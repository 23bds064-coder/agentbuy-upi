import { NextResponse } from "next/server";
import { aiCatalogService, checkPolicy, createPaymentRecord, saveAppData, type Recommendation } from "@/app/lib/agentbuy";
import { readAppDataFromDisk, writeAppDataToDisk } from "@/app/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      recommendation?: Recommendation;
      payment?: { amount?: number; id?: string; mode?: string };
      query?: string;
      approvalId?: string;
      sessionId?: string;
    };

    const recommendation = body.recommendation;
    const selectedProduct = recommendation?.selectedProduct?.id ? aiCatalogService.getById(recommendation.selectedProduct.id) : undefined;
    const upsell = recommendation?.upsell?.id ? aiCatalogService.getById(recommendation.upsell.id) : null;
    if (!selectedProduct) {
      return NextResponse.json({ ok: false, message: "Order blocked: verified cart product is required." }, { status: 400 });
    }
    const total = selectedProduct.price + (upsell?.price ?? 0);
    const policyResult = checkPolicy(total, selectedProduct, upsell);
    if (!policyResult.ok) {
      const { recordAuditEvent } = await import("@/app/lib/audit");
      recordAuditEvent({
        eventType: "POLICY_BLOCKED",
        sessionId: body.sessionId,
        amount: total,
        productIds: [selectedProduct.id, ...(upsell ? [upsell.id] : [])],
        status: "BLOCKED",
        summary: "Policy blocked",
        explanation: `Order blocked because the verified cart total ₹${total.toLocaleString("en-IN")} exceeds the ₹${policyResult.maxOrderValue.toLocaleString("en-IN")} transaction limit.`,
        policyResult: { passed: false, violations: policyResult.violations },
      });
      return NextResponse.json({ ok: false, error: "POLICY_BLOCKED", message: "Order creation blocked by merchant policy.", violations: policyResult.violations }, { status: 403 });
    }
    const itemNames = [selectedProduct.name, upsell?.name].filter(Boolean).join(" + ");
    const approvalId = body.approvalId;

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
        approvalId: approvalId || "none",
        mode: body.payment?.mode ?? "razorpay_test",
        createdAt: new Date().toISOString(),
      },
      message: "Order finalized successfully in Razorpay test mode with verified server approval.",
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
