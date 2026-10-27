// Shared betting rules. Adjust the limits here.
export const MIN_STAKE = 10_000;
export const MAX_STAKE = 500_000_000;
export const MAX_LEGS = 10;
export const MAX_PAYOUT = 5_000_000_000;

export type LegResult = "won" | "lost" | "void";

/** "1.5k" "2m" "1b" "250000" -> number (null if invalid). */
export function parseAmount(input: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([kmb])?\s*$/i.exec(input.replace(/[$,]/g, ""));
  if (!m) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || "").toLowerCase() as "k" | "m" | "b"] ?? 1;
  const v = Math.round(Number(m[1]) * mult * 100) / 100;
  return Number.isFinite(v) ? v : null;
}

/** Trailing number in a label like "Over 2.5" or "Arsenal -1.5". */
export function parsePoint(label: string): number | null {
  const m = /(-?\d+(?:\.\d+)?)\s*$/.exec(label);
  return m ? Number(m[1]) : null;
}

/** Only whole and half lines can be graded as won/lost/void. */
export function lineSupported(point: number | null): boolean {
  return point !== null && Number.isFinite(point) && Math.abs(point * 2 - Math.round(point * 2)) < 1e-9;
}

export function gradeLeg(
  marketKey: string,
  selection: string,
  home: string,
  away: string,
  hg: number,
  ag: number
): LegResult | null {
  if (marketKey === "h2h") {
    if (selection === home) return hg > ag ? "won" : "lost";
    if (selection === away) return ag > hg ? "won" : "lost";
    if (selection.toLowerCase() === "draw") return hg === ag ? "won" : "lost";
    return null;
  }

  if (marketKey === "totals") {
    const m = /^(over|under)\s+(-?\d+(?:\.\d+)?)$/i.exec(selection.trim());
    if (!m) return null;
    const point = Number(m[2]);
    if (!lineSupported(point)) return null;
    const total = hg + ag;
    if (total === point) return "void";
    return (m[1].toLowerCase() === "over" ? total > point : total < point) ? "won" : "lost";
  }

  if (marketKey === "btts") {
    const both = hg > 0 && ag > 0;
    if (/^yes$/i.test(selection)) return both ? "won" : "lost";
    if (/^no$/i.test(selection)) return both ? "lost" : "won";
    return null;
  }

  if (marketKey === "spreads") {
    const point = parsePoint(selection);
    if (!lineSupported(point)) return null;
    const team = selection.replace(/\s*-?\d+(?:\.\d+)?\s*$/, "").trim();
    let diff: number;
    if (team === home) diff = hg + (point as number) - ag;
    else if (team === away) diff = ag + (point as number) - hg;
    else return null;
    if (diff === 0) return "void";
    return diff > 0 ? "won" : "lost";
  }

  return null;
}
