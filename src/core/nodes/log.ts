import type { Database } from "../../db";
import type { Context, RunResult } from "../types";

type LogConfig = {};

export function buildLogNode(db: Database) {
  async function runLog(ctx: Context, config: LogConfig): Promise<RunResult> {
    console.log(`Hello from Log node: ${JSON.stringify(ctx)}`);
    return { status: "completed" };
  }

  return {
    type: "log",
    run: runLog,
  };
}
