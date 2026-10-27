import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";
import { verifyTurnstile, clientIp } from "@/lib/captcha";
import { hashCode, normalizeCode, safeEqual } from "@/lib/resetcode";

const MAX_ATTEMPTS = 5;
const BAD = "Invalid or expired code";

function passwordOk(p: string) {
  return /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p) && p.length >= 8;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leader = String(body.leader || "").trim();
    const code = normalizeCode(String(body.code || ""));
    const password = String(body.password || "");
    const captchaToken = String(body.captchaToken || "");

    if (!leader || code.length !== 8 || !password) {
      return NextResponse.json({ error: "Fill in every field" }, { status: 400 });
    }
    if (!passwordOk(password)) {
      return NextResponse.json(
        { error: "Password needs upper, lower, number, symbol, 8+ chars" },
        { status: 400 }
      );
    }
    if (!(await verifyTurnstile(captchaToken, clientIp(req)))) {
      return NextResponse.json({ error: "Captcha failed. Try again." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: user } = await db
      .from("orbis_users")
      .select("id, status, token_version")
      .eq("leader_lower", leader.toLowerCase())
      .maybeSingle();
    if (!user || user.status === "deleted") {
      return NextResponse.json({ error: BAD }, { status: 400 });
    }

    const { data: row } = await db
      .from("orbis_reset_codes")
      .select("id, code_hash, expires_at, attempts")
      .eq("user_id", user.id)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: BAD }, { status: 400 });
    }

    if (!safeEqual(hashCode(user.id, code), row.code_hash)) {
      await db
        .from("orbis_reset_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id)
        .is("used_at", null);
      return NextResponse.json({ error: BAD }, { status: 400 });
    }

    // Claim the code so it can only be used once.
    const { data: claimed } = await db
      .from("orbis_reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("used_at", null)
      .select("id");
    if (!claimed?.length) return NextResponse.json({ error: BAD }, { status: 400 });

    const { error } = await db
      .from("orbis_users")
      .update({
        password_hash: await hashPassword(password),
        token_version: Number(user.token_version) + 1, // signs out every old session
      })
      .eq("id", user.id);
    if (error) {
      console.error("password reset update failed:", error.message);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // Burn any other pending codes.
    await db
      .from("orbis_reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
