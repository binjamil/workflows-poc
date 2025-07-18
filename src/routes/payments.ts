import { Router } from "express";
import { payments } from "../db/schema";
import type { MessageBus } from "../msgbus";
import type { Database } from "../db";
import { eq } from "drizzle-orm";
import { buildEventStore } from "../core/event-store";

export function createPaymentRoutes(db: Database, bus: MessageBus) {
  const router = Router();

  // GET /v1/payments
  router.get("/", async (req, res) => {
    try {
      const allPayments = await db.select().from(payments);
      res.json(allPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // POST /v1/payments/settle
  router.post("/settle", async (req, res) => {
    try {
      const paymentId = req.body?.paymentId;
      if (!paymentId) {
        return res.status(400).json({ error: "paymentId is required" });
      }

      const [updatedPayment] = await db
        .update(payments)
        .set({ status: "settled" })
        .where(eq(payments.paymentId, paymentId))
        .returning();

      if (!updatedPayment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Resume workflow waiting for payment settlement
      const { runId } = updatedPayment;
      const store = buildEventStore(db, runId);
      const events = await store.all();
      const lastEvent = events[events.length - 1];
      if (lastEvent?.type === "node:pending" && (lastEvent.patch as { paymentId: string })?.paymentId === paymentId) {
        await store.append({ type: "node:completed", nodeId: lastEvent.nodeId, patch: updatedPayment });
        await bus.post("workflow:start", { runId });
      }

      res.json(updatedPayment);
    } catch (error) {
      console.error("Error settling payment:", error);
      res.status(500).json({ error: "Failed to settle payment" });
    }
  });

  return router;
}
