"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/app/components/BottomNav";

type Leg = {
  id: string;
  home: string;
  away: string;
  commence_time: string;
  market_title: string;
  selection: string;
  price: number;
  status: "open" | "won" | "lost" | "void";
};

type Bet = {
  id: string;
  kind: "single" | "acca";
  stake: number;
  total_odds: number;
  potential_payout: number;
  payout: number;
  status: "open" | "won" | "lost" | "void";
  placed_at: string;
  orbis_bet_legs: Leg[];
};

const money = (n: number) => `$${Math.round(Number(n)).toLocaleString()}`;

const STATUS_STYLE: Record<string, string> = {
  open: "text-[var(--muted)] border-[var(--border)]",
  won: "text-[var(--green)] border-[var(--green)]",
  lost: "text-[var(--danger)] border-[var(--danger)]",
  void: "text-[var(--muted)] border-[var(--border)]",
};

const LEG_DOT: Record<string, string> = {
  open: "bg-[var(--muted)]",
  won: "bg-[var(--green)]",
  lost: "bg-[var(--danger)]",
  void: "bg-[var(--border)]",
};

export default function BetsPage() {
  const [bets, setBets] = useState<Bet[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"open" | "settled">("open");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bets/list", { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(json.error || "Could not load bets");
        else setBets(json.bets);
      } catch {
        if (!cancelled) setError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = (bets || []).filter((b) => (tab === "open" ? b.status === "open" : b.status !== "open"));

  return (
    <main className="min-h-screen p-4 pb-24 max-w-lg mx-auto text-sm">
      <h1 className="mb-3 text-xl font-bold">My Bets</h1>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {(["open", "settled"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg border py-2 capitalize ${
              tab === t ? "border-[var(--green)] text-[var(--green)]" : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-[var(--danger)]">{error}</p>}
      {!bets && !error && <p className="text-[var(--muted)]">Loading…</p>}
      {bets && shown.length === 0 && (
        <p className="text-[var(--muted)]">No {tab} bets yet.</p>
      )}

      <div className="space-y-3">
        {shown.map((b) => (
          <div key={b.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {b.kind === "acca" ? `Accumulator (${b.orbis_bet_legs.length})` : "Single"}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${STATUS_STYLE[b.status]}`}>
                {b.status}
              </span>
            </div>

            <ul className="mt-2 space-y-1.5">
              {b.orbis_bet_legs.map((l) => (
                <li key={l.id} className="flex items-start gap-2">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${LEG_DOT[l.status]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">
                      {l.selection} <span className="text-[var(--green)]">@ {Number(l.price).toFixed(2)}</span>
                    </div>
                    <div className="truncate text-[10px] text-[var(--muted)]">
                      {l.market_title} · {l.home} vs {l.away}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-2 text-xs">
              <div>
                <div className="text-[10px] text-[var(--muted)]">Stake</div>
                {money(b.stake)}
              </div>
              <div>
                <div className="text-[10px] text-[var(--muted)]">Odds</div>
                {Number(b.total_odds).toFixed(2)}
              </div>
              <div>
                <div className="text-[10px] text-[var(--muted)]">
                  {b.status === "open" ? "To win" : "Returned"}
                </div>
                <span className={b.status === "won" ? "text-[var(--green)]" : ""}>
                  {money(b.status === "open" ? b.potential_payout : b.payout)}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-[var(--muted)]">
              Placed {new Date(b.placed_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
