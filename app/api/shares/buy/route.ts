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
  if (quantity < 1) {
    return NextResponse.json({ error: "Minimum buy is 1 share" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: state, error: stateErr } = await db
    .from("orbis_share_state")
    .select("*")
    .eq("id", 1)
    .single();
  if (stateErr || !state) {
    return NextResponse.json(
      { error: "Share market not initialized. Run SQL share_state.sql in Supabase." },
      { status: 500 }
    );
  }

  const price = Math.max(FLOOR, Number(state.current_price));
  const forSale = Number(state.shares_for_sale);
  if (quantity > forSale) {
    return NextResponse.json(
      { error: `Only ${forSale.toLocaleString()} shares available` },
      { status: 400 }
    );
  }

  const cost = quantity * price;

  const { data: user, error: userErr } = await db
    .from("orbis_users")
    .select("balance, shares")
    .eq("id", userId)
    .single();
  if (userErr || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const balance = Number(user.balance);
  if (balance < cost) {
    return NextResponse.json(
      { error: `Need $${cost.toLocaleString()}, you have $${balance.toLocaleString()}` },
      { status: 400 }
    );
  }

  const newBalance = balance - cost;
  const newShares = Number(user.shares) + quantity;
  const newForSale = forSale - quantity;

  const { error: uErr } = await db
    .from("orbis_users")
    .update({ balance: newBalance, shares: newShares })
    .eq("id", userId)
    .gte("balance", cost);
  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  const { error: sErr } = await db
    .from("orbis_share_state")
    .update({
      shares_for_sale: newForSale,
      current_price: price,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .gte("shares_for_sale", quantity);
  if (sErr) {
    // best-effort rollback user
    await db
      .from("orbis_users")
      .update({ balance, shares: user.shares })
      .eq("id", userId);
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `Bought ${quantity} share(s) for $${cost.toLocaleString()}`,
    balance: newBalance,
    yourShares: newShares,
    sharesForSale: newForSale,
    currentPrice: price,
  });
}
