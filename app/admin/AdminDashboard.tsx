"use client";

import { useCallback, useEffect, useState } from "react";

type Tab = "overview" | "users" | "bets" | "support" | "log";

type Stats = {
  users: number;
  frozen: number;
  deleted: number;
  total_balance: number;
  open_bets: number;
  open_stake: number;
  open_exposure: number;
  open_tickets: number;
};
type User = {
  id: string;
  leader_name: string;
  nation_id: number;
  balance: number;
  shares: number;
  status: "active" | "frozen" | "deleted";
  is_admin: boolean;
};
type Leg = {
  id: string;
  home: string;
  away: string;
  market_title: string;
  selection: string;
  price: number;
  status: string;
};
type Bet = {
  id: string;
  kind: string;
  stake: number;
  total_odds: number;
  potential_payout: number;
  payout: number;
  status: string;
  placed_at: string;
  orbis_users: { leader_name: string; nation_id: number } | null;
  orbis_bet_legs: Leg[];
};
type Ticket = {
  id: string;
  subject: string;
  status: string;
  last_sender: string;
  updated_at: string;
  orbis_users: { leader_name: string; nation_id: number } | null;
};
type Msg = { id: string; sender: string; body: string; created_at: string };
type LogRow = {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  admin: { leader_name: string } | null;
  target: { leader_name: string } | null;
};

const money = (n: number | string) => `$${Math.round(Number(n)).toLocaleString()}`;

const chip = (s: string) =>
  s === "active" || s === "won"
    ? "border-[var(--green)] text-[var(--green)]"
    : s === "frozen" || s === "lost" || s === "deleted"
      ? "border-[var(--danger)] text-[var(--danger)]"
      : "border-[var(--border)] text-[var(--muted)]";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { cache: "no-store", ...init });
  const json = await res.json().catch(() => ({}));
  if (res.status === 403) {
    window.location.href = "/";
    throw new Error("Forbidden");
  }
  if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
  return json;
}

