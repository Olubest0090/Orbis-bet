import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import BottomNav from "@/app/components/BottomNav";
import HomeMatchList from "@/app/components/HomeMatchList";
import Logo from "@/app/components/Logo";

function compact(n: number) {
  const abs = Math.abs(n);
  const fmt = (v: number, s: string) => `${Number(v.toFixed(2)).toString()}${s}`;
  if (abs >= 1e9) return fmt(n / 1e9, "b");
  if (abs >= 1e6) return fmt(n / 1e6, "m");
  if (abs >= 1e3) return fmt(n / 1e3, "k");
  return String(Math.round(n));
}

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

  const balance = Number(user.balance || 0);

  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[rgba(6,9,20,0.72)] px-4 py-3 backdrop-blur">
        <Logo />
        <a href="/me" className="balance-pill">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2Zm14 7h.01" />
          </svg>
          ${compact(balance)}
        </a>
      </header>

      <div className="px-4 pt-4">
        <div className="hero">
          <p className="text-xs text-[var(--muted)]">Welcome back</p>
          <p className="text-2xl font-bold leading-tight">{user.leader_name}</p>
          <p className="text-xs text-[var(--muted)]">Nation #{user.nation_id}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-black/25 p-3">
              <p className="text-[10.5px] text-[var(--muted)]">Balance</p>
              <p className="truncate font-bold">${balance.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-black/25 p-3">
              <p className="text-[10.5px] text-[var(--muted)]">Shares</p>
              <p className="font-bold">{Number(user.shares || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plain <a> for reliable mobile navigation */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4">
        <a href="/football" className="pill pill-on">Football</a>
        <a href="/bets" className="pill">My Bets</a>
        <a href="/me/shares" className="pill">Shares</a>
        <a href="/me/support" className="pill">Support</a>
      </div>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between px-4">
          <h2 className="text-sm font-semibold text-[var(--muted)]">Upcoming matches</h2>
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
