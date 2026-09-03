"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarDays, ChevronRight, CircleDollarSign, TrendingDown } from "lucide-react";
import { loadAppData, type PaymentRecord, type PaymentStatus } from "@/app/lib/agentbuy";

const statusStyles: Record<PaymentStatus, string> = {
  Successful: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Failed: "bg-rose-50 text-rose-700",
};

export default function HistoryPage() {
  const [records] = useState<PaymentRecord[]>(() => loadAppData().payments);
  const [filter, setFilter] = useState<"All" | PaymentStatus>("All");

  const filteredRecords =
    filter === "All" ? records : records.filter((record) => record.status === filter);

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
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Payments</p>
              <h1 className="text-2xl font-bold">History</h1>
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
            {records.length} total
          </div>
        </header>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <CircleDollarSign className="h-4 w-4 text-violet-600" />
              This month
            </div>
            <div className="text-xl font-bold text-slate-900">
              ₹{records.reduce((total, record) => total + record.amount, 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {(["All", "Successful", "Pending", "Failed"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-xl px-2 py-2 font-medium ${
                  filter === option ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              No payment records for this filter.
            </div>
          ) : (
            filteredRecords.map((record) => (
              <article key={record.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{record.merchant}</h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(record.date).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[record.status]}`}>
                    {record.status}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Amount</p>
                    <p className="text-2xl font-bold text-slate-900">₹{record.amount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
                    <TrendingDown className="h-4 w-4" />
                    View
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
