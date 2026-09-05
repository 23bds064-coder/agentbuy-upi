import assert from "node:assert";
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const jiti = createJiti(rootDir, {
  alias: {
    "@": rootDir,
  },
});

const {
  recordAuditEvent,
  getAuditTrail,
  getMerchantMetrics,
} = jiti("./app/lib/audit.ts");

const { buildRecommendation } = jiti("./app/lib/agentbuy.ts");
const { GET: getAuditRoute } = jiti("./app/api/audit/route.ts");

console.log("\n=======================================================");
console.log("  AGENTBUY TRANSACTION AUDIT TRAIL & METRICS TESTS    ");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

// ----------------------------------------------------
// TEST 1: Record Required Audit Event Types with Non-Sensitive Metadata
// ----------------------------------------------------
test("1. Audit engine records required lifecycle events with formatted timestamps", () => {
  const testSession = `sess_test_${Date.now()}`;

  const event = recordAuditEvent({
    eventType: "REQUEST_RECEIVED",
    sessionId: testSession,
    status: "INFO",
    summary: "Request received",
    explanation: "Buyer requested: 'Noise cancelling headphones under ₹25,000 for travel'",
    metadata: {
      query: "Noise cancelling headphones under ₹25,000 for travel",
      budget: 25000,
    },
  });

  assert.ok(event.id.startsWith("evt_"), "Event ID should start with evt_");
  assert.strictEqual(event.eventType, "REQUEST_RECEIVED");
  assert.strictEqual(event.status, "INFO");
  assert.ok(event.timestamp, "ISO timestamp must exist");
  assert.match(event.timeFormatted, /^\d{2}:\d{2}:\d{2}$/, "Time formatted as HH:mm:ss");
  assert.strictEqual(event.metadata?.budget, 25000);
});

// ----------------------------------------------------
// TEST 2: Security Sanitization (No secrets, keys, or card credentials stored)
// ----------------------------------------------------
test("2. Security policy sanitizes sensitive data (keys, secrets, card numbers)", () => {
  const sensitiveEvent = recordAuditEvent({
    eventType: "PAYMENT_CREATED",
    orderId: "order_test_sec_check",
    status: "PENDING",
    summary: "Payment created",
    metadata: {
      orderId: "order_test_sec_check",
      apiKey: "secret_api_key_should_not_be_stored",
      cardSecret: "1234-5678-9012-3456",
      authSignature: "hmac_signature_token",
      safeAmount: 24900,
    },
  });

  assert.strictEqual(sensitiveEvent.metadata?.safeAmount, 24900, "Safe data preserved");
  assert.strictEqual(
    sensitiveEvent.metadata?.apiKey,
    "[REDACTED_SECURITY_POLICY]",
    "API Key must be redacted"
  );
  assert.strictEqual(
    sensitiveEvent.metadata?.cardSecret,
    "[REDACTED_SECURITY_POLICY]",
    "Card details must be redacted"
  );
  assert.strictEqual(
    sensitiveEvent.metadata?.authSignature,
    "[REDACTED_SECURITY_POLICY]",
    "Signature token must be redacted"
  );
});

// ----------------------------------------------------
// TEST 3: Chronological Sorting & Retrieval
// ----------------------------------------------------
test("3. Audit trail retrieves events chronologically for a session", () => {
  const sessionId = `sess_chrono_${Date.now()}`;

  recordAuditEvent({
    eventType: "REQUEST_RECEIVED",
    sessionId,
    status: "INFO",
    summary: "Request received",
  });

  recordAuditEvent({
    eventType: "CATALOG_SEARCH",
    sessionId,
    status: "INFO",
    summary: "Catalog searched",
  });

  recordAuditEvent({
    eventType: "PRODUCT_SELECTED",
    sessionId,
    status: "SUCCESS",
    summary: "Product selected",
  });

  const trail = getAuditTrail(sessionId);
  assert.strictEqual(trail.length, 3, "Expected 3 events for session");
  assert.strictEqual(trail[0].eventType, "REQUEST_RECEIVED");
  assert.strictEqual(trail[1].eventType, "CATALOG_SEARCH");
  assert.strictEqual(trail[2].eventType, "PRODUCT_SELECTED");
});

