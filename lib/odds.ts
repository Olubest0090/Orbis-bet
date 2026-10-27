// Shared The Odds API helpers (used by the match page API and bet placement).
export const SPORTS = [
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_uefa_champs_league",
  "soccer_france_ligue_one",
] as const;

// Only markets that can be graded from a final score.
export const BETTABLE = ["h2h", "totals", "btts", "spreads"] as const;

export const MARKET_TITLE: Record<string, string> = {
  h2h: "1X2",
  totals: "Over / Under",
  btts: "GG / NG",
  spreads: "Handicap",
};

type Outcome = { name: string; price: number; point?: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { markets: Market[] };
export type OddsEvent = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
};

export type MergedMarket = {
  key: string;
  title: string;
  outcomes: { name: string; price: number }[];
};

export function mergeMarkets(ev: OddsEvent): MergedMarket[] {
  const byKey: Record<string, { name: string; price: number }[]> = {};
  for (const b of ev.bookmakers || []) {
    for (const m of b.markets || []) {
      if (!(BETTABLE as readonly string[]).includes(m.key)) continue;
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
  return BETTABLE.filter((k) => byKey[k]?.length).map((key) => ({
    key,
    title: MARKET_TITLE[key] || key,
    outcomes: byKey[key],
  }));
}

export async function loadEvents(apiKey: string, sport: string, markets: string) {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "uk,eu");
  url.searchParams.set("markets", markets);
  url.searchParams.set("oddsFormat", "decimal");
  const res = await fetch(url.toString(), { next: { revalidate: 45 } });
  if (!res.ok) return [] as OddsEvent[];
  return (await res.json()) as OddsEvent[];
}

/** Events for one sport, same query as the match page so the fetch cache is shared. */
export async function loadSportEvents(apiKey: string, sport: string) {
  let list = await loadEvents(apiKey, sport, "h2h,totals,btts,spreads");
  if (!list.length) list = await loadEvents(apiKey, sport, "h2h");
  return list;
}
