import zlib from 'zlib';
import { getGames } from '@/lib/snes/data';
import { slimIndex } from '@/lib/snes/top8';

test('the Top 8 client payload stays inside its gzip budget', () => {
  // Exactly what page.tsx hands to <Top8 games>. It ships twice (HTML and RSC), so the 120 KB page budget has
  // room for both copies plus the markup.
  const json = JSON.stringify(slimIndex(getGames()));
  const gz = zlib.gzipSync(json, { level: 9 }).length;
  expect(gz).toBeLessThanOrEqual(50 * 1024);
});
