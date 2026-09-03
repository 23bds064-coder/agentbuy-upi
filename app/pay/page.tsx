"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronRight, CreditCard, QrCode, Send, ShieldCheck, Wallet2 } from "lucide-react";
import { loadAppData } from "@/app/lib/agentbuy";

const actions = [
  { label: "Scan QR", icon: QrCode, tone: "bg-sky-100 text-sky-700" },
  { label: "Send", icon: Send, tone: "bg-violet-100 text-violet-700" },
  { label: "Pay", icon: Wallet2, tone: "bg-emerald-100 text-emerald-700" },
  { label: "History", icon: CreditCard, tone: "bg-amber-100 text-amber-700" },
];

export default function PayPage() {
  const [balance, setBalance] = useState(() => loadAppData().balance);
  const amount = 89999;
  const [method, setMethod] = useState<"UPI" | "Other">("UPI");
  const [status, setStatus] = useState<string>("");
  const [isPaying, setIsPaying] = useState(false);

  const handlePay = async () => {
    setIsPaying(true);
    setStatus("");

    try {
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: "iPhone 17 Pro", amount, method }),
      });

      const result = await response.json();
      if (result.ok) {
        setBalance(result.balance);
        setStatus("Payment completed in sandbox mode via Razorpay test flow.");
      } else {
        setStatus(result.message || "Payment failed.");
      }
    } catch {
      setStatus("Unable to complete payment. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-24 pt-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">UPI</p>
              <h1 className="text-2xl font-bold">Pay</h1>
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
            ₹{balance.toLocaleString("en-IN")}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3">
          {actions.map(({ label, icon: Icon, tone }) => (
            <Link
              key={label}
              href={label === "History" ? "/history" : "/pay"}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">{label}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Order</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Secure
            </span>
          </div>

          <div className="mt-5 space-y-1">
            <p className="text-sm text-slate-500">Item</p>
            <h2 className="text-2xl font-bold text-slate-900">iPhone 17 Pro</h2>
          </div>

          <div className="mt-6 flex items-end justify-between border-t border-slate-200 pt-4">
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-3xl font-bold text-slate-900">₹{amount.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
              Agent match
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Payment method</p>
            <span className="flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700">
              <ShieldCheck className="h-3 w-3" />
              Test mode
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 p-3">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment-method"
                  checked={method === "UPI"}
                  onChange={() => setMethod("UPI")}
                  className="h-5 w-5 accent-violet-600"
                />
                <span className="font-semibold text-slate-800">UPI</span>
              </div>
              <span className="text-xs font-medium text-violet-700">user@upi</span>
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 p-3 text-slate-600">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment-method"
                  checked={method === "Other"}
                  onChange={() => setMethod("Other")}
                  className="h-5 w-5 accent-violet-600"
                />
                <span className="font-medium">Other</span>
              </div>
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">UPI ID</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">user@upi</p>
          </div>

          {status ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {status}
            </div>
          ) : null}

          <button
            onClick={handlePay}
            disabled={isPaying}
            className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-slate-300/40 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPaying ? "Processing..." : `Pay ₹${amount.toLocaleString("en-IN")}`}
          </button>
        </section>
      </div>
    </main>
  );
}
