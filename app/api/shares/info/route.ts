import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const [{ data: user }, { data: state }] = await Promise.all([
    db
      .from("orbis_users")
      .select("balance, shares, last_dividend, total_dividends")
      .eq("id", userId)
      .single(),
    db.from("orbis_share_state").select("*").eq("id", 1).single(),
  ]);

  const yourShares = Number(user?.shares ?? 0);
  const totalShares = Number(state?.total_shares ?? 20_000);
  const poolPercent = totalShares > 0 ? (yourShares / totalShares) * 100 : 0;

  return NextResponse.json({
    yourShares,
    poolPercent,
    lastDividend: Number(user?.last_dividend ?? 0),
    totalDividends: Number(user?.total_dividends ?? 0),
    balance: Number(user?.balance ?? 0),
    currentPrice: Number(state?.current_price ?? 5_000_000),
    sharesForSale: Number(state?.shares_for_sale ?? 12_000),
    totalShares,
  });
}
