import { NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/app/lib/razorpay";
import { readAppDataFromDisk, writeAppDataToDisk } from "@/app/lib/store";
import { getApproval } from "@/app/lib/approval";
import { aiCatalogService, type PaymentStatus } from "@/app/lib/agentbuy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      approvalId?: string;
      sessionId?: string;
    };

    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      approvalId,
      sessionId,
    } = body;

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_FIELDS",
          message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required for verification.",
        },
        { status: 400 }
      );
    }

    if (!approvalId) {
      return NextResponse.json(
        {
          ok: false,
          error: "HUMAN_APPROVAL_REQUIRED",
          message: "Payment verification rejected: a server approval is required.",
        },
        { status: 403 }
      );
    }

    const approval = getApproval(approvalId);
    if (!approval || approval.status !== "consumed") {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_APPROVAL",
          message: "Payment verification rejected: no consumed server approval was found.",
        },
        { status: 403 }
      );
    }

    // Cryptographic signature verification using server secret
    const isValidSignature = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature,
    });

    const state = readAppDataFromDisk();

    if (!isValidSignature) {
      // Mark transaction status as Failed in store
      const updatedPayments = state.payments.map((p) =>
        p.id === orderId ? { ...p, status: "Failed" as PaymentStatus } : p
      );
      writeAppDataToDisk({ ...state, payments: updatedPayments });

      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_SIGNATURE",
          status: "Failed",
          message: "Razorpay signature verification failed. Test payment has been marked as Failed.",
        },
        { status: 400 }
      );
    }

    const existingPayment = state.payments.find((p) => p.id === orderId);
    if (!existingPayment || Math.abs(existingPayment.amount - approval.cart.total) > 0.01) {
      return NextResponse.json(
        {
          ok: false,
          error: "PAYMENT_ORDER_NOT_FOUND",
          message: "Payment verification rejected: the server has no matching payment order for this approval.",
        },
        { status: 403 }
      );
    }

    const currentCatalogTotal = approval.cart.items.reduce((sum, item) => {
      const currentProduct = aiCatalogService.getById(item.id);
      return currentProduct && currentProduct.price === item.price
        ? sum + currentProduct.price * item.quantity
        : NaN;
    }, 0);
    if (!Number.isFinite(currentCatalogTotal) || Math.abs(currentCatalogTotal - approval.cart.total) > 0.01) {
      return NextResponse.json(
        {
          ok: false,
          error: "PRICE_CHANGED",
          message: "Payment verification rejected: catalog prices changed after approval. Please rebuild the cart.",
        },
        { status: 403 }
      );
    }

    const amount = existingPayment.amount;
    const item = existingPayment.item;

    // Update payment record to Successful
    const updatedPayments = state.payments.map((p) =>
      p.id === orderId
        ? {
            ...p,
            id: paymentId,
            status: "Successful" as PaymentStatus,
            date: new Date().toISOString(),
          }
        : p
    );

    const nextState = {
      ...state,
      balance: Math.max(0, state.balance - amount),
      payments: updatedPayments,
    };

    writeAppDataToDisk(nextState);

    // Record PAYMENT_SUCCESS and ORDER_CREATED audit events
    const { recordAuditEvent } = await import("@/app/lib/audit");
    recordAuditEvent({
      eventType: "PAYMENT_SUCCESS",
      sessionId,
      orderId,
      paymentId,
      approvalId,
      amount,
      status: "SUCCESS",
      summary: "Payment successful",
      explanation: `Razorpay HMAC-SHA256 signature verified on server. Test payment ${paymentId} captured for ₹${amount.toLocaleString("en-IN")}.`,
      metadata: {
        orderId,
        paymentId,
        approvalId,
        amount,
        signatureVerified: true,
      },
    });

    recordAuditEvent({
      eventType: "ORDER_CREATED",
      sessionId,
      orderId: `order_${Date.now()}`,
      paymentId,
      approvalId,
      amount,
      status: "SUCCESS",
      summary: "Order created",
      explanation: `AgentBuy order finalized with merchant fulfillment. Items: ${item} (Total: ₹${amount.toLocaleString("en-IN")}).`,
      metadata: {
        paymentId,
        approvalId,
        item,
        amount,
      },
    });

    const auditEvent = `RAZORPAY TEST PAYMENT VERIFIED: Payment ID ${paymentId}, Order ${orderId}, Server Approval ${approvalId || "none"}`;

    return NextResponse.json({
      ok: true,
      status: "Successful",
      paymentId,
      orderId,
      approvalId,
      amount,
      item,
      balance: nextState.balance,
      auditEvent,
      message: "Payment verified successfully in Razorpay test mode. Transaction recorded.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Payment verification failed.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
