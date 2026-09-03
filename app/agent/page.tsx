"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BellRing, Package, Trash2, PauseCircle, PlayCircle } from "lucide-react";
import { loadAppData, saveAppData, type Condition } from "@/app/lib/agentbuy";

export default function AgentPage() {
  const [mode, setMode] = useState<"product" | "local">("product");
  const [conditions, setConditions] = useState<Condition[]>(() => loadAppData().conditions);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    product: "iPhone 17 Pro",
    targetPrice: 90000,
    store: "Trusted Store",
    distanceKm: 2,
    stockAvailable: true,
    frequency: "instant",
  });

  const handleSubmit = async () => {
    const payload = {
      type: mode,
      title: mode === "product" ? "Price alert" : "Nearby stock alert",
      product: form.product,
      targetPrice: mode === "product" ? Number(form.targetPrice) : undefined,
      store: mode === "local" ? form.store : undefined,
      distanceKm: mode === "local" ? Number(form.distanceKm) : undefined,
      stockAvailable: mode === "local" ? form.stockAvailable : undefined,
      enabled: true,
      frequency: form.frequency,
    };

    const response = await fetch("/api/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.ok) {
      const next = loadAppData();
      setConditions(next.conditions);
      setMessage("Condition created and agent monitoring started.");
    } else {
      setMessage(result.message || "Unable to create condition.");
    }
  };

  const toggleCondition = (id: string) => {
    const next = loadAppData();
    const updated = next.conditions.map((condition) =>
      condition.id === id ? { ...condition, enabled: !condition.enabled } : condition
    );
    const merged = { ...next, conditions: updated };
    saveAppData(merged);
    setConditions(updated);
  };

  const deleteCondition = (id: string) => {
    const next = loadAppData();
    const updated = next.conditions.filter((condition) => condition.id !== id);
    const merged = { ...next, conditions: updated };
    saveAppData(merged);
    setConditions(updated);
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
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Agent</p>
              <h1 className="text-2xl font-bold">Conditions</h1>
            </div>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            {conditions.filter((condition) => condition.enabled).length} Active
          </div>
        </header>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => setMode("product")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${mode === "product" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              Product
            </button>
            <button
              type="button"
              onClick={() => setMode("local")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${mode === "local" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              Local
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Product</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <Package className="h-4 w-4 text-violet-600" />
                <input
                  value={form.product}
                  onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))}
                  className="w-full bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {mode === "product" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">Notify me when</label>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Price</span>
                    <span className="rounded bg-violet-100 px-2 py-0.5 font-medium text-violet-700">≤</span>
                    <input
                      type="number"
                      value={form.targetPrice}
                      onChange={(event) => setForm((current) => ({ ...current, targetPrice: Number(event.target.value) }))}
                      className="w-28 bg-transparent text-right text-slate-700 outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Trusted store</label>
                  <input
                    value={form.store}
                    onChange={(event) => setForm((current) => ({ ...current, store: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Distance within</label>
                  <input
                    type="number"
                    value={form.distanceKm}
                    onChange={(event) => setForm((current) => ({ ...current, distanceKm: Number(event.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-700 outline-none"
                  />
                </div>
                <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  <span>Product available</span>
                  <input
                    type="checkbox"
                    checked={form.stockAvailable}
                    onChange={(event) => setForm((current) => ({ ...current, stockAvailable: event.target.checked }))}
                    className="h-4 w-4 accent-emerald-600"
                  />
                </label>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">Notification frequency</label>
              <select
                value={form.frequency}
                onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-700 outline-none"
              >
                <option value="instant">Instant</option>
                <option value="daily">Daily digest</option>
              </select>
            </div>

            {message ? (
              <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {message}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSubmit}
              className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-violet-200"
            >
              Create Alert
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <BellRing className="h-5 w-5 text-amber-500" />
            Active conditions
          </div>

          <div className="mt-4 space-y-3">
            {conditions.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">No active conditions yet.</div>
            ) : (
              conditions.map((condition) => (
                <div key={condition.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-slate-500">{condition.type}</p>
                      <h3 className="mt-1 text-base font-bold text-slate-900">{condition.product}</h3>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${condition.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {condition.enabled ? "Live" : "Paused"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {condition.type === "product"
                      ? `Price target: ₹${condition.targetPrice?.toLocaleString("en-IN")}`
                      : `${condition.store} · within ${condition.distanceKm} km`}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCondition(condition.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-2 text-xs font-medium text-white"
                    >
                      {condition.enabled ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                      {condition.enabled ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCondition(condition.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
