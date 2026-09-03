# AgentBuy Commerce Agent

AgentBuy is a merchant-facing AI commerce demo that turns a buyer request into a structured recommendation flow with policy enforcement, human approval, and a simulated payment checkout.

## What this project proves

- A buyer request can be turned into a product recommendation
- The recommendation is explainable and auditable
- Commerce guardrails prevent unsafe or oversized orders
- Payment is gated behind approval instead of automatic capture
- Merchant value is visible via upsell lift and revenue impact

## Features

- AI buyer prompt and product discovery
- Budget-aware recommendation matching
- Contextual upsell selection
- Policy engine with max order and blocker checks
- Human approval before payment
- Razorpay test-mode simulation
- Audit trail for merchant review

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

If port 3000 is occupied, Next.js will choose the next available port automatically.

## Demo flow for a 5-minute video

1. Open the app and enter a buyer request such as:
   "Noise cancelling headphones under ₹25,000 for travel"
2. Click Find Product.
3. Show the reasoning panel and recommended product.
4. Highlight the audit trail and policy checks.
5. Trigger the failure case to show the policy block.
6. Return to a valid case and click Approve & Pay.
7. Show the payment confirmation and explain that this is a bounded commerce flow, not an unguarded AI action.

## Strongest company-message angle

This is not just a chatbot. It is a bounded AI commerce workflow:

- buyer input → structured product match
- catalog search → product and upsell selection
- policy engine → merchant-safe approvals
- human approval → controlled payment path
- audit trail → explainable decision record

## Verification

Run these before submitting or demoing:

```bash
npm run lint
npm run build
```

Both should pass before recording the final proof video.

## Repo story for interviews or submission

"The hardest problem was not building the UI, it was making the AI behave like a merchant-safe decision engine instead of a generic chatbot. The solution adds explicit guardrails, an approval gate, and a transparent audit trail so the system is explainable and safe for commerce."

This is the narrative that makes the project feel company-grade instead of demo-only.
