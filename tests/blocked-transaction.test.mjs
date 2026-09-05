import assert from "node:assert/strict";
import { createJiti } from "jiti";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(rootDir, { alias: { "@": rootDir } });
const { buildRecommendation } = jiti("./app/lib/agentbuy.ts");
const { recordApproval } = jiti("./app/lib/approval.ts");
const { getAuditTrail } = jiti("./app/lib/audit.ts");
const { POST: paymentRoute } = jiti("./app/api/payment/route.ts");
const { POST: orderRoute } = jiti("./app/api/order/route.ts");

const query = "Blocked transaction demo: cart total ₹42,000";
const sessionId = `blocked_demo_${Date.now()}`;

for (let attempt = 1; attempt <= 3; attempt += 1) {
  const recommendation = buildRecommendation(query);
  assert.equal(recommendation.total, 42000, `attempt ${attempt}: cart total must be deterministic`);
  assert.equal(recommendation.policy.ok, false, `attempt ${attempt}: policy must block`);
  assert.equal(recommendation.selectedProduct.price, 29990);
  assert.equal(recommendation.upsell.price, 12010);
}

const recommendation = buildRecommendation(query);
const approval = recordApproval({
  cart: [
    { id: recommendation.selectedProduct.id, quantity: 1, isUpsell: false },
    { id: recommendation.upsell.id, quantity: 1, isUpsell: true },
  ],
  total: 1,
});
assert.equal(approval.ok, false, "server approval must reject the blocked cart");
assert.match(approval.error, /guardrail|policy/i);

const paymentResponse = await paymentRoute(new Request("http://localhost/api/payment", {
  method: "POST",
  body: JSON.stringify({ item: "blocked demo", amount: 42000, method: "UPI" }),
}));
assert.equal(paymentResponse.status, 403, "legacy payment route must block over-limit payments");
assert.equal((await paymentResponse.json()).error, "POLICY_BLOCKED");

const orderResponse = await orderRoute(new Request("http://localhost/api/order", {
  method: "POST",
  body: JSON.stringify({
    recommendation: {
      selectedProduct: { id: recommendation.selectedProduct.id, price: 1 },
      upsell: { id: recommendation.upsell.id, price: 1 },
    },
    payment: { amount: 1 },
    query,
    sessionId,
  }),
}));
assert.equal(orderResponse.status, 403, "order route must block even forged client totals");
assert.equal((await orderResponse.json()).error, "POLICY_BLOCKED");

const blockedEvents = getAuditTrail(sessionId).filter((event) => event.eventType === "POLICY_BLOCKED");
assert.equal(blockedEvents.length, 1, "blocked order must record exactly one linked POLICY_BLOCKED event");
assert.equal(blockedEvents[0].amount, 42000);

console.log("\n✓ Blocked transaction demo passed 3 deterministic attempts");
console.log("✓ ₹42,000 cart blocked at ₹30,000 with no approval, payment, or order");