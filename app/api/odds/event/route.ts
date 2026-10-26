import { NextResponse } from "next/server";

const SPORTS = [
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_uefa_champs_league",
  "soccer_france_ligue_one",
] as const;

const MARKET_KEYS = "h2h,totals,btts,spreads";

const MARKET_TITLE: Record<string, string> = {
  h2h: "Match result (1X2)",
  totals: "Over / Under",
  btts: "Both teams to score (GG/NG)",
  spreads: "Handicap",
};

type Outcome = { name: string; price: number; point?: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { markets: Market[] };
type Event = {
  id: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
};

function mergeMarkets(ev: Event) {
  const byKey: Record<string, { name: string; price: number }[]> = {};
  for (const b of ev.bookmakers || []) {
    for (const m of b.markets || []) {
      if (!byKey[m.key]) byKey[m.key] = [];
      for (const o of m.outcomes || []) {
        const label =
          o.point != null ? `${o.name} ${o.point}` : o.name;
        if (!byKey[m.key].some((x) => x.name === label)) {
          byKey[m.key].push({ name: label, price: o.price });
        }
      }
    }
  }
  return Object.entries(byKey).map(([key, outcomes]) => ({
    key,
    title: MARKET_TITLE[key] || key,
    outcomes,
  }));
}

export async function GET(req: Request) {
  const key = process.env.ODDS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ODDS_API_KEY not set", markets: [] },
      { status: 500 }
    );
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id", markets: [] }, { status: 400 });
  }

  for (const sport of SPORTS) {
    try {
      const url = new URL(
        `https://api.the-odds-api.com/v4/sports/${sport}/odds`
      );
      url.searchParams.set("apiKey", key);
      url.searchParams.set("regions", "uk,eu");
      url.searchParams.set("markets", MARKET_KEYS);
      url.searchParams.set("oddsFormat", "decimal");
      url.searchParams.set("eventIds", id);

      const res = await fetch(url.toString(), { next: { revalidate: 60 } });
      if (!res.ok) continue;
      const list = (await res.json()) as Event[];
      const ev = list.find((e) => e.id === id) || list[0];
      if (!ev) continue;

      return NextResponse.json({
        id: ev.id,
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
    home: "",
    away: "",
    markets: [],
    error: "Match not found or no odds right now",
  });
}
