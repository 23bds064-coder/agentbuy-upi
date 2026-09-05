# AgentBuy

### AI-native commerce agent for merchants

AgentBuy turns natural-language shopping intent into a bounded commerce workflow. It searches a verified merchant catalog, recommends a product, generates a contextual upsell, calculates the cart on the backend, checks deterministic policies, waits for explicit human approval, and records the result in an audit trail.

## Demo

Use this five-minute flow:

1. Enter `I need noise cancelling headphones under ₹25,000 for travel.`
2. Show the catalog-backed recommendation and concise explanation.
3. Show the contextual upsell, cart total, policy checks, and calculated uplift.
4. Approve the transaction and complete the Razorpay test-mode checkout.
5. Show payment verification, order creation, the audit trail, and merchant dashboard.
6. Run the blocked transaction demo and show that the ₹42,000 cart is rejected against the ₹30,000 limit.

## Key Features

- AI buyer intent and product discovery
- AI-readable merchant catalog with structured prices, stock, attributes, and schema
- Catalog-backed product recommendation
- Contextual AI upselling and cart uplift calculation
- Deterministic order and payment policies
- Explicit human approval before the guarded payment flow
- Razorpay test-mode payment simulation and signature verification
- Transaction audit trail with policy and payment events
- Merchant dashboard with order, uplift, and blocked-transaction metrics
- Failure handling for policy blocks, invalid approvals, payment failures, and cancellations

## Architecture

```text
User
  -> AI Agent
  -> Merchant Catalog
  -> Recommendation
  -> Upsell
  -> Backend Cart Calculation
  -> Policy Engine
  -> Human Approval
  -> Razorpay Test Mode
  -> Order
  -> Audit Trail
```

The AI recommends and explains. The backend owns catalog prices, cart totals, policy decisions, approvals, payment creation, and order finalization.

## Safety Controls

- Maximum order value: ₹30,000
- Maximum upsell value: ₹5,000
- Human approval required before the guarded payment flow
- Razorpay test mode only; no real money is charged
- Payment credentials are not stored in application data
- No chain-of-thought is exposed; explanations cite observable catalog and policy facts
- Blocked transactions create no payment order and no order record

## Running Locally

Requirements: Node.js 20 or later.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port 3000 is occupied, Next.js will select another available port.

The test-mode defaults work without credentials. To override them, set the optional variables in `.env.local`:

```text
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_secret
```

Never use production Razorpay credentials for this demo.

## Testing

Run the full regression suite:

```bash
npm test
```

Run static and production checks:

```bash
npm run lint
npm run build
```

The tests cover successful approval and payment flows, signature verification, replay prevention, policy blocks, audit events, deterministic ₹42,000 blocked-cart behavior, and direct payment/order bypass attempts.

## Project Structure

```text
app/
  api/                 Backend catalog, agent, policy, approval, payment, order, and audit routes
  lib/                 Catalog, cart, policy, approval, Razorpay, audit, and storage logic
  page.tsx             Main buyer and merchant demo experience
data/                   Local demo state and audit records
tests/                  Node-based route and domain regression tests
```

## Interview Summary

AgentBuy demonstrates a bounded AI commerce workflow rather than an unguarded chatbot:

```text
buyer intent -> verified catalog -> recommendation -> upsell -> policy decision
-> explicit approval -> test payment -> order -> explainable audit record
```
