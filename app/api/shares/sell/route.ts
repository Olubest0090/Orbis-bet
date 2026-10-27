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
    return NextResponse.json({ error: "Minimum sell is 1 share" }, { status: 400 });
  }
  if (quantity > 20_000) {
    return NextResponse.json({ error: "That is more than the total shares" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin().rpc("sell_shares", {
    p_user: userId,
    p_qty: quantity,
    p_floor: FLOOR,
  });

  if (error) {
    const m = error.message;
    const held = /not_enough_held:([\d.]+)/.exec(m);
    if (held) {
      return NextResponse.json(
        { error: `You only have ${Number(held[1]).toLocaleString()} share(s)` },
        { status: 400 }
      );
    }
    if (m.includes("account_frozen")) {
      return NextResponse.json({ error: "Your account is frozen. Contact customer service." }, { status: 403 });
    }
    if (m.includes("capital_insufficient")) {
      return NextResponse.json(
        { error: "The share market can't buy that many back right now. Open a ticket." },
        { status: 400 }
      );
    }
    if (m.includes("bad_quantity")) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
    console.error("sell_shares failed:", m);
    return NextResponse.json({ error: "Could not sell shares" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `Sold ${quantity} share(s) for $${Number(data.credit).toLocaleString()} (after 10%)`,
    balance: Number(data.balance),
    yourShares: Number(data.shares),
    sharesForSale: Number(data.for_sale),
    currentPrice: Number(data.price),
  });
}
