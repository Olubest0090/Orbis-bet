"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Turnstile from "@/app/components/Turnstile";
import Logo from "@/app/components/Logo";

function passwordOk(p: string) {
  return /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p) && p.length >= 8;
}

export default function ResetPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "enter">("request");
  const [leader, setLeader] = useState("");
  const [nationId, setNationId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const input =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 outline-none focus:border-[var(--green)]";

  function newCaptcha() {
    setCaptchaToken("");
    setCaptchaReset((n) => n + 1);
  }

  function goTo(next: "request" | "enter") {
    setStep(next);
    setError("");
    newCaptcha();
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!leader.trim() || !/^\d+$/.test(nationId.trim())) {
      setError("Enter your leader name and nation ID (numbers only).");
      return;
    }
    if (!captchaToken) {
      setError("Complete the captcha.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leader: leader.trim(), nationId: nationId.trim(), captchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send a code");
        newCaptcha();
        return;
      }
      setInfo(data.message || "");
      goTo("enter");
    } catch {
      setError("Network error");
      newCaptcha();
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
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
        newCaptcha();
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      setError("Network error");
      newCaptcha();
    } finally {
      setLoading(false);
    }
  }

  const button =
    "w-full rounded-lg bg-[var(--green)] py-2.5 font-semibold text-black disabled:opacity-60";

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
        <div className="mb-5 text-center">
          <div className="flex justify-center"><Logo size={38} /></div>
          <p className="mt-1 text-sm text-[var(--muted)]">Reset your password</p>
        </div>

        {done ? (
          <p className="text-center text-[var(--green)]">Password changed. Taking you to log in…</p>
        ) : step === "request" ? (
          <form onSubmit={requestCode} className="space-y-4">
            <p className="text-xs text-[var(--muted)]">
              We&apos;ll send a one-time code to your nation&apos;s in-game inbox. Only you can read it, so that&apos;s how
              we know it&apos;s you.
            </p>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Leader name</label>
              <input className={input} value={leader} onChange={(e) => setLeader(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Nation ID</label>
              <input className={input} inputMode="numeric" value={nationId} onChange={(e) => setNationId(e.target.value)} />
            </div>
            <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <button type="submit" disabled={loading} className={button}>
              {loading ? "Sending…" : "Send code to my in-game inbox"}
            </button>
            <button type="button" onClick={() => goTo("enter")} className="w-full text-sm text-[var(--muted)] underline">
              I already have a code
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="space-y-4">
            {info && <p className="rounded-lg border border-[var(--border)] p-2 text-xs text-[var(--muted)]">{info}</p>}
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
            <button type="submit" disabled={loading} className={button}>
              {loading ? "Saving…" : "Set new password"}
            </button>
            <button type="button" onClick={() => goTo("request")} className="w-full text-sm text-[var(--muted)] underline">
              Send me a new code
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
