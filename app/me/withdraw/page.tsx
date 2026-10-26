"use client";

import Link from "next/link";
import { useState } from "react";

const MIN_WITHDRAW = 100_000;

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [nationId, setNationId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const amountNum = Number(String(amount).replace(/,/g, ""));
  const nationNum = Number(String(nationId).trim());
  const validAmount = Number.isFinite(amountNum) && amountNum >= MIN_WITHDRAW;
  const validNation = Number.isFinite(nationNum) && nationNum > 0;

  async function onRequest() {
    setMessage("");
    if (!validAmount) {
      setMessage(`Enter at least $${MIN_WITHDRAW.toLocaleString()}.`);
      return;
    }
    if (!validNation) {
      setMessage("Enter a valid destination nation ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/withdraw/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum, nationId: nationNum }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || `Request failed (${res.status})`);
        return;
      }
      setMessage(data.message || "Withdraw request received.");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-4 pb-24 max-w-lg mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Withdraw</h1>
        <Link href="/me" className="text-sm text-[var(--muted)]">
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
        <p className="text-sm text-[var(--muted)]">
          Request a payout of your Orbis Bet balance to a Politics &amp; War nation.
          Sending from the bank is not connected yet — this page records the request UI only for now.
        </p>

        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">Amount ($)</label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500000"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Minimum ${MIN_WITHDRAW.toLocaleString()}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">
            Destination nation ID
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={nationId}
            onChange={(e) => setNationId(e.target.value)}
            placeholder="e.g. 756196"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]"
          />
        </div>

        <button
          type="button"
          onClick={onRequest}
          disabled={loading}
          className="w-full rounded-xl bg-[var(--green)] py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Request withdraw"}
        </button>

        {message && (
          <p className="text-sm text-[var(--muted)] border-t border-[var(--border)] pt-3">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
