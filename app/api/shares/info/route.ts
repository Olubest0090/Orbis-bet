import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: user } = await db
    .from("orbis_users")
    .select("balance, shares")
    .eq("id", userId)
    .single();

  const yourShares = Number(user?.shares ?? 0);
  const totalShares = 20_000;
  const poolPercent = totalShares > 0 ? (yourShares / totalShares) * 100 : 0;

  return NextResponse.json({
    yourShares,
    poolPercent,
    lastDividend: 0,
    totalDividends: 0,
    balance: Number(user?.balance ?? 0),
    currentPrice: 5_000_000,
    sharesForSale: 12_000,
    totalShares,
  });
}
