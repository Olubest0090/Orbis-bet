"use client";

import { useState } from "react";
import { useSlip } from "@/lib/slip";
import { MAX_LEGS, MAX_PAYOUT, MAX_STAKE, MIN_STAKE, parseAmount } from "@/lib/betting";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function SlipBar() {
  const { legs, remove, clear, updatePrices } = useSlip();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "acca">("acca");
  const [stakeText, setStakeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  if (legs.length === 0 && !done) return null;

  const kind: "single" | "acca" = legs.length < 2 ? "single" : mode;
  const stake = parseAmount(stakeText);
  const totalOdds = legs.reduce((p, l) => p * l.price, 1);
  const eventIds = legs.map((l) => l.eventId);
  const sameMatch = kind === "acca" && new Set(eventIds).size !== eventIds.length;

  const cost = stake ? (kind === "single" ? stake * legs.length : stake) : 0;
  const payout = stake
    ? Math.min(
        kind === "single" ? legs.reduce((s, l) => s + stake * l.price, 0) : stake * totalOdds,
        MAX_PAYOUT * (kind === "single" ? legs.length : 1)
      )
    : 0;

  async function place() {
    setMsg("");
    if (!stake || stake < MIN_STAKE || stake > MAX_STAKE) {
      setMsg(`Stake must be ${money(MIN_STAKE)} to ${money(MAX_STAKE)}. You can type 500k, 2m, 1b.`);
      return;
    }
    if (sameMatch) {
      setMsg("An accumulator can't have two picks from the same match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          stake,
          legs: legs.map((l) => ({
            eventId: l.eventId,
            sport: l.sport,
            market: l.marketKey,
            selection: l.selection,
            price: l.price,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.changes) {
        updatePrices(data.changes);
        setMsg("Odds changed. Check the new prices and tap Place bet again.");
        return;
      }
      if (!res.ok) {
        setMsg(data.error || "Could not place bet");
        return;
      }
      clear();
      setStakeText("");
      setOpen(false);
      setDone(true);
    } catch {
      setMsg("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (legs.length === 0 && done) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-[var(--green)] bg-[var(--card)] p-3 text-xs">
        <span className="text-[var(--green)]">Bet placed ✓</span>
        <span className="flex gap-4">
          <a href="/bets" className="underline">My Bets</a>
          <button type="button" className="text-[var(--muted)]" onClick={() => setDone(false)}>
            Close
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--card)]">
      <button
        type="button"
        className="flex w-full items-center justify-between p-3 text-left text-xs"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-semibold">
          Bet slip <span className="text-[var(--green)]">({legs.length})</span>
        </span>
        <span className="text-[var(--muted)]">{open ? "▾ Hide" : "▴ Open"}</span>
      </button>

      {open && (
        <div className="max-h-[70vh] overflow-y-auto border-t border-[var(--border)] p-3 text-xs">
          {legs.length > 1 && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["acca", "single"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-lg border py-1.5 ${
                    mode === m ? "border-[var(--green)] text-[var(--green)]" : "border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {m === "acca" ? "Accumulator" : "Singles"}
                </button>
              ))}
            </div>
          )}

          <ul className="space-y-2">
            {legs.map((l) => (
              <li key={`${l.eventId}|${l.marketKey}|${l.selection}`} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.selection}</div>
                  <div className="truncate text-[10px] text-[var(--muted)]">
                    {l.marketTitle} · {l.home} vs {l.away}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-[var(--green)]">{l.price.toFixed(2)}</span>
                  <button type="button" aria-label="Remove" className="text-[var(--muted)]" onClick={() => remove(l)}>
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {legs.length > MAX_LEGS && (
            <p className="mt-2 text-[var(--danger)]">Max {MAX_LEGS} selections.</p>
          )}
          {sameMatch && (
            <p className="mt-2 text-[var(--danger)]">
              Two picks are from the same match. Remove one or switch to Singles.
            </p>
          )}

          <label className="mt-3 block text-[var(--muted)]">
            {kind === "single" && legs.length > 1 ? "Stake per selection" : "Stake"}
          </label>
          <input
            value={stakeText}
            onChange={(e) => setStakeText(e.target.value)}
            inputMode="text"
            placeholder="e.g. 500k, 2m"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--green)]"
          />
          <div className="mt-2 flex gap-2">
            {["100k", "1m", "10m", "100m"].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setStakeText(q)}
                className="flex-1 rounded-lg border border-[var(--border)] py-1 text-[var(--muted)]"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-1">
            {kind === "acca" && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Total odds</span>
                <span>{totalOdds.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Total stake</span>
              <span>{stake ? money(cost) : "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Potential payout</span>
              <span className="font-semibold text-[var(--green)]">{stake ? money(payout) : "-"}</span>
            </div>
          </div>

          {msg && <p className="mt-2 text-[var(--danger)]">{msg}</p>}

          <button
            type="button"
            disabled={busy || legs.length > MAX_LEGS}
            onClick={place}
            className="mt-3 w-full rounded-lg bg-[var(--green)] py-2.5 text-sm font-semibold text-black disabled:opacity-60"
          >
            {busy ? "Placing…" : "Place bet"}
          </button>
          <button type="button" onClick={clear} className="mt-2 w-full py-1 text-[var(--muted)] underline">
            Clear slip
          </button>
          <p className="mt-2 text-center text-[10px] text-[var(--muted)]">
            18+ · In-game currency only · Bet responsibly
          </p>
        </div>
      )}
    </div>
  );
}
