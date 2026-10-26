"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type SharesInfo = {
  yourShares: number;
  poolPercent: number;
  lastDividend: number;
  totalDividends: number;
  balance: number;
  currentPrice: number;
  sharesForSale: number;
  totalShares: number;
};

const FALLBACK: SharesInfo = {
  yourShares: 0,
  poolPercent: 0,
  lastDividend: 0,
  totalDividends: 0,
  balance: 0,
  currentPrice: 5_000_000,
  sharesForSale: 12_000,
  totalShares: 20_000,
};

export default function SharesPage() {
  const [info, setInfo] = useState<SharesInfo>(FALLBACK);
  const [qty, setQty] = useState("1");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/shares/info");
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setInfo({
          yourShares: Number(data.yourShares) || 0,
          poolPercent: Number(data.poolPercent) || 0,
          lastDividend: Number(data.lastDividend) || 0,
          totalDividends: Number(data.totalDividends) || 0,
          balance: Number(data.balance) || 0,
          currentPrice: Number(data.currentPrice) || 5_000_000,
          sharesForSale: Number(data.sharesForSale) || 12_000,
          totalShares: Number(data.totalShares) || 20_000,
        });
      }
    } catch {
      /* keep fallback */
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const n = Math.max(0, Math.floor(Number(qty) || 0));
  const buyCost = n * info.currentPrice;
  const sellCredit = Math.floor(n * info.currentPrice * 0.9);

  async function onBuy() {
    setMessage("");
    if (n < 1) {
      setMessage("Minimum buy is 1 share.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/shares/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: n }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || `Buy failed (${res.status})`);
        return;
      }
      setMessage(data.message || "Buy submitted.");
      await load();
    } catch {
      setMessage("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function onSell() {
    setMessage("");
    if (n < 1) {
      setMessage("Minimum sell is 1 share.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/shares/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: n }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || `Sell failed (${res.status})`);
        return;
      }
      setMessage(data.message || "Sell submitted.");
      await load();
    } catch {
      setMessage("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-4 pb-24 max-w-lg mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Shares</h1>
        <Link href="/me" className="text-sm text-[var(--muted)]">
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
        <p className="text-xs text-[var(--muted)]">
          Fixed pool {info.totalShares.toLocaleString()} shares · Floor $3,000,000 ·
          Sell-back at current price − 10%
        </p>
        {fetching ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[var(--muted)]">Your shares</p>
              <p className="text-lg font-semibold">{info.yourShares.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Your % of pool</p>
              <p className="text-lg font-semibold">{info.poolPercent.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Last dividend</p>
              <p className="font-semibold">${info.lastDividend.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Total dividends</p>
              <p className="font-semibold">${info.totalDividends.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Balance</p>
              <p className="font-semibold text-[var(--green)]">
                ${info.balance.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Current price</p>
              <p className="font-semibold">${info.currentPrice.toLocaleString()}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[var(--muted)]">Shares available to buy</p>
              <p className="font-semibold">{info.sharesForSale.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
        <label className="block text-sm text-[var(--muted)]">Quantity (shares)</label>
        <input
          type="text"
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]"
        />
        <p className="text-xs text-[var(--muted)]">
          Buy cost ≈ ${buyCost.toLocaleString()} · Sell credit ≈ ${sellCredit.toLocaleString()}{" "}
          (after 10%)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onBuy}
            className="rounded-xl bg-[var(--green)] py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            Buy shares
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onSell}
            className="rounded-xl border border-[var(--green)] py-3 text-sm font-semibold text-[var(--green)] disabled:opacity-60"
          >
            Sell shares
          </button>
        </div>
        {message && (
          <p className="text-sm text-[var(--muted)] border-t border-[var(--border)] pt-3">
            {message}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">
          Top shareholders
        </h2>
        <p className="text-sm text-[var(--muted)]">Leaderboard coming when ledger is live.</p>
      </div>
    </main>
  );
}