const post = (body: Record<string, unknown>) =>
  api("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [msg, setMsg] = useState("");

  // overview
  const [stats, setStats] = useState<Stats | null>(null);
  // users
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[] | null>(null);
  // bets
  const [betStatus, setBetStatus] = useState<"open" | "settled">("open");
  const [betUser, setBetUser] = useState<{ id: string; name: string } | null>(null);
  const [bets, setBets] = useState<Bet[] | null>(null);
  // support
  const [ticketStatus, setTicketStatus] = useState<"open" | "closed">("open");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  // log
  const [log, setLog] = useState<LogRow[] | null>(null);

  const fail = (e: unknown) => setMsg(e instanceof Error ? e.message : "Something went wrong");

  const loadStats = useCallback(async () => {
    try {
      setStats((await api("/api/admin?a=stats")).stats);
    } catch (e) {
      fail(e);
    }
  }, []);

  const loadUsers = useCallback(async (query: string) => {
    try {
      setUsers((await api(`/api/admin?a=users&q=${encodeURIComponent(query)}`)).users);
    } catch (e) {
      fail(e);
    }
  }, []);

  const loadBets = useCallback(async (status: string, userId?: string) => {
    try {
      const extra = userId ? `&userId=${userId}` : "";
      setBets((await api(`/api/admin?a=bets&status=${status}${extra}`)).bets);
    } catch (e) {
      fail(e);
    }
  }, []);

  const loadTickets = useCallback(async (status: string) => {
    try {
      setTickets((await api(`/api/admin?a=tickets&status=${status}`)).tickets);
    } catch (e) {
      fail(e);
    }
  }, []);

  const loadLog = useCallback(async () => {
    try {
      setLog((await api("/api/admin?a=log")).log);
    } catch (e) {
      fail(e);
    }
  }, []);

  useEffect(() => {
    if (tab === "overview") void loadStats();
    if (tab === "users") void loadUsers("");
    if (tab === "log") void loadLog();
  }, [tab, loadStats, loadUsers, loadLog]);

  useEffect(() => {
    if (tab === "bets") void loadBets(betStatus, betUser?.id);
  }, [tab, betStatus, betUser, loadBets]);

  useEffect(() => {
    if (tab === "support") void loadTickets(ticketStatus);
  }, [tab, ticketStatus, loadTickets]);

  async function run(body: Record<string, unknown>, done: () => void, okText: string) {
    setMsg("");
    try {
      await post(body);
      setMsg(okText);
      done();
    } catch (e) {
      fail(e);
    }
  }

  function adjust(u: User) {
    const amount = window.prompt(`Add or remove balance for ${u.leader_name}.\nType 5m to add, -500k to remove:`);
    if (!amount) return;
    const reason = window.prompt("Reason (saved in the log):") ?? "";
    void run({ action: "adjust", userId: u.id, amount, reason }, () => loadUsers(q), "Balance updated");
  }

  function setStatus(u: User, status: "active" | "frozen" | "deleted") {
    const word = { active: "restore/unfreeze", frozen: "freeze", deleted: "delete" }[status];
    if (!window.confirm(`${word} ${u.leader_name}?`)) return;
    const reason = window.prompt("Reason (saved in the log):") ?? "";
    void run({ action: "status", userId: u.id, status, reason }, () => loadUsers(q), "Account updated");
  }

  async function resetPassword(u: User) {
    if (
      !window.confirm(
        `Send a one-time reset code to ${u.leader_name} (Nation #${u.nation_id}) as an in-game message?\n\nOnly they can read it in their game inbox.`
      )
    )
      return;
    setMsg("Sending…");
    try {
      const r = await post({ action: "send_reset_code", userId: u.id });
      setMsg(`Code sent in-game to Nation #${r.nation_id}. It works for 15 minutes at /reset.`);
    } catch (e) {
      fail(e);
    }
  }

  function resolve(b: Bet, result: "won" | "lost" | "void") {
    const text =
      result === "void"
        ? `Cancel this bet and refund ${money(b.stake)}?`
        : result === "won"
          ? `Settle as WON and pay ${money(b.potential_payout)}?`
          : "Settle as LOST?";
    if (!window.confirm(text)) return;
    const reason = window.prompt("Reason (saved in the log):") ?? "";
    void run({ action: "resolve", betId: b.id, result, reason }, () => loadBets(betStatus, betUser?.id), "Bet updated");
  }

  async function openThread(t: Ticket) {
    setOpenTicket(t);
    setReply("");
    try {
      setThread((await api(`/api/admin?a=ticket&id=${t.id}`)).messages);
    } catch (e) {
      fail(e);
    }
  }

  function sendReply(close: boolean) {
    if (!openTicket) return;
    const t = openTicket;
    void run(
      { action: "reply", ticketId: t.id, body: reply, status: close ? "closed" : "open" },
      async () => {
        setReply("");
        await openThread(t);
        void loadTickets(ticketStatus);
      },
      close ? "Replied and closed" : "Reply sent"
    );
  }

  const TABS: [Tab, string][] = [
    ["overview", "Overview"],
    ["users", "Users"],
    ["bets", "Bets"],
    ["support", "Support"],
    ["log", "Log"],
  ];

  const input =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--green)]";
  const btn = "rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs";

  return (
    <main className="min-h-screen p-3 pb-10 max-w-2xl mx-auto text-sm">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">
          <span className="text-[var(--green)]">Orbis</span> Admin
        </h1>
        <a href="/" className="text-xs text-[var(--muted)]">← Site</a>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k);
              setMsg("");
              setOpenTicket(null);
            }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
              tab === k ? "border-[var(--green)] text-[var(--green)]" : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {label}
            {k === "support" && stats && stats.open_tickets > 0 ? ` (${stats.open_tickets})` : ""}
          </button>
        ))}
      </div>

      {msg && <p className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-xs">{msg}</p>}

      {tab === "overview" && (
        <div>
          {!stats ? (
            <p className="text-[var(--muted)]">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["Users", stats.users],
                  ["Frozen / deleted", `${stats.frozen} / ${stats.deleted}`],
                  ["Total user balance", money(stats.total_balance)],
                  ["Open bets", stats.open_bets],
                  ["Open stakes", money(stats.open_stake)],
                  ["Max payout owed", money(stats.open_exposure)],
                  ["Open tickets", stats.open_tickets],
                ] as [string, string | number][]
              ).map(([label, v]) => (
                <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                  <div className="text-[10px] text-[var(--muted)]">{label}</div>
                  <div className="mt-0.5 text-base font-semibold">{v}</div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            className={`${btn} mt-3 w-full py-2.5`}
            onClick={() =>
              void run({ action: "settle_now" }, loadStats, "Settlement ran. Check the Log tab for the counts.")
            }
          >
            Run settlement now
          </button>
        </div>
      )}

      {tab === "users" && (
        <div>
          <div className="mb-3 flex gap-2">
            <input
              className={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void loadUsers(q)}
              placeholder="Leader name or nation ID"
            />
            <button type="button" className={btn} onClick={() => void loadUsers(q)}>
              Search
            </button>
          </div>
          {!users && <p className="text-[var(--muted)]">Loading…</p>}
          {users && users.length === 0 && <p className="text-[var(--muted)]">No accounts found.</p>}
          <div className="space-y-2">
            {users?.map((u) => (
              <div key={u.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {u.leader_name} {u.is_admin && <span className="text-[10px] text-[var(--green)]">ADMIN</span>}
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">Nation #{u.nation_id}</div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase ${chip(u.status)}`}>
                    {u.status}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span>Balance {money(u.balance)}</span>
                  <span className="text-[var(--muted)]">Shares {Number(u.shares)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={btn} onClick={() => adjust(u)}>
                    +/− Balance
                  </button>
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      setBetUser({ id: u.id, name: u.leader_name });
                      setTab("bets");
                    }}
                  >
                    Bets
                  </button>
                  {!u.is_admin && (
                    <>
                      <button type="button" className={btn} onClick={() => resetPassword(u)}>
                        Reset password
                      </button>
                      {u.status === "active" && (
                        <button type="button" className={btn} onClick={() => setStatus(u, "frozen")}>
                          Freeze
                        </button>
                      )}
                      {u.status === "frozen" && (
                        <button type="button" className={btn} onClick={() => setStatus(u, "active")}>
                          Unfreeze
                        </button>
                      )}
                      {u.status !== "deleted" ? (
                        <button type="button" className={`${btn} text-[var(--danger)]`} onClick={() => setStatus(u, "deleted")}>
                          Delete
                        </button>
                      ) : (
                        <button type="button" className={btn} onClick={() => setStatus(u, "active")}>
                          Restore
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "bets" && (
        <div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {(["open", "settled"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setBetStatus(s)}
                className={`rounded-lg border py-2 capitalize ${
                  betStatus === s ? "border-[var(--green)] text-[var(--green)]" : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {betUser && (
            <p className="mb-2 text-xs">
              Showing bets for <b>{betUser.name}</b>{" "}
              <button type="button" className="underline text-[var(--muted)]" onClick={() => setBetUser(null)}>
                show all
              </button>
            </p>
          )}
          {!bets && <p className="text-[var(--muted)]">Loading…</p>}
          {bets && bets.length === 0 && <p className="text-[var(--muted)]">No {betStatus} bets.</p>}
          <div className="space-y-2">
            {bets?.map((b) => (
              <div key={b.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">
                    {b.orbis_users?.leader_name ?? "?"}{" "}
                    <span className="text-[10px] font-normal text-[var(--muted)]">
                      {b.kind === "acca" ? `acca (${b.orbis_bet_legs.length})` : "single"}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase ${chip(b.status)}`}>
                    {b.status}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {b.orbis_bet_legs.map((l) => (
                    <li key={l.id} className="text-xs">
                      <span className="font-medium">{l.selection}</span>{" "}
                      <span className="text-[var(--green)]">@ {Number(l.price).toFixed(2)}</span>{" "}
                      <span className="text-[10px] text-[var(--muted)]">
                        {l.market_title} · {l.home} vs {l.away} · {l.status}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between text-xs">
                  <span>Stake {money(b.stake)}</span>
                  <span>Odds {Number(b.total_odds).toFixed(2)}</span>
                  <span>{b.status === "open" ? `To win ${money(b.potential_payout)}` : `Paid ${money(b.payout)}`}</span>
                </div>
                {b.status === "open" && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className={btn} onClick={() => resolve(b, "won")}>Won</button>
                    <button type="button" className={btn} onClick={() => resolve(b, "lost")}>Lost</button>
                    <button type="button" className={btn} onClick={() => resolve(b, "void")}>Cancel + refund</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "support" && !openTicket && (
        <div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {(["open", "closed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTicketStatus(s)}
                className={`rounded-lg border py-2 capitalize ${
                  ticketStatus === s ? "border-[var(--green)] text-[var(--green)]" : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {!tickets && <p className="text-[var(--muted)]">Loading…</p>}
          {tickets && tickets.length === 0 && <p className="text-[var(--muted)]">No {ticketStatus} tickets.</p>}
          <div className="space-y-2">
            {tickets?.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void openThread(t)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{t.subject}</span>
                  {t.status === "open" && t.last_sender === "user" && (
                    <span className="shrink-0 rounded-full border border-[var(--green)] px-2 py-0.5 text-[10px] uppercase text-[var(--green)]">
                      needs reply
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[10px] text-[var(--muted)]">
                  {t.orbis_users?.leader_name ?? "?"} · {new Date(t.updated_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "support" && openTicket && (
        <div>
          <button type="button" className="mb-2 text-xs text-[var(--muted)]" onClick={() => setOpenTicket(null)}>
            ← All tickets
          </button>
          <h2 className="font-semibold">{openTicket.subject}</h2>
          <p className="mb-2 text-[10px] text-[var(--muted)]">
            {openTicket.orbis_users?.leader_name} · Nation #{openTicket.orbis_users?.nation_id}
          </p>
          <div className="space-y-2">
            {thread.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-xl border p-2.5 ${
                  m.sender === "admin" ? "ml-auto border-[var(--green)] bg-[var(--card)]" : "border-[var(--border)] bg-[var(--bg)]"
                }`}
              >
                <div className="mb-0.5 text-[10px] text-[var(--muted)]">
                  {m.sender === "admin" ? "You" : "User"} · {new Date(m.created_at).toLocaleString()}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            ))}
          </div>
          <textarea
            className={`${input} mt-3`}
            rows={3}
            maxLength={2000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!reply.trim()}
              onClick={() => sendReply(false)}
              className="rounded-lg bg-[var(--green)] py-2.5 font-semibold text-black disabled:opacity-60"
            >
              Send
            </button>
            <button
              type="button"
              disabled={!reply.trim()}
              onClick={() => sendReply(true)}
              className="rounded-lg border border-[var(--border)] py-2.5 disabled:opacity-60"
            >
              Send + close
            </button>
          </div>
          {openTicket.status === "closed" && <p className="mt-2 text-[10px] text-[var(--muted)]">Replying reopens a closed ticket.</p>}
        </div>
      )}

      {tab === "log" && (
        <div>
          {!log && <p className="text-[var(--muted)]">Loading…</p>}
          {log && log.length === 0 && <p className="text-[var(--muted)]">Nothing logged yet.</p>}
          <div className="space-y-2">
            {log?.map((r) => (
              <div key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{r.action.replace("_", " ")}</span>
                  <span className="text-[10px] text-[var(--muted)]">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-[var(--muted)]">
                  {r.admin?.leader_name ?? "?"}
                  {r.target ? ` → ${r.target.leader_name}` : ""}
                </div>
                <div className="mt-1 break-words text-[10px] text-[var(--muted)]">
                  {Object.entries(r.details || {})
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
