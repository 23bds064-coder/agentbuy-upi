import { NextResponse } from "next/server";
import { createPaymentRecord, saveAppData, type Recommendation } from "@/app/lib/agentbuy";
import { readAppDataFromDisk, writeAppDataToDisk } from "@/app/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      recommendation?: Recommendation;
      payment?: { amount?: number; id?: string; mode?: string };
      query?: string;
    };

    const recommendation = body.recommendation;
    const total = Number(body.payment?.amount ?? recommendation?.total ?? 0);
    const itemNames = [recommendation?.selectedProduct?.name, recommendation?.upsell?.name].filter(Boolean).join(" + ");

    const state = readAppDataFromDisk();
    const paymentRecord = createPaymentRecord(itemNames || "AgentBuy cart", total, "Other");
    const next = {
      ...state,
      balance: Math.max(0, state.balance - total),
      payments: [paymentRecord, ...state.payments],
    };

    saveAppData(next);
    writeAppDataToDisk(next);

    return NextResponse.json({
      ok: true,
      order: {
        id: `order-${Date.now()}`,
        query: body.query ?? recommendation?.query ?? "Unknown request",
        items: itemNames || "AgentBuy cart",
        total,
        paymentId: body.payment?.id ?? paymentRecord.id,
        mode: body.payment?.mode ?? "razorpay_test",
        createdAt: new Date().toISOString(),
      },
      message: "Order created successfully in Razorpay test mode with human approval recorded.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Order creation failed.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 400 }
    );
  }
}
