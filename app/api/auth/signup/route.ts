import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

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
    const nationId = Number(String(body.nationId || "").trim());
    const leader = String(body.leader || "").trim();
    const password = String(body.password || "");
    const age18 = Boolean(body.age18);

    if (!nationId || !leader || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!passwordOk(password)) {
      return NextResponse.json(
        { error: "Password needs upper, lower, number, symbol, 8+ chars" },
        { status: 400 }
      );
    }
    if (!age18) {
      return NextResponse.json({ error: "Must be 18+" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const password_hash = await hashPassword(password);
    const { error } = await db.from("orbis_users").insert({
      nation_id: nationId,
      leader_name: leader,
      password_hash,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Nation ID or leader name already registered" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
