import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { SUPPORT_SYSTEM_PROMPT } from "@/lib/support-kb";

const DAILY_LIMIT = 20;
const MODEL = "claude-haiku-5-5";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "The assistant isn't available right now. Please open a ticket." },
      { status: 503 }
    );
  }

  let raw: unknown;
  try {
    raw = (await req.json()).messages;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!Array.isArray(raw)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Keep the last few turns only, plain text, starting with a user message.
  let messages: Msg[] = raw
    .filter(
      (m): m is Msg =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 600) }))
    .slice(-8);
  while (messages.length && messages[0].role !== "user") messages = messages.slice(1);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Write a question first" }, { status: 400 });
  }

  const { data: allowed, error: usageErr } = await supabaseAdmin().rpc("bump_ai_usage", {
    p_user: userId,
    p_limit: DAILY_LIMIT,
  });
  if (usageErr) {
    console.error("ai usage failed:", usageErr.message);
    return NextResponse.json({ error: "Try again shortly" }, { status: 500 });
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "You've used today's assistant questions. Please open a ticket." },
      { status: 429 }
    );
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SUPPORT_SYSTEM_PROMPT,
        messages,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("assistant request failed:", res.status, await res.text().catch(() => ""));
      return NextResponse.json(
        { error: "The assistant couldn't answer. Please open a ticket." },
        { status: 502 }
      );
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const reply = (json.content || [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!reply) {
      return NextResponse.json({ error: "No answer. Please open a ticket." }, { status: 502 });
    }
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("assistant error:", e);
    return NextResponse.json({ error: "The assistant couldn't answer. Please open a ticket." }, { status: 502 });
  }
}
