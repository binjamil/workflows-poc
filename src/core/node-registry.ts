import type { Database } from "../db";
import { workflowDefinitions, workflowRuns } from "../db";
import { eq } from "drizzle-orm";
import type { Node } from "./types";
import { buildLogNode, buildQueryNode, buildPaymentNode } from "./nodes";

export function buildNodeRegistry(db: Database) {
  const nodes = [buildQueryNode(db), buildLogNode(db), buildPaymentNode(db)];
  const mappings: Record<string, unknown> = {};
  nodes.forEach((node) => {
    mappings[node.type] = node.run;
  });

  /**
   * Maps a node ID to its corresponding run function.
   *
   * @param nodeId - The ID of the node to map.
   * @returns The run function of the node.
   */
  function map(nodeId: string) {
    const nodeType = nodeId.split(":")[0];
    if (!nodeType) {
      throw new Error(`Node type ${nodeType} not found`);
    }
    return mappings[nodeType];
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
        run: map(node.id),
      } as Node;
    });
  }

  return {
    map,
    loadNodes,
  };
}
