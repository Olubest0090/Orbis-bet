"use client";

import { useCallback, useSyncExternalStore } from "react";

export type SlipLeg = {
  eventId: string;
  sport: string;
  home: string;
  away: string;
  commence: string;
  marketKey: string;
  marketTitle: string;
  selection: string;
  price: number;
};

const KEY = "orbis_slip_v1";
const EVENT = "orbis-slip";
const EMPTY: SlipLeg[] = [];

let cacheRaw = "[]";
let cache: SlipLeg[] = EMPTY;

function snapshot(): SlipLeg[] {
  let raw = "[]";
  try {
    raw = localStorage.getItem(KEY) ?? "[]";
  } catch {
    /* storage blocked */
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      const parsed = JSON.parse(raw);
      cache = Array.isArray(parsed) ? parsed : EMPTY;
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function write(legs: SlipLeg[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(legs));
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(EVENT));
}

const same = (a: SlipLeg, b: SlipLeg) =>
  a.eventId === b.eventId && a.marketKey === b.marketKey && a.selection === b.selection;

export function useSlip() {
  const legs = useSyncExternalStore(subscribe, snapshot, () => EMPTY);

  /** Tap a price: adds it, replaces another pick in the same market, or removes it. */
  const toggle = useCallback((leg: SlipLeg) => {
    const cur = snapshot();
    if (cur.some((l) => same(l, leg))) {
      write(cur.filter((l) => !same(l, leg)));
    } else {
      write([
        ...cur.filter((l) => !(l.eventId === leg.eventId && l.marketKey === leg.marketKey)),
        leg,
      ]);
    }
  }, []);

  const remove = useCallback((leg: SlipLeg) => {
    write(snapshot().filter((l) => !same(l, leg)));
  }, []);

  const clear = useCallback(() => write([]), []);

  const updatePrices = useCallback(
    (changes: { eventId: string; market: string; selection: string; newPrice: number }[]) => {
      write(
        snapshot().map((l) => {
          const c = changes.find(
            (x) => x.eventId === l.eventId && x.market === l.marketKey && x.selection === l.selection
          );
          return c ? { ...l, price: c.newPrice } : l;
        })
      );
    },
    []
  );

  const has = useCallback(
    (leg: SlipLeg) => legs.some((l) => same(l, leg)),
    [legs]
  );

  return { legs, toggle, remove, clear, updatePrices, has };
}
