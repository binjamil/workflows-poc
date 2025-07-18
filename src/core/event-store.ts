import { eq, max } from "drizzle-orm";
import type { Database } from "../db";
import { workflowEvents } from "../db";
import type { Event, EventStore } from "./types";
import { updateWorkflowRunStatus } from "./workflow-status";

export function buildEventStore(db: Database, runId: string): EventStore {
  async function nextSeq(runId: string): Promise<number> {
    const result = await db
      .select({ maxSeq: max(workflowEvents.seq) })
      .from(workflowEvents)
      .where(eq(workflowEvents.runId, runId));

    return (result[0]?.maxSeq ?? 0) + 1;
  }

  async function append(ev: Event) {
    const seq = await nextSeq(runId);

    await db.insert(workflowEvents).values({
      runId,
      seq,
      type: ev.type,
      nodeId: "nodeId" in ev ? ev.nodeId : null,
      patch: "patch" in ev ? ev.patch : null,
      ts: new Date(),
    });

    // Update workflow run status after appending event
    const allEvents = await all();
    await updateWorkflowRunStatus(db, runId, allEvents);
  }

  async function all(): Promise<Event[]> {
    const events = await db
      .select()
      .from(workflowEvents)
      .where(eq(workflowEvents.runId, runId))
      .orderBy(workflowEvents.seq);

    return events.map((ev) => {
      switch (ev.type) {
        case "workflow:completed":
          return { type: "workflow:completed" };
        case "workflow:started":
          return { type: "workflow:started", patch: ev.patch };
        case "node:started":
          return { type: "node:started", nodeId: ev.nodeId! };
        case "node:pending":
          return { type: "node:pending", nodeId: ev.nodeId!, patch: ev.patch };
        case "node:completed":
          return {
            type: "node:completed",
            nodeId: ev.nodeId!,
            patch: ev.patch,
          };
        default:
          throw new Error(`Unknown event type: ${ev.type}`);
      }
    });
  }

  return {
    append,
    all,
  };
}
