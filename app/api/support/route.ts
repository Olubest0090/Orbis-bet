import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_OPEN = 3;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("orbis_tickets")
    .select("id, subject, status, last_sender, updated_at, orbis_ticket_messages(id, sender, body, created_at)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("support list failed:", error.message);
    return NextResponse.json({ error: "Could not load tickets" }, { status: 500 });
  }
  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let body: { action?: string; subject?: string; body?: string; ticketId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const text = String(body.body || "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "Write a message" }, { status: 400 });
  const db = supabaseAdmin();

  if (body.action === "create") {
    const subject = String(body.subject || "").trim().slice(0, 100);
    if (!subject) return NextResponse.json({ error: "Add a subject" }, { status: 400 });

    const { count } = await db
      .from("orbis_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "open");
    if ((count ?? 0) >= MAX_OPEN) {
      return NextResponse.json(
        { error: `You already have ${MAX_OPEN} open tickets. Wait for a reply or close one.` },
        { status: 429 }
      );
    }

    const { data: t, error } = await db
      .from("orbis_tickets")
      .insert({ user_id: userId, subject })
      .select("id")
      .single();
    if (error || !t) return NextResponse.json({ error: "Could not create ticket" }, { status: 500 });
    await db.from("orbis_ticket_messages").insert({ ticket_id: t.id, sender: "user", body: text });
    return NextResponse.json({ ok: true, id: t.id });
  }

  if (body.action === "reply") {
    const ticketId = String(body.ticketId || "");
    if (!UUID.test(ticketId)) return NextResponse.json({ error: "Bad ticket" }, { status: 400 });
    const { data: t } = await db
      .from("orbis_tickets")
      .select("id")
      .eq("id", ticketId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!t) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    await db.from("orbis_ticket_messages").insert({ ticket_id: ticketId, sender: "user", body: text });
    await db
      .from("orbis_tickets")
      .update({ status: "open", last_sender: "user", updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
