import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTurnstile, clientIp } from "@/lib/captcha";
import { issueResetCode } from "@/lib/resetflow";

const PER_USER_PER_HOUR = 3;
const COOLDOWN_MS = 2 * 60 * 1000;
const GLOBAL_PER_HOUR = 40; // protects the in-game account that sends the messages

const OK_MESSAGE =
  "If those details match an account, a code was sent to that nation's in-game inbox. It works for 15 minutes.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leader = String(body.leader || "").trim();
    const nationRaw = String(body.nationId || "").trim();
    const captchaToken = String(body.captchaToken || "");

    if (!leader || !/^\d{1,9}$/.test(nationRaw)) {
      return NextResponse.json({ error: "Enter your leader name and nation ID" }, { status: 400 });
    }
    if (!(await verifyTurnstile(captchaToken, clientIp(req)))) {
      return NextResponse.json({ error: "Captcha failed. Try again." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count: globalCount } = await db
      .from("orbis_reset_codes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", hourAgo);
    if ((globalCount ?? 0) >= GLOBAL_PER_HOUR) {
      return NextResponse.json({ error: "Too many requests right now. Try again later." }, { status: 429 });
    }

    // From here on every outcome returns the same message, so nobody can use this form
    // to find out which accounts exist.
    const { data: user } = await db
      .from("orbis_users")
      .select("id, nation_id, status, is_admin")
      .eq("leader_lower", leader.toLowerCase())
      .eq("nation_id", Number(nationRaw))
      .maybeSingle();
    if (!user || user.status === "deleted" || user.is_admin) {
      return NextResponse.json({ ok: true, message: OK_MESSAGE });
    }

    const { data: recent } = await db
      .from("orbis_reset_codes")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", hourAgo)
      .order("created_at", { ascending: false });
    const sentLastHour = recent?.length ?? 0;
    const last = recent?.[0] ? new Date(recent[0].created_at).getTime() : 0;
    if (sentLastHour >= PER_USER_PER_HOUR || Date.now() - last < COOLDOWN_MS) {
      return NextResponse.json({ ok: true, message: OK_MESSAGE });
    }

    const result = await issueResetCode(db, user);
    if (!result.ok) {
      console.error("forgot-password send failed:", result.error);
      await db.from("orbis_admin_log").insert({
        action: "password_reset_send_failed",
        target_user: user.id,
        details: { nation_id: user.nation_id, error: result.error },
      });
    }
    return NextResponse.json({ ok: true, message: OK_MESSAGE });
  } catch (e) {
    console.error("forgot error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
