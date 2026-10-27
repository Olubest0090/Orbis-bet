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
};

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function crestStyle(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${h} 70% 48%), hsl(${(h + 40) % 360} 65% 28%))`,
  };
}

function Crest({ name }: { name: string }) {
  return (
    <div className="mx-auto crest" style={crestStyle(name)} aria-hidden="true">
      {initials(name)}
    </div>
  );
}

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
    return (
      <div className="space-y-3 px-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="match-card h-[188px] animate-pulse" />
        ))}
      </div>
    );
  }
  if (error && matches.length === 0) {
    return <p className="px-4 text-sm text-[var(--danger)]">{error}</p>;
  }

  return (
    <div className="space-y-3 px-4 pb-16">
      {matches.map((m) => {
        const hasOdds = m.odds.home != null || m.odds.draw != null || m.odds.away != null;
        const started = new Date(m.commence).getTime() <= Date.now();
        return (
          <div key={m.id} className="match-card">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
              <span className="league-chip truncate">{m.league}</span>
              <span className="shrink-0">
                {started ? "Started · betting closed" : fmtWhen(m.commence)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-center">
              <div>
                <Crest name={m.home} />
                <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-tight">{m.home}</p>
              </div>
              <span className="pt-3 text-[11px] font-semibold text-[var(--muted)]">VS</span>
              <div>
                <Crest name={m.away} />
                <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-tight">{m.away}</p>
              </div>
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
                      className={`odds-btn ${picked ? "odds-on" : ""}`}
                    >
                      <div className="k">{label}</div>
                      <div className="v">{price != null ? price.toFixed(2) : "—"}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-xs text-[var(--muted)]">Odds unavailable right now</p>
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
