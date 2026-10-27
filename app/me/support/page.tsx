"use client";

import { useCallback, useEffect, useState } from "react";
import BottomNav from "@/app/components/BottomNav";

type Msg = { id: string; sender: "user" | "admin"; body: string; created_at: string };
type Ticket = {
  id: string;
  subject: string;
  status: "open" | "closed";
  last_sender: "user" | "admin";
  updated_at: string;
  orbis_ticket_messages: Msg[];
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatErr, setChatErr] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/support", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) setError(json.error || "Could not load");
      else setTickets(json.tickets);
    } catch {
      setError("Network error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not send");
        return;
      }
      setText("");
      setSubject("");
      await load();
      if (payload.action === "create" && json.id) setActive(json.id);
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    const q = chatText.trim();
    if (!q || chatBusy) return;
    const next = [...chat, { role: "user" as const, content: q }];
    setChat(next);
    setChatText("");
    setChatErr("");
    setChatBusy(true);
    try {
      const res = await fetch("/api/support/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setChatErr(json.error || "The assistant couldn't answer. Please open a ticket.");
        return;
      }
      setChat([...next, { role: "assistant" as const, content: json.reply }]);
    } catch {
      setChatErr("Network error");
    } finally {
      setChatBusy(false);
    }
  }

  const current = tickets?.find((t) => t.id === active) || null;
  const sortedMsgs = (t: Ticket) =>
    [...t.orbis_ticket_messages].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <main className="min-h-screen p-4 pb-24 max-w-lg mx-auto text-sm">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Customer service</h1>
        <a href="/me" className="text-xs text-[var(--muted)]">← Me</a>
      </div>
      {error && <p className="mb-2 text-[var(--danger)]">{error}</p>}

      {current ? (
        <div>
          <button type="button" className="mb-2 text-xs text-[var(--muted)]" onClick={() => setActive(null)}>
            ← All tickets
          </button>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">{current.subject}</h2>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase text-[var(--muted)]">
              {current.status}
            </span>
          </div>
          <div className="space-y-2">
            {sortedMsgs(current).map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-xl border p-2.5 ${
                  m.sender === "admin"
                    ? "border-[var(--green)] bg-[var(--card)]"
                    : "ml-auto border-[var(--border)] bg-[var(--bg)]"
                }`}
              >
                <div className="mb-0.5 text-[10px] text-[var(--muted)]">
                  {m.sender === "admin" ? "Support" : "You"} · {new Date(m.created_at).toLocaleString()}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Write a reply…"
            className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--green)]"
          />
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => send({ action: "reply", ticketId: current.id, body: text })}
            className="mt-2 w-full rounded-lg bg-[var(--green)] py-2.5 font-semibold text-black disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-[var(--green)] bg-[var(--card)] p-3">
            <h2 className="font-semibold">Ask our assistant</h2>
            <p className="mb-2 text-[11px] text-[var(--muted)]">
              Instant answers, any time. It can&apos;t change your account. For that, open a ticket below.
            </p>
            {chat.length > 0 && (
              <div className="mb-2 max-h-72 space-y-2 overflow-y-auto">
                {chat.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[90%] whitespace-pre-wrap break-words rounded-xl border p-2.5 text-xs ${
                      m.role === "assistant"
                        ? "border-[var(--green)] bg-[var(--bg)]"
                        : "ml-auto border-[var(--border)] bg-[var(--bg)]"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {chatBusy && <p className="text-xs text-[var(--muted)]">Thinking…</p>}
              </div>
            )}
            {chatErr && <p className="mb-2 text-xs text-[var(--danger)]">{chatErr}</p>}
            <div className="flex gap-2">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void ask()}
                maxLength={600}
                placeholder="e.g. How do accumulators work?"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
              />
              <button
                type="button"
                disabled={chatBusy || !chatText.trim()}
                onClick={() => void ask()}
                className="shrink-0 rounded-lg bg-[var(--green)] px-3 text-sm font-semibold text-black disabled:opacity-60"
              >
                Ask
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
            <h2 className="mb-2 font-semibold">New ticket</h2>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
              placeholder="Subject"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--green)]"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Tell us what's wrong"
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--green)]"
            />
            <button
              type="button"
              disabled={busy || !subject.trim() || !text.trim()}
              onClick={() => send({ action: "create", subject, body: text })}
              className="mt-2 w-full rounded-lg bg-[var(--green)] py-2.5 font-semibold text-black disabled:opacity-60"
            >
              {busy ? "Sending…" : "Submit"}
            </button>
          </div>

          <h2 className="mb-2 mt-5 font-semibold">Your tickets</h2>
          {!tickets && !error && <p className="text-[var(--muted)]">Loading…</p>}
          {tickets && tickets.length === 0 && <p className="text-[var(--muted)]">No tickets yet.</p>}
          <div className="space-y-2">
            {tickets?.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{t.subject}</span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase ${
                      t.last_sender === "admin" && t.status === "open"
                        ? "border-[var(--green)] text-[var(--green)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {t.status === "closed" ? "closed" : t.last_sender === "admin" ? "replied" : "waiting"}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-[var(--muted)]">
                  {new Date(t.updated_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      <BottomNav />
    </main>
  );
}
