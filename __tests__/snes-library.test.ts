import {
  buildIndex, compareRelease, DEFAULT_FILTERS, facets, filterGames, groupByMonth, heatmapCounts, isFiltered, labelPoints,
  matches, neighbours, parseQuery, queryContext, scatterPoints, sortGames, toQuery, xForDate, type Filters, type IndexGame,
} from '@/lib/snes/library';
import type { Game } from '@/lib/snes/types';

const game = (slug: string, over: Partial<Game> = {}): Game => ({
  slug, title: slug, releasedUS: '1994-04', datePrecision: 'month', developers: ['nintendo-ead'], publisher: 'nintendo',
  genres: [], players: null, chip: null, launchTitle: false, esrb: null, summary: null,
  series: null, similar: [], themes: [], perspectives: [], multiplayer: { coop: false, versus: false },
  scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: null, usersCount: 0, egm: null, nintendoPower: null, other: {} },
  boxArt: `/snes/box/${slug}.jpg`, media: { video: false, logo: false, box3d: false },
  sources: { wikipedia: null, igdb: null }, ...over,
});

const GAMES: Game[] = [
  game('super-metroid', { title: 'Super Metroid', releasedUS: '1994-04-18', datePrecision: 'day', scores: { aggregate: 95, aggregateCount: 40, critic: null, criticCount: 0, users: null, usersCount: 0, egm: [9, 9, 9, 9], nintendoPower: null, other: {} }, media: { video: true, logo: true, box3d: true } }),
  game('f-zero', { title: 'F-Zero', releasedUS: '1991-08-23', datePrecision: 'day', launchTitle: true }),
  game('pilotwings', { title: 'Pilotwings', releasedUS: '1991-08-23', datePrecision: 'day', launchTitle: true, chip: 'DSP-1', scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: null, usersCount: 0, egm: [7.75], nintendoPower: { score: 3.8, scale: 5 }, other: {} } }),
  game('pokemon-ish', { title: 'Pokémon Puzzle', releasedUS: '1994-04', publisher: 'konami', developers: ['konami'], genres: ['Puzzle'], players: 2 }),
  game('mystery', { title: 'Mystery Year', releasedUS: '1994', datePrecision: 'year', boxArt: null }),
  game('dkc', { title: 'Donkey Kong Country', releasedUS: '1994-11-21', datePrecision: 'day', developers: ['rare'], scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: null, usersCount: 0, egm: [10, 9, 9, 9], nintendoPower: null, other: {} } }),
];
const INDEX = buildIndex(GAMES);
const NAMES = { nintendo: 'Nintendo', konami: 'Konami', 'nintendo-ead': 'Nintendo EAD', rare: 'Rare' };
const f = (over: Partial<Filters> = {}): Filters => ({ ...DEFAULT_FILTERS, ...over });
const slugs = (gs: IndexGame[]) => gs.map((g) => g.slug);

describe('buildIndex', () => {
  test('carries what the client needs, with averages, NP on a 0–10 scale and media paths', () => {
    const sm = INDEX.find((g) => g.slug === 'super-metroid')!;
    expect(sm).toMatchObject({ egmAvg: 9, aggregate: 95, thumb: '/snes/thumb/super-metroid.jpg', video: '/snes/video/super-metroid.mp4', search: 'super metroid' });
    expect(INDEX.find((g) => g.slug === 'pilotwings')).toMatchObject({ egmAvg: 7.8, np10: 7.6, chipSlug: 'dsp-1', video: null });
    expect(INDEX.find((g) => g.slug === 'mystery')).toMatchObject({ thumb: null, boxArt: null });
  });
  test('orders by release: exact days first within a month, a year-only date after December', () => {
    expect(slugs(INDEX)).toEqual(['f-zero', 'pilotwings', 'super-metroid', 'pokemon-ish', 'dkc', 'mystery']);
    expect(compareRelease({ releasedUS: '1994-04', datePrecision: 'month', title: 'A' }, { releasedUS: '1994-04-30', datePrecision: 'day', title: 'Z' })).toBeGreaterThan(0);
  });
});

describe('filters', () => {
  test('search ignores case, accents and punctuation', () => {
    expect(slugs(filterGames(INDEX, f({ q: 'pokemon' })))).toEqual(['pokemon-ish']);
    expect(slugs(filterGames(INDEX, f({ q: 'F ZERO' })))).toEqual(['f-zero']);
  });
  test('each filter narrows, and they combine', () => {
    expect(slugs(filterGames(INDEX, f({ years: [1991] })))).toEqual(['f-zero', 'pilotwings']);
    expect(slugs(filterGames(INDEX, f({ publisher: 'konami' })))).toEqual(['pokemon-ish']);
    expect(slugs(filterGames(INDEX, f({ developer: 'rare' })))).toEqual(['dkc']);
    expect(slugs(filterGames(INDEX, f({ chip: 'dsp-1' })))).toEqual(['pilotwings']);
    expect(slugs(filterGames(INDEX, f({ scores: ['np'] })))).toEqual(['pilotwings']);
    expect(slugs(filterGames(INDEX, f({ scores: ['egm8'] })))).toEqual(['super-metroid', 'dkc']);
    expect(slugs(filterGames(INDEX, f({ launch: true })))).toEqual(['f-zero', 'pilotwings']);
    expect(slugs(filterGames(INDEX, f({ genre: 'Puzzle' })))).toEqual(['pokemon-ish']);
    expect(slugs(filterGames(INDEX, f({ players: 2 })))).toEqual(['pokemon-ish']);
    expect(slugs(filterGames(INDEX, f({ years: [1994], scores: ['egm'] })))).toEqual(['super-metroid', 'dkc']);
    expect(matches(INDEX[0], f())).toBe(true);
  });
  test('isFiltered ignores view, sort and axis', () => {
    expect(isFiltered(f({ view: 'wall', sort: 'egm', y: 'np' }))).toBe(false);
    expect(isFiltered(f({ launch: true }))).toBe(true);
  });
});

