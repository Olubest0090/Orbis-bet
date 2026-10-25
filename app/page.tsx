import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export default async function HomePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const db = supabaseAdmin();
  const { data: user } = await db
    .from("orbis_users")
    .select("leader_name, nation_id, balance, shares")
    .eq("id", userId)
    .single();

  if (!user) redirect("/login");

  const bal = Number(user.balance || 0).toLocaleString();

  return (
    <main className="min-h-screen pb-24">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="text-lg font-bold">
          <span className="text-[var(--green)]">Orbis</span> Bet
        </div>
        <div className="rounded-full border border-[var(--green)] px-3 py-1 text-sm text-[var(--green)]">
          ${bal}
        </div>
      </header>

      <div className="px-4 pt-4">
        <p className="text-sm text-[var(--muted)]">Signed in as</p>
        <p className="font-semibold">{user.leader_name}</p>
        <p className="text-xs text-[var(--muted)]">Nation #{user.nation_id}</p>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto px-4 text-sm">
        {["Football", "Live", "My Bets", "Shares"].map((t) => (
          <span key={t} className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">
            {t}
          </span>
        ))}
      </div>

      <section className="mt-4 px-4">
        <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">HOT · Matches</h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted)]">Placeholder · odds API later</p>
          <div className="mt-2 flex justify-between text-sm font-medium">
            <span>Home</span>
            <span className="text-[var(--muted)]">vs</span>
            <span>Away</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[["1", "1.85"], ["X", "3.40"], ["2", "4.20"]].map(([k, o]) => (
              <button key={k} type="button" className="rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2">
                <div className="text-xs text-[var(--muted)]">{k}</div>
                <div className="font-semibold text-[var(--green)]">{o}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-3 px-4">
        <Link href="/me/deposit" className="rounded-xl bg-[var(--green)] py-3 text-center text-sm font-semibold text-black">Deposit</Link>
        <Link href="/me/withdraw" className="rounded-xl border border-[var(--green)] py-3 text-center text-sm font-semibold text-[var(--green)]">Withdraw</Link>
        <Link href="/me/shares" className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 text-center text-sm font-semibold">Shares</Link>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-[var(--border)] bg-[var(--card)] text-xs">
        {[
          ["/", "Home"],
          ["/me", "Me"],
          ["/api/auth/logout", "Log out"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="flex-1 py-3 text-center text-[var(--muted)]">
            {label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
