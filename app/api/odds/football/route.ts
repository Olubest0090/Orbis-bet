import { NextResponse } from "next/server";

/** Soccer sport keys on The Odds API (h2h = 1X2). */
const SPORTS = [
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_uefa_champs_league",
] as const;

type Outcome = { name: string; price: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { key: string; title: string; markets: Market[] };
type Event = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
};

function h2hForEvent(ev: Event): { home?: number; draw?: number; away?: number } {
  for (const b of ev.bookmakers || []) {
    const m = b.markets?.find((x) => x.key === "h2h");
    if (!m?.outcomes) continue;
    let home: number | undefined;
    let draw: number | undefined;
    let away: number | undefined;
    for (const o of m.outcomes) {
      if (o.name === "Draw") draw = o.price;
      else if (o.name === ev.home_team) home = o.price;
      else if (o.name === ev.away_team) away = o.price;
    }
    if (home != null && away != null) return { home, draw, away };
  }
  return {};
}

export async function GET() {
  const key = process.env.ODDS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "ODDS_API_KEY not set on server" },
      { status: 500 }
    );
  }

  const matches: Array<{
    id: string;
    league: string;
    commence: string;
    home: string;
    away: string;
    odds: { home?: number; draw?: number; away?: number };
  }> = [];

  const errors: string[] = [];

  for (const sport of SPORTS) {
    try {
      const url = new URL(
        `https://api.the-odds-api.com/v4/sports/${sport}/odds`
      );
      url.searchParams.set("apiKey", key);
      url.searchParams.set("regions", "uk,eu");
      url.searchParams.set("markets", "h2h");
      url.searchParams.set("oddsFormat", "decimal");

      const res = await fetch(url.toString(), { next: { revalidate: 120 } });
      if (!res.ok) {
        const t = await res.text();
        errors.push(`${sport}: ${res.status} ${t.slice(0, 120)}`);
        continue;
      }
      const data = (await res.json()) as Event[];
      for (const ev of data.slice(0, 8)) {
        matches.push({
          id: ev.id,
          league: ev.sport_title || sport,
          commence: ev.commence_time,
          home: ev.home_team,
          away: ev.away_team,
          odds: h2hForEvent(ev),
        });
      }
    } catch (e) {
      errors.push(`${sport}: ${e instanceof Error ? e.message : "fetch failed"}`);
    }
  }

  matches.sort(
    (a, b) => new Date(a.commence).getTime() - new Date(b.commence).getTime()
  );

  return NextResponse.json({
    matches: matches.slice(0, 40),
    errors: errors.length ? errors : undefined,
  });
}