// ----------------------------------------------------
// TEST 4: Concise AI Decision Explanations Grounded in Observable Rules
// ----------------------------------------------------
test("4. Concise AI decision explanations match observable inputs without chain-of-thought", () => {
  const query = "Noise cancelling headphones under ₹25,000 for travel";
  const rec = buildRecommendation(query);

  assert.ok(rec.conciseExplanations, "Concise explanations must exist");

  const productExp = rec.conciseExplanations.productSelection;
  assert.ok(productExp, "Product selection explanation must exist");
  assert.match(productExp, /matches the requested 'audio' category/i, "Must cite category");
  assert.match(productExp, /within the ₹25,000 budget/i, "Must cite budget constraint");
  assert.match(productExp, /in stock \(\d+ units\)/i, "Must cite actual catalog stock");

  const upsellExp = rec.conciseExplanations.upsell;
  assert.ok(upsellExp, "Upsell explanation must exist");
  assert.match(upsellExp, /complements/i, "Must explain complementary pairing");
  assert.match(upsellExp, /₹5,000 upsell limit/i, "Must cite ₹5,000 upsell cap");

  const policyExp = rec.conciseExplanations.policy;
  assert.ok(policyExp, "Policy explanation must exist");
  assert.match(policyExp, /below the ₹30,000 transaction limit/i, "Must cite ₹30,000 cap");

  // Verify no chain-of-thought keywords exist in concise explanations
  const bannedKeywords = /internal reasoning|hidden deliberation|step-by-step thinking|thought process/i;
  assert.strictEqual(bannedKeywords.test(productExp), false, "No chain-of-thought in product explanation");
  assert.strictEqual(bannedKeywords.test(upsellExp), false, "No chain-of-thought in upsell explanation");
  assert.strictEqual(bannedKeywords.test(policyExp), false, "No chain-of-thought in policy explanation");
});

// ----------------------------------------------------
// TEST 5: Policy Block Event Logging
// ----------------------------------------------------
test("5. Policy failure records POLICY_BLOCKED audit event with violation reasons", () => {
  const blockedQuery = "Travel headphones under ₹50,000";
  const rec = buildRecommendation(blockedQuery);

  assert.strictEqual(rec.policy.ok, false, "Policy must fail for ₹50,000");

  const blockEvent = recordAuditEvent({
    eventType: "POLICY_BLOCKED",
    amount: rec.total,
    policyResult: { passed: false, violations: rec.policy.violations },
    status: "BLOCKED",
    summary: "Policy blocked",
    explanation: rec.conciseExplanations?.policy || rec.policy.violations[0],
  });

  assert.strictEqual(blockEvent.eventType, "POLICY_BLOCKED");
  assert.strictEqual(blockEvent.status, "BLOCKED");
  assert.strictEqual(blockEvent.summary, "Policy blocked");
  assert.ok(blockEvent.policyResult?.violations?.length, "Violations must be documented");
});

// ----------------------------------------------------
// TEST 6: Merchant Performance Metrics Calculation
// ----------------------------------------------------
test("6. Merchant dashboard metrics compute accurate business KPIs and safety controls", () => {
  const metrics = getMerchantMetrics();

  assert.strictEqual(typeof metrics.totalOrders, "number", "totalOrders is number");
  assert.strictEqual(typeof metrics.averageCartValue, "number", "averageCartValue is number");
  assert.strictEqual(typeof metrics.totalBaseValue, "number", "totalBaseValue is number");
  assert.strictEqual(typeof metrics.totalUpsellValue, "number", "totalUpsellValue is number");
  assert.strictEqual(typeof metrics.cartValueUpliftPercent, "number", "cartValueUpliftPercent is number");
  assert.strictEqual(typeof metrics.successfulPayments, "number", "successfulPayments is number");
  assert.strictEqual(typeof metrics.blockedTransactions, "number", "blockedTransactions is number");
  assert.ok(Array.isArray(metrics.recentTransactions), "recentTransactions is an array");

  // Verify Safety & Controls section data
  assert.strictEqual(metrics.safetyControls.humanApprovalEnforced, true, "Human approval enforced");
  assert.strictEqual(metrics.safetyControls.orderLimitEnforced, true, "Order limit enforced");
  assert.strictEqual(metrics.safetyControls.maxOrderValue, 30000, "Max order ₹30,000");
  assert.strictEqual(metrics.safetyControls.upsellLimitEnforced, true, "Upsell limit enforced");
  assert.strictEqual(metrics.safetyControls.maxUpsellValue, 5000, "Max upsell ₹5,000");
  assert.strictEqual(metrics.safetyControls.stockVerified, true, "Stock verified");
  assert.strictEqual(metrics.safetyControls.testPaymentMode, true, "Test payment mode");

  // Transparent labeling
  assert.strictEqual(metrics.isDemoMetrics, true, "Must be clearly labeled as demo metrics");
});

// ----------------------------------------------------
// TEST 7: HTTP GET /api/audit Endpoint
// ----------------------------------------------------
test("7. HTTP GET /api/audit returns events and merchant metrics", async () => {
  const req = new Request("http://localhost:3000/api/audit", { method: "GET" });
  const res = await getAuditRoute(req);

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.ok, true);
  assert.ok(Array.isArray(data.events), "events should be returned");
  assert.ok(data.metrics, "metrics should be returned");
  assert.strictEqual(data.metrics.safetyControls.humanApprovalEnforced, true);
});

