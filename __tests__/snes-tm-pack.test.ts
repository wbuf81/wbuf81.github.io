import zlib from 'zlib';
import { getGames, getPrices, getWeeks } from '@/lib/snes/data';
import { buildTimeMachineProps } from '@/lib/snes/tmProps';
import { packGames, packWeeks, unpackGames, unpackWeeks } from '@/lib/snes/pack';
import type { Week } from '@/lib/snes/types';

const slim = getGames().map((g) => ({ slug: g.slug, title: g.title, releasedUS: g.releasedUS, datePrecision: g.datePrecision, boxArt: g.boxArt }));

test('the real weeks survive packing exactly', () => {
  expect(unpackWeeks(packWeeks(getWeeks()))).toEqual(getWeeks());
});
test('the real games survive packing exactly', () => {
  expect(unpackGames(packGames(slim))).toEqual(slim);
});
test('art and box paths that do not follow the naming rule are kept as written', () => {
  const w: Week = {
    start: '1991-08-23', song: { title: 'S', by: 'A', article: 'Other', art: '/elsewhere/s.webp' }, album: { title: 'Al', by: null, article: null, art: null },
    film: { title: 'F', by: null, article: 'F', art: '/snes/pop/f.webp', gross: null }, news: [], near: { date: '1991-08-20', text: 'x' },
  };
  expect(unpackWeeks(packWeeks([w]))).toEqual([w]);
  const g = [{ slug: 'a', title: 'A', releasedUS: '1992', datePrecision: 'year', boxArt: '/x/a.png' }, { slug: 'b', title: 'B', releasedUS: '1992-03', datePrecision: 'month', boxArt: null }];
  expect(unpackGames(packGames(g))).toEqual(g);
});
test('packing makes the client payload meaningfully smaller', () => {
  expect(JSON.stringify(packWeeks(getWeeks())).length).toBeLessThan(JSON.stringify(getWeeks()).length * 0.75);
});
test('the Time Machine client payload stays inside its gzip budget', () => {
  // Exactly what page.tsx hands to the client component (the same builder): packed weeks and games, milestones, prices. It ships twice
  // (HTML and RSC), so the 150 KB page budget has about double this to spare for markup.
  const payload = buildTimeMachineProps({ games: getGames(), weeks: getWeeks(), prices: getPrices() });
  const json = JSON.stringify(payload);
  const gz = zlib.gzipSync(json, { level: 9 }).length;
  expect(gz).toBeLessThanOrEqual(70 * 1024);
});
