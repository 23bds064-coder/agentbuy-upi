import { NextResponse } from "next/server";
import { verifyAndConsumeApproval } from "@/app/lib/approval";
import { createRazorpayTestOrder, generateTestSignature, getRazorpayCredentials } from "@/app/lib/razorpay";
import { readAppDataFromDisk, writeAppDataToDisk } from "@/app/lib/store";
import type { PaymentRecord } from "@/app/lib/agentbuy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      approvalId?: string;
      total?: number;
      paymentMode?: string;
      sessionId?: string;
    };

    const approvalId = body.approvalId;
    const requestedTotal = Number(body.total ?? 0);

    // Strict Enforcement Gate 1: Check approvalId existence
    if (!approvalId) {
      return NextResponse.json(
        {
          ok: false,
          error: "HUMAN_APPROVAL_REQUIRED",
          message: "Payment creation rejected: Explicit human approval has not been recorded. The AI is not permitted to authorize payments directly.",
        },
        { status: 403 }
      );
    }

    // Strict Enforcement Gate 2: Server-side approval verification & consumption
    const verification = verifyAndConsumeApproval(approvalId, requestedTotal);
    if (!verification.valid || !verification.approval) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_OR_CONSUMED_APPROVAL",
          message: verification.error || "Payment creation rejected: Invalid or consumed approval record.",
        },
        { status: 403 }
      );
    }

    const approval = verification.approval;
    const totalAmount = approval.cart.total;

    // Create Razorpay test order on the server
    const razorpayOrder = createRazorpayTestOrder({
      amountInRupees: totalAmount,
      receipt: `rcpt_${approval.id}`,
      notes: {
        approvalId: approval.id,
        itemsCount: String(approval.cart.items.length),
      },
    });

    const { keyId } = getRazorpayCredentials();

    // Generate authentic test signature for sandbox verification flow
    const testPaymentId = `pay_test_${Date.now()}`;
    const testSignature = generateTestSignature(razorpayOrder.id, testPaymentId);

    // Record Pending transaction in server disk store
    const itemNames = approval.cart.items.map((i) => i.name).join(" + ");
    const state = readAppDataFromDisk();
    const pendingPaymentRecord: PaymentRecord = {
      id: razorpayOrder.id,
      merchant: "AgentBuy Merchant",
      amount: totalAmount,
      status: "Pending",
      date: new Date().toISOString(),
      method: "Other",
      item: itemNames,
    };

    const updatedState = {
      ...state,
      payments: [pendingPaymentRecord, ...state.payments],
    };
    writeAppDataToDisk(updatedState);

    // Record PAYMENT_CREATED audit event
    const { recordAuditEvent } = await import("@/app/lib/audit");
    recordAuditEvent({
      eventType: "PAYMENT_CREATED",
      sessionId: body.sessionId,
      orderId: razorpayOrder.id,
      approvalId: approval.id,
      amount: totalAmount,
      productIds: approval.cart.items.map((i) => i.id),
      status: "PENDING",
      summary: "Payment created",
      explanation: `Razorpay test-mode order ${razorpayOrder.id} created on server for ₹${totalAmount.toLocaleString("en-IN")}.`,
      metadata: {
        orderId: razorpayOrder.id,
        approvalId: approval.id,
        amountPaise: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    });

    return NextResponse.json({
      ok: true,
      order: razorpayOrder,
      keyId,
      approvalId: approval.id,
      items: approval.cart.items,
      total: totalAmount,
      simulatedPayment: {
        paymentId: testPaymentId,
        signature: testSignature,
      },
      message: "Razorpay test-mode order created. Server-verified human approval recorded.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to create payment order.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
