"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bell, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { loadAppData, type Notification } from "@/app/lib/agentbuy";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "product" | "local">("all");
  const [notifications] = useState<Notification[]>(() => loadAppData().notifications);

  const visibleNotifications =
    filter === "all" ? notifications : notifications.filter((item) => item.type === filter);

  const primaryAlert = visibleNotifications[0] ?? {
    id: "placeholder",
    title: "Price condition met",
    product: "iPhone 17 Pro",
    price: "₹89,999",
    target: "Target: ₹90,000",
    type: "product",
    createdAt: new Date().toISOString(),
    conditionId: "placeholder",
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
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Alerts</p>
              <h1 className="text-2xl font-bold">Notifications</h1>
            </div>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            {notifications.length} New
          </div>
        </header>

        <div className="flex gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
          {([
            ["all", "All"],
            ["product", "Price"],
            ["local", "Nearby"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`flex-1 rounded-xl px-2 py-2 text-sm font-medium ${
                filter === value ? "bg-slate-900 text-white" : "bg-transparent text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-lg shadow-slate-300/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Bell className="h-4 w-4" />
              AgentBuy
            </div>
            <Sparkles className="h-4 w-4 text-amber-300" />
          </div>
          <div className="mt-6">
            <p className="text-sm text-slate-300">{primaryAlert.title}</p>
            <h2 className="mt-3 text-2xl font-bold">{primaryAlert.product}</h2>
            <p className="mt-2 text-3xl font-bold">{primaryAlert.price}</p>
            <p className="mt-3 text-sm text-slate-300">{primaryAlert.target}</p>
          </div>
          <Link
            href="/pay"
            className="mt-6 inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            View Deal
          </Link>
        </section>

        <section className="space-y-3">
          {visibleNotifications.length === 0 ? (
            <div className="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              No notifications yet. The agent will alert you when a condition matches.
            </div>
          ) : (
            visibleNotifications.map((notification) => (
              <article key={notification.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{notification.title}</p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">{notification.product}</h3>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${notification.type === "product" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {notification.type === "product" ? "Price" : "Local"}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <p className="text-lg font-semibold text-slate-900">{notification.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Info</p>
                    <p className="text-sm font-medium text-slate-800">{notification.target}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Condition met
                  </div>
                  <Link href="/pay" className="font-semibold text-violet-700">
                    Open deal
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>

        <div className="rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
          <div className="flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4" />
            Nearby deal active
          </div>
          <p className="mt-2">Trusted electronics store is 1.8 km away and has stock available.</p>
        </div>
      </div>
    </main>
  );
}