test('sortGames puts missing scores last, in release order', () => {
  expect(slugs(sortGames(INDEX, 'egm'))).toEqual(['dkc', 'super-metroid', 'pilotwings', 'f-zero', 'pokemon-ish', 'mystery']);
  expect(slugs(sortGames(INDEX, 'title'))[0]).toBe('dkc');
  expect(slugs(sortGames(INDEX, 'date'))).toEqual(slugs(INDEX));
});

test('facets list companies with counts, the chips present, genres and player counts', () => {
  const fx = facets(INDEX, NAMES);
  expect(fx.publishers).toEqual([{ slug: 'konami', name: 'Konami', count: 1 }, { slug: 'nintendo', name: 'Nintendo', count: 5 }]);
  expect(fx.developers.map((d) => d.slug)).toEqual(['konami', 'nintendo-ead', 'rare']);
  expect(fx.chips).toEqual([{ slug: 'dsp-1', name: 'DSP-1', count: 1 }]);
  expect(fx.genres).toEqual(['Puzzle']);
  expect(fx.players).toEqual([2]);
});

describe('URL state', () => {
  const ctx = queryContext(facets(INDEX, NAMES));
  test('round-trips through the query string', () => {
    const state = f({ q: 'metroid', years: [1993, 1994], publisher: 'nintendo', scores: ['egm', 'np'], launch: true, sort: 'egm', view: 'wall', y: 'np' });
    expect(parseQuery(toQuery(state), ctx)).toEqual(state);
    expect(toQuery(f())).toBe('');
  });
  test('drops unknown parameters and invalid values silently', () => {
    expect(parseQuery('?year=1989,1994,abc&publisher=sega&chip=nope&scores=egm,bogus&view=cube&sort=hype&players=99&utm=x', ctx)).toEqual(
      f({ years: [1994], scores: ['egm'] }),
    );
  });
});

test('groupByMonth groups in order, with year-only games in their own group at the end of the year', () => {
  expect(groupByMonth(INDEX).map((g) => [g.key, g.month, slugs(g.games)])).toEqual([
    ['1991-08', 8, ['f-zero', 'pilotwings']],
    ['1994-04', 4, ['super-metroid', 'pokemon-ish']],
    ['1994-11', 11, ['dkc']],
    ['1994', null, ['mystery']],
  ]);
});

describe('heatmap', () => {
  test('a cell per month 1991–1998, pre-launch months marked, levels relative to the busiest month', () => {
    const cells = heatmapCounts(INDEX);
    expect(cells).toHaveLength(96);
    expect(cells.find((c) => c.key === '1991-07')).toMatchObject({ pre: true, count: 0, level: 0 });
    expect(cells.find((c) => c.key === '1991-08')).toMatchObject({ pre: false, count: 2, level: 4 });
    expect(cells.find((c) => c.key === '1994-11')).toMatchObject({ count: 1, level: 2 });
  });
  test('with no matches every cell is empty', () => {
    expect(heatmapCounts([]).every((c) => c.count === 0 && c.level === 0)).toBe(true);
  });
});

describe('scatter', () => {
  test('one point per game with the chosen score, positioned by date', () => {
    expect(scatterPoints(INDEX, 'egm').map((p) => [p.slug, p.y])).toEqual([['pilotwings', 7.8], ['super-metroid', 9], ['dkc', 9.3]]);
    expect(scatterPoints(INDEX, 'np').map((p) => p.slug)).toEqual(['pilotwings']);
    expect(xForDate('1991-08-01')).toBe(0);
    expect(xForDate('1998-12-31')).toBeCloseTo(100, 0);
  });
  test('labels never collide', () => {
    const pts = [{ slug: 'a', title: 'A', x: 50, y: 9.5 }, { slug: 'b', title: 'B', x: 52, y: 9.4 }, { slug: 'c', title: 'C', x: 80, y: 9.4 }];
    expect(labelPoints(pts, 8)).toEqual(['a', 'c']);
  });
});

test('neighbours step through release order and stop at the ends', () => {
  expect(neighbours(INDEX, 'f-zero')).toEqual({ prev: null, next: INDEX[1] });
  expect(neighbours(INDEX, 'mystery')).toEqual({ prev: INDEX[4], next: null });
});
