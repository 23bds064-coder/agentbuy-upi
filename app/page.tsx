"use client";

import { useMemo, useState } from "react";
import { Check, ShieldCheck, Sparkles, TrendingUp, X } from "lucide-react";
import type { Product, Recommendation } from "@/app/lib/agentbuy";

const DEFAULT_QUERY = "Noise cancelling headphones under ₹25,000 for travel";

export default function HomePage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("");

  const cartItems = useMemo(() => {
    if (!recommendation) return [];
    return [recommendation.selectedProduct, recommendation.upsell];
  }, [recommendation]);

  const runRecommendation = async (nextQuery: string) => {
    setIsLoading(true);
    setPaymentStatus("");
    setIsApproved(false);

    try {
      const response = await fetch("/api/agent/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery }),
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.message || "Unable to build recommendation");
      }

      setRecommendation(result.recommendation);
    } catch (error) {
      setRecommendation(null);
      setPaymentStatus(error instanceof Error ? error.message : "Unable to process request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!recommendation) return;

    try {
      const policyResponse = await fetch("/api/policy/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          total: recommendation.total,
          selectedProduct: recommendation.selectedProduct,
          upsell: recommendation.upsell,
        }),
      });

      const policyResult = await policyResponse.json();
      if (!policyResult.ok) {
        setPaymentStatus(policyResult.message || "Policy block: approval denied.");
        return;
      }

      const paymentResponse = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: cartItems,
          total: recommendation.total,
          paymentMode: "razorpay_test",
        }),
      });

      const paymentResult = await paymentResponse.json();
      if (!paymentResult.ok) {
        throw new Error(paymentResult.message || "Payment initialization failed");
      }

      const orderResponse = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendation,
          payment: paymentResult.payment,
          query,
        }),
      });

      const orderResult = await orderResponse.json();
      if (!orderResult.ok) {
        throw new Error(orderResult.message || "Order creation failed");
      }

      setIsApproved(true);
      setPaymentStatus(orderResult.message || "Payment successful in Razorpay test mode.");
    } catch (error) {
      setPaymentStatus(error instanceof Error ? error.message : "Unable to approve payment.");
    }
  };

  const failedPolicy = recommendation && !recommendation.policy.ok;

  return (
    <main className="min-h-screen bg-[#120d09] text-[#f3eadb]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-12">
        <div className="rounded-[30px] border border-[#2d241d] bg-[#f5efe7] p-4 text-[#17120e] shadow-[0_20px_60px_rgba(0,0,0,0.2)] md:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] bg-[#140f0d] p-6 text-[#f5efe5] shadow-xl shadow-black/20 md:p-7">
              <div className="mb-5 flex items-center gap-3 text-[#d7b778]">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.2em]">AI Buyer</span>
              </div>

              <label className="mb-2 block text-sm font-medium text-[#d8c29f]">What are you looking for?</label>
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-28 w-full resize-none rounded-2xl border border-[#3c2d23] bg-[#1b1411] px-4 py-3 text-lg leading-7 text-[#f5efe5] outline-none placeholder:text-[#bca98c]"
                placeholder="Describe the product or need..."
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => runRecommendation(query)}
                  disabled={isLoading}
                  className="rounded-2xl bg-[#d1a96d] px-5 py-3 text-base font-bold text-[#17120e] shadow-lg shadow-[#d1a96d]/20 transition hover:bg-[#e0bc7d] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? "Finding product..." : "Find Product"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const failureQuery = "Travel headphones under ₹50,000";
                    setQuery(failureQuery);
                    runRecommendation(failureQuery);
                  }}
                  className="rounded-2xl border border-[#3d3126] bg-[#211a15] px-5 py-3 text-base font-semibold text-[#f4ebdf] transition hover:bg-[#2a211a]"
                >
                  Try failure case
                </button>
              </div>
            </section>

            <aside className="rounded-[28px] border border-[#e7dcc9] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3 text-[#17120e]">
                <ShieldCheck className="h-5 w-5 text-[#148a5d]" />
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6c5f52]">Policy engine</span>
              </div>

              <div className="space-y-3 text-sm text-[#2d241d]">
                <div className="flex items-center justify-between rounded-2xl bg-[#f6f1ea] px-3 py-2">
                  <span>Max order value</span>
                  <strong>₹30,000</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#f6f1ea] px-3 py-2">
                  <span>Max upsell value</span>
                  <strong>₹5,000</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#f6f1ea] px-3 py-2">
                  <span>Payment authorization</span>
                  <strong className="text-[#8d5b12]">Human approval</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#f6f1ea] px-3 py-2">
                  <span>Allowed payment mode</span>
                  <strong>Razorpay test</strong>
                </div>
              </div>
            </aside>
          </div>

          {recommendation ? (
            <div className="mt-8 space-y-6">
              <section className="rounded-[28px] border border-[#e7dcc9] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 text-[#17120e]">
                  <div className="rounded-xl bg-[#efe5d5] p-2 text-[#8d5b12]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Agent reasoning</h2>
                </div>

                <div className="mt-5 space-y-3">
                  {recommendation.reasoning.map((step) => (
                    <div key={step} className="flex items-start gap-3 rounded-2xl bg-[#f7f2eb] px-4 py-3 text-sm text-[#312922]">
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dff6eb] text-[#148a5d]">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                {!failedPolicy ? (
                  <div className="mt-6 rounded-[24px] bg-gradient-to-br from-[#eafaf2] to-[#f6efec] p-5 ring-1 ring-[#e1d1b6]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8d5b12]">Best match</p>
                        <h3 className="mt-2 text-3xl font-black text-[#17120e]">{recommendation.selectedProduct.name}</h3>
                        <p className="mt-1 text-xl font-bold text-[#5d3d0b]">₹{recommendation.selectedProduct.price.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm ring-1 ring-[#eadbc8]">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#6c5f52]">Travel fit</p>
                        <p className="mt-1 text-lg font-bold text-[#148a5d]">High</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-[#f1c9c9] bg-[#fff1f1] p-5">
                    <div className="flex items-center gap-3 text-[#b42f2f]">
                      <X className="h-5 w-5" />
                      <h3 className="text-xl font-bold">Policy blocked</h3>
                    </div>
                    <p className="mt-3 text-sm text-[#8a2d2d]">
                      The agent cannot proceed because the cart exceeds the maximum order value or violates the bounded commerce policy.
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-[#8a2d2d]">
                      {recommendation.policy.violations.map((violation) => (
                        <li key={violation}>• {violation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {!failedPolicy && (
                <section className="rounded-[28px] border border-[#e7dcc9] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold text-[#17120e]">Cart + approval</h2>
                    <span className="rounded-full bg-[#f3e6d2] px-3 py-1 text-sm font-semibold text-[#8d5b12]">AI policy check</span>
                  </div>

                  <div className="mt-6 space-y-3">
                    {cartItems.map((item: Product) => (
                      <div key={item.id} className="flex items-center justify-between rounded-2xl bg-[#f7f2eb] px-4 py-3">
                        <div>
                          <p className="font-bold text-[#17120e]">{item.name}</p>
                          <p className="text-xs uppercase tracking-[0.14em] text-[#6c5f52]">{item.category}</p>
                        </div>
                        <span className="text-lg font-bold text-[#17120e]">₹{item.price.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#e7dcc9] pt-4">
                    <span className="text-base font-semibold text-[#534b43]">Total</span>
                    <span className="text-3xl font-black text-[#17120e]">₹{recommendation.total.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="mt-6 space-y-2 rounded-2xl bg-[#eafaf2] p-4 text-sm text-[#0e6a4d]">
                    <p>✓ Under spending limit</p>
                    <p>✓ Products in stock</p>
                    <p>✓ Upsell within limit</p>
                    <p>🔐 Payment requires approval</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproved}
                    className="mt-6 w-full rounded-2xl bg-[#17120e] px-5 py-3 text-base font-bold text-white shadow-lg shadow-[#17120e]/20 transition hover:bg-[#241d1a] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isApproved ? "Approved & Paid" : "Approve & Pay"}
                  </button>
                  {paymentStatus ? (
                    <div className="mt-4 rounded-2xl border border-[#cfeae0] bg-[#edfdf5] px-4 py-3 text-sm font-medium text-[#0e6a4d]">
                      {paymentStatus}
                    </div>
                  ) : null}
                </section>
              )}

              <section className="rounded-[28px] border border-[#e7dcc9] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 text-[#17120e]">
                  <TrendingUp className="h-5 w-5 text-[#8d5b12]" />
                  <h2 className="text-2xl font-bold">Merchant revenue impact</h2>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-[#f7f2eb] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#6c5f52]">Base cart</p>
                    <p className="mt-2 text-2xl font-bold text-[#17120e]">₹{recommendation.selectedProduct.price.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f7f2eb] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#6c5f52]">AI upsell</p>
                    <p className="mt-2 text-2xl font-bold text-[#17120e]">₹{recommendation.upsell.price.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f3e6d2] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8d5b12]">Revenue uplift</p>
                    <p className="mt-2 text-2xl font-bold text-[#8d5b12]">+{recommendation.uplift}%</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-[#e7dcc9] bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3 text-[#17120e]">
                  <ShieldCheck className="h-5 w-5 text-[#148a5d]" />
                  <h2 className="text-2xl font-bold">Agent audit trail</h2>
                </div>

                <div className="rounded-2xl bg-[#17120e] p-4 font-mono text-sm text-[#f5efe5]">
                  {recommendation.auditTrail.map((step, index) => (
                    <div key={`${step}-${index}`} className="flex gap-3 py-1">
                      <span className="text-[#d7b778]">{index + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="mt-8 rounded-[28px] border border-dashed border-[#d7c7b2] bg-[#f8f4ee] p-8 text-center text-[#534b43] shadow-sm">
              No agent decision yet. Start with a purchase request to see the recommended product, upsell, and approval flow.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
