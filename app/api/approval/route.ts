import { NextResponse } from "next/server";
import { recordApproval, getApproval } from "@/app/lib/approval";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart, total, paymentMode, approvedBy } = body;

    const result = recordApproval({
      cart,
      total: total !== undefined ? Number(total) : undefined,
      paymentMode,
      approvedBy,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: result.error || "Approval rejected by merchant guardrails.",
          violations: result.violations || [],
        },
        { status: 400 }
      );
    }

    // Record USER_APPROVED event in audit log
    const { recordAuditEvent } = await import("@/app/lib/audit");
    recordAuditEvent({
      eventType: "USER_APPROVED",
      sessionId: body.sessionId,
      approvalId: result.approval?.id,
      amount: result.approval?.cart.total,
      productIds: result.approval?.cart.items.map((i) => i.id),
      status: "SUCCESS",
      summary: "User approved",
      explanation: `Buyer explicitly approved purchase of ${result.approval?.cart.items.map((i) => i.name).join(" + ")} (Total: ₹${result.approval?.cart.total.toLocaleString("en-IN")})`,
      metadata: {
        approvalId: result.approval?.id,
        itemsCount: result.approval?.cart.items.length,
        paymentMode,
      },
    });

    return NextResponse.json({
      ok: true,
      approval: result.approval,
      message: "Human approval recorded on server. Payment creation is now authorized.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to process human approval.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const approvalId = searchParams.get("id");

    if (!approvalId) {
      return NextResponse.json(
        { ok: false, message: "Query parameter 'id' is required." },
        { status: 400 }
      );
    }

    const approval = getApproval(approvalId);
    if (!approval) {
      return NextResponse.json(
        { ok: false, message: "Approval record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      approval,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to retrieve approval.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
