import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const FLOOR = 3_000_000;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let quantity = 0;
  try {
    const body = await req.json();
    quantity = Math.floor(Number(body.quantity));
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Minimum buy is 1 share" }, { status: 400 });
  }
  if (quantity > 20_000) {
    return NextResponse.json({ error: "That is more than the total shares" }, { status: 400 });
  }

  // One database function does every check and change together, so two requests at the
  // same moment can't both spend the same money or take the same shares.
  const { data, error } = await supabaseAdmin().rpc("buy_shares", {
    p_user: userId,
    p_qty: quantity,
    p_floor: FLOOR,
  });

  if (error) {
    const m = error.message;
    const avail = /not_enough_shares:(\d+)/.exec(m);
    if (avail) {
      return NextResponse.json(
        { error: `Only ${Number(avail[1]).toLocaleString()} shares available` },
        { status: 400 }
      );
    }
    const need = /insufficient_balance:([\d.]+):([\d.]+)/.exec(m);
    if (need) {
      return NextResponse.json(
        { error: `Need $${Number(need[1]).toLocaleString()}, you have $${Number(need[2]).toLocaleString()}` },
        { status: 400 }
      );
    }
    if (m.includes("account_frozen")) {
      return NextResponse.json({ error: "Your account is frozen. Contact customer service." }, { status: 403 });
    }
    if (m.includes("bad_quantity")) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
    console.error("buy_shares failed:", m);
    return NextResponse.json({ error: "Could not buy shares" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `Bought ${quantity} share(s) for $${Number(data.cost).toLocaleString()}`,
    balance: Number(data.balance),
    yourShares: Number(data.shares),
    sharesForSale: Number(data.for_sale),
    currentPrice: Number(data.price),
  });
}
