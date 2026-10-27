import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { maybeSettle } from "@/lib/settle";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await maybeSettle();

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("orbis_bets")
    .select(
      "id, kind, stake, total_odds, potential_payout, payout, status, placed_at, settled_at, orbis_bet_legs(id, home, away, commence_time, market_title, selection, price, status)"
    )
    .eq("user_id", userId)
    .order("placed_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("bets list failed:", error.message);
    return NextResponse.json({ error: "Could not load bets" }, { status: 500 });
  }
  return NextResponse.json({ bets: data ?? [] });
}
