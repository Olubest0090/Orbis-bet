import { NextResponse } from "next/server";

const SPORTS = [
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_uefa_champs_league",
  "soccer_france_ligue_one",
] as const;

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
  sport_key: string;
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
        const label = o.point != null ? `${o.name} ${o.point}` : o.name;
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

async function fetchSport(
  key: string,
  sport: string,
  eventId?: string
): Promise<Event | null> {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("regions", "uk,eu");
  url.searchParams.set("markets", "h2h,totals,btts,spreads");
  url.searchParams.set("oddsFormat", "decimal");

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const list = (await res.json()) as Event[];
  if (!eventId) return list[0] || null;
  return list.find((e) => e.id === eventId) || null;
}

export async function GET(req: Request) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ODDS_API_KEY not set", markets: [] },
      { status: 500 }
    );
  }

  const sp = new URL(req.url).searchParams;
  const id = sp.get("id");
  const sportHint = sp.get("sport") || "";

  if (!id) {
    return NextResponse.json({ error: "Missing id", markets: [] }, { status: 400 });
  }

  const order = [
    ...(sportHint ? [sportHint] : []),
    ...SPORTS.filter((s) => s !== sportHint),
  ];

  for (const sport of order) {
    try {
      const ev = await fetchSport(apiKey, sport, id);
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
      /* next */
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
