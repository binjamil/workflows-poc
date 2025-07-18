import express from "express";
import { drizzle } from "drizzle-orm/node-postgres";
import { buildDAGRunner } from "./core/dag-runner";
import { createClientPool } from "redis";
import { buildMessageBus } from "./msgbus";
import { createWorkflowRoutes } from "./routes/workflows";
import { createPaymentRoutes } from "./routes/payments";

async function main() {
  const db = drizzle({
    connection: process.env.DATABASE_URL!,
    casing: "snake_case",
  });

  const redis = await createClientPool().connect();
  if (!redis) {
    throw new Error("Failed to connect to Redis");
  }

  const bus = buildMessageBus(redis);
  const dagRunner = buildDAGRunner(db, bus);
  dagRunner.start();

  const app = express();
  app.use(express.json());
  app.use("/v1/workflows", createWorkflowRoutes(db, bus));
  app.use("/v1/payments", createPaymentRoutes(db, bus));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch(console.error);
