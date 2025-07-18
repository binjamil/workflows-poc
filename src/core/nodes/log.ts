import type { Database } from "../../db";
import type { Context, RunResult, NodeBuilder } from "../types";

type LogConfig = {};

export function buildLogNode(db: Database): NodeBuilder<LogConfig> {
  async function runLog(ctx: Context, config: LogConfig): Promise<RunResult> {
    console.log(`Hello from Log node: ${JSON.stringify(ctx)}`);
    return { status: "completed" };
  }

  return {
    type: "log",
    run: runLog,
  };
}
