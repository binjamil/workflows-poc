import { init } from "@paralleldrive/cuid2";
import { integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

const createId = init({ length: 12 });

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: text()
    .primaryKey()
    .$defaultFn(() => "wf_" + createId()),
  name: text(),
  description: text(),
  nodes: jsonb().default([]),
});

export const workflowRuns = pgTable("workflow_runs", {
  runId: text()
    .primaryKey()
    .$defaultFn(() => "run_" + createId()),
  workflowId: text().references(() => workflowDefinitions.id),
  startedAt: timestamp(),
  status: text(),
});

export const workflowEvents = pgTable(
  "workflow_events",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => "ev_" + createId()),
    runId: text().references(() => workflowRuns.runId),
    seq: integer(),
    type: text(),
    nodeId: text(),
    patch: jsonb(),
    ts: timestamp(),
  },
  (t) => [unique().on(t.runId, t.seq), unique().on(t.runId, t.type, t.nodeId)]
);
