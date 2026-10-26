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
  h2h: "1X2",
  totals: "Over / Under",
  btts: "GG / NG",
  spreads: "Handicap",
  h2h_q1: "1st half 1X2",
  totals_h1: "1st half O/U",
};

/** Markets we show (skip exchange lay etc.) */
const ALLOW = new Set(["h2h", "totals", "btts", "spreads", "h2h_q1", "totals_h1"]);

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
      if (!ALLOW.has(m.key)) continue;
      if (!byKey[m.key]) byKey[m.key] = [];
      for (const o of m.outcomes || []) {
        const label = o.point != null ? `${o.name} ${o.point}` : o.name;
        const price = o.price;
        if (price >= 100 || price < 1.01) continue;
        if (!byKey[m.key].some((x) => x.name === label)) {
          byKey[m.key].push({ name: label, price });
        }
      }
    }
  }
  const order = ["h2h", "totals", "btts", "spreads", "h2h_q1", "totals_h1"];
  return order
    .filter((k) => byKey[k]?.length)
    .map((key) => ({
      key,
      title: MARKET_TITLE[key] || key,
      outcomes: byKey[key],
    }));
}

async function loadEvents(apiKey: string, sport: string, markets: string) {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "uk,eu");
  url.searchParams.set("markets", markets);
  url.searchParams.set("oddsFormat", "decimal");
  const res = await fetch(url.toString(), { next: { revalidate: 45 } });
  if (!res.ok) return [] as Event[];
  return (await res.json()) as Event[];
}

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
      let list = await loadEvents(apiKey, sport, "h2h,totals,btts,spreads");
      if (!list.length) list = await loadEvents(apiKey, sport, "h2h");

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
      /* next */
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
