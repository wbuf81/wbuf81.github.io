// __tests__/snes-weeks-data.test.ts
import fs from 'fs';
import path from 'path';
import weeks from '@/data/snes/weeks.json';
import overrides from '@/data/snes/pop-overrides.json';
import games from '@/data/snes/games.json';
import type { Week } from '@/lib/snes/types';

const W = weeks as Week[];
const DAY = 86400000;

it('covers every Friday from launch to the last game', () => {
  expect(W[0].start).toBe('1991-08-23');
  for (let i = 1; i < W.length; i++) expect(Date.parse(W[i].start) - Date.parse(W[i - 1].start)).toBe(7 * DAY);
  const last = [...(games as { releasedUS: string }[])].map((g) => g.releasedUS).sort().pop()!;
  expect(W[W.length - 1].start <= last.padEnd(10, '-31').slice(0, 10)).toBe(true);
  expect(W.length).toBeGreaterThanOrEqual(370);
});
it('has a song, album and film every week, and every art file exists', () => {
  for (const w of W) {
    for (const item of [w.song, w.album, w.film]) {
      expect(item.title).toBeTruthy();
      if (item.art) expect(fs.existsSync(path.join(process.cwd(), 'public', item.art))).toBe(true);
    }
    expect(w.news.length).toBeLessThanOrEqual(4);
  }
});
it("launch week matches the history", () => {
  expect(W[0].song).toMatchObject({ title: '(Everything I Do) I Do It for You', by: 'Bryan Adams' });
  expect(W[0].album.title).toBe('Unforgettable... with Love');
  expect(W[0].film.title).toBe('Hot Shots!');
  expect(W[0].news.map((n) => n.text)).toContain('The Super Nintendo Entertainment System is first released in the United States.');
});
it('overrides name real weeks', () => {
  const starts = new Set(W.map((w) => w.start));
  for (const k of Object.keys((overrides as { weeks: Record<string, unknown> }).weeks)) expect(starts.has(k)).toBe(true);
});
