import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let amount = 0;
  let nationId = 0;
  try {
    const body = await req.json();
    amount = Number(body.amount);
    nationId = Number(body.nationId);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount < 100_000) {
    return NextResponse.json(
      { error: "Amount must be at least $100,000" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(nationId) || nationId <= 0) {
    return NextResponse.json({ error: "Invalid nation ID" }, { status: 400 });
  }

  return NextResponse.json(
    {
      error:
        "Withdraw send is not connected yet. UI works; bank payout comes after deposit/mod path is clear.",
    },
    { status: 501 }
  );
}
