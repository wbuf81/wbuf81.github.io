/* The Time Machine page's client props, built in one place so the page and the payload-budget test share them. Pure. */
import type { Game, Week } from './types.ts';
import { MILESTONES } from './years.ts';
import { consolePrice, type HardwarePrice } from './prices.ts';
import { packGames, packWeeks } from './pack.ts';
import type { Price } from './types.ts';

const year = (d: string) => Number(d.slice(0, 4));

export function buildTimeMachineProps(input: { games: Game[]; weeks: Week[]; prices: { hardware: HardwarePrice[]; games: Record<string, Price> } }) {
  const { games, weeks, prices } = input;
  const slim = games.map((g) => ({ slug: g.slug, title: g.title, releasedUS: g.releasedUS, datePrecision: g.datePrecision, boxArt: g.boxArt }));
  const milestones = MILESTONES.flatMap((m) => { const g = games.find((x) => x.slug === m.slug); return g ? [{ ...m, date: g.releasedUS }] : []; });
  const c = consolePrice(prices);
  return {
    weeks: packWeeks(weeks), games: packGames(slim), milestones,
    prices: { console: { usd: c.usd, year: year(c.date) }, games: Object.fromEntries(Object.entries(prices.games).map(([s, p]) => [s, { usd: p.usd, year: year(p.date) }])) },
  };
}
