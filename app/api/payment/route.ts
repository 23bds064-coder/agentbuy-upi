import { NextResponse } from "next/server";
import { createPaymentRecord, policy, saveAppData } from "@/app/lib/agentbuy";
import { readAppDataFromDisk, writeAppDataToDisk } from "@/app/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      item?: string;
      amount?: number;
      method?: "UPI" | "Other";
    };

    const item = body.item ?? "iPhone 17 Pro";
    const amount = Number(body.amount ?? 89999);
    const method = body.method ?? "UPI";

    if (amount > policy.maxOrderValue) {
      const { recordAuditEvent } = await import("@/app/lib/audit");
      recordAuditEvent({
        eventType: "POLICY_BLOCKED",
        amount,
        status: "BLOCKED",
        summary: "Policy blocked",
        explanation: `Payment blocked because ₹${amount.toLocaleString("en-IN")} exceeds the ₹${policy.maxOrderValue.toLocaleString("en-IN")} transaction limit.`,
        policyResult: {
          passed: false,
          violations: [`Order total ₹${amount.toLocaleString("en-IN")} exceeds the ₹${policy.maxOrderValue.toLocaleString("en-IN")} policy cap.`],
        },
      });
      return NextResponse.json(
        {
          ok: false,
          error: "POLICY_BLOCKED",
          message: `Payment blocked: maximum allowed is ₹${policy.maxOrderValue.toLocaleString("en-IN")}.`,
        },
        { status: 403 }
      );
    }

    const state = readAppDataFromDisk();
    const payment = createPaymentRecord(item, amount, method);
    const next = {
      ...state,
      balance: Math.max(0, state.balance - amount),
      payments: [payment, ...state.payments],
    };

    saveAppData(next);
    writeAppDataToDisk(next);

    return NextResponse.json({
      ok: true,
      payment,
      balance: next.balance,
      message: "Payment processed in sandbox mode",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Payment failed",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 400 }
    );
  }
}
