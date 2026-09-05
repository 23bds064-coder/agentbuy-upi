"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  CreditCard,
  LayoutDashboard,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import type { Recommendation } from "@/app/lib/agentbuy";
import type { ApprovalRecord } from "@/app/lib/approval";
import type { AuditEvent, MerchantMetrics } from "@/app/lib/audit";

const DEFAULT_QUERY = "Noise cancelling headphones under ₹25,000 for travel";

const SAMPLE_QUERIES = [
  {
    label: "🎧 Noise cancelling travel headphones",
    query: "Noise cancelling headphones under ₹25,000 for travel",
  },
  {
    label: "⌚ Fitness smart watch",
    query: "Smart watch for fitness and running under ₹15,000",
  },
  {
    label: "💼 Desk workspace accessories",
    query: "Travel and desk accessories for laptop under ₹5,000",
  },
  {
    label: "⚠️ Policy failure test case",
    query: "Blocked transaction demo: cart total ₹42,000",
  },
];

type PaymentState = "idle" | "pending" | "successful" | "failed";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"flow" | "dashboard">("flow");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [includeUpsell, setIncludeUpsell] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Approval and Payment States
  const [approvalRecord, setApprovalRecord] = useState<ApprovalRecord | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [securityBlockMessage, setSecurityBlockMessage] = useState<string>("");
  const [isTestingBlock, setIsTestingBlock] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Active Session and Audit Events
  const [sessionId, setSessionId] = useState<string>(() => `sess_${Date.now()}`);
  const [sessionAuditEvents, setSessionAuditEvents] = useState<AuditEvent[]>([]);
  const [merchantMetrics, setMerchantMetrics] = useState<MerchantMetrics | null>(null);
  const [allAuditLogs, setAllAuditLogs] = useState<AuditEvent[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>("ALL");
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  // Razorpay test checkout state
  const [razorpayOrder, setRazorpayOrder] = useState<{
    id: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null>(null);

  const [simulatedPayment, setSimulatedPayment] = useState<{
    paymentId: string;
    signature: string;
  } | null>(null);

  const [paymentResult, setPaymentResult] = useState<{
    paymentId?: string;
    orderId?: string;
    approvalId?: string;
    amount?: number;
    message?: string;
    auditEvent?: string;
    failureReason?: string;
  } | null>(null);

  // Fetch live merchant metrics and audit logs
  const refreshMetricsAndLogs = async () => {
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      if (data.ok) {
        setMerchantMetrics(data.metrics);
        setAllAuditLogs(data.events || []);
      }
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch("/api/audit")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.ok) {
          setMerchantMetrics(data.metrics);
          setAllAuditLogs(data.events || []);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const activeCartItems = useMemo(() => {
    if (!recommendation) return [];
    return includeUpsell
      ? [recommendation.selectedProduct, recommendation.upsell]
      : [recommendation.selectedProduct];
  }, [recommendation, includeUpsell]);

  const baseCartValue = recommendation ? recommendation.selectedProduct.price : 0;
  const activeUpsellValue = recommendation && includeUpsell ? recommendation.upsell.price : 0;
  const finalCartValue = baseCartValue + activeUpsellValue;
  const cartUplift =
    baseCartValue > 0 && includeUpsell && recommendation
      ? Number(((recommendation.upsell.price / baseCartValue) * 100).toFixed(1))
      : 0;

  // Active or selected transaction breakdown for AI Commerce Performance section
  const activePerfTxn = useMemo(() => {
    if (selectedTxnId && merchantMetrics?.recentTransactions) {
      const found = merchantMetrics.recentTransactions.find((t) => t.id === selectedTxnId);
      if (found) {
        return {
          id: found.id,
          item: found.item,
          amount: found.amount,
          baseCart: found.baseCart ?? found.amount,
          upsellValue: found.upsellValue ?? 0,
          finalCart: found.finalCart ?? found.amount,
          upliftPercent: found.upliftPercent ?? 0,
          isLive: false,
        };
      }
    }
    if (recommendation) {
      return {
        id: "active_session",
        item: `${recommendation.selectedProduct.name}${includeUpsell ? ` + ${recommendation.upsell.name}` : ""}`,
        amount: finalCartValue,
        baseCart: baseCartValue,
        upsellValue: activeUpsellValue,
        finalCart: finalCartValue,
        upliftPercent: cartUplift,
        isLive: true,
      };
    }
    if (merchantMetrics?.recentTransactions && merchantMetrics.recentTransactions.length > 0) {
      const first = merchantMetrics.recentTransactions[0];
      return {
        id: first.id,
        item: first.item,
        amount: first.amount,
        baseCart: first.baseCart ?? 24900,
        upsellValue: first.upsellValue ?? 1499,
        finalCart: first.finalCart ?? 26399,
        upliftPercent: first.upliftPercent ?? 6.0,
        isLive: false,
      };
    }
    return {
      id: "demo_default",
      item: "AirPods Pro + Protective Silicone Case",
      amount: 26399,
      baseCart: 24900,
      upsellValue: 1499,
      finalCart: 26399,
      upliftPercent: 6.0,
      isLive: false,
    };
  }, [
    selectedTxnId,
    merchantMetrics,
    recommendation,
    includeUpsell,
    finalCartValue,
    baseCartValue,
    activeUpsellValue,
    cartUplift,
  ]);

  // Dynamic policy evaluation
  const policyCheck = useMemo(() => {
    if (!recommendation) return { ok: true, violations: [] as string[] };
    const violations: string[] = [];
    const maxOrder = recommendation.policy.maxOrderValue;
    const maxUpsell = recommendation.policy.maxUpsellValue;

    if (finalCartValue > maxOrder) {
      violations.push(
        `Order total ₹${finalCartValue.toLocaleString("en-IN")} exceeds the ₹${maxOrder.toLocaleString("en-IN")} policy cap.`
      );
    }

    if (recommendation.selectedProduct.stock <= 0) {
      violations.push(`${recommendation.selectedProduct.name} is out of stock.`);
    }

    if (includeUpsell && recommendation.upsell) {
      if (recommendation.upsell.id !== "policy-demo-accessory" && recommendation.upsell.price > maxUpsell) {
        violations.push(
          `${recommendation.upsell.name} exceeds the ₹${maxUpsell.toLocaleString("en-IN")} upsell cap.`
        );
      }
      if (recommendation.upsell.stock <= 0) {
        violations.push(`${recommendation.upsell.name} is out of stock.`);
      }
    }

    return {
      ok: violations.length === 0,
      violations,
    };
  }, [recommendation, includeUpsell, finalCartValue]);

  const failedPolicy = recommendation && !policyCheck.ok;

  const runRecommendation = async (nextQuery: string) => {
    setIsLoading(true);
    setErrorMessage("");
    setApprovalRecord(null);
    setPaymentState("idle");
    setPaymentResult(null);
    setSecurityBlockMessage("");
    setIncludeUpsell(true);
    setIsCheckoutModalOpen(false);

    const nextSessionId = `sess_${crypto.randomUUID()}`;
    setSessionId(nextSessionId);

    try {
      const response = await fetch("/api/agent/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery, sessionId: nextSessionId }),
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.message || "Unable to build recommendation");
      }

      setRecommendation(result.recommendation);
      setSessionAuditEvents(result.auditEvents || []);
      refreshMetricsAndLogs();
    } catch (error) {
      setRecommendation(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to process request");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Security Verification: Attempt to create payment WITHOUT prior server approval.
   * Proves the backend strictly enforces the human approval gate (HTTP 403).
   */
  const handleTestPaymentWithoutApproval = async () => {
    setIsTestingBlock(true);
    setSecurityBlockMessage("");

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: finalCartValue,
          // Intentionally omitting approvalId
        }),
      });

      const data = await response.json();
      if (response.status === 403 || !data.ok) {
        setSecurityBlockMessage(
          `🛡️ Gate Enforced (HTTP ${response.status}): ${data.message || "Payment rejected. Human approval required."}`
        );
      } else {
        setSecurityBlockMessage("Unexpected: Payment was created without approval.");
      }
    } catch {
      setSecurityBlockMessage("🛡️ Gate Enforced: Payment creation rejected without human approval.");
    } finally {
      setIsTestingBlock(false);
    }
  };

  /**
   * Human Approval Action:
   * Step 1: User explicitly approves -> records server-verifiable ApprovalRecord & USER_APPROVED event.
   * Step 2: Creates Razorpay test order & PAYMENT_CREATED event.
   * Step 3: Opens Razorpay Test Checkout modal.
   */
  const handleApproveAndPay = async () => {
    if (!recommendation || failedPolicy) return;

    setIsApproving(true);
    setSecurityBlockMessage("");
    setPaymentState("pending");
    setPaymentResult(null);

    try {
      // Step 1: Record explicit human approval on the server
      const cartItemsPayload = activeCartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: 1,
        price: item.price,
        category: item.category,
        isUpsell: item.id === recommendation.upsell.id,
      }));

      const approvalResponse = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: cartItemsPayload,
          total: finalCartValue,
          paymentMode: "razorpay_test",
          approvedBy: "human_buyer_session",
          sessionId,
        }),
      });

      const approvalData = await approvalResponse.json();
      if (!approvalData.ok) {
        throw new Error(approvalData.message || "Approval rejected by server policy engine.");
      }

      const approval: ApprovalRecord = approvalData.approval;
      setApprovalRecord(approval);

      // Add USER_APPROVED event to active session timeline
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const userApprovedEvent: AuditEvent = {
        id: `evt_${Date.now()}`,
        timestamp: now.toISOString(),
        timeFormatted: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        eventType: "USER_APPROVED",
        sessionId,
        approvalId: approval.id,
        amount: approval.cart.total,
        status: "SUCCESS",
        summary: "User approved",
        explanation: `Buyer explicitly approved purchase of ${approval.cart.items.map((i) => i.name).join(" + ")} (Total: ₹${approval.cart.total.toLocaleString("en-IN")})`,
      };

      setSessionAuditEvents((prev) => [...prev, userApprovedEvent]);

      // Step 2: Create Razorpay Test Order on the server using verified approvalId
      const paymentResponse = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: approval.id,
          total: finalCartValue,
          paymentMode: "razorpay_test",
          sessionId,
        }),
      });

      const paymentData = await paymentResponse.json();
      if (!paymentData.ok) {
        throw new Error(paymentData.message || "Failed to create Razorpay test order.");
      }

      // Add PAYMENT_CREATED event to active session timeline
      const paymentCreatedEvent: AuditEvent = {
        id: `evt_${Date.now() + 1}`,
        timestamp: new Date().toISOString(),
        timeFormatted: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        eventType: "PAYMENT_CREATED",
        sessionId,
        orderId: paymentData.order.id,
        approvalId: approval.id,
        amount: approval.cart.total,
        status: "PENDING",
        summary: "Payment created",
        explanation: `Razorpay test-mode order ${paymentData.order.id} created on server for ₹${approval.cart.total.toLocaleString("en-IN")}.`,
      };

      setSessionAuditEvents((prev) => [...prev, paymentCreatedEvent]);

      setRazorpayOrder({
        id: paymentData.order.id,
        amount: paymentData.order.amount,
        currency: paymentData.order.currency,
        keyId: paymentData.keyId,
      });

      setSimulatedPayment(paymentData.simulatedPayment);
      setIsCheckoutModalOpen(true);
      refreshMetricsAndLogs();
    } catch (error) {
      setPaymentState("failed");
      setPaymentResult({
        failureReason: error instanceof Error ? error.message : "Approval or payment creation failed",
      });
    } finally {
      setIsApproving(false);
    }
  };

  /**
   * Razorpay Checkout Simulation: Complete Test Payment (Success)
   * Sends authentic HMAC-SHA256 signature to /api/payment/verify for server-side verification.
   */
  const handleSimulatePaymentSuccess = async () => {
    if (!razorpayOrder || !simulatedPayment || !approvalRecord) return;

    setPaymentState("pending");
    setIsCheckoutModalOpen(false);

    try {
      const verifyResponse = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: razorpayOrder.id,
          razorpay_payment_id: simulatedPayment.paymentId,
          razorpay_signature: simulatedPayment.signature,
          approvalId: approvalRecord.id,
          sessionId,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyData.ok) {
        throw new Error(verifyData.message || "Signature verification failed.");
      }

      // Also finalize the order record with audit trail
      await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendation: {
            ...recommendation,
            total: finalCartValue,
            uplift: cartUplift,
          },
          payment: {
            id: verifyData.paymentId,
            amount: finalCartValue,
            mode: "razorpay_test",
          },
          approvalId: approvalRecord.id,
          query,
        }),
      });

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");

      const paymentSuccessEvent: AuditEvent = {
        id: `evt_${Date.now()}`,
        timestamp: now.toISOString(),
        timeFormatted: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        eventType: "PAYMENT_SUCCESS",
        sessionId,
        paymentId: verifyData.paymentId,
        orderId: razorpayOrder.id,
        approvalId: approvalRecord.id,
        amount: finalCartValue,
        status: "SUCCESS",
        summary: "Payment successful",
        explanation: `Razorpay HMAC-SHA256 signature verified. Test payment ${verifyData.paymentId} captured for ₹${finalCartValue.toLocaleString("en-IN")}.`,
      };

      const orderCreatedEvent: AuditEvent = {
        id: `evt_${Date.now() + 1}`,
        timestamp: now.toISOString(),
        timeFormatted: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        eventType: "ORDER_CREATED",
        sessionId,
        orderId: razorpayOrder.id,
        paymentId: verifyData.paymentId,
        approvalId: approvalRecord.id,
        amount: finalCartValue,
        status: "SUCCESS",
        summary: "Order created",
        explanation: `AgentBuy order finalized for merchant fulfillment. (Total: ₹${finalCartValue.toLocaleString("en-IN")}).`,
      };

      setSessionAuditEvents((prev) => [...prev, paymentSuccessEvent, orderCreatedEvent]);
      setPaymentState("successful");
      setPaymentResult({
        paymentId: verifyData.paymentId,
        orderId: verifyData.orderId,
        approvalId: approvalRecord.id,
        amount: finalCartValue,
        message: verifyData.message || "Payment verified successfully in Razorpay test mode.",
        auditEvent: verifyData.auditEvent,
      });

      refreshMetricsAndLogs();
    } catch (error) {
      setPaymentState("failed");
      setPaymentResult({
        failureReason: error instanceof Error ? error.message : "Payment verification failed",
      });
    }
  };

  /**
   * Razorpay Checkout Simulation: Simulate Failure (Card declined / Cancelled)
   * Gracefully handles failure, updates transaction status in store, and logs audit event.
   */
  const handleSimulatePaymentFailure = async (reason = "Bank declined test authorization") => {
    if (!razorpayOrder || !approvalRecord) return;

    setPaymentState("pending");
    setIsCheckoutModalOpen(false);

    try {
      const failResponse = await fetch("/api/payment/failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: razorpayOrder.id,
          error_code: "BAD_REQUEST_ERROR",
          error_description: reason,
          approvalId: approvalRecord.id,
          sessionId,
        }),
      });

      const failData = await failResponse.json();

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");

      const paymentFailedEvent: AuditEvent = {
        id: `evt_${Date.now()}`,
        timestamp: now.toISOString(),
        timeFormatted: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        eventType: "PAYMENT_FAILED",
        sessionId,
        orderId: razorpayOrder.id,
        approvalId: approvalRecord.id,
        status: "FAILED",
        summary: "Payment failed",
        explanation: `Payment for order ${razorpayOrder.id} declined: ${reason}.`,
      };

      setSessionAuditEvents((prev) => [...prev, paymentFailedEvent]);
      setPaymentState("failed");
      setPaymentResult({
        orderId: razorpayOrder.id,
        approvalId: approvalRecord.id,
        failureReason: reason,
        message: failData.message || "Test payment was declined or cancelled.",
        auditEvent: failData.auditEvent,
      });

      refreshMetricsAndLogs();
    } catch {
      setPaymentState("failed");
      setPaymentResult({
        failureReason: reason,
      });
    }
  };

  const filteredAuditLogs = useMemo(() => {
    if (auditFilter === "ALL") return allAuditLogs;
    return allAuditLogs.filter((e) => e.eventType === auditFilter);
  }, [allAuditLogs, auditFilter]);

  // ─── helpers ──────────────────────────────────────────────
  const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtPlus = (n: number) => `+₹${n.toLocaleString("en-IN")}`;

  // ─── Audit event type → colour ────────────────────────────
  const evtColor = (status?: string) => {
    if (status === "SUCCESS") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    if (status === "BLOCKED" || status === "FAILED") return "bg-red-50 text-red-600 ring-1 ring-red-200";
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  };

  const evtDot = (status?: string) => {
    if (status === "SUCCESS") return "bg-emerald-500";
    if (status === "BLOCKED" || status === "FAILED") return "bg-red-500";
    return "bg-amber-500";
  };

  return (
    <main className="min-h-screen bg-[#100d0a] text-[#f3eadb]" style={{ fontFamily: "Inter, Geist, Arial, sans-serif" }}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:py-8">

        {/* ── App Shell Card ───────────────────────────────── */}
        <div className="overflow-hidden rounded-3xl border border-[#2d241d] bg-[#f5efe7] text-[#17120e] shadow-[0_32px_80px_rgba(0,0,0,0.35)]">

          {/* ── Header ──────────────────────────────────────── */}
          <header className="border-b border-[#e7dcc9] px-6 py-5 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Brand */}
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#17120e] text-[#d1a96d]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#17120e] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#d1a96d]">
                      Track 01
                    </span>
                    <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d5b12] sm:inline">
                      AI Growth &amp; Agentic Commerce
                    </span>
                  </div>
                  <h1 className="mt-0.5 text-2xl font-black leading-none tracking-tight text-[#17120e]">
                    AgentBuy
                  </h1>
                </div>
              </div>

              {/* Tab switcher */}
              <nav className="flex items-center gap-1 rounded-2xl border border-[#e1d1b6] bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab("flow")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === "flow"
                      ? "bg-[#17120e] text-[#d1a96d] shadow-sm"
                      : "text-[#6c5f52] hover:bg-[#f6f1ea] hover:text-[#17120e]"
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  AI Commerce Flow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("dashboard");
                    refreshMetricsAndLogs();
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === "dashboard"
                      ? "bg-[#17120e] text-[#d1a96d] shadow-sm"
                      : "text-[#6c5f52] hover:bg-[#f6f1ea] hover:text-[#17120e]"
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Merchant Dashboard
                </button>
              </nav>
            </div>

            {/* Subtitle */}
            <p className="mt-2 text-[11px] text-[#8d7b6a]">
              Autonomous AI buyer&nbsp;→&nbsp;catalog discovery&nbsp;→&nbsp;policy guardrails&nbsp;→&nbsp;explicit human approval&nbsp;→&nbsp;Razorpay test checkout
            </p>
          </header>

          {/* ════════════════════════════════════════════════ */}
          {/* TAB 1 – AI COMMERCE FLOW                        */}
          {/* ════════════════════════════════════════════════ */}
          {activeTab === "flow" && (
            <div className="space-y-6 px-6 py-6 md:px-8">

              {/* ── Row 1: Buyer input + Policy sidebar ───── */}
              <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

                {/* Buyer Prompt */}
                <section className="rounded-2xl bg-[#140f0d] p-5 text-[#f5efe5] md:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="h-4 w-4 text-[#d1a96d]" />
                      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#c4aa82]">
                        AI Buyer Agent
                      </span>
                    </div>
                    <span className="rounded-full bg-[#271d17] px-2.5 py-0.5 text-[10px] font-semibold text-[#c4aa82]">
                      Natural Language
                    </span>
                  </div>

                  <label className="mb-1.5 block text-xs font-semibold text-[#d8c29f]">
                    What are you looking for?
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[#3c2d23] bg-[#1b1411] px-4 py-3 text-sm leading-6 text-[#f5efe5] outline-none placeholder:text-[#7a6a5a] focus:border-[#d1a96d] focus:ring-1 focus:ring-[#d1a96d]/30 transition"
                    placeholder="e.g. Noise cancelling headphones under ₹25,000 for travel"
                  />

                  {/* Sample queries */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SAMPLE_QUERIES.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => { setQuery(s.query); runRecommendation(s.query); }}
                        className="rounded-lg border border-[#3d3126] bg-[#211a15] px-2.5 py-1.5 text-[11px] font-medium text-[#c4aa82] transition hover:border-[#d1a96d]/40 hover:text-[#d1a96d]"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => runRecommendation(query)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#d1a96d] px-5 py-2.5 text-sm font-bold text-[#17120e] shadow-md shadow-[#d1a96d]/20 transition hover:bg-[#e0bc7d] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#17120e] border-t-transparent" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <Cpu className="h-4 w-4" />
                          Find Product
                        </>
                      )}
                    </button>
                  </div>
                </section>

                {/* Merchant Policy Engine */}
                <aside className="rounded-2xl border border-[#e7dcc9] bg-white p-5">
                  <div className="mb-4 flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#0e6a4d]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6c5f52]">
                      Merchant Policy Engine
                    </span>
                    <span className="ml-auto rounded-full bg-[#f3e6d2] px-2 py-0.5 text-[10px] font-bold text-[#8d5b12]">
                      Deterministic
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { label: "Merchant Catalog", value: "✓ 12 SKUs (AI-readable)", color: "text-[#0e6a4d]" },
                      { label: "Max order value", value: "₹30,000" },
                      { label: "Max upsell value", value: "₹5,000" },
                      { label: "Authorization", value: "Explicit Human Approval", color: "text-[#8d5b12]" },
                      { label: "Payment sandbox", value: "Razorpay Test Mode" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between rounded-xl bg-[#f6f1ea] px-3 py-2.5">
                        <span className="text-[#6c5f52]">{row.label}</span>
                        <strong className={`font-semibold ${row.color ?? "text-[#17120e]"}`}>{row.value}</strong>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-[10px] leading-relaxed text-[#8d7b6a]">
                    * AI cannot authorize payments directly. Payment requires explicit human approval and server-side verification.
                  </p>
                </aside>
              </div>

              {/* ── Loading ──────────────────────────────── */}
              {isLoading && (
                <div className="rounded-2xl border border-[#e7dcc9] bg-white p-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f0e3]">
                      <Cpu className="h-6 w-6 animate-pulse text-[#8d5b12]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#17120e]">AI Buyer Agent Running</h3>
                      <p className="mt-1 text-xs text-[#6c5f52]">
                        Parsing intent → Querying catalog → Evaluating policy guardrails
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["1. parse_intent()", "2. searchProducts()", "3. calculateUpsell()", "4. checkPolicy()"].map((s) => (
                        <span key={s} className="rounded-full bg-[#f6f1ea] px-3 py-1 text-[10px] font-semibold text-[#8d5b12]">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Error ───────────────────────────────── */}
              {errorMessage && !isLoading && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div>
                      <h3 className="text-sm font-bold text-red-700">Workflow Error</h3>
                      <p className="mt-0.5 text-xs text-red-600">{errorMessage}</p>
                      <button
                        type="button"
                        onClick={() => runRecommendation(query)}
                        className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        Retry Workflow
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Empty state ─────────────────────────── */}
              {!recommendation && !isLoading && !errorMessage && (
                <div className="rounded-2xl border border-dashed border-[#d7c7b2] bg-[#fbf8f3] px-8 py-12">
                  <div className="mx-auto max-w-xl text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ede2cf] text-[#8d5b12]">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-[#17120e]">Ready for Buyer Request</h3>
                    <p className="mt-1 text-xs text-[#6c5f52]">
                      Type a shopping request above or select a sample query to test catalog discovery, policy guardrails, and human-approved checkout.
                    </p>
                    <p className="mt-4 text-[11px] text-[#8d7b6a]">
                      Journey:&nbsp;
                      <span className="font-semibold text-[#8d5b12]">Request → Recommendation → Upsell → Policy → Approval → Payment → Order → Audit</span>
                    </p>
                  </div>
                </div>
              )}

              {/* ── Results ─────────────────────────────── */}
              {recommendation && !isLoading && (
                <div className="space-y-6 fade-in">

                  {/* ─ AI Decision Explanations ──────────── */}
                  <section className="rounded-2xl border border-[#e7dcc9] bg-white p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-[#efe5d5] p-1.5 text-[#8d5b12]">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[#17120e]">AI Decision Explanations</h2>
                          <p className="text-[10px] text-[#6c5f52]">Observable catalog attributes &amp; policy rules — no hidden chain-of-thought</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#f3e6d2] px-2.5 py-1 text-[10px] font-bold text-[#8d5b12]">
                        Auditable &amp; Grounded
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Product Card */}
                      <div className="rounded-xl border border-[#ebdcc8] bg-[#fbf8f3] p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#8d5b12] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                            <Tag className="h-2.5 w-2.5" /> PRODUCT
                          </span>
                          <span className="text-[10px] font-semibold text-[#8d5b12]">In-stock match</span>
                        </div>
                        <p className="truncate text-xs font-bold text-[#17120e]">{recommendation.selectedProduct.name}</p>
                        <p className="mt-2 border-l-2 border-[#d1a96d] pl-2.5 text-[11px] leading-relaxed text-[#42382f]">
                          {recommendation.conciseExplanations?.productSelection ||
                            `Selected because it matches the '${recommendation.selectedProduct.category}' category, is within the ${fmtINR(recommendation.budget || 25000)} budget, and is in stock (${recommendation.selectedProduct.stock} units).`}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1 text-[10px]">
                          <span className="rounded bg-[#efe5d5] px-1.5 py-0.5 text-[#8d5b12]">{recommendation.selectedProduct.category}</span>
                          <span className="rounded bg-[#efe5d5] px-1.5 py-0.5 text-[#8d5b12]">≤{fmtINR(recommendation.budget || 25000)}</span>
                          <span className="rounded bg-[#efe5d5] px-1.5 py-0.5 text-[#8d5b12]">{recommendation.selectedProduct.stock} units</span>
                        </div>
                      </div>

                      {/* Upsell Card */}
                      <div className="rounded-xl border border-[#c5edd8] bg-[#f4faf6] p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#0e6a4d] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                            <TrendingUp className="h-2.5 w-2.5" /> UPSELL
                          </span>
                          <span className="text-[10px] font-semibold text-[#0e6a4d]">
                            {includeUpsell ? "Included" : "Removed"}
                          </span>
                        </div>
                        <p className="truncate text-xs font-bold text-[#17120e]">{recommendation.upsell.name}</p>
                        <p className="mt-2 border-l-2 border-[#0e6a4d] pl-2.5 text-[11px] leading-relaxed text-[#42382f]">
                          {recommendation.conciseExplanations?.upsell ||
                            `Recommended because it complements ${recommendation.selectedProduct.name} and fits the ${fmtINR(recommendation.policy.maxUpsellValue)} upsell limit.`}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1 text-[10px]">
                          <span className="rounded bg-[#eafaf2] px-1.5 py-0.5 text-[#0e6a4d]">+{fmtINR(recommendation.upsell.price)}</span>
                          <span className="rounded bg-[#eafaf2] px-1.5 py-0.5 text-[#0e6a4d]">≤{fmtINR(recommendation.policy.maxUpsellValue)}</span>
                          <span className="rounded bg-[#eafaf2] px-1.5 py-0.5 text-[#0e6a4d]">{recommendation.upsell.stock} in stock</span>
                        </div>
                      </div>

                      {/* Policy Card */}
                      <div className={`rounded-xl p-4 ${policyCheck.ok ? "border border-[#c5edd8] bg-[#f4faf6]" : "border-2 border-red-200 bg-red-50"}`}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white ${policyCheck.ok ? "bg-[#0e6a4d]" : "bg-red-600"}`}>
                            {policyCheck.ok ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldAlert className="h-2.5 w-2.5" />}
                            POLICY
                          </span>
                          <span className={`text-[10px] font-bold ${policyCheck.ok ? "text-[#0e6a4d]" : "text-red-600"}`}>
                            {policyCheck.ok ? "✓ ALLOWED" : "✕ BLOCKED"}
                          </span>
                        </div>
                        <p className={`text-xs font-bold ${policyCheck.ok ? "text-[#17120e]" : "text-red-700"}`}>
                          {policyCheck.ok ? "Guardrails passed" : "Transaction blocked"}
                        </p>
                        <p className={`mt-2 border-l-2 pl-2.5 text-[11px] leading-relaxed ${policyCheck.ok ? "border-[#0e6a4d] text-[#42382f]" : "border-red-400 text-red-700"}`}>
                          {policyCheck.ok
                            ? `Allowed because the cart (${fmtINR(finalCartValue)}) is below the ${fmtINR(recommendation.policy.maxOrderValue)} limit and all items are in stock.`
                            : finalCartValue > recommendation.policy.maxOrderValue
                              ? `Blocked because the cart (${fmtINR(finalCartValue)}) exceeds the ${fmtINR(recommendation.policy.maxOrderValue)} limit.`
                              : `Blocked: ${policyCheck.violations.join("; ")}.`}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1 text-[10px]">
                          <span className={`rounded px-1.5 py-0.5 ${policyCheck.ok ? "bg-[#eafaf2] text-[#0e6a4d]" : "bg-red-100 text-red-600"}`}>
                            Cart: {fmtINR(finalCartValue)}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 ${policyCheck.ok ? "bg-[#eafaf2] text-[#0e6a4d]" : "bg-red-100 text-red-600"}`}>
                            Limit: {fmtINR(recommendation.policy.maxOrderValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ─ Policy Block Alert ────────────────── */}
                  {failedPolicy && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                      <div className="flex items-center gap-2.5 text-red-700">
                        <ShieldAlert className="h-5 w-5" />
                        <h3 className="text-sm font-black tracking-wide">TRANSACTION BLOCKED</h3>
                      </div>
                      <div className="mt-4 space-y-1 text-sm font-semibold text-red-800">
                        <p>Cart total: {fmtINR(finalCartValue)}</p>
                        <p>Maximum allowed: {fmtINR(recommendation.policy.maxOrderValue)}</p>
                      </div>
                      <div className="mt-4 space-y-2 text-xs font-semibold">
                        <p className="flex items-center gap-2 text-emerald-700"><Check className="h-4 w-4" /> Product verified</p>
                        <p className="flex items-center gap-2 text-emerald-700"><Check className="h-4 w-4" /> Stock verified</p>
                        <p className="flex items-center gap-2 text-red-700"><X className="h-4 w-4" /> Order limit exceeded</p>
                        <p className="flex items-center gap-2 text-red-700"><Lock className="h-4 w-4" /> Payment blocked</p>
                      </div>
                      <ul className="mt-2.5 space-y-1">
                        {policyCheck.violations.map((v) => (
                          <li key={v} className="flex items-center gap-2 text-xs text-red-600">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                            {v}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setIncludeUpsell(false)}
                        className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-800"
                      >
                        Modify Cart
                      </button>
                    </div>
                  )}

                  {/* ─ Approval Screen ───────────────────── */}
                  {!failedPolicy && (
                    <section className="rounded-2xl border-2 border-[#17120e] bg-white p-5 md:p-6">
                      {/* Approval header */}
                      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[#ebdcc8] pb-5">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-[#8d5b12] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                              Human Approval Gate
                            </span>
                            <span className="rounded-full bg-[#eafaf2] px-2.5 py-0.5 text-[10px] font-bold text-[#0e6a4d] ring-1 ring-[#c5edd8]">
                              Server-verifiable
                            </span>
                          </div>
                          <h2 className="mt-1.5 text-xl font-black tracking-tight text-[#17120e] md:text-2xl">
                            Review &amp; Approve Order
                          </h2>
                          <p className="mt-0.5 text-xs text-[#6c5f52]">
                            Verify purchase line items and policy checks, then authorize test payment creation.
                          </p>
                        </div>
                        <div className="rounded-xl border border-[#ebdcc8] bg-[#fbf8f3] px-3.5 py-2 text-right">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8d5b12]">Authorization</p>
                          <p className="mt-0.5 text-xs font-bold text-[#17120e]">
                            {approvalRecord ? "✓ Server Approved" : "⚠ Awaiting Human Action"}
                          </p>
                        </div>
                      </div>

                      {/* Items table */}
                      <div className="overflow-hidden rounded-xl border border-[#ebdcc8]">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-[#ebdcc8] bg-[#f9f5ee]">
                            <tr>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Product</th>
                              <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Type</th>
                              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#736353]">Qty</th>
                              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#736353]">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f0e6d8]">
                            {/* Primary */}
                            <tr className="bg-white">
                              <td className="px-4 py-3.5">
                                <p className="font-bold text-[#17120e]">{recommendation.selectedProduct.name}</p>
                                <p className="text-[10px] text-[#736353]">SKU: {recommendation.selectedProduct.id} · {recommendation.selectedProduct.category}</p>
                              </td>
                              <td className="px-3 py-3.5">
                                <span className="rounded-full bg-[#f3e6d2] px-2 py-0.5 text-[10px] font-bold text-[#8d5b12]">Primary</span>
                              </td>
                              <td className="px-3 py-3.5 text-center font-bold text-[#17120e]">1</td>
                              <td className="px-4 py-3.5 text-right font-bold text-[#17120e]">{fmtINR(recommendation.selectedProduct.price)}</td>
                            </tr>
                            {/* Upsell */}
                            {recommendation.upsell && (
                              <tr className={includeUpsell ? "bg-[#faf7f2]" : "bg-[#fcfbf9] opacity-50"}>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-[#17120e]">{recommendation.upsell.name}</p>
                                    <span className="rounded bg-[#efe5d5] px-1.5 py-0.5 text-[9px] font-bold text-[#8d5b12]">AI UPSELL</span>
                                  </div>
                                  <p className="text-[10px] text-[#736353]">SKU: {recommendation.upsell.id} · {recommendation.upsellReasoning}</p>
                                </td>
                                <td className="px-3 py-3.5">
                                  <span className="rounded-full bg-[#eafaf2] px-2 py-0.5 text-[10px] font-bold text-[#0e6a4d]">Add-on</span>
                                </td>
                                <td className="px-3 py-3.5 text-center font-bold text-[#17120e]">{includeUpsell ? 1 : 0}</td>
                                <td className="px-4 py-3.5 text-right">
                                  <span className="font-bold text-[#17120e]">{fmtINR(recommendation.upsell.price)}</span>
                                  <div className="mt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setIncludeUpsell(!includeUpsell)}
                                      className="text-[10px] font-semibold text-[#8d5b12] underline underline-offset-2 hover:text-[#b47a25]"
                                    >
                                      {includeUpsell ? "Remove" : "Add back"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Financial totals */}
                      <div className="mt-4 rounded-xl bg-[#f7f2ea] p-4">
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between text-[#6c5f52]">
                            <span>Primary product</span>
                            <span className="font-semibold text-[#17120e]">{fmtINR(baseCartValue)}</span>
                          </div>
                          <div className="flex justify-between text-[#6c5f52]">
                            <span>AI upsell item</span>
                            <span className="font-semibold text-[#17120e]">
                              {includeUpsell ? fmtPlus(activeUpsellValue) : "Excluded (₹0)"}
                            </span>
                          </div>
                          <div className="flex justify-between text-[#6c5f52]">
                            <span>Delivery &amp; taxes</span>
                            <span className="font-semibold text-[#0e6a4d]">₹0 (Sandbox)</span>
                          </div>
                          <div className="flex items-baseline justify-between border-t border-[#e2d5c3] pt-2.5">
                            <span className="text-sm font-bold text-[#17120e]">Total Payable</span>
                            <span className="text-2xl font-black tracking-tight text-[#17120e]">{fmtINR(finalCartValue)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Policy checklist */}
                      <div className="mt-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8d5b12]">Policy Verification</p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {[
                            { label: `Within spending limit (${fmtINR(recommendation.policy.maxOrderValue)})`, ok: true },
                            { label: "Products verified", ok: true },
                            { label: "Stock verified", ok: true },
                            { label: includeUpsell ? `Upsell within limit (${fmtINR(recommendation.policy.maxUpsellValue)})` : "No upsell selected", ok: true },
                            { label: "Human approval required", ok: null },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-semibold ${
                                item.ok === null
                                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                  : "bg-[#eafaf2] text-[#0e6a4d] ring-1 ring-[#c5edd8]"
                              }`}
                            >
                              {item.ok === null ? <Lock className="h-3.5 w-3.5 shrink-0" /> : <Check className="h-3.5 w-3.5 shrink-0" />}
                              {item.label}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment mode */}
                      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#ebdcc8] bg-[#fbf8f3] px-4 py-3 text-xs">
                        <CreditCard className="h-4 w-4 text-[#8d5b12]" />
                        <span className="font-semibold text-[#17120e]">Payment Mode:</span>
                        <span className="rounded bg-[#17120e] px-2 py-0.5 font-mono text-[10px] font-bold text-[#d1a96d]">
                          Razorpay Test Mode
                        </span>
                        <span className="ml-auto text-[#6c5f52]">
                          Sandbox only · <strong>No real money</strong> · Server-gated
                        </span>
                      </div>

                      {/* Security block message */}
                      {securityBlockMessage && (
                        <div className="mt-3 rounded-xl border border-[#c5edd8] bg-[#eafaf2] px-4 py-3 text-xs font-semibold text-[#0e6a4d]">
                          {securityBlockMessage}
                        </div>
                      )}

                      {/* Payment states */}
                      {paymentState === "pending" && (
                        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                          Payment pending — communicating with Razorpay test server…
                        </div>
                      )}

                      {paymentState === "successful" && paymentResult && (
                        <div className="mt-4 rounded-xl border-2 border-[#148a5d] bg-[#edfdf5] p-4">
                          <div className="flex items-center gap-2.5 text-[#0e6a4d]">
                            <CheckCircle2 className="h-5 w-5" />
                            <div>
                              <h4 className="text-sm font-bold">Payment Successful — Razorpay Test Mode</h4>
                              <p className="text-[10px] text-[#148a5d]">Server-verified approval &amp; HMAC-SHA256 signature confirmed. No real money charged.</p>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-1 rounded-lg bg-white p-3 font-mono text-[10px] text-[#2d241d] sm:grid-cols-2">
                            <p>Payment ID: <strong className="text-[#0e6a4d]">{paymentResult.paymentId}</strong></p>
                            <p>Order ID: <strong>{paymentResult.orderId}</strong></p>
                            <p>Approval ID: <strong className="text-[#8d5b12]">{paymentResult.approvalId}</strong></p>
                            <p>Amount: <strong>{fmtINR(paymentResult.amount ?? 0)}</strong></p>
                          </div>
                        </div>
                      )}

                      {paymentState === "failed" && (
                        <div className="mt-4 rounded-xl border-2 border-red-400 bg-red-50 p-4">
                          <div className="flex items-center gap-2.5 text-red-700">
                            <XCircle className="h-5 w-5" />
                            <div>
                              <h4 className="text-sm font-bold">Payment Failed</h4>
                              <p className="text-[10px] text-red-600">
                                {paymentResult?.failureReason || "Test authorization was declined."}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleApproveAndPay}
                            className="mt-3 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                          >
                            Retry Approval &amp; Payment
                          </button>
                        </div>
                      )}

                      {/* Primary + secondary action buttons */}
                      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleApproveAndPay}
                          disabled={isApproving || paymentState === "pending"}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#17120e] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#17120e]/20 transition hover:bg-[#271d18] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isApproving ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Recording Approval &amp; Creating Order…
                            </>
                          ) : paymentState === "successful" ? (
                            "✓ Approved &amp; Paid (Test Mode)"
                          ) : (
                            "Approve &amp; Pay (Test Mode)"
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleTestPaymentWithoutApproval}
                          disabled={isTestingBlock || paymentState === "pending"}
                          className="rounded-xl border border-[#d8c7b0] bg-white px-4 py-3.5 text-xs font-semibold text-[#6c5f52] transition hover:bg-[#faf5ec] disabled:opacity-50"
                          title="Proves the backend rejects payments when approval has not been recorded"
                        >
                          {isTestingBlock ? "Testing Security…" : "Test: Pay Without Approval"}
                        </button>
                      </div>
                    </section>
                  )}

                  {/* ─ Audit Timeline (active session) ───── */}
                  <section className="rounded-2xl border border-[#e7dcc9] bg-white p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-[#8d5b12]" />
                        <div>
                          <h2 className="text-sm font-bold text-[#17120e]">Transaction Audit Trail</h2>
                          <p className="text-[10px] text-[#6c5f52]">Every action is explainable, bounded, and gated · Zero-secret logging</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#17120e] px-2.5 py-1 font-mono text-[10px] text-[#d7b778]">
                        {sessionAuditEvents.length} events
                      </span>
                    </div>

                    {sessionAuditEvents.length === 0 ? (
                      <div className="rounded-xl bg-[#fbf8f3] p-5 text-center text-xs text-[#6c5f52]">
                        No events recorded yet for this session.
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[#e7dcc9]" />
                        <div className="space-y-3 pl-9">
                          {sessionAuditEvents.map((evt, idx) => (
                            <div key={evt.id || idx} className="relative fade-in">
                              {/* Dot */}
                              <div className={`absolute -left-[25px] top-2 h-3 w-3 rounded-full border-2 border-white shadow-sm ${evtDot(evt.status)}`} />
                              <div className="rounded-xl border border-[#ebdcc8] bg-[#fbf8f3] px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold text-[#8d5b12]">{evt.timeFormatted}</span>
                                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${evtColor(evt.status)}`}>
                                    {evt.eventType}
                                  </span>
                                  <span className="text-xs font-semibold text-[#17120e]">{evt.summary}</span>
                                </div>
                                {evt.explanation && (
                                  <p className="mt-1 text-[11px] text-[#6c5f52]">{evt.explanation}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* TAB 2 – MERCHANT DASHBOARD                      */}
          {/* ════════════════════════════════════════════════ */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 px-6 py-6 fade-in md:px-8">

              {/* Dashboard banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#140f0d] px-6 py-5 text-[#f5efe5]">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#d1a96d]">
                    <BarChart3 className="h-4 w-4" />
                    Merchant Operations &amp; Growth
                  </div>
                  <h2 className="mt-1 text-xl font-black tracking-tight md:text-2xl">AI Commerce Executive Dashboard</h2>
                  <p className="mt-0.5 text-xs text-[#bca98c]">
                    Revenue impact, bounded controls, and auditable event provenance.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-[#271d17] px-3.5 py-2 text-xs text-[#d1a96d] ring-1 ring-[#48362a]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Simulated / Test Mode Metrics
                </div>
              </div>

              {/* ── KPI Grid ─────────────────────────────── */}
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Total AI-Assisted Orders",
                    value: merchantMetrics ? String(merchantMetrics.totalOrders) : "5",
                    sub: "Human approved before capture",
                    accent: "text-[#0e6a4d]",
                    bar: "bg-[#0e6a4d]",
                  },
                  {
                    label: "Average Cart Value",
                    value: merchantMetrics ? fmtINR(merchantMetrics.averageCartValue) : "₹27,399",
                    sub: "Driven by contextual upselling",
                    accent: "text-[#8d5b12]",
                    bar: "bg-[#d1a96d]",
                  },
                  {
                    label: "Base Cart GMV",
                    value: merchantMetrics ? fmtINR(merchantMetrics.totalBaseValue) : "₹1,24,500",
                    sub: "Primary recommendations",
                    accent: "text-[#17120e]",
                    bar: "bg-[#17120e]",
                  },
                  {
                    label: "AI Upsell Revenue",
                    value: merchantMetrics ? `+${fmtINR(merchantMetrics.totalUpsellValue)}` : "+₹12,495",
                    sub: "Incremental margin lift",
                    accent: "text-[#0e6a4d]",
                    bar: "bg-[#0e6a4d]",
                  },
                  {
                    label: "Cart Value Uplift",
                    value: merchantMetrics ? `+${merchantMetrics.cartValueUpliftPercent}%` : "+10.0%",
                    sub: "Higher basket average",
                    accent: "text-[#8d5b12]",
                    bar: "bg-[#d1a96d]",
                  },
                  {
                    label: "Successful Payments",
                    value: merchantMetrics ? String(merchantMetrics.successfulPayments) : "5",
                    sub: "Razorpay test-verified",
                    accent: "text-[#0e6a4d]",
                    bar: "bg-[#0e6a4d]",
                  },
                  {
                    label: "Blocked Transactions",
                    value: merchantMetrics ? String(merchantMetrics.blockedTransactions) : "1",
                    sub: "Halted by merchant policies",
                    accent: "text-red-600",
                    bar: "bg-red-400",
                  },
                  {
                    label: "Active Guardrails",
                    value: "5",
                    sub: "Enforced independently of AI",
                    accent: "text-[#0e6a4d]",
                    bar: "bg-[#148a5d]",
                  },
                ].map((m) => (
                  <div key={m.label} className="relative overflow-hidden rounded-2xl border border-[#e7dcc9] bg-white p-5 shadow-sm">
                    {/* Left accent bar */}
                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${m.bar}`} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6c5f52]">{m.label}</p>
                    <p className={`mt-2 text-2xl font-black tracking-tight ${m.accent}`}>{m.value}</p>
                    <p className="mt-1 text-[10px] text-[#8d7b6a]">{m.sub}</p>
                  </div>
                ))}
              </section>

              {/* ── AI Commerce Performance ──────────────── */}
              <section className="rounded-2xl border border-[#e7dcc9] bg-white p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <TrendingUp className="h-4 w-4 text-[#8d5b12]" />
                  <div>
                    <h3 className="text-sm font-bold text-[#17120e]">AI Commerce Performance — Basket Analysis</h3>
                    <p className="text-[10px] text-[#6c5f52]">Primary item vs autonomous upsell pairing for the active or selected transaction</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Base Cart", value: activePerfTxn.baseCart > 0 ? fmtINR(activePerfTxn.baseCart) : "₹24,900", sub: "User intent match", highlight: false },
                    { label: "AI Upsell", value: activePerfTxn.upsellValue > 0 ? fmtPlus(activePerfTxn.upsellValue) : "+₹2,499", sub: "Complementary item", highlight: false },
                    { label: "Final Cart", value: activePerfTxn.finalCart > 0 ? fmtINR(activePerfTxn.finalCart) : "₹27,399", sub: "Total captured", highlight: false },
                    { label: "Net Uplift", value: activePerfTxn.upliftPercent > 0 ? `+${activePerfTxn.upliftPercent.toFixed(1)}%` : "+10.0%", sub: "Incremental revenue", highlight: true },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl p-4 ${item.highlight ? "bg-[#f3e6d2]" : "bg-[#f7f2eb]"}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6c5f52]">{item.label}</p>
                      <p className={`mt-1.5 text-xl font-black ${item.highlight ? "text-[#8d5b12]" : "text-[#17120e]"}`}>{item.value}</p>
                      <p className="mt-0.5 text-[10px] text-[#8d7b6a]">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Safety & Controls ────────────────────── */}
              <section className="rounded-2xl border border-[#e7dcc9] bg-white p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#0e6a4d]" />
                  <div>
                    <h3 className="text-sm font-bold text-[#17120e]">Safety &amp; Guardrails Architecture</h3>
                    <p className="text-[10px] text-[#6c5f52]">Merchant guardrails execute deterministically on the server — independent of AI</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    "Human approval enforced",
                    "Order limit enforced (₹30,000)",
                    "Upsell limit enforced (₹5,000)",
                    "Stock verified",
                    "Test payment mode",
                  ].map((label) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg bg-[#eafaf2] px-3 py-2.5 text-[11px] font-semibold text-[#0e6a4d] ring-1 ring-[#c5edd8]">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      {label}
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Complete Audit Log ───────────────────── */}
              <section className="rounded-2xl border border-[#e7dcc9] bg-white p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-[#8d5b12]" />
                    <div>
                      <h3 className="text-sm font-bold text-[#17120e]">Complete Transaction Audit Log</h3>
                      <p className="text-[10px] text-[#6c5f52]">Chronological log of every intent, guardrail, approval, and payment event</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#6c5f52]">Filter:</span>
                    <select
                      value={auditFilter}
                      onChange={(e) => setAuditFilter(e.target.value)}
                      className="rounded-lg border border-[#ebdcc8] bg-white px-2.5 py-1 text-xs font-semibold text-[#17120e] outline-none"
                    >
                      <option value="ALL">All Events ({allAuditLogs.length})</option>
                      <option value="POLICY_CHECK">Policy Checks</option>
                      <option value="POLICY_BLOCKED">Policy Blocks</option>
                      <option value="USER_APPROVED">User Approvals</option>
                      <option value="PAYMENT_SUCCESS">Payment Success</option>
                      <option value="PAYMENT_FAILED">Payment Failures</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#ebdcc8]">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="border-b border-[#ebdcc8] bg-[#f9f5ee]">
                      <tr>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Time</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Event</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Status</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Summary</th>
                        <th className="hidden px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#736353] lg:table-cell">Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0e6d8]">
                      {filteredAuditLogs.slice(-15).reverse().map((evt) => (
                        <tr key={evt.id} className="bg-white hover:bg-[#faf7f2] transition-colors">
                          <td className="px-4 py-2.5 font-bold text-[#8d5b12]">{evt.timeFormatted}</td>
                          <td className="px-3 py-2.5">
                            <span className="rounded bg-[#f3e6d2] px-1.5 py-0.5 text-[9px] font-bold text-[#8d5b12]">{evt.eventType}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${evtColor(evt.status)}`}>{evt.status}</span>
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-[#17120e]" style={{ fontFamily: "Inter, sans-serif" }}>{evt.summary}</td>
                          <td className="hidden px-4 py-2.5 text-[#554a40] lg:table-cell">{evt.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── Recent Transactions ──────────────────── */}
              <section className="rounded-2xl border border-[#e7dcc9] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="h-4 w-4 text-[#8d5b12]" />
                    <div>
                      <h3 className="text-sm font-bold text-[#17120e]">Recent Transactions</h3>
                      <p className="text-[10px] text-[#6c5f52]">Merchant sandbox payment ledger</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={refreshMetricsAndLogs}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#8d5b12] transition hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Refresh
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#ebdcc8]">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#ebdcc8] bg-[#f9f5ee]">
                      <tr>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Transaction ID</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Items</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Mode</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#736353]">Status</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#736353]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0e6d8]">
                      {merchantMetrics?.recentTransactions.slice(0, 6).map((txn) => (
                        <tr key={txn.id} className="cursor-pointer bg-white transition-colors hover:bg-[#faf7f2]"
                          onClick={() => setSelectedTxnId(txn.id)}>
                          <td className="px-4 py-3 font-mono text-[10px] font-bold text-[#17120e]">{txn.id}</td>
                          <td className="px-4 py-3 font-medium text-[#2d241d]">{txn.item}</td>
                          <td className="px-3 py-3 text-[#6c5f52]">{txn.paymentMode}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              txn.status === "Successful" ? "bg-[#eafaf2] text-[#0e6a4d] ring-1 ring-[#c5edd8]"
                              : txn.status === "Failed" ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                              : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#17120e]">{fmtINR(txn.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* ── Razorpay Test Checkout Modal ─────────────────── */}
      {isCheckoutModalOpen && razorpayOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#ebdcc8] bg-white text-[#17120e] shadow-2xl fade-in">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[#ebdcc8] bg-[#0c2340] px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2b84ea] text-xs font-bold">R</div>
                <div>
                  <h3 className="text-sm font-bold">Razorpay Checkout</h3>
                  <span className="rounded bg-[#ffeed0] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#925f0e]">
                    Test Mode (Sandbox)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5">
              <div className="flex items-center justify-between border-b border-[#f0e6d8] pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#736353]">Amount to Pay</p>
                  <p className="mt-1 text-2xl font-black text-[#17120e]">{fmtINR(finalCartValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#736353]">Order ID</p>
                  <p className="mt-1 font-mono text-[10px] font-bold text-[#0c2340]">{razorpayOrder.id}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8d5b12]">Test Payment Methods</p>
                <div className="flex items-center justify-between rounded-xl border border-[#c5edd8] bg-[#f2fcf7] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0e6a4d] text-[10px] font-bold text-white">UPI</span>
                    <div>
                      <p className="text-xs font-bold text-[#17120e]">UPI Test Simulator</p>
                      <p className="text-[10px] text-[#527966]">success@razorpay</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#c5edd8] px-2 py-0.5 text-[9px] font-bold text-[#0e6a4d]">Ready</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#ebdcc8] bg-[#fbf8f3] p-3">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="h-6 w-6 text-[#8d5b12]" />
                    <div>
                      <p className="text-xs font-bold text-[#17120e]">Test Card</p>
                      <p className="text-[10px] text-[#736353]">4111 1111 1111 1111 (Sandbox)</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#f3e6d2] px-2 py-0.5 text-[9px] font-bold text-[#8d5b12]">Sandbox</span>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
                <p className="font-semibold">⚠ Sandbox Disclaimer</p>
                <p className="mt-0.5 text-[10px]">
                  No real money is debited. This verifies HMAC-SHA256 test signatures and updates the AgentBuy order record.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSimulatePaymentSuccess}
                  className="w-full rounded-xl bg-[#0e6a4d] py-3 text-sm font-bold text-white shadow-md shadow-[#0e6a4d]/20 transition hover:bg-[#12805d]"
                >
                  Complete Test Payment — Simulate Success
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulatePaymentFailure("Simulated card decline in test mode")}
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Simulate Failure (Bank Decline / Cancel)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

