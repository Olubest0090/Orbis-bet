import { NextResponse } from "next/server";
import { settleOpenBets } from "@/lib/settle";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stats = await settleOpenBets();
  return NextResponse.json({ ok: true, ...stats });
}
