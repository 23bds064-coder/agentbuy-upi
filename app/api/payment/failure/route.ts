import { NextResponse } from "next/server";
import { readAppDataFromDisk, writeAppDataToDisk } from "@/app/lib/store";
import type { PaymentStatus } from "@/app/lib/agentbuy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      razorpay_order_id?: string;
      error_code?: string;
      error_description?: string;
      approvalId?: string;
    };

    const orderId = body.razorpay_order_id;
    const reason = body.error_description || body.error_code || "Payment cancelled or declined in test mode";

    const state = readAppDataFromDisk();

    if (orderId) {
      const updatedPayments = state.payments.map((p) =>
        p.id === orderId
          ? {
              ...p,
              status: "Failed" as PaymentStatus,
              date: new Date().toISOString(),
            }
          : p
      );
      writeAppDataToDisk({ ...state, payments: updatedPayments });
    }

    // Record PAYMENT_FAILED audit event
    const { recordAuditEvent } = await import("@/app/lib/audit");
    recordAuditEvent({
      eventType: "PAYMENT_FAILED",
      orderId,
      approvalId: body.approvalId,
      status: "FAILED",
      summary: "Payment failed",
      explanation: `Payment for order ${orderId || "unknown"} failed or was declined: ${reason}.`,
      metadata: {
        orderId,
        approvalId: body.approvalId,
        errorCode: body.error_code,
        reason,
      },
    });

    const auditEvent = `RAZORPAY TEST PAYMENT FAILED: Order ${orderId || "unknown"}, Reason: ${reason}, Approval: ${body.approvalId || "none"}`;

    return NextResponse.json({
      ok: true,
      status: "Failed",
      orderId,
      reason,
      auditEvent,
      message: "Payment failure handled and recorded gracefully in test mode.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to record payment failure.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
