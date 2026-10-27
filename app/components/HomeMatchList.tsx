"use client";

import { useEffect, useState } from "react";
import SlipBar from "@/app/components/SlipBar";
import { useSlip, type SlipLeg } from "@/lib/slip";

type Match = {
  id: string;
  sport_key?: string;
  league: string;
  commence: string;
  home: string;
  away: string;
  odds: { home?: number; draw?: number; away?: number };
  score_home?: string;
  score_away?: string;
  live?: boolean;
  completed?: boolean;
};

export default function HomeMatchList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { toggle, has } = useSlip();

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
        if (!cancelled) setMatches(data.matches || []);
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

  function moreHref(m: Match) {
    const q = new URLSearchParams();
    if (m.sport_key) q.set("sport", m.sport_key);
    q.set("home", m.home);
    q.set("away", m.away);
    return `/match/${encodeURIComponent(m.id)}?${q.toString()}`;
  }

  function legFor(m: Match, selection: string, price: number): SlipLeg {
    return {
      eventId: m.id,
      sport: m.sport_key || "",
      home: m.home,
      away: m.away,
      commence: m.commence,
      marketKey: "h2h",
      marketTitle: "1X2",
      selection,
      price,
    };
  }

  if (loading) {
    return <p className="px-4 text-sm text-[var(--muted)]">Loading matches…</p>;
  }
  if (error && matches.length === 0) {
    return <p className="px-4 text-sm text-[var(--danger)]">{error}</p>;
  }

  return (
    <div className="space-y-3 px-4 pb-16">
      {matches.map((m) => {
        const hasOdds =
          m.odds.home != null || m.odds.draw != null || m.odds.away != null;
        const started = !!m.live || new Date(m.commence).getTime() <= Date.now();
        return (
          <div
            key={m.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              {m.live && (
                <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  LIVE
                </span>
              )}
              <span>
                {m.league} · {fmtWhen(m.commence)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-sm font-medium">
              <span className="flex-1 text-left">{m.home}</span>
              {m.score_home != null && m.score_away != null ? (
                <span className="font-bold text-[var(--green)]">
                  {m.score_home} - {m.score_away}
                </span>
              ) : (
                <span className="text-xs text-[var(--muted)]">vs</span>
              )}
              <span className="flex-1 text-right">{m.away}</span>
            </div>
            {hasOdds ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(
                  [
                    ["1", m.home, m.odds.home],
                    ["X", "Draw", m.odds.draw],
                    ["2", m.away, m.odds.away],
                  ] as const
                ).map(([label, selection, price]) => {
                  const canPick = price != null && !started;
                  const leg = price != null ? legFor(m, selection, price) : null;
                  const picked = leg ? has(leg) : false;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={!canPick}
                      onClick={() => leg && toggle(leg)}
                      className={`rounded-lg border py-2 disabled:opacity-50 ${
                        picked
                          ? "border-[var(--green)] bg-[var(--green)]/10"
                          : "border-[var(--border)] bg-[var(--bg)]"
                      }`}
                    >
                      <div className="text-xs text-[var(--muted)]">{label}</div>
                      <div className="font-semibold text-[var(--green)]">
                        {price != null ? price.toFixed(2) : "—"}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Odds unavailable (live/suspended)
              </p>
            )}
            {!started && (
              <div className="mt-2 text-right">
                <a href={moreHref(m)} className="text-[11px] text-[var(--muted)] underline">
                  More markets ›
                </a>
              </div>
            )}
          </div>
        );
      })}
      {!loading && matches.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No fixtures right now.</p>
      )}
      <SlipBar above />
    </div>
  );
}
