import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import BottomNav from "@/app/components/BottomNav";
import HomeMatchList from "@/app/components/HomeMatchList";

export default async function FootballPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <main className="min-h-screen pb-24 max-w-lg mx-auto">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-xl font-bold">Football</h1>
        <Link href="/" className="text-sm text-[var(--muted)]">
          Home
        </Link>
      </div>
      <HomeMatchList />
      <BottomNav />
    </main>
  );
}
