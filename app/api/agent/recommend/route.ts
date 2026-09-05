import { NextResponse } from "next/server";
import { buildRecommendation } from "@/app/lib/agentbuy";
import { recordAuditEvent, type AuditEvent } from "@/app/lib/audit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: string;
      customPolicy?: {
        maxOrderValue?: number;
        maxUpsellValue?: number;
        requireHumanApproval?: boolean;
      };
      sessionId?: string;
    };
    const query = (body.query ?? "Noise cancelling headphones under ₹25,000 for travel").trim();

    if (!query) {
      return NextResponse.json({ ok: false, message: "A buyer request is required." }, { status: 400 });
    }

    const sessionId = body.sessionId || `sess_${Date.now()}`;
    const recommendation = buildRecommendation(query, body.customPolicy);

    // Record structured audit trail events for the workflow
    const events: AuditEvent[] = [];

    // 1. REQUEST_RECEIVED
    events.push(
      recordAuditEvent({
        eventType: "REQUEST_RECEIVED",
        sessionId,
        status: "INFO",
        summary: "Request received",
        explanation: `Buyer requested: "${query}"`,
        metadata: {
          query,
          budget: recommendation.budget,
          category: recommendation.constraints?.category,
        },
      })
    );

    // 2. CATALOG_SEARCH
    events.push(
      recordAuditEvent({
        eventType: "CATALOG_SEARCH",
        sessionId,
        status: "INFO",
        summary: "Catalog searched",
        explanation: `Evaluated catalog products matching intent: ${recommendation.matchedProducts.length} candidate(s) found.`,
        metadata: {
          candidateCount: recommendation.matchedProducts.length,
          category: recommendation.constraints?.category,
        },
      })
    );

    // 3. PRODUCT_SELECTED
    events.push(
      recordAuditEvent({
        eventType: "PRODUCT_SELECTED",
        sessionId,
        productIds: [recommendation.selectedProduct.id],
        amount: recommendation.selectedProduct.price,
        status: "SUCCESS",
        summary: "Product selected",
        explanation: recommendation.conciseExplanations?.productSelection || `Selected ${recommendation.selectedProduct.name}`,
        metadata: {
          productId: recommendation.selectedProduct.id,
          productName: recommendation.selectedProduct.name,
          price: recommendation.selectedProduct.price,
          stock: recommendation.selectedProduct.stock,
        },
      })
    );

    // 4. UPSELL_RECOMMENDED
    events.push(
      recordAuditEvent({
        eventType: "UPSELL_RECOMMENDED",
        sessionId,
        productIds: [recommendation.upsell.id],
        amount: recommendation.upsell.price,
        status: "SUCCESS",
        summary: "Upsell recommended",
        explanation: recommendation.conciseExplanations?.upsell || `Recommended complementary ${recommendation.upsell.name}`,
        metadata: {
          upsellId: recommendation.upsell.id,
          upsellName: recommendation.upsell.name,
          price: recommendation.upsell.price,
          upliftPercent: recommendation.uplift,
        },
      })
    );

    // 5. CART_CREATED
    events.push(
      recordAuditEvent({
        eventType: "CART_CREATED",
        sessionId,
        productIds: [recommendation.selectedProduct.id, recommendation.upsell.id],
        amount: recommendation.total,
        status: "INFO",
        summary: "Cart created",
        explanation: `Assembled 2-item cart. Subtotal: ₹${recommendation.baseTotal.toLocaleString("en-IN")}, Total: ₹${recommendation.total.toLocaleString("en-IN")}`,
        metadata: {
          subtotal: recommendation.baseTotal,
          upsellPrice: recommendation.upsellTotal,
          total: recommendation.total,
        },
      })
    );

    // 6. POLICY_CHECK or POLICY_BLOCKED
    if (recommendation.policy.ok) {
      events.push(
        recordAuditEvent({
          eventType: "POLICY_CHECK",
          sessionId,
          amount: recommendation.total,
          policyResult: { passed: true },
          status: "SUCCESS",
          summary: "Policy passed",
          explanation: recommendation.conciseExplanations?.policy || "Order is within spending limits and all products are in stock.",
          metadata: {
            maxOrderValue: recommendation.policy.maxOrderValue,
            maxUpsellValue: recommendation.policy.maxUpsellValue,
          },
        })
      );
    } else {
      events.push(
        recordAuditEvent({
          eventType: "POLICY_BLOCKED",
          sessionId,
          amount: recommendation.total,
          policyResult: { passed: false, violations: recommendation.policy.violations },
          status: "BLOCKED",
          summary: "Policy blocked",
          explanation: recommendation.conciseExplanations?.policy || recommendation.policy.violations[0],
          metadata: {
            violations: recommendation.policy.violations,
            maxOrderValue: recommendation.policy.maxOrderValue,
          },
        })
      );
    }

    return NextResponse.json({
      ok: true,
      sessionId,
      recommendation,
      auditEvents: events,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to generate an agent recommendation.",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 400 }
    );
  }
}
