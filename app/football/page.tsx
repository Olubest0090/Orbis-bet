"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Match = {
  id: string;
  sport_key?: string;
  league: string;
  commence: string;
  home: string;
  away: string;
  odds: { home?: number; draw?: number; away?: number };
};

export default function FootballPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
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

  function openMatch(m: Match) {
    const q = m.sport_key ? `?sport=${encodeURIComponent(m.sport_key)}` : "";
    router.push(`/match/${encodeURIComponent(m.id)}${q}`);
  }

  return (
    <main className="min-h-screen p-4 pb-24 max-w-lg mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Football</h1>
        <Link href="/" className="text-sm text-[var(--muted)]">
          Home
        </Link>
      </div>
      {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
      {error && <p className="text-sm text-[var(--danger)] mb-2">{error}</p>}
      <div className="space-y-3">
        {matches.map((m) => (
          <div
            key={m.id}
            role="button"
            onClick={() => openMatch(m)}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <p className="text-xs text-[var(--muted)]">
              {m.league} · {fmtWhen(m.commence)}
            </p>
            <div className="mt-2 flex justify-between text-sm font-medium gap-2">
              <span className="flex-1">{m.home}</span>
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
                <button
                  key={label}
                  type="button"
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMatch(m);
                  }}
                >
                  <div className="text-xs text-[var(--muted)]">{label}</div>
                  <div className="font-semibold text-[var(--green)]">
                    {price != null ? price.toFixed(2) : "—"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
