import { NextResponse } from "next/server";
import {
  recordAuditEvent,
  getAuditTrail,
  getAllAuditEvents,
  getMerchantMetrics,
  type AuditEventType,
} from "@/app/lib/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const orderId = searchParams.get("orderId");
    const type = searchParams.get("type");

    if (type === "metrics") {
      const metrics = getMerchantMetrics();
      return NextResponse.json({ ok: true, metrics });
    }

    const events = sessionId || orderId
      ? getAuditTrail(sessionId || orderId || undefined)
      : getAllAuditEvents(50);

    const metrics = getMerchantMetrics();

    return NextResponse.json({
      ok: true,
      events,
      metrics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to retrieve audit trail.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventType: AuditEventType;
      sessionId?: string;
      orderId?: string;
      paymentId?: string;
      approvalId?: string;
      productIds?: string[];
      amount?: number;
      policyResult?: { passed: boolean; violations?: string[] };
      status?: "INFO" | "SUCCESS" | "BLOCKED" | "FAILED" | "PENDING";
      summary: string;
      explanation?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.eventType || !body.summary) {
      return NextResponse.json(
        { ok: false, message: "eventType and summary are required." },
        { status: 400 }
      );
    }

    const event = recordAuditEvent({
      eventType: body.eventType,
      sessionId: body.sessionId,
      orderId: body.orderId,
      paymentId: body.paymentId,
      approvalId: body.approvalId,
      productIds: body.productIds,
      amount: body.amount,
      policyResult: body.policyResult,
      status: body.status || "INFO",
      summary: body.summary,
      explanation: body.explanation,
      metadata: body.metadata,
    });

    return NextResponse.json({
      ok: true,
      event,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to record audit event.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
