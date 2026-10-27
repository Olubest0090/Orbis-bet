import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, friendlyError } from "@/lib/admin";
import { settleOpenBets } from "@/lib/settle";
import { parseAmount } from "@/lib/betting";
import { sendPnwMessage } from "@/lib/pnw";
import { hashCode, makeCode, prettyCode } from "@/lib/resetcode";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://orbis-bet.vercel.app";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esc = (s: string) => s.replace(/[\\%_,()]/g, "\\$&");
const reasonOf = (v: unknown) => String(v ?? "").trim().slice(0, 200);

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const a = sp.get("a") || "stats";
  const db = supabaseAdmin();

  if (a === "stats") {
    const { data, error } = await db.rpc("admin_stats");
    if (error) return NextResponse.json({ error: "Could not load stats" }, { status: 500 });
    return NextResponse.json({ stats: data });
  }

  if (a === "users") {
    const q = (sp.get("q") || "").trim().slice(0, 50);
    let query = db
      .from("orbis_users")
      .select("id, leader_name, nation_id, balance, shares, status, is_admin, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (q) {
      query = /^\d+$/.test(q)
        ? query.eq("nation_id", Number(q))
        : query.ilike("leader_lower", `%${esc(q.toLowerCase())}%`);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Could not load users" }, { status: 500 });
    return NextResponse.json({ users: data });
  }

  if (a === "bets") {
    const status = sp.get("status") || "open";
    const userId = sp.get("userId") || "";
    let query = db
      .from("orbis_bets")
      .select(
        "id, kind, stake, total_odds, potential_payout, payout, status, placed_at, orbis_users(leader_name, nation_id), orbis_bet_legs(id, home, away, market_title, selection, price, status, commence_time)"
      )
      .order("placed_at", { ascending: false })
      .limit(50);
    if (status === "open") query = query.eq("status", "open");
    else if (status === "settled") query = query.neq("status", "open");
    if (userId && UUID.test(userId)) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Could not load bets" }, { status: 500 });
    return NextResponse.json({ bets: data });
  }

  if (a === "tickets") {
    const status = sp.get("status") === "closed" ? "closed" : "open";
    const { data, error } = await db
      .from("orbis_tickets")
      .select("id, subject, status, last_sender, updated_at, orbis_users(leader_name, nation_id)")
      .eq("status", status)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: "Could not load tickets" }, { status: 500 });
    return NextResponse.json({ tickets: data });
  }

  if (a === "ticket") {
    const id = sp.get("id") || "";
    if (!UUID.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
    const { data, error } = await db
      .from("orbis_ticket_messages")
      .select("id, sender, body, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) return NextResponse.json({ error: "Could not load ticket" }, { status: 500 });
    return NextResponse.json({ messages: data });
  }

  if (a === "log") {
    const { data, error } = await db
      .from("orbis_admin_log")
      .select(
        "id, action, details, created_at, admin:orbis_users!admin_id(leader_name), target:orbis_users!target_user(leader_name)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: "Could not load log" }, { status: 500 });
    return NextResponse.json({ log: data });
  }

  return NextResponse.json({ error: "Unknown request" }, { status: 400 });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const action = String(body.action || "");
  const db = supabaseAdmin();

  if (action === "adjust") {
    const userId = String(body.userId || "");
    const raw = String(body.amount ?? "").trim();
    const negative = raw.startsWith("-");
    const parsed = parseAmount(raw.replace(/^[+-]/, ""));
    if (!UUID.test(userId) || parsed === null || parsed <= 0) {
      return NextResponse.json({ error: "Enter an amount like 5m, 500k or -250k" }, { status: 400 });
    }
    const { data, error } = await db.rpc("admin_adjust_balance", {
      p_admin: admin.id,
      p_user: userId,
      p_amount: negative ? -parsed : parsed,
      p_reason: reasonOf(body.reason),
    });
    if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 400 });
    return NextResponse.json({ ok: true, balance: data });
  }

  if (action === "status") {
    const userId = String(body.userId || "");
    const status = String(body.status || "");
    if (!UUID.test(userId) || !["active", "frozen", "deleted"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { error } = await db.rpc("admin_set_status", {
      p_admin: admin.id,
      p_user: userId,
      p_status: status,
      p_reason: reasonOf(body.reason),
    });
    if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "resolve") {
    const betId = String(body.betId || "");
    const result = String(body.result || "");
    if (!UUID.test(betId) || !["won", "lost", "void"].includes(result)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { error } = await db.rpc("admin_resolve_bet", {
      p_admin: admin.id,
      p_bet: betId,
      p_result: result,
      p_reason: reasonOf(body.reason),
    });
    if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "reply" || action === "ticket_status") {
    const ticketId = String(body.ticketId || "");
    if (!UUID.test(ticketId)) return NextResponse.json({ error: "Bad ticket" }, { status: 400 });
    const text = String(body.body || "").trim().slice(0, 2000);
    const status = body.status === "closed" ? "closed" : "open";

    if (action === "reply") {
      if (!text) return NextResponse.json({ error: "Write a reply" }, { status: 400 });
      const { error } = await db
        .from("orbis_ticket_messages")
        .insert({ ticket_id: ticketId, sender: "admin", body: text });
      if (error) return NextResponse.json({ error: "Could not send" }, { status: 500 });
    }
    const { error: upErr } = await db
      .from("orbis_tickets")
      .update({
        status,
        ...(action === "reply" ? { last_sender: "admin" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);
    if (upErr) return NextResponse.json({ error: "Could not update ticket" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "send_reset_code") {
    const userId = String(body.userId || "");
    if (!UUID.test(userId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { data: target } = await db
      .from("orbis_users")
      .select("id, nation_id, leader_name, status, is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (!target || target.status === "deleted") {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (target.is_admin) {
      return NextResponse.json({ error: "You can't reset another admin's password here" }, { status: 400 });
    }

    const { data: last } = await db
      .from("orbis_reset_codes")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < 2 * 60 * 1000) {
      return NextResponse.json({ error: "A code was just sent. Wait 2 minutes before sending another." }, { status: 429 });
    }

    const code = makeCode();
    const { data: row, error: insErr } = await db
      .from("orbis_reset_codes")
      .insert({
        user_id: userId,
        code_hash: hashCode(userId, code),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (insErr || !row) return NextResponse.json({ error: "Could not create a code" }, { status: 500 });

    try {
      await sendPnwMessage(
        target.nation_id,
        "Orbis Bet password reset",
        `<p>Your Orbis Bet password reset code is <b>${prettyCode(code)}</b>.</p>` +
          `<p>It expires in 15 minutes. Open ${SITE}/reset and enter it with your leader name and a new password.</p>` +
          `<p>If you did not ask for this, ignore this message.</p>`
      );
    } catch (e) {
      await db.from("orbis_reset_codes").delete().eq("id", row.id);
      console.error("reset message failed:", e);
      const why = e instanceof Error ? e.message : "unknown error";
      return NextResponse.json({ error: `Could not send the in-game message: ${why}` }, { status: 502 });
    }

    await db.from("orbis_admin_log").insert({
      admin_id: admin.id,
      action: "password_reset_code",
      target_user: userId,
      details: { nation_id: target.nation_id },
    });
    return NextResponse.json({ ok: true, nation_id: target.nation_id });
  }

  if (action === "settle_now") {
    const stats = await settleOpenBets();
    await db.from("orbis_admin_log").insert({ admin_id: admin.id, action: "settle_now", details: stats });
    return NextResponse.json({ ok: true, ...stats });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
