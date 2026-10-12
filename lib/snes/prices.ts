/* Researched period prices (each with a source). Only games Wes's research found carry a price. */
import type { Price } from './types.ts';
import { LAUNCH } from './years.ts';
export type HardwarePrice = Price & { item: string };
export function consolePrice(p: { hardware: HardwarePrice[] }): HardwarePrice { return p.hardware[0]; }
export function gamePrice(p: { games: Record<string, Price> }, slug: string): Price | null { return p.games[slug] ?? null; }

/** The hardware items that count as "the console": complete Super NES packages. Controllers, the Super Scope and the cleaning kit never do. */
export const CONSOLE_ITEMS = ['Super NES Control Set', 'Super NES with Mario (Super Set)'];
/** A console price as the Time Machine shows it: the launch package, or a later catalog price, from the month it is dated. */
export type ConsoleOffer = { item: string; usd: number; year: number; from: string; kind: 'launch' | 'catalog' };

export function consoleOffers(p: { hardware: HardwarePrice[] }): ConsoleOffer[] {
  return p.hardware
    .filter((h) => CONSOLE_ITEMS.includes(h.item))
    .map((h) => ({ item: h.item, usd: h.usd, year: Number(h.date.slice(0, 4)), from: h.date, kind: h.date <= LAUNCH.slice(0, 7) ? 'launch' as const : 'catalog' as const }))
    .sort((a, b) => a.from.localeCompare(b.from));
}
/** The latest console price dated on or before the week (a catalog dated "1993-10" counts from October 1993); the launch price before any. */
export function consoleAt(offers: ConsoleOffer[], iso: string): ConsoleOffer {
  return offers.filter((o) => o.from <= iso).pop() ?? offers[0];
}
/** "A Super NES: $199.99 at launch in 1991" or "A Super NES Control Set: $99.99 in a 1993 catalog" — always dated, never "then". */
export function consoleLabel(o: ConsoleOffer): string {
  return o.kind === 'launch' ? `A Super NES: $${o.usd.toFixed(2)} at launch in ${o.year}` : `A ${o.item}: $${o.usd.toFixed(2)} in a ${o.year} catalog`;
}
