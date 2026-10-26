import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let amount = 0;
  try {
    const body = await req.json();
    amount = Number(body.amount);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount < 100_000) {
    return NextResponse.json(
      { error: "Amount must be at least $100,000" },
      { status: 400 }
    );
  }

  // Trade accept + balance credit not wired yet (needs confirmed P&W mutation / manual flow).
  return NextResponse.json(
    {
      error:
        "Accept trade is not connected to Politics & War yet. UI works; auto-accept comes next.",
    },
    { status: 501 }
  );
}
