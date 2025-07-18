import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { workflowDefinitions, workflowRuns } from "../db";
import { buildLogNode, buildPaymentNode, buildQueryNode } from "./nodes";
import type { Node, NodeBuilder } from "./types";

export function buildNodeRegistry(db: Database) {
  const builders: Record<string, NodeBuilder<any>> = {
    query: buildQueryNode(db),
    log: buildLogNode(db),
    payment: buildPaymentNode(db),
  };

  /**
   * Maps a node type to its corresponding run function provided by builder.
   */
  function get(type: string) {
    const builder = builders[type];
    if (!builder) {
      throw new Error(`Node type ${type} not registered`);
    }
    return builder;
  }

  /**
   * Loads nodes for a workflow run and maps them with their execution functions.
   *
   * @param runId - The workflow run identifier
   * @returns Array of nodes with their run functions attached
   */
  async function loadNodes(runId: string) {
    const [workflowRun] = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.runId, runId))
      .limit(1)
      .innerJoin(workflowDefinitions, eq(workflowRuns.workflowId, workflowDefinitions.id));

    return (workflowRun?.workflow_definitions.nodes as Array<any>).map((node) => {
      return {
        ...node,
        run: get(node.id.split(":")[0]).run,
      } as Node;
    });
  }

  return {
    get,
    loadNodes,
  };
}
