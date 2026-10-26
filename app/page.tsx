import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import BottomNav from "@/app/components/BottomNav";
import HomeMatchList from "@/app/components/HomeMatchList";

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

      {/* Plain <a> for reliable mobile navigation */}
      <div className="mt-4 flex gap-3 overflow-x-auto px-4 text-sm">
        <a
          href="/football"
          className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5"
        >
          Football
        </a>
        <a
          href="/football"
          className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5"
        >
          Live
        </a>
        <a
          href="/me"
          className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5"
        >
          My Bets
        </a>
        <a
          href="/me/shares"
          className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5"
        >
          Shares
        </a>
      </div>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between px-4">
          <h2 className="text-sm font-semibold text-[var(--muted)]">
            LIVE · Matches
          </h2>
          <a href="/football" className="text-xs text-[var(--green)]">
            Full list
          </a>
        </div>
        <HomeMatchList />
      </section>

      <BottomNav />
    </main>
  );
}
