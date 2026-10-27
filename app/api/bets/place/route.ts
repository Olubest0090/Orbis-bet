import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { SPORTS, loadEvents, loadSportEvents, mergeMarkets, type OddsEvent } from "@/lib/odds";
import {
  MAX_LEGS,
  MAX_PAYOUT,
  MAX_STAKE,
  MIN_STAKE,
  lineSupported,
  parsePoint,
} from "@/lib/betting";

type InLeg = { eventId?: string; sport?: string; market?: string; selection?: string; price?: number };

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let body: { kind?: string; stake?: number; legs?: InLeg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const kind = body.kind === "acca" ? "acca" : body.kind === "single" ? "single" : null;
  const stake = Math.round(Number(body.stake) * 100) / 100;
  const legsIn = Array.isArray(body.legs) ? body.legs : [];

  if (!kind) return NextResponse.json({ error: "Bad bet type" }, { status: 400 });
  if (!Number.isFinite(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
    return NextResponse.json(
      { error: `Stake must be between $${MIN_STAKE.toLocaleString()} and $${MAX_STAKE.toLocaleString()}` },
      { status: 400 }
    );
  }
  if (legsIn.length < 1 || legsIn.length > MAX_LEGS) {
    return NextResponse.json({ error: `Pick 1 to ${MAX_LEGS} selections` }, { status: 400 });
  }
  if (kind === "acca" && legsIn.length < 2) {
    return NextResponse.json({ error: "An accumulator needs 2+ selections" }, { status: 400 });
  }

  const seen = new Set<string>();
  const events = new Set<string>();
  for (const l of legsIn) {
    const k = `${l.eventId}|${l.market}|${l.selection}`;
    if (!l.eventId || !l.market || !l.selection || !l.sport || seen.has(k)) {
      return NextResponse.json({ error: "Invalid or duplicate selection" }, { status: 400 });
    }
    seen.add(k);
    if (!(SPORTS as readonly string[]).includes(l.sport)) {
      return NextResponse.json({ error: "Unsupported league" }, { status: 400 });
    }
    if (kind === "acca") {
      if (events.has(l.eventId)) {
        return NextResponse.json(
          { error: "An accumulator can't have two picks from the same match" },
          { status: 400 }
        );
      }
      events.add(l.eventId);
    }
  }

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Odds are unavailable" }, { status: 503 });

  // Re-check every selection against fresh odds. Never trust the phone's price.
  const cache = new Map<string, OddsEvent[]>();
  const legsOut: Record<string, unknown>[] = [];
  const changes: { eventId: string; market: string; selection: string; oldPrice: number; newPrice: number }[] = [];

  try {
    for (const l of legsIn) {
      const sport = l.sport as string;
      if (!cache.has(sport)) {
        const onlyH2h = legsIn.filter((x) => x.sport === sport).every((x) => x.market === "h2h");
        cache.set(sport, onlyH2h ? await loadEvents(apiKey, sport, "h2h") : await loadSportEvents(apiKey, sport));
      }
      const ev = cache.get(sport)!.find((e) => e.id === l.eventId);
      if (!ev) {
        return NextResponse.json({ error: "A match is no longer available" }, { status: 409 });
      }
      if (new Date(ev.commence_time).getTime() <= Date.now()) {
        return NextResponse.json(
          { error: `${ev.home_team} vs ${ev.away_team} has already started` },
          { status: 409 }
        );
      }
      const market = mergeMarkets(ev).find((m) => m.key === l.market);
      const outcome = market?.outcomes.find((o) => o.name === l.selection);
      if (!market || !outcome) {
        return NextResponse.json({ error: "A selection is no longer available" }, { status: 409 });
      }
      if ((l.market === "totals" || l.market === "spreads") && !lineSupported(parsePoint(outcome.name))) {
        return NextResponse.json({ error: "That line isn't supported yet" }, { status: 400 });
      }
      if (Math.abs(outcome.price - Number(l.price)) > 0.005) {
        changes.push({
          eventId: l.eventId as string,
          market: l.market as string,
          selection: l.selection as string,
          oldPrice: Number(l.price),
          newPrice: outcome.price,
        });
      }
      legsOut.push({
        event_id: ev.id,
        sport_key: sport,
        home: ev.home_team,
        away: ev.away_team,
        commence_time: ev.commence_time,
        market_key: market.key,
        market_title: market.title,
        selection: outcome.name,
        price: outcome.price,
      });
    }
  } catch (e) {
    console.error("bet validation failed:", e);
    return NextResponse.json({ error: "Could not check odds. Try again." }, { status: 503 });
  }

  if (changes.length) {
    return NextResponse.json({ error: "Odds changed. Review and confirm again.", changes }, { status: 409 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.rpc("place_bets", {
    p_user: userId,
    p_kind: kind,
    p_stake: stake,
    p_legs: legsOut,
    p_max_payout: MAX_PAYOUT,
  });

  if (error) {
    if (error.message.includes("insufficient_balance")) {
      return NextResponse.json({ error: "Not enough balance" }, { status: 400 });
    }
    if (error.message.includes("account_frozen")) {
      return NextResponse.json(
        { error: "Your account is frozen. Contact customer service." },
        { status: 403 }
      );
    }
    console.error("place_bets failed:", error.message);
    return NextResponse.json({ error: "Could not place bet" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, balance: data?.balance, betIds: data?.bet_ids });
}
