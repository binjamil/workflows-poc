import type { Database } from "../../db";
import type { Context, RunResult } from "../types";

type QueryConfig = { query: string };

export function buildQueryNode(db: Database) {
  async function runQuery(ctx: Context, config: QueryConfig): Promise<RunResult> {
    // Here we just return dummy data for demonstration purposes
    // In real impl, you would use db and config to execute the query
    const { query } = config;
    const dummyCompanies = [{ id: 1, name: "A-Team" }];
    const dummyEmployees = [
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Doe" },
    ];

    if (query.includes("companies")) return { status: "completed", patch: dummyCompanies };
    if (query.includes("employees")) return { status: "completed", patch: dummyEmployees };
    return { status: "completed", patch: [] };
  }

  return {
    type: "query",
    run: runQuery,
  };
}
