import { NextResponse } from "next/server";

const SPORTS = [
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_uefa_champs_league",
  "soccer_france_ligue_one",
] as const;

type Outcome = { name: string; price: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { markets: Market[] };
type Event = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Bookmaker[];
  completed?: boolean;
  scores?: { name: string; score: string }[] | null;
  last_update?: string;
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

/** Drop suspended junk lines (e.g. 1.00 / 501 / 501). */
function saneOdds(o: { home?: number; draw?: number; away?: number }) {
  const vals = [o.home, o.draw, o.away].filter((x) => x != null) as number[];
  if (vals.some((v) => v >= 100 || v < 1.01)) return {};
  return o;
}

async function fetchScores(key: string, sport: string): Promise<Event[]> {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/scores`);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("daysFrom", "1");
  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) return [];
  return (await res.json()) as Event[];
}

async function fetchOdds(key: string, sport: string): Promise<Event[]> {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("regions", "uk,eu");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return (await res.json()) as Event[];
}

export async function GET() {
  const key = process.env.ODDS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "ODDS_API_KEY not set on server" }, { status: 500 });
  }

  const byId = new Map<
    string,
    {
      id: string;
      sport_key: string;
      league: string;
      commence: string;
      home: string;
      away: string;
      odds: { home?: number; draw?: number; away?: number };
      score_home?: string;
      score_away?: string;
      completed?: boolean;
      live?: boolean;
    }
  >();

  for (const sport of SPORTS) {
    try {
      const [oddsList, scoresList] = await Promise.all([
        fetchOdds(key, sport),
        fetchScores(key, sport),
      ]);

      for (const ev of oddsList) {
        const odds = saneOdds(h2hForEvent(ev));
        byId.set(ev.id, {
          id: ev.id,
          sport_key: ev.sport_key || sport,
          league: ev.sport_title || sport,
          commence: ev.commence_time,
          home: ev.home_team,
          away: ev.away_team,
          odds,
        });
      }

      const now = Date.now();
      for (const ev of scoresList) {
        const existing = byId.get(ev.id);
        const homeScore = ev.scores?.find((s) => s.name === ev.home_team)?.score;
        const awayScore = ev.scores?.find((s) => s.name === ev.away_team)?.score;
        const start = new Date(ev.commence_time).getTime();
        const live =
          !ev.completed && start <= now && homeScore != null && awayScore != null;

        if (existing) {
          existing.score_home = homeScore;
          existing.score_away = awayScore;
          existing.completed = ev.completed;
          existing.live = live;
        } else {
          byId.set(ev.id, {
            id: ev.id,
            sport_key: ev.sport_key || sport,
            league: ev.sport_title || sport,
            commence: ev.commence_time,
            home: ev.home_team,
            away: ev.away_team,
            odds: {},
            score_home: homeScore,
            score_away: awayScore,
            completed: ev.completed,
            live,
          });
        }
      }
    } catch {
      /* continue */
    }
  }

  const matches = Array.from(byId.values())
    .filter((m) => !m.completed)
    .sort((a, b) => {
      // Live first, then by kickoff
      if (a.live && !b.live) return -1;
      if (!a.live && b.live) return 1;
      return new Date(a.commence).getTime() - new Date(b.commence).getTime();
    })
    .slice(0, 60);

  return NextResponse.json({ matches });
}
