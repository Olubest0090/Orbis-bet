import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import BottomNav from "@/app/components/BottomNav";

const CHIPS: { href: string; label: string }[] = [
  { href: "/football", label: "Football" },
  { href: "/football", label: "Live" },
  { href: "/me", label: "My Bets" },
  { href: "/me/shares", label: "Shares" },
];

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
        {CHIPS.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5"
          >
            {c.label}
          </Link>
        ))}
      </div>

      <section className="mt-4 px-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--muted)]">HOT · Matches</h2>
          <Link href="/football" className="text-xs text-[var(--green)]">
            View all
          </Link>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted)]">
            Open Football for live odds from the feed.
          </p>
          <Link
            href="/football"
            className="mt-3 block w-full rounded-xl bg-[var(--green)] py-3 text-center text-sm font-semibold text-black"
          >
            Open Football
          </Link>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
