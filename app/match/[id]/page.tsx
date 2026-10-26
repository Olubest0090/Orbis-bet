"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function MatchDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({ h2h: true });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/odds/event?id=${encodeURIComponent(id)}`);
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ id, league: "", commence: "", home: "", away: "", markets: [], error: "Network error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
    <main className="min-h-screen p-4 pb-24 max-w-lg mx-auto">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/" className="text-sm text-[var(--muted)]">
          ← Back
        </Link>
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading match…</p>}

      {!loading && data && (
        <>
          <p className="text-xs text-[var(--muted)]">
            {data.league}
            {data.commence ? ` · ${fmtWhen(data.commence)}` : ""}
          </p>
          <h1 className="mt-1 text-xl font-bold">
            {data.home || "Home"}{" "}
            <span className="text-[var(--muted)] font-normal text-base">vs</span>{" "}
            {data.away || "Away"}
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
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                    onClick={() =>
                      setOpen((s) => ({ ...s, [m.key]: !isOpen }))
                    }
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
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-center"
                        >
                          <div className="text-xs text-[var(--muted)] truncate">
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

          <p className="mt-6 text-xs text-[var(--muted)]">
            Markets shown for display. Placing bets comes next.
          </p>
        </>
      )}
    </main>
  );
}