// ----------------------------------------------------
// TEST 8: Full End-to-End Successful Transaction Audit Sequence
// ----------------------------------------------------
const { POST: recommendRoute } = jiti("./app/api/agent/recommend/route.ts");
const { POST: approvalRoute } = jiti("./app/api/approval/route.ts");
const { POST: paymentCreateRoute } = jiti("./app/api/payment/create/route.ts");
const { POST: paymentVerifyRoute } = jiti("./app/api/payment/verify/route.ts");

test("8. Complete successful transaction records exact required event sequence in chronological order", async () => {
  const e2eSessionId = `sess_e2e_sequence_${Date.now()}`;

  // Step 1: Recommend API (REQUEST_RECEIVED, CATALOG_SEARCH, PRODUCT_SELECTED, UPSELL_RECOMMENDED, CART_CREATED, POLICY_CHECK)
  const recReq = new Request("http://localhost:3000/api/agent/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "AirPods Pro under ₹25,000 for travel",
      sessionId: e2eSessionId,
    }),
  });
  const recRes = await recommendRoute(recReq);
  assert.strictEqual(recRes.status, 200);
  const recData = await recRes.json();
  assert.strictEqual(recData.ok, true);

  // Step 2: Approval API (USER_APPROVED)
  const primary = recData.recommendation.selectedProduct;
  const upsell = recData.recommendation.upsell;
  const total = primary.price + upsell.price;

  const apprReq = new Request("http://localhost:3000/api/approval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart: [
        { id: primary.id, name: primary.name, price: primary.price, category: primary.category },
        { id: upsell.id, name: upsell.name, price: upsell.price, category: upsell.category, isUpsell: true },
      ],
      total,
      paymentMode: "razorpay_test",
      sessionId: e2eSessionId,
    }),
  });
  const apprRes = await approvalRoute(apprReq);
  assert.strictEqual(apprRes.status, 200);
  const apprData = await apprRes.json();
  assert.strictEqual(apprData.ok, true);
  const approvalId = apprData.approval.id;

  // Step 3: Payment Create API (PAYMENT_CREATED)
  const payCreateReq = new Request("http://localhost:3000/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      approvalId,
      total,
      sessionId: e2eSessionId,
    }),
  });
  const payCreateRes = await paymentCreateRoute(payCreateReq);
  assert.strictEqual(payCreateRes.status, 200);
  const payCreateData = await payCreateRes.json();
  assert.strictEqual(payCreateData.ok, true);
  const razorpayOrderId = payCreateData.order.id;
  const simPaymentId = payCreateData.simulatedPayment.paymentId;
  const simSignature = payCreateData.simulatedPayment.signature;

  // Step 4: Payment Verify API (PAYMENT_SUCCESS, ORDER_CREATED)
  const verifyReq = new Request("http://localhost:3000/api/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: simPaymentId,
      razorpay_signature: simSignature,
      approvalId,
      sessionId: e2eSessionId,
    }),
  });
  const verifyRes = await paymentVerifyRoute(verifyReq);
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.ok, true);

  // Step 5: Fetch complete audit trail for this session
  const sessionAuditTrail = getAuditTrail(e2eSessionId);
  assert.strictEqual(sessionAuditTrail.length, 10, "Expected exactly 10 audit events for complete transaction");

  const actualSequence = sessionAuditTrail.map((e) => e.eventType);
  const expectedSequence = [
    "REQUEST_RECEIVED",
    "CATALOG_SEARCH",
    "PRODUCT_SELECTED",
    "UPSELL_RECOMMENDED",
    "CART_CREATED",
    "POLICY_CHECK",
    "USER_APPROVED",
    "PAYMENT_CREATED",
    "PAYMENT_SUCCESS",
    "ORDER_CREATED",
  ];

  assert.deepStrictEqual(
    actualSequence,
    expectedSequence,
    `Audit event sequence mismatch: expected ${expectedSequence.join(" -> ")} but got ${actualSequence.join(" -> ")}`
  );

  // Assert required non-sensitive metadata on every event
  for (const event of sessionAuditTrail) {
    assert.ok(event.id.startsWith("evt_"), "Event must have id");
    assert.ok(event.timestamp, "Event must have timestamp");
    assert.match(event.timeFormatted, /^\d{2}:\d{2}:\d{2}$/, "Event must have formatted time (HH:mm:ss)");
    assert.ok(event.status, "Event must have status");
    assert.ok(event.summary, "Event must have concise summary");
    assert.ok(event.explanation, "Event must have concise explanation");

    // Strictly ensure no secrets or sensitive data exist in metadata
    if (event.metadata) {
      for (const [key, val] of Object.entries(event.metadata)) {
        assert.notStrictEqual(val, "secret", "No raw secrets");
        assert.notStrictEqual(val, "password", "No raw passwords");
        assert.notStrictEqual(val, "token", "No raw tokens");
        assert.notStrictEqual(val, "card", "No raw card numbers");
      }
    }
  }
});

console.log("\n-------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("-------------------------------------------------------\n");

if (failed > 0) {
  process.exit(1);
}
