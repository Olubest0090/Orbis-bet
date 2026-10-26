import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

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
  return NextResponse.json(
    {
      error:
        "Share ledger not live yet. UI works; buy/sell will debit balance and move shares next.",
    },
    { status: 501 }
  );
}
