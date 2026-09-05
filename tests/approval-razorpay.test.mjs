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

// Import modules via jiti to resolve TypeScript & paths
const { recordApproval, getApproval, verifyAndConsumeApproval } = jiti("./app/lib/approval.ts");
const { createRazorpayTestOrder, verifyRazorpaySignature, generateTestSignature } = jiti("./app/lib/razorpay.ts");

console.log("\n=======================================================");
console.log("  AGENTBUY HUMAN APPROVAL & RAZORPAY TEST MODE TESTS  ");
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
// TEST 1: Payment Attempted Without Approval -> Blocked
// ----------------------------------------------------
test("1. Payment attempted without approval is blocked by server gate", () => {
  const result = verifyAndConsumeApproval("", 24900);
  assert.strictEqual(result.valid, false, "Expected valid to be false");
  assert.match(
    result.error,
    /Human approval required/i,
    "Expected error explaining human approval is required"
  );
});

// ----------------------------------------------------
// TEST 2: Payment Attempted With Fake/Nonexistent Approval -> Blocked
// ----------------------------------------------------
test("2. Payment attempted with fake/invalid approval ID is blocked", () => {
  const result = verifyAndConsumeApproval("appr_fake_unauthorized_token_12345", 24900);
  assert.strictEqual(result.valid, false, "Expected valid to be false");
  assert.match(
    result.error,
    /Approval record not found/i,
    "Expected error indicating approval record does not exist"
  );
});

// ----------------------------------------------------
// TEST 3: Create Server Approval State
// ----------------------------------------------------
let approvedRecord = null;
test("3. Explicit human approval creates a server-verifiable approval state", () => {
  const approvalRes = recordApproval({
    cart: [
      {
        id: "airpods-pro",
        name: "AirPods Pro",
        price: 24900,
        quantity: 1,
        category: "audio",
        isUpsell: false,
      },
      {
        id: "laptop-stand",
        name: "Laptop Stand",
        price: 2499,
        quantity: 1,
        category: "accessory",
        isUpsell: true,
      },
    ],
    total: 27399,
    paymentMode: "razorpay_test",
    approvedBy: "test_operator",
  });

  assert.strictEqual(approvalRes.ok, true, "Approval should be ok");
  assert.ok(approvalRes.approval, "Approval record should be generated");
  assert.ok(approvalRes.approval.id.startsWith("appr_"), "ID should start with appr_");
  assert.strictEqual(approvalRes.approval.status, "approved", "Status should be approved");
  assert.strictEqual(approvalRes.approval.cart.total, 27399, "Total should match 27399");

  // Verify policy checks
  const checks = approvalRes.approval.policyChecks;
  assert.strictEqual(checks.withinSpendingLimit, true, "Within spending limit");
  assert.strictEqual(checks.productsVerified, true, "Products verified");
  assert.strictEqual(checks.stockVerified, true, "Stock verified");
  assert.strictEqual(checks.upsellWithinLimit, true, "Upsell within limit");
  assert.strictEqual(checks.humanApprovalRequired, true, "Human approval required");

  approvedRecord = approvalRes.approval;

  // Retrieve from server registry
  const fetched = getApproval(approvedRecord.id);
  assert.ok(fetched, "Should fetch approval from server registry");
  assert.strictEqual(fetched.id, approvedRecord.id, "Fetched ID matches");
});

// ----------------------------------------------------
// TEST 4: Payment After Approval -> Allowed & Creates Order
// ----------------------------------------------------
let createdOrder = null;
test("4. Payment after explicit human approval is allowed and creates Razorpay test order", () => {
  assert.ok(approvedRecord, "Requires previous approval record");

  const verifyResult = verifyAndConsumeApproval(approvedRecord.id, 27399);
  assert.strictEqual(verifyResult.valid, true, "Should be valid after approval");
  assert.strictEqual(verifyResult.approval.status, "consumed", "Status should transition to consumed");

  // Server-side Razorpay test order creation
  createdOrder = createRazorpayTestOrder({
    amountInRupees: verifyResult.approval.cart.total,
    receipt: `rcpt_${approvedRecord.id}`,
    notes: {
      approvalId: approvedRecord.id,
    },
  });

  assert.ok(createdOrder.id.startsWith("order_test_"), "Order ID should start with order_test_");
  assert.strictEqual(createdOrder.amount, 2739900, "Amount in paise should be 27399 * 100");
  assert.strictEqual(createdOrder.currency, "INR", "Currency should be INR");
  assert.strictEqual(createdOrder.status, "created", "Order status should be created");
});

// ----------------------------------------------------
// TEST 5: Replay / Double-Spend Prevention
// ----------------------------------------------------
test("5. Replaying an already-consumed approval is blocked", () => {
  assert.ok(approvedRecord, "Requires previous approval record");

  const replayResult = verifyAndConsumeApproval(approvedRecord.id, 27399);
  assert.strictEqual(replayResult.valid, false, "Replay should be rejected");
  assert.match(
    replayResult.error,
    /already been consumed/i,
    "Expected error stating approval was already consumed"
  );
});

// ----------------------------------------------------
// TEST 6: Razorpay Test Signature Verification -> Authentic Allowed
// ----------------------------------------------------
test("6. Razorpay HMAC-SHA256 signature verification validates authentic test payment", () => {
  const orderId = createdOrder.id;
  const paymentId = `pay_test_${Date.now()}`;
  const authenticSignature = generateTestSignature(orderId, paymentId);

  const isValid = verifyRazorpaySignature({
    orderId,
    paymentId,
    signature: authenticSignature,
  });

  assert.strictEqual(isValid, true, "Authentic signature must be verified as true");
});

