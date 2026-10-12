/* Researched period prices (each with a source). Only games Wes's research found carry a price. */
import type { Price } from './types.ts';
export type HardwarePrice = Price & { item: string };
export function consolePrice(p: { hardware: HardwarePrice[] }): HardwarePrice { return p.hardware[0]; }
export function gamePrice(p: { games: Record<string, Price> }, slug: string): Price | null { return p.games[slug] ?? null; }
