"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type MarketRow = {
  key: string;
  title: string;
  outcomes: { name: string; price: number }[];
};

type EventDetail = {
  id: string;
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
  const [picked, setPicked] = useState<{
    market: string;
    name: string;
    price: number;
  } | null>(null);

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
        if (!cancelled) setData(json);
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
    <main className="min-h-screen p-4 pb-28 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-[var(--muted)]">
        ← Back
      </Link>

      {loading && <p className="mt-4 text-sm text-[var(--muted)]">Loading match…</p>}

      {!loading && data && (
        <>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {data.league}
            {data.commence ? ` · ${fmtWhen(data.commence)}` : ""}
          </p>
          <h1 className="mt-1 text-xl font-bold">
            {data.home || homeQ || "Home"}{" "}
            <span className="text-base font-normal text-[var(--muted)]">vs</span>{" "}
            {data.away || awayQ || "Away"}
          </h1>

          {data.error && (
            <p className="mt-2 text-sm text-[var(--danger)]">{data.error}</p>
          )}

          <div className="mt-6 space-y-2">
            {(data.markets || []).map((m) => {
              const isOpen = open[m.key] ?? false;
              return (
                <div
                  key={m.key}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                    onClick={() => setOpen((s) => ({ ...s, [m.key]: !isOpen }))}
                  >
                    <span>{m.title}</span>
                    <span className="text-[var(--muted)]">{isOpen ? "▾" : "▸"}</span>
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] p-3 sm:grid-cols-3">
                      {m.outcomes.map((o) => (
                        <button
                          key={o.name}
                          type="button"
                          onClick={() =>
                            setPicked({
                              market: m.title,
                              name: o.name,
                              price: o.price,
                            })
                          }
                          className={`rounded-lg border px-2 py-2 text-center ${
                            picked?.name === o.name && picked?.market === m.title
                              ? "border-[var(--green)] bg-[var(--green)]/10"
                              : "border-[var(--border)] bg-[var(--bg)]"
                          }`}
                        >
                          <div className="truncate text-xs text-[var(--muted)]">
                            {o.name}
                          </div>
                          <div className="font-semibold text-[var(--green)]">
                            {o.price.toFixed(2)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!data.markets?.length && !data.error && (
              <p className="text-sm text-[var(--muted)]">No markets for this match.</p>
            )}
          </div>
        </>
      )}

      {picked && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm">
            <span className="text-[var(--muted)]">{picked.market}:</span>{" "}
            <strong>{picked.name}</strong> @ {picked.price.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Selection only — place bet (stake) next step.
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-[var(--muted)] underline"
            onClick={() => setPicked(null)}
          >
            Clear
          </button>
        </div>
      )}
    </main>
  );
}

export default function MatchDetailPage() {
  return (
    <Suspense fallback={<main className="p-4 text-sm text-[var(--muted)]">Loading…</main>}>
      <MatchInner />
    </Suspense>
  );
}
