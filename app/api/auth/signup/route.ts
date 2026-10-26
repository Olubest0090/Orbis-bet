import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword, setSession } from "@/lib/auth";
import { verifyTurnstile, clientIp } from "@/lib/captcha";
import { fetchNation } from "@/lib/pnw";

function passwordOk(p: string) {
  return (
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p) &&
    p.length >= 8
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nationIdRaw = String(body.nationId || "").trim();
    const leader = String(body.leader || "").trim();
    const password = String(body.password || "");
    const age18 = Boolean(body.age18);
    const keep = Boolean(body.keep);
    const captchaToken = String(body.captchaToken || "");

    if (!nationIdRaw || !leader || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!/^\d{1,9}$/.test(nationIdRaw)) {
      return NextResponse.json(
        { error: "Nation ID must be numbers only" },
        { status: 400 }
      );
    }
    const nationId = Number(nationIdRaw);
    if (!passwordOk(password)) {
      return NextResponse.json(
        { error: "Password needs upper, lower, number, symbol, 8+ chars" },
        { status: 400 }
      );
    }
    if (!age18) {
      return NextResponse.json({ error: "Must be 18+" }, { status: 400 });
    }
    if (!(await verifyTurnstile(captchaToken, clientIp(req)))) {
      return NextResponse.json(
        { error: "Captcha failed. Try again." },
        { status: 400 }
      );
    }

    // Verify the nation exists and the leader name matches it.
    let nation;
    try {
      nation = await fetchNation(nationId);
    } catch (e) {
      console.error("P&W lookup failed:", e);
      return NextResponse.json(
        { error: "Could not reach Politics & War. Try again shortly." },
        { status: 502 }
      );
    }
    if (!nation) {
      return NextResponse.json({ error: "Nation ID not found" }, { status: 400 });
    }
    if (nation.leader_name.trim().toLowerCase() !== leader.toLowerCase()) {
      return NextResponse.json(
        { error: "Leader name does not match that nation" },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    const password_hash = await hashPassword(password);
    const { data: created, error } = await db
      .from("orbis_users")
      .insert({
        nation_id: nationId,
        leader_name: nation.leader_name.trim(), // canonical spelling from the game
        password_hash,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Nation ID or leader name already registered" },
          { status: 409 }
        );
      }
      console.error("signup insert failed:", error.message);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    await setSession(created.id, keep ? 60 * 60 * 24 * 30 : 60 * 60 * 24);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("signup error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
