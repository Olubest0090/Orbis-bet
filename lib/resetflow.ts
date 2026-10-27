import { sendPnwMessage } from "@/lib/pnw";
import { hashCode, makeCode, prettyCode } from "@/lib/resetcode";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://orbis-bet.vercel.app";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Creates a one-time code and sends it to the nation's in-game inbox. */
export async function issueResetCode(
  db: any,
  user: { id: string; nation_id: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = makeCode();
  const { data: row, error } = await db
    .from("orbis_reset_codes")
    .insert({
      user_id: user.id,
      code_hash: hashCode(user.id, code),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !row) return { ok: false, error: "Could not create a code" };

  try {
    await sendPnwMessage(
      user.nation_id,
      "Orbis Bet password reset",
      `<p>Your Orbis Bet password reset code is <b>${prettyCode(code)}</b>.</p>` +
        `<p>It expires in 15 minutes. Open ${SITE}/reset and enter it with your leader name and a new password.</p>` +
        `<p>If you did not ask for this, ignore this message.</p>`
    );
  } catch (e) {
    await db.from("orbis_reset_codes").delete().eq("id", row.id);
    return { ok: false, error: e instanceof Error ? e.message : "message failed" };
  }
  return { ok: true };
}
