import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword, setSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leader = String(body.leader || "").trim();
    const password = String(body.password || "");
    const keep = Boolean(body.keep);

    if (!leader || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: user, error } = await db
      .from("orbis_users")
      .select("id, password_hash")
      .ilike("leader_name", leader)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
