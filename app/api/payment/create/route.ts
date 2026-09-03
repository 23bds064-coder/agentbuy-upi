import { NextResponse } from "next/server";
import { type Product } from "@/app/lib/agentbuy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      total?: number;
      paymentMode?: string;
      cart?: Product[];
    };

    const total = Number(body.total ?? body.cart?.reduce((sum, item) => sum + item.price, 0) ?? 0);
    const paymentMode = body.paymentMode ?? "razorpay_test";

    const payment = {
      id: `pay_${Date.now()}`,
      amount: total,
      currency: "INR",
      status: "pending",
      mode: paymentMode,
      createdAt: new Date().toISOString(),
      merchant: "AgentBuy Merchant",
      description: "AI-buyer checkout in test mode",
    };

    return NextResponse.json({
      ok: true,
      payment,
      message: "Razorpay test-mode checkout initiated. Human approval required before final capture.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to create payment.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 400 }
    );
  }
}
