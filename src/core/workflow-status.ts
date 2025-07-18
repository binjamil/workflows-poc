import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { workflowRuns } from "../db/schema";
import type { Event } from "./types";

export type WorkflowRunStatus =
  | "created" // Initial state, no events yet
  | "running" // Has workflow:started event, execution in progress
  | "pending" // Waiting for external completion (node:pending exists)
  | "completed" // Has workflow:completed event
  | "failed"; // Error during execution (TODO)

/**
 * Derives workflow run status from events following event sourcing principles.
 * This ensures status is always consistent with the event stream and avoids
 * distributed systems issues by having a single source of truth.
 */
export function deriveWorkflowStatus(events: Event[]): WorkflowRunStatus {
  if (events.length === 0) return "created";

  const lastEvent = events[events.length - 1];

  // Check for completion first
  if (events.some((e) => e.type === "workflow:completed")) {
    return "completed";
  }

  // Check for pending state (node waiting for external completion)
  if (lastEvent?.type === "node:pending") {
    return "pending";
  }

  // Check if workflow has started
  if (events.some((e) => e.type === "workflow:started")) {
    return "running";
  }

  return "created";
}

/**
 * Updates workflow run status in database based on events.
 * Call this after appending events to maintain consistency.
 */
export async function updateWorkflowRunStatus(db: Database, runId: string, events: Event[]): Promise<void> {
  const status = deriveWorkflowStatus(events);

  await db.update(workflowRuns).set({ status }).where(eq(workflowRuns.runId, runId));
}
