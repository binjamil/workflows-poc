import { drizzle } from "drizzle-orm/node-postgres";
import { buildDAGRunner } from "./core/dag-runner";
import { workflowRuns } from "./db";

async function main() {
  const db = drizzle({
    connection: process.env.DATABASE_URL!,
    casing: "snake_case",
  });

  const [workflowRun] = await db
    .insert(workflowRuns)
    .values({
      workflowId: "wf_rrezbzmja52o",
    })
    .returning();

  if (!workflowRun) {
    throw new Error("Failed to create workflow run");
  }

  const runId = workflowRun.runId;
  // const runId = "run_vn9d6iyk42cj";

  const dagRunner = buildDAGRunner(db);
  const ctx = await dagRunner.run(runId);
  console.log(JSON.stringify(ctx, null, 2));

  await db.$client.end();
}

main();
