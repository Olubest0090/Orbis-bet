"use client";

import Link from "next/link";
import { useState } from "react";

const BANKER_LEADER = "Lawrence dawg";
const BANKER_NATION_ID = 756196;
const TRADE_URL =
  "https://politicsandwar.com/nation/trade/create?leadername=Lawrence+dawg";
const MIN_DEPOSIT = 100_000;

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const amountNum = Number(String(amount).replace(/,/g, ""));
  const validAmount = Number.isFinite(amountNum) && amountNum >= MIN_DEPOSIT;

  function onSendTrade() {
    setMessage("");
    if (!validAmount) {
      setMessage(`Enter at least $${MIN_DEPOSIT.toLocaleString()} to deposit.`);
      return;
    }
    window.open(TRADE_URL, "_blank", "noopener,noreferrer");
    setMessage(
      "Trade page opened. Create a BUY for FOOD to Lawrence dawg. Total value should match your deposit amount. Then come back and tap Accept trade."
    );
  }

  async function onAcceptTrade() {
    setMessage("");
    if (!validAmount) {
      setMessage(`Enter at least $${MIN_DEPOSIT.toLocaleString()} to deposit.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/deposit/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || `Could not accept trade (${res.status})`);
        return;
      }
      setMessage(
        data.message ||
          `Deposit recorded. New balance: $${Number(data.balance ?? 0).toLocaleString()}`
      );
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-4 pb-24 max-w-lg mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Deposit</h1>
        <Link href="/me" className="text-sm text-[var(--muted)]">
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
        <p className="text-sm text-[var(--muted)]">
          Deposit PnW cash by creating an in-game <strong className="text-[var(--text)]">BUY</strong>{" "}
          trade for <strong className="text-[var(--text)]">Food</strong> with banker nation{" "}
          <strong className="text-[var(--text)]">
            {BANKER_LEADER} (#{BANKER_NATION_ID})
          </strong>
          .
        </p>

        <div>
          <label className="mb-1 block text-sm text-[var(--muted)]">
            Amount to deposit ($)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1000000"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Minimum ${MIN_DEPOSIT.toLocaleString()}. Food under 1,001 units. Trade total should equal this amount.
          </p>
        </div>

        <ol className="list-decimal pl-5 text-sm text-[var(--muted)] space-y-1">
          <li>Enter the $ amount above.</li>
          <li>Tap <span className="text-[var(--text)]">Send trade</span> and create the BUY (Food) to the banker.</li>
          <li>Return here and tap <span className="text-[var(--text)]">Accept trade</span>.</li>
        </ol>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onSendTrade}
            className="rounded-xl bg-[var(--green)] py-3 text-sm font-semibold text-black"
          >
            Send trade
          </button>
          <button
            type="button"
            onClick={onAcceptTrade}
            disabled={loading}
            className="rounded-xl border border-[var(--green)] py-3 text-sm font-semibold text-[var(--green)] disabled:opacity-60"
          >
            {loading ? "Checking…" : "Accept trade"}
          </button>
        </div>

        {message && (
          <p className="text-sm text-[var(--muted)] border-t border-[var(--border)] pt-3">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
