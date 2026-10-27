"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Turnstile from "@/app/components/Turnstile";

function passwordOk(p: string) {
  return /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p) && p.length >= 8;
}

export default function ResetPage() {
  const router = useRouter();
  const [leader, setLeader] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const input =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!leader.trim() || !code.trim() || !password) {
      setError("Fill in every field.");
      return;
    }
    if (!passwordOk(password)) {
      setError("Password needs upper, lower, number, symbol, 8+ chars.");
      return;
    }
    if (!captchaToken) {
      setError("Complete the captcha.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leader: leader.trim(), code, password, captchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reset password");
        setCaptchaToken("");
        setCaptchaReset((n) => n + 1);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
        <div className="mb-5 text-center">
          <div className="text-2xl font-bold">
            <span className="text-[var(--green)]">Orbis</span> Bet
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">Reset your password</p>
        </div>

        {done ? (
          <p className="text-center text-[var(--green)]">Password changed. Taking you to log in…</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-xs text-[var(--muted)]">
              Forgot your password? Ask support to send you a code. It arrives as an in-game message and works for 15 minutes.
            </p>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Leader name</label>
              <input className={input} value={leader} onChange={(e) => setLeader(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Code from your in-game message</label>
              <input
                className={`${input} uppercase tracking-widest`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ABCD-EFGH"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">New password</label>
              <input type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="mt-1 text-xs text-[var(--muted)]">Upper, lower, number, symbol, min 8</p>
            </div>
            <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--green)] py-2.5 font-semibold text-black disabled:opacity-60"
            >
              {loading ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          <Link href="/login" className="text-[var(--green)]">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}
