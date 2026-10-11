import fs from 'fs';
import path from 'path';
import type { Company, Game, Overrides, Aliases } from '@/lib/snes/types';
import { ESRB_START, GAME_COUNT_RANGE } from '@/lib/snes/build';

const read = <T,>(file: string): T => JSON.parse(fs.readFileSync(path.join(process.cwd(), file), 'utf8'));
const games = read<Game[]>('data/snes/games.json');
const companies = read<Company[]>('data/snes/companies.json');
const overrides = read<Overrides>('data/snes/overrides.json');
const aliases = read<Aliases>('data/snes/aliases.json');
const slugs = new Set(games.map((g) => g.slug));
const companySlugs = new Set(companies.map((c) => c.slug));

test('the game count is in the expected range', () => {
  expect(games.length).toBeGreaterThanOrEqual(GAME_COUNT_RANGE[0]);
  expect(games.length).toBeLessThanOrEqual(GAME_COUNT_RANGE[1]);
});

test('slugs are unique and URL-safe; titles carry no wiki markup', () => {
  expect(slugs.size).toBe(games.length);
  for (const g of games) {
    expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(g.title).toMatch(/^[^{}[\]|<>]+$/);
  }
});

test('US release dates fall between launch and 1998, in the format their precision says', () => {
  const format = { day: /^\d{4}-\d{2}-\d{2}$/, month: /^\d{4}-\d{2}$/, year: /^\d{4}$/ };
  for (const g of games) {
    expect(g.releasedUS).toMatch(format[g.datePrecision]);
    expect(g.releasedUS >= '1991-08').toBe(true);
    expect(g.releasedUS < '1999').toBe(true);
  }
});

test('every developer and publisher is a company', () => {
  for (const g of games) {
    expect(companySlugs.has(g.publisher)).toBe(true);
    for (const d of g.developers) expect(companySlugs.has(d)).toBe(true);
  }
});

test('every box art file exists locally', () => {
  for (const g of games.filter((x) => x.boxArt)) {
    expect(g.boxArt).toBe(`/snes/box/${g.slug}.jpg`);
    expect(fs.existsSync(path.join(process.cwd(), 'public', g.boxArt!))).toBe(true);
  }
});

test('scores stay inside their scales', () => {
  for (const { scores } of games) {
    if (scores.aggregate !== null) expect(scores.aggregate).toBeGreaterThanOrEqual(0);
    if (scores.aggregate !== null) expect(scores.aggregate).toBeLessThanOrEqual(100);
    for (const s of scores.egm ?? []) expect(s >= 0 && s <= 10).toBe(true);
    if (scores.nintendoPower) expect(scores.nintendoPower.score).toBeLessThanOrEqual(scores.nintendoPower.scale);
  }
});

test('no ESRB rating before the ESRB existed', () => {
  for (const g of games.filter((x) => x.releasedUS < ESRB_START)) expect(g.esrb).toBeNull();
});

test('launch day includes F-Zero and Super Mario World', () => {
  const launch = games.filter((g) => g.launchTitle).map((g) => g.title);
  expect(launch).toEqual(expect.arrayContaining(['F-Zero', 'Super Mario World']));
});

test('every override and alias names a real game', () => {
  for (const slug of [...Object.keys(overrides), ...Object.keys(aliases.igdb), ...Object.keys(aliases.boxart)]) {
    expect(slugs.has(slug)).toBe(true);
  }
});

test('every box art image is credited, and no two games share one source file', () => {
  const sources = read<Record<string, string>>('public/snes/box/sources.json');
  expect(Object.keys(sources).sort()).toEqual(games.filter((g) => g.boxArt).map((g) => g.slug).sort());
  const files = Object.values(sources);
  expect(new Set(files).size).toBe(files.length);
});

test('Final Fantasy IV and VI carry their US names, II and III', () => {
  const ff = Object.fromEntries(games.filter((g) => g.slug.startsWith('final-fantasy')).map((g) => [g.slug, g.title]));
  expect(ff['final-fantasy-ii']).toBe('Final Fantasy II');
  expect(ff['final-fantasy-iii']).toBe('Final Fantasy III');
  expect(ff['final-fantasy-iv']).toBeUndefined();
  expect(ff['final-fantasy-vi']).toBeUndefined();
});

test('every cover has a 96px thumbnail, and no thumbnail is orphaned', () => {
  const dir = path.join(process.cwd(), 'public/snes/thumb');
  const thumbs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')) : [];
  expect(thumbs.sort()).toEqual(games.filter((g) => g.boxArt).map((g) => `${g.slug}.jpg`).sort());
});

describe('media', () => {
  const pub = (p: string) => path.join(process.cwd(), 'public/snes', p);
  const size = (dir: string) => fs.readdirSync(pub(dir)).reduce((n, f) => n + fs.statSync(pub(`${dir}/${f}`)).size, 0);

  test('every media flag points at a real file, and every file belongs to a flagged game', () => {
    for (const [kind, ext] of [['video', 'mp4'], ['logo', 'png'], ['box3d', 'png']] as const) {
      const files = fs.readdirSync(pub(kind)).sort();
      expect(files).toEqual(games.filter((g) => g.media[kind]).map((g) => `${g.slug}.${ext}`).sort());
    }
  });

  test('stays inside the size budgets (GitHub Pages caps a site at 1 GB)', () => {
    expect(size('video')).toBeLessThanOrEqual(350e6);
    for (const f of fs.readdirSync(pub('video'))) expect(fs.statSync(pub(`video/${f}`)).size).toBeLessThanOrEqual(600e3);
    const total = ['box', 'thumb', 'video', 'logo', 'box3d'].reduce((n, d) => n + size(d), 0);
    expect(total).toBeLessThanOrEqual(600e6);
  });

  test('at least 700 games have a clip', () => {
    expect(games.filter((g) => g.media.video).length).toBeGreaterThanOrEqual(700);
  });
});
