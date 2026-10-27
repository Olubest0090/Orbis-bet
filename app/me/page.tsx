import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import BottomNav from "@/app/components/BottomNav";

export default async function MePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const db = supabaseAdmin();
  const { data: user } = await db
    .from("orbis_users")
    .select("leader_name, nation_id, balance, shares, status, is_admin")
    .eq("id", userId)
    .single();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen p-4 pb-24 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Me</h1>

      {user.status === "frozen" && (
        <div className="mb-4 rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">
          Your account is frozen. You can look around but can&apos;t bet or move money. Contact customer service.
        </div>
      )}

      <p className="text-sm text-[var(--muted)]">Leader</p>
      <p className="font-semibold">{user.leader_name}</p>
      <p className="text-xs text-[var(--muted)]">Nation #{user.nation_id}</p>
      <p className="mt-3 text-2xl font-bold text-[var(--green)]">
        ${Number(user.balance).toLocaleString()}
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Link href="/me/deposit" className="rounded-xl bg-[var(--green)] py-3 text-center text-sm font-semibold text-black">Deposit</Link>
        <Link href="/me/withdraw" className="rounded-xl border border-[var(--green)] py-3 text-center text-sm font-semibold text-[var(--green)]">Withdraw</Link>
        <Link href="/me/shares" className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 text-center text-sm font-semibold">Shares</Link>
      </div>
      <Link href="/me/support" className="mt-3 block rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 text-center text-sm font-semibold">
        Customer service
      </Link>
      {user.is_admin && (
        <Link href="/admin" className="mt-3 block rounded-xl border border-[var(--green)] py-3 text-center text-sm font-semibold text-[var(--green)]">
          Admin dashboard
        </Link>
      )}
      <BottomNav />
    </main>
  );
}
