"use client";

import { useEffect, useState } from "react";

type Match = {
  id: string;
  league: string;
  commence: string;
  home: string;
  away: string;
  odds: { home?: number; draw?: number; away?: number };
};

export default function HomeMatchList() {
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
          if (data.errors?.length) setError(String(data.errors[0]));
        }
      } catch {
        if (!cancelled) setError("Network error loading matches");
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

  if (loading) {
    return <p className="px-4 text-sm text-[var(--muted)]">Loading matches…</p>;
  }

  if (error && matches.length === 0) {
    return <p className="px-4 text-sm text-[var(--danger)]">{error}</p>;
  }

  return (
    <div className="space-y-3 px-4">
      {error && (
        <p className="text-xs text-[var(--muted)]">{error}</p>
      )}
      {matches.map((m) => (
        <div
          key={m.id}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <p className="text-xs text-[var(--muted)]">
            {m.league} · {fmtWhen(m.commence)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-sm font-medium">
            <span className="flex-1 text-left">{m.home}</span>
            <span className="text-xs text-[var(--muted)]">vs</span>
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
        </div>
      ))}
      {!loading && matches.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No fixtures right now.</p>
      )}
    </div>
  );
}
