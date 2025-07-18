import type { Database } from "../db";
import type { Context, Node, Event } from "./types";
import { buildEventStore } from "./event-store";
import { buildNodeRegistry } from "./node-registry";
import type { MessageBus } from "../msgbus";

export function buildDAGRunner(db: Database, bus: MessageBus) {
  let running = false;

  async function start() {
    running = true;
    while (running) {
      const msg = await bus.poll("workflow:start");
      if (!msg) continue;
      await run(msg.runId);
    }
  }

  function stop() {
    running = false;
  }

  /**
   * Executes a workflow run by processing events and running nodes in dependency order.
   *
   * @param runId - The unique identifier for the workflow run
   * @returns The final execution context containing all node outputs
   *
   * Process:
   * 1. Retrieves workflow definition and existing events for the run
   * 2. Rebuilds context from events and resolves node dependencies
   * 3. Topologically sorts nodes and executes them sequentially
   * 4. Handles pending nodes by returning early and waiting for completion
   * 5. Emits events for each node execution stage (started, pending, completed)
   */
  async function run(runId: string) {
    const eventStore = buildEventStore(db, runId);
    const registry = buildNodeRegistry(db);

    const nodes = await registry.loadNodes(runId);
    const events = await eventStore.all();
    const resolvedNodes = resolveNodes(nodes, events);
    const ctx = rebuildContext(events);

    if (events.length === 0) {
      const meta = { runId };
      await eventStore.append({ type: "workflow:started", patch: meta });
      ctx["meta"] = meta;
    }

    const lastEvent = events[events.length - 1];
    if (lastEvent?.type === "node:pending" || lastEvent?.type === "workflow:completed") {
      return ctx;
    }

    for (const nodeId of topologicalSort(resolvedNodes)) {
      await eventStore.append({ type: "node:started", nodeId });

      const node = resolvedNodes.find((n) => n.id === nodeId)!;
      const result = await node.run(Object.freeze({ ...ctx }), node.config);
      ctx[nodeId] = result.patch;

      if (result.status === "pending") {
        await eventStore.append({ type: "node:pending", nodeId, patch: result.patch });
        return ctx;
      } else {
        await eventStore.append({ type: "node:completed", nodeId, patch: result.patch });
      }
    }

    await eventStore.append({ type: "workflow:completed" });
    return ctx;
  }

  return {
    start,
    stop,
  };
}

/**
 * Topologically sorts nodes using Kahn's algorithm.
 * Returns nodes in dependency order (dependencies before dependents).
 * Throws if cycle detected.
 */
function topologicalSort(nodes: Node[]): string[] {
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();

  nodes.forEach((n) => {
    inDeg.set(n.id, n.deps.length);
    n.deps.forEach((d) => {
      if (!adj.has(d)) adj.set(d, []);
      adj.get(d)!.push(n.id);
    });
  });

  const queue = nodes.filter((n) => n.deps.length === 0).map((n) => n.id);
  const order: string[] = [];

  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    (adj.get(id) || []).forEach((child) => {
      inDeg.set(child, (inDeg.get(child) || 0) - 1);
      if (inDeg.get(child) === 0) queue.push(child);
    });
  }

  if (order.length !== nodes.length) {
    throw new Error("Cycle detected in DAG definition");
  }

  return order;
}

/**
 * Rebuilds the workflow execution context from a series of events.
 * Processes events to reconstruct the current state of each node by applying
 * patches from completed and pending node events to build the context object.
 */
export function rebuildContext(events: Event[]): Context {
  const ctx: Context = {};
  for (const ev of events) {
    if (ev.type === "workflow:started") ctx["meta"] = ev.patch;
    if (ev.type === "node:completed") ctx[ev.nodeId] = ev.patch;
    if (ev.type === "node:pending") ctx[ev.nodeId] = ev.patch;
  }
  return ctx;
}

/**
 * Resolves node dependencies by removing completed nodes from dependency arrays.
 * Iterates through events to identify completed nodes and filters them out of
 * each node's deps array to determine which nodes are ready to execute.
 */
function resolveNodes(nodes: Node[], events: Event[]): Node[] {
  const completedNodes = new Set<string>();

  for (const event of events) {
    if (event.type === "node:completed") {
      completedNodes.add(event.nodeId);
    }
  }

  return nodes
    .filter((node) => !completedNodes.has(node.id))
    .map((node) => ({
      ...node,
      deps: node.deps.filter((depId) => !completedNodes.has(depId)),
    }));
}
