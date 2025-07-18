import { Router } from "express";
import { workflowRuns } from "../db/schema";
import { buildEventStore } from "../core/event-store";
import { rebuildContext } from "../core/dag-runner";
import { eq } from "drizzle-orm";
import type { MessageBus } from "../msgbus";
import type { Database } from "../db";

export function createWorkflowRoutes(db: Database, bus: MessageBus) {
  const router = Router();

  // POST /v1/workflows/run
  router.post("/run", async (req, res) => {
    try {
      const workflowId = req.body?.workflowId;
      if (!workflowId) {
        return res.status(400).json({ error: "workflowId is required" });
      }

      const [workflowRun] = await db
        .insert(workflowRuns)
        .values({
          workflowId,
          startedAt: new Date(),
        })
        .returning();

      if (!workflowRun) {
        return res.status(500).json({ error: "Failed to create workflow run" });
      }

      await bus.post("workflow:start", { runId: workflowRun.runId });

      res.json({ runId: workflowRun.runId });
    } catch (error) {
      console.error("Error starting workflow:", error);
      res.status(500).json({ error: "Failed to start workflow" });
    }
  });

  // POST /v1/workflows/resume
  router.post("/resume", async (req, res) => {
    try {
      const runId = req.body?.runId;
      if (!runId) {
        return res.status(400).json({ error: "runId is required" });
      }

      await bus.post("workflow:start", { runId });

      res.json({ runId });
    } catch (error) {
      console.error("Error resuming workflow:", error);
      res.status(500).json({ error: "Failed to resume workflow" });
    }
  });

  // GET /v1/workflows/status?runId=...
  router.get("/status", async (req, res) => {
    try {
      const runId = req.query.runId as string;
      if (!runId) {
        return res.status(400).json({ error: "runId query parameter is required" });
      }

      const [run] = await db
        .select()
        .from(workflowRuns)
        .where(eq(workflowRuns.runId, runId));

      if (!run) {
        return res.status(404).json({ error: "Workflow run not found" });
      }

      const eventStore = buildEventStore(db, runId);
      const events = await eventStore.all();
      const context = rebuildContext(events);

      res.json({ ...run, context });
    } catch (error) {
      console.error("Error getting workflow status:", error);
      res.status(500).json({ error: "Failed to get workflow status" });
    }
  });

  // GET /v1/workflows/events?runId=...
  router.get("/events", async (req, res) => {
    try {
      const runId = req.query.runId as string;
      if (!runId) {
        return res.status(400).json({ error: "runId query parameter is required" });
      }

      const eventStore = buildEventStore(db, runId);
      const events = await eventStore.all();

      res.json(events);
    } catch (error) {
      console.error("Error getting workflow events:", error);
      res.status(500).json({ error: "Failed to get workflow events" });
    }
  });

  return router;
}
