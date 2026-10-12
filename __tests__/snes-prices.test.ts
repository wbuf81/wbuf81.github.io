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
