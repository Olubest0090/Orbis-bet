import { supabaseAdmin } from "@/lib/supabase";
import { gradeLeg } from "@/lib/betting";

type ScoreEvent = {
  id: string;
  completed: boolean;
  scores: { name: string; score: string }[] | null;
};

type OpenLeg = {
  id: string;
  bet_id: string;
  event_id: string;
  sport_key: string;
  market_key: string;
  selection: string;
  home: string;
  away: string;
};

/** Grade finished matches, then settle any bet whose legs are all decided. */
export async function settleOpenBets() {
  const apiKey = process.env.ODDS_API_KEY;
  const db = supabaseAdmin();
  const stats = { legsGraded: 0, betsSettled: 0, sports: 0 };
  if (!apiKey) return stats;

  // Nothing can be final earlier than ~100 minutes after kickoff.
  const cutoff = new Date(Date.now() - 100 * 60 * 1000).toISOString();
  const { data: legs, error } = await db
    .from("orbis_bet_legs")
    .select("id, bet_id, event_id, sport_key, market_key, selection, home, away")
    .eq("status", "open")
    .lt("commence_time", cutoff)
    .limit(500);
  if (error || !legs?.length) return stats;

  const bySport = new Map<string, OpenLeg[]>();
  for (const l of legs as OpenLeg[]) {
    if (!bySport.has(l.sport_key)) bySport.set(l.sport_key, []);
    bySport.get(l.sport_key)!.push(l);
  }

  const touchedBets = new Set<string>();
  for (const [sport, sportLegs] of bySport) {
    stats.sports++;
    let events: ScoreEvent[] = [];
    try {
      const res = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sport}/scores/?apiKey=${encodeURIComponent(apiKey)}&daysFrom=3`,
        { cache: "no-store" }
      );
      if (!res.ok) continue;
      events = (await res.json()) as ScoreEvent[];
    } catch {
      continue;
    }
    const byId = new Map(events.map((e) => [e.id, e]));

    for (const l of sportLegs) {
      const ev = byId.get(l.event_id);
      if (!ev?.completed || !ev.scores) continue;
      const hs = ev.scores.find((s) => s.name === l.home);
      const as = ev.scores.find((s) => s.name === l.away);
      if (!hs || !as) continue;
      const hg = Number(hs.score);
      const ag = Number(as.score);
      if (!Number.isFinite(hg) || !Number.isFinite(ag)) continue;

      const result = gradeLeg(l.market_key, l.selection, l.home, l.away, hg, ag);
      if (!result) continue;
      const { error: upErr } = await db
        .from("orbis_bet_legs")
        .update({ status: result })
        .eq("id", l.id)
        .eq("status", "open");
      if (!upErr) {
        stats.legsGraded++;
        touchedBets.add(l.bet_id);
      }
    }
  }

  for (const betId of touchedBets) {
    const { data, error: rpcErr } = await db.rpc("settle_bet", { p_bet: betId });
    if (rpcErr) console.error("settle_bet failed:", rpcErr.message);
    else if (data && data !== "open") stats.betsSettled++;
  }
  return stats;
}

/** Run settlement at most once per interval, even with many visitors. */
export async function maybeSettle(minIntervalMs = 10 * 60 * 1000) {
  const db = supabaseAdmin();
  const { data: st } = await db.from("orbis_settle_state").select("last_run").eq("id", 1).single();
  if (!st) return;
  if (Date.now() - new Date(st.last_run).getTime() < minIntervalMs) return;

  const { data: claimed } = await db
    .from("orbis_settle_state")
    .update({ last_run: new Date().toISOString() })
    .eq("id", 1)
    .eq("last_run", st.last_run)
    .select();
  if (!claimed?.length) return;

  try {
    await settleOpenBets();
  } catch (e) {
    console.error("settlement failed:", e);
  }
}