// ----------------------------------------------------
// TEST 7: Razorpay Forged Signature -> Blocked
// ----------------------------------------------------
test("7. Forged or tampered Razorpay signature is rejected by server", () => {
  const orderId = createdOrder.id;
  const paymentId = `pay_test_${Date.now()}`;
  const forgedSignature = "0000000000000000000000000000000000000000000000000000000000000000";

  const isValid = verifyRazorpaySignature({
    orderId,
    paymentId,
    signature: forgedSignature,
  });

  assert.strictEqual(isValid, false, "Forged signature must be rejected");
});

// ----------------------------------------------------
// TEST 8: Policy Cap Violation Rejection
// ----------------------------------------------------
test("8. Policy violation (cart exceeding spending cap) is rejected by approval engine", () => {
  const overLimitApproval = recordApproval({
    cart: [
      {
        id: "sony-wh-1000xm5",
        name: "Sony WH-1000XM5",
        price: 29990,
        quantity: 1,
      },
      {
        id: "airpods-pro",
        name: "AirPods Pro",
        price: 24900,
        quantity: 1,
      },
    ],
    total: 54890, // Exceeds ₹30,000 policy cap
  });

  assert.strictEqual(overLimitApproval.ok, false, "Should be rejected");
  assert.ok(overLimitApproval.violations.length > 0, "Should have violations listed");
  assert.match(
    overLimitApproval.violations[0],
    /exceeds the policy spending limit/i,
    "Violation should cite spending limit"
  );
});

// ----------------------------------------------------
// TEST 9: HTTP Route POST /api/payment/create without approval -> 403 Forbidden
// ----------------------------------------------------
const { POST: paymentCreateRoute } = jiti("./app/api/payment/create/route.ts");
const { POST: approvalRoute } = jiti("./app/api/approval/route.ts");
const { POST: paymentVerifyRoute } = jiti("./app/api/payment/verify/route.ts");
const { POST: paymentFailureRoute } = jiti("./app/api/payment/failure/route.ts");

test("9. HTTP POST /api/payment/create returns 403 when approvalId is omitted", async () => {
  const req = new Request("http://localhost:3000/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ total: 24900 }),
  });
  const res = await paymentCreateRoute(req);
  assert.strictEqual(res.status, 403, "Expected 403 Forbidden");
  const data = await res.json();
  assert.strictEqual(data.ok, false);
  assert.strictEqual(data.error, "HUMAN_APPROVAL_REQUIRED");
});

// ----------------------------------------------------
// TEST 10: End-to-End HTTP Route Flow: Approval -> Payment Create -> Verify
// ----------------------------------------------------
test("10. Full HTTP route flow: POST /api/approval -> POST /api/payment/create -> POST /api/payment/verify", async () => {
  // Step A: Approval API
  const apprReq = new Request("http://localhost:3000/api/approval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart: [
        {
          id: "airpods-pro",
          name: "AirPods Pro",
          price: 24900,
          quantity: 1,
          category: "audio",
        },
      ],
      total: 24900,
      paymentMode: "razorpay_test",
    }),
  });
  const apprRes = await approvalRoute(apprReq);
  assert.strictEqual(apprRes.status, 200);
  const apprData = await apprRes.json();
  assert.strictEqual(apprData.ok, true);
  const approvalId = apprData.approval.id;

  // Step B: Payment Create API with approvalId
  const payReq = new Request("http://localhost:3000/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      approvalId,
      total: 24900,
    }),
  });
  const payRes = await paymentCreateRoute(payReq);
  assert.strictEqual(payRes.status, 200);
  const payData = await payRes.json();
  assert.strictEqual(payData.ok, true);
  assert.ok(payData.order.id.startsWith("order_test_"));

  // Step C: Payment Verify API with authentic signature
  const testOrderId = payData.order.id;
  const testPayId = payData.simulatedPayment.paymentId;
  const testSig = payData.simulatedPayment.signature;

  const verifyReq = new Request("http://localhost:3000/api/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPayId,
      razorpay_signature: testSig,
      approvalId,
    }),
  });
  const verifyRes = await paymentVerifyRoute(verifyReq);
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.ok, true);
  assert.strictEqual(verifyData.status, "Successful");
});

// ----------------------------------------------------
// TEST 11: HTTP Route POST /api/payment/failure gracefully handles and stores failure
// ----------------------------------------------------
test("11. HTTP POST /api/payment/failure stores Failed status and audit event", async () => {
  const failReq = new Request("http://localhost:3000/api/payment/failure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: "order_test_failed_example_123",
      error_code: "BAD_REQUEST_ERROR",
      error_description: "Payment declined by issuing bank simulator",
    }),
  });
  const failRes = await paymentFailureRoute(failReq);
  assert.strictEqual(failRes.status, 200);
  const failData = await failRes.json();
  assert.strictEqual(failData.ok, true);
  assert.strictEqual(failData.status, "Failed");
  assert.match(failData.auditEvent, /RAZORPAY TEST PAYMENT FAILED/i);
});

console.log("\n-------------------------------------------------------");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("-------------------------------------------------------\n");

if (failed > 0) {
  process.exit(1);
}
