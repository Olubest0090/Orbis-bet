"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Match = {
  id: string;
  league: string;
  commence: string;
  home: string;
  away: string;
  odds: { home?: number; draw?: number; away?: number };
};

export default function FootballPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/odds/football");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(data.error || `Failed (${res.status})`);
          return;
        }
        if (!cancelled) {
          setMatches(data.matches || []);
          if (data.errors?.length) setError(`Partial: ${data.errors[0]}`);
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function fmtWhen(iso: string) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <main className="min-h-screen p-4 pb-24 max-w-lg mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Football</h1>
        <Link href="/" className="text-sm text-[var(--muted)]">
          Home
        </Link>
      </div>

      <p className="text-xs text-[var(--muted)] mb-4">
        Tap a match for full markets. Placing bets comes next.
      </p>

      {loading && <p className="text-sm text-[var(--muted)]">Loading matches…</p>}
      {error && !loading && (
        <p className="text-sm text-[var(--danger)] mb-3">{error}</p>
      )}

      <div className="space-y-3">
        {matches.map((m) => (
          <Link
            key={m.id}
            href={`/match/${encodeURIComponent(m.id)}`}
            className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <p className="text-xs text-[var(--muted)]">
              {m.league} · {fmtWhen(m.commence)}
            </p>
            <div className="mt-2 flex items-center justify-between text-sm font-medium gap-2">
              <span className="flex-1 text-left">{m.home}</span>
              <span className="text-[var(--muted)] text-xs">vs</span>
              <span className="flex-1 text-right">{m.away}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(
                [
                  ["1", m.odds.home],
                  ["X", m.odds.draw],
                  ["2", m.odds.away],
                ] as const
              ).map(([label, price]) => (
                <div
                  key={label}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2 text-center"
                >
                  <div className="text-xs text-[var(--muted)]">{label}</div>
                  <div className="font-semibold text-[var(--green)]">
                    {price != null ? price.toFixed(2) : "—"}
                  </div>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {!loading && matches.length === 0 && !error && (
        <p className="text-sm text-[var(--muted)]">No fixtures returned.</p>
      )}
    </main>
  );
}
