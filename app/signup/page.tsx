"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Turnstile from "@/app/components/Turnstile";

function passwordOk(p: string) {
  return (
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p) &&
    p.length >= 8
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [nationId, setNationId] = useState("");
  const [leader, setLeader] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [keep, setKeep] = useState(true);
  const [age18, setAge18] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetCaptcha() {
    setCaptchaToken("");
    setCaptchaReset((n) => n + 1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nationId.trim() || !leader.trim() || !password) {
      setError("Nation ID, leader name, and password required.");
      return;
    }
    if (!/^\d+$/.test(nationId.trim())) {
      setError("Nation ID must be numbers only.");
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
    if (!age18) {
      setError("You must confirm you are 18+.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationId: nationId.trim(),
          leader: leader.trim(),
          password,
          keep,
          age18,
          captchaToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        resetCaptcha();
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error");
      resetCaptcha();
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
          <p className="mt-1 text-sm text-[var(--muted)]">Create your account</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Nation ID</label>
            <input type="text" inputMode="numeric" value={nationId} onChange={(e) => setNationId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Leader name</label>
            <input type="text" value={leader} onChange={(e) => setLeader(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]" />
            <p className="mt-1 text-xs text-[var(--muted)]">Must match the leader of that nation in the game</p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]" />
            <p className="mt-1 text-xs text-[var(--muted)]">Upper, lower, number, symbol, min 8</p>
          </div>
          <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="size-4 accent-[var(--green)]" />
            Keep me logged in
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input type="checkbox" checked={age18} onChange={(e) => setAge18(e.target.checked)} className="size-4 accent-[var(--green)]" />
            I confirm I am 18 or older
          </label>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-[var(--green)] py-2.5 font-semibold text-black disabled:opacity-60">
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          Already have an account? <Link href="/login" className="text-[var(--green)]">Log in</Link>
        </p>
        <p className="mt-3 text-center text-xs text-[var(--muted)]">18+ · PnW in-game only · Bet responsibly</p>
      </div>
    </main>
  );
}
