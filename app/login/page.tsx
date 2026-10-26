"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Turnstile from "@/app/components/Turnstile";

export default function LoginPage() {
  const router = useRouter();
  const [leader, setLeader] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [keep, setKeep] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!leader.trim() || !password) {
      setError("Leader name and password required.");
      return;
    }
    if (!captchaToken) {
      setError("Complete the captcha.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leader: leader.trim(),
          password,
          keep,
          captchaToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Login failed (${res.status})`);
        setCaptchaToken("");
        setCaptchaReset((n) => n + 1);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error");
      setCaptchaToken("");
      setCaptchaReset((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold">
            <span className="text-[var(--green)]">Orbis</span> Bet
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">Sign in to continue</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Leader name</label>
            <input type="text" value={leader} onChange={(e) => setLeader(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]" />
          </div>
          <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="size-4 accent-[var(--green)]" />
            Keep me logged in
          </label>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-[var(--green)] py-2.5 font-semibold text-black disabled:opacity-60">
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          No account? <Link href="/signup" className="text-[var(--green)]">Sign up</Link>
        </p>
        <p className="mt-3 text-center text-xs text-[var(--muted)]">18+ · In-game only · Bet responsibly</p>
      </div>
    </main>
  );
}
