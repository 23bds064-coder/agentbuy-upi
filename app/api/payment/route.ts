import { NextResponse } from "next/server";
import { createPaymentRecord, saveAppData } from "@/app/lib/agentbuy";
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
