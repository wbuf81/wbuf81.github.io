import prices from '@/data/snes/prices.json';
import games from '@/data/snes/games.json';
import { CPI } from '@/lib/snes/money';
import { consolePrice, gamePrice } from '@/lib/snes/prices';
import { getPrices } from '@/lib/snes/data';

const slugs = new Set((games as { slug: string }[]).map((g) => g.slug));
type P = { usd: number; date: string; source: string };

it('starts with the $199.99 launch console', () => {
  expect(prices.hardware[0]).toMatchObject({ item: 'Super NES Control Set', usd: 199.99, date: '1991-08' });
});
it('every price is sourced, dated inside the CPI table and names a real game', () => {
  const all: P[] = [...prices.hardware, ...Object.values(prices.games as Record<string, P>)];
  for (const p of all) {
    expect(p.source.length).toBeGreaterThan(8);
    expect(CPI[Number(p.date.slice(0, 4))]).toBeDefined();
    expect(p.usd).toBeGreaterThan(5);
    expect(p.usd).toBeLessThan(200);
  }
  for (const slug of Object.keys(prices.games)) expect(slugs.has(slug)).toBe(true);
  expect(Object.keys(prices.games).length).toBeGreaterThanOrEqual(30);
});
it('helpers expose the launch console and per-game prices', () => {
  const p = getPrices();
  expect(consolePrice(p).usd).toBe(199.99);
  expect(gamePrice(p, 'star-fox')?.usd).toBe(59.99);
  expect(gamePrice(p, 'not-a-game')).toBeNull();
});
describe('the console price for a week', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CONSOLE_ITEMS, consoleOffers, consoleAt } = require('@/lib/snes/prices');
  const offers = consoleOffers(getPrices());
  it('counts only complete console packages, never accessories', () => {
    expect(CONSOLE_ITEMS).toEqual(['Super NES Control Set', 'Super NES with Mario (Super Set)']);
    expect(offers.map((o: { item: string }) => o.item)).not.toEqual(expect.arrayContaining(['Super Scope 6']));
    expect(offers.every((o: { item: string }) => CONSOLE_ITEMS.includes(o.item))).toBe(true);
  });
  it('picks the latest console entry dated on or before the week', () => {
    expect(consoleAt(offers, '1991-08-23')).toMatchObject({ usd: 199.99, year: 1991, kind: 'launch' });
    expect(consoleAt(offers, '1993-05-07')).toMatchObject({ item: 'Super NES with Mario (Super Set)', usd: 139.99, year: 1993, kind: 'catalog' });
    expect(consoleAt(offers, '1995-06-02')).toMatchObject({ item: 'Super NES Control Set', usd: 99.99, year: 1993, kind: 'catalog' });
  });
});
