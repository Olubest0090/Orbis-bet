import { NextResponse } from "next/server";
import { SPORTS, loadSportEvents, mergeMarkets } from "@/lib/odds";

export async function GET(req: Request) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ODDS_API_KEY not set", markets: [] }, { status: 500 });
  }

  const sp = new URL(req.url).searchParams;
  const id = decodeURIComponent(sp.get("id") || "");
  const sportHint = sp.get("sport") || "";
  const homeQ = (sp.get("home") || "").toLowerCase();
  const awayQ = (sp.get("away") || "").toLowerCase();

  if (!id && !homeQ) {
    return NextResponse.json({ error: "Missing id", markets: [] }, { status: 400 });
  }

  const order = [
    ...(sportHint ? [sportHint] : []),
    ...SPORTS.filter((s) => s !== sportHint),
  ];

  for (const sport of order) {
    try {
      const list = await loadSportEvents(apiKey, sport);
      const ev =
        list.find((e) => e.id === id) ||
        list.find(
          (e) =>
            homeQ &&
            awayQ &&
            e.home_team.toLowerCase().includes(homeQ) &&
            e.away_team.toLowerCase().includes(awayQ)
        );
      if (!ev) continue;

      return NextResponse.json({
        id: ev.id,
        sport_key: ev.sport_key || sport,
        league: ev.sport_title || sport,
        commence: ev.commence_time,
        home: ev.home_team,
        away: ev.away_team,
        markets: mergeMarkets(ev),
      });
    } catch {
      /* try next sport */
    }
  }

  return NextResponse.json({
    id,
    league: "",
    commence: "",
    home: sp.get("home") || "",
    away: sp.get("away") || "",
    markets: [],
    error: "Match not found or no odds right now",
  });
}
