import { drizzle } from "drizzle-orm/node-postgres";
import { workflowDefinitions } from "./db/schema";

async function seed() {
  const db = drizzle({
    connection: process.env.DATABASE_URL!,
    casing: "snake_case",
  });

  await db.insert(workflowDefinitions).values({
    name: "Basic litmus test",
    description: "A simple workflow to test the system",
    nodes: [
      // {
      //   id: "trigger",
      //   config: { type: "cron", schedule: "0 0 * * *" },
      //   deps: [],
      // },
      {
        id: "query:1",
        config: { query: "SELECT * FROM companies where id = 1" },
        deps: [],
      },
      {
        id: "query:2",
        config: { query: "SELECT * FROM employees where company_id = 1" },
        deps: ["query:1"],
      },
      {
        id: "payment:1",
        config: {
          rules: "Calculate contributions for each employee as 5% of their salary",
        },
        deps: ["query:1", "query:2"],
      },
      {
        id: "log:1",
        deps: ["payment:1"],
      },
    ],
  });
}

seed();
