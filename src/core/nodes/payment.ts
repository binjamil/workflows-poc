import { payments, type Database } from "../../db";
import type { Context, RunResult, NodeBuilder } from "../types";

type PaymentConfig = {
  amount: number;
};

export function buildPaymentNode(db: Database): NodeBuilder<PaymentConfig> {
  async function runPayment(ctx: Context, config: PaymentConfig): Promise<RunResult> {
    const { runId } = ctx.meta as { runId: string };
    const [payment] = await db
      .insert(payments)
      .values({
        runId,
        amount: config.amount,
        status: "processing",
      })
      .returning();

    if (!payment) {
      throw new Error("Failed to create payment");
    }

    return { status: "pending", patch: payment };
  }

  return {
    type: "payment",
    run: runPayment,
  };
}
