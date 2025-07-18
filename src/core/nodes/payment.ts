import type { Database } from "../../db";
import type { Context, RunResult, NodeBuilder } from "../types";

type PaymentConfig = {
  amount: number;
};

export function buildPaymentNode(db: Database): NodeBuilder<PaymentConfig> {
  async function runPayment(
    ctx: Context,
    config: PaymentConfig,
  ): Promise<RunResult> {
    console.log(`Posting payment...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { status: "pending", patch: { paymentId: "wxy747" } };
  }

  return {
    type: "payment",
    run: runPayment,
  };
}
