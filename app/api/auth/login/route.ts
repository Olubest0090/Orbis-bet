import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword, setSession } from "@/lib/auth";
import { verifyTurnstile, clientIp } from "@/lib/captcha";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leader = String(body.leader || "").trim();
    const password = String(body.password || "");
    const keep = Boolean(body.keep);
    const captchaToken = String(body.captchaToken || "");

    if (!leader || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!(await verifyTurnstile(captchaToken, clientIp(req)))) {
      return NextResponse.json(
        { error: "Captcha failed. Try again." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    const { data: user, error } = await db
      .from("orbis_users")
      .select("id, password_hash")
      .eq("leader_lower", leader.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("login lookup failed:", error.message);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json(
        { error: "Invalid leader name or password" },
        { status: 401 }
      );
    }

    await setSession(user.id, keep ? 60 * 60 * 24 * 30 : 60 * 60 * 24);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
