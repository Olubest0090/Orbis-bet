"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SlipBar from "@/app/components/SlipBar";
import { useSlip, type SlipLeg } from "@/lib/slip";

type MarketRow = {
  key: string;
  title: string;
  outcomes: { name: string; price: number }[];
};

type EventDetail = {
  id: string;
  sport_key?: string;
  league: string;
  commence: string;
  home: string;
  away: string;
  markets: MarketRow[];
  error?: string;
};

function MatchInner() {
  const params = useParams();
  const search = useSearchParams();
  const id = decodeURIComponent(String(params?.id || ""));
  const sport = search.get("sport") || "";
  const homeQ = search.get("home") || "";
  const awayQ = search.get("away") || "";
  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({ h2h: true });
  const { toggle, has } = useSlip();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams({ id });
        if (sport) q.set("sport", sport);
        if (homeQ) q.set("home", homeQ);
        if (awayQ) q.set("away", awayQ);
        const res = await fetch(`/api/odds/event?${q.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          setData(json);
          if (json.markets?.[0]?.key) {
            setOpen({ [json.markets[0].key]: true });
          }
        }
      } catch {
        if (!cancelled)
          setData({
            id,
            league: "",
            commence: "",
            home: homeQ,
            away: awayQ,
            markets: [],
            error: "Network error",
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, sport, homeQ, awayQ]);

  function fmtWhen(iso: string) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  const home = data?.home || homeQ || "Home";
  const away = data?.away || awayQ || "Away";

  function legFor(m: MarketRow, o: { name: string; price: number }): SlipLeg {
    return {
      eventId: data?.id || id,
      sport: data?.sport_key || sport,
      home,
      away,
      commence: data?.commence || "",
      marketKey: m.key,
      marketTitle: m.title,
      selection: o.name,
      price: o.price,
    };
  }

  return (
    <main className="min-h-screen p-3 pb-32 max-w-lg mx-auto text-sm">
      <Link href="/" className="text-xs text-[var(--muted)]">
        ← Back
      </Link>

      {loading && <p className="mt-3 text-xs text-[var(--muted)]">Loading…</p>}

      {!loading && data && (
        <>
          <p className="mt-2 text-[11px] text-[var(--muted)] truncate">
            {data.league}
            {data.commence ? ` · ${fmtWhen(data.commence)}` : ""}
          </p>
          <h1 className="mt-0.5 text-sm font-semibold leading-tight truncate">
            {home} <span className="font-normal text-[var(--muted)]">vs</span> {away}
          </h1>

          {data.error && (
            <p className="mt-2 text-xs text-[var(--danger)]">{data.error}</p>
          )}

          <div className="mt-4 space-y-2">
            {(data.markets || []).map((m) => {
              const isOpen = open[m.key] ?? false;
              return (
                <div
                  key={m.key}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium"
                    onClick={() => setOpen((s) => ({ ...s, [m.key]: !isOpen }))}
                  >
                    <span>{m.title}</span>
                    <span className="text-[var(--muted)]">{isOpen ? "▾" : "▸"}</span>
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--border)] p-2">
                      {m.outcomes.map((o) => {
                        const leg = legFor(m, o);
                        return (
                          <button
                            key={o.name}
                            type="button"
                            onClick={() => toggle(leg)}
                            className={`rounded-lg border px-1 py-1.5 text-center ${
                              has(leg)
                                ? "border-[var(--green)] bg-[var(--green)]/10"
                                : "border-[var(--border)] bg-[var(--bg)]"
                            }`}
                          >
                            <div className="truncate text-[10px] text-[var(--muted)]">
                              {o.name}
                            </div>
                            <div className="text-xs font-semibold text-[var(--green)]">
                              {o.price.toFixed(2)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {!data.markets?.length && !data.error && (
              <p className="text-xs text-[var(--muted)]">No markets for this match.</p>
            )}
          </div>
        </>
      )}

      <SlipBar />
    </main>
  );
}

export default function MatchDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="p-3 text-xs text-[var(--muted)]">Loading…</main>
      }
    >
      <MatchInner />
    </Suspense>
  );
}
