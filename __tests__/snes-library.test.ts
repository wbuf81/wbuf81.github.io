import {
  AXES, buildIndex, compareRelease, DEFAULT_FILTERS, facets, filterGames, genreFamily, groupByMonth, heatmapCounts, isFiltered,
  labelBox, labelPoints, matches, neighbours, parseQuery, queryContext, scatterPoints, scoreDomain, sortGames, toQuery, xForDate,
  yForScore, yTicks, type Filters, type IndexGame, type ScatterPoint,
} from '@/lib/snes/library';
import { getGames } from '@/lib/snes/data';
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
  game('super-metroid', { title: 'Super Metroid', releasedUS: '1994-04-18', datePrecision: 'day', scores: { aggregate: 95, aggregateCount: 40, critic: null, criticCount: 0, users: null, usersCount: 0, egm: [9, 9, 9, 9], nintendoPower: null, other: {} }, media: { video: true, logo: true, box3d: true }, themes: ['Science fiction'], perspectives: ['Side view'], multiplayer: { coop: false, versus: false } }),
  game('f-zero', { title: 'F-Zero', releasedUS: '1991-08-23', datePrecision: 'day', launchTitle: true, series: 'Mode 7 Racers', perspectives: ['Bird view'], multiplayer: { coop: false, versus: true } }),
  game('pilotwings', { title: 'Pilotwings', releasedUS: '1991-08-23', datePrecision: 'day', launchTitle: true, chip: 'DSP-1', series: 'Mode 7 Racers', themes: ['Action'], multiplayer: { coop: true, versus: false }, scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: null, usersCount: 0, egm: [7.75], nintendoPower: { score: 3.8, scale: 5 }, other: {} } }),
  game('pokemon-ish', { title: 'Pokémon Puzzle', releasedUS: '1994-04', publisher: 'konami', developers: ['konami'], genres: ['Puzzle'], players: 2 }),
  game('mystery', { title: 'Mystery Year', releasedUS: '1994', datePrecision: 'year', boxArt: null }),
  game('dkc', { title: 'Donkey Kong Country', releasedUS: '1994-11-21', datePrecision: 'day', developers: ['rare'], series: 'Donkey Kong', themes: ['Action'], scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: 87.46, usersCount: 0, egm: [10, 9, 9, 9], nintendoPower: null, other: {} } }),
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
  test('series, theme, camera and multiplayer filters', () => {
    expect(slugs(filterGames(INDEX, f({ series: 'mode-7-racers' })))).toEqual(['f-zero', 'pilotwings']);
    expect(slugs(filterGames(INDEX, f({ theme: 'Action' })))).toEqual(['pilotwings', 'dkc']);
    expect(slugs(filterGames(INDEX, f({ camera: 'Side view' })))).toEqual(['super-metroid']);
    expect(slugs(filterGames(INDEX, f({ mp: 'coop' })))).toEqual(['pilotwings']);
    expect(slugs(filterGames(INDEX, f({ mp: 'versus' })))).toEqual(['f-zero']);
    expect(slugs(filterGames(INDEX, f({ theme: 'Action', mp: 'coop' })))).toEqual(['pilotwings']);
  });
  test('isFiltered ignores view, sort and axis', () => {
    expect(isFiltered(f({ view: 'wall', sort: 'egm', y: 'np' }))).toBe(false);
    expect(isFiltered(f({ launch: true }))).toBe(true);
    for (const over of [{ series: 'x' }, { theme: 'x' }, { camera: 'x' }, { mp: 'coop' as const }]) expect(isFiltered(f(over))).toBe(true);
  });
});

test('sortGames puts missing scores last, in release order', () => {
  expect(slugs(sortGames(INDEX, 'egm'))).toEqual(['dkc', 'super-metroid', 'pilotwings', 'f-zero', 'pokemon-ish', 'mystery']);
  expect(slugs(sortGames(INDEX, 'title'))[0]).toBe('dkc');
  expect(slugs(sortGames(INDEX, 'date'))).toEqual(slugs(INDEX));
});

test('buildIndex carries series, themes, perspectives, multiplayer and the player score', () => {
  expect(INDEX.find((g) => g.slug === 'pilotwings')).toMatchObject({ series: 'Mode 7 Racers', themes: ['Action'], coop: true, versus: false, users: null });
  expect(INDEX.find((g) => g.slug === 'f-zero')).toMatchObject({ perspectives: ['Bird view'], coop: false, versus: true });
  expect(INDEX.find((g) => g.slug === 'dkc')!.users).toBe(87.46);
  expect(INDEX[0]).not.toHaveProperty('critic');
});

test('sortGames and scatterPoints support the player score', () => {
  expect(slugs(sortGames(INDEX, 'users'))[0]).toBe('dkc');
  expect(scatterPoints(INDEX, 'users').map((p) => [p.slug, p.y])).toEqual([['dkc', 8.7]]);
});

test('facets list series with two or more games, themes and perspectives', () => {
  const fx = facets(INDEX, NAMES);
  expect(fx.series).toEqual([{ slug: 'mode-7-racers', name: 'Mode 7 Racers', count: 2 }]);
  expect(fx.themes).toEqual(['Action', 'Science fiction']);
  expect(fx.perspectives).toEqual(['Bird view', 'Side view']);
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
  test('round-trips series, theme, camera and mp, and drops invalid values', () => {
    const state = f({ series: 'mode-7-racers', theme: 'Action', camera: 'Side view', mp: 'versus' });
    expect(parseQuery(toQuery(state), ctx)).toEqual(state);
    expect(parseQuery('?series=donkey-kong&theme=Nope&camera=Nope&mp=both', ctx)).toEqual(f());
  });
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
  test('labels never collide: a label as wide as its title blocks a neighbour on either side', () => {
    const pts = [{ slug: 'a', title: 'Alpha Centauri', x: 50, y: 9.5 }, { slug: 'b', title: 'Beta', x: 52, y: 9.5 }, { slug: 'c', title: 'C', x: 80, y: 9.4 }];
    expect(labelPoints(pts, 8).map((l) => l.slug)).toEqual(['a', 'c']);
  });
  test('Donkey Kong Country and Chrono Trigger, tied on EGM, do not both get a label', () => {
    const pts = [
      { slug: 'chrono-trigger', title: 'Chrono Trigger', x: xForDate('1995-08'), y: 9.25 },
      { slug: 'dkc', title: 'Donkey Kong Country', x: xForDate('1994-11-21'), y: 9.25 },
    ];
    expect(labelPoints(pts)).toEqual([{ slug: 'dkc', side: 'right' }]);
  });
  test('a label that would run off the right edge flips left; one that fits nowhere is skipped', () => {
    const pts = [{ slug: 'smw', title: 'Super Mario World', x: 95, y: 9 }, { slug: 'long', title: 'x'.repeat(200), x: 50, y: 8 }];
    expect(labelPoints(pts)).toEqual([{ slug: 'smw', side: 'left' }]);
  });
  test('the y axis fills the chart: half a point under the lowest whole score, up to 10', () => {
    const at = (...ys: number[]): ScatterPoint[] => ys.map((y, i) => ({ slug: String(i), title: String(i), x: 0, y }));
    expect(scoreDomain(at(9.3, 7.8, 9))).toEqual([6.5, 10]);
    expect(scoreDomain(at(3.9, 8))).toEqual([2.5, 10]);
    expect(scoreDomain(at(0.2))).toEqual([0, 10]);
    expect(scoreDomain([])).toEqual([0, 10]);
    expect(yForScore(9, [8, 10])).toBe(50);
    expect(yForScore(10, [6.5, 10])).toBe(100);
  });
  test('y ticks are whole numbers inside the domain, every other one on a tall domain', () => {
    expect(yTicks([8.5, 10])).toEqual([9, 10]);
    expect(yTicks([4.5, 10])).toEqual([5, 6, 7, 8, 9, 10]);
    expect(yTicks([2.5, 10])).toEqual([4, 6, 8, 10]);
    expect(yTicks([0, 10])).toEqual([0, 2, 4, 6, 8, 10]);
  });
});

describe('scatter on the real data', () => {
  const real = buildIndex(getGames());
  const overlap = (a: ReturnType<typeof labelBox>, b: ReturnType<typeof labelBox>) =>
    a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top;
  test.each(AXES)('no two label boxes intersect and none leaves the chart (%s)', (axis) => {
    const points = scatterPoints(real, axis);
    const domain = scoreDomain(points);
    const bySlug = new Map(points.map((p) => [p.slug, p]));
    const boxes = labelPoints(points, 8, domain).map((l) => labelBox(bySlug.get(l.slug)!, l.side, domain));
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.length).toBeLessThanOrEqual(8);
    for (const b of boxes) expect(b.left >= 0 && b.right <= 100).toBe(true);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBe(false);
  });
  test('every genre in the dataset has a family; only Music is left as Other', () => {
    const genres = [...new Set(real.flatMap((g) => g.genres))].sort();
    expect(genres.filter((g) => genreFamily([g]) === 'other')).toEqual(['Music']);
  });
});

describe('genreFamily', () => {
  test.each([
    [['Platform', 'Adventure'], 'action'],
    [["Hack and slash/Beat 'em up", 'Arcade'], 'action'],
    [['Shooter', 'Platform'], 'shooter'],
    [['Fighting', 'Arcade'], 'fighting'],
    [['Fighting', 'Sport'], 'sports'],
    [['Racing'], 'sports'],
    [['Role-playing (RPG)', 'Adventure'], 'rpg'],
    [['Puzzle', 'Role-playing (RPG)'], 'rpg'],
    [['Adventure'], 'rpg'],
    [['Simulator', 'Strategy'], 'puzzle'],
    [['Puzzle', 'Adventure'], 'puzzle'],
    [['Quiz/Trivia'], 'puzzle'],
    [['Music'], 'other'],
    [[], 'other'],
  ])('%j is %s', (genres, family) => {
    expect(genreFamily(genres as string[])).toBe(family);
  });
});

test('neighbours step through release order and stop at the ends', () => {
  expect(neighbours(INDEX, 'f-zero')).toEqual({ prev: null, next: INDEX[1] });
  expect(neighbours(INDEX, 'mystery')).toEqual({ prev: INDEX[4], next: null });
});

describe('the "In my Top 8" filter (mine)', () => {
  const ctx = queryContext(facets(INDEX, NAMES));
  test('mine=1 round-trips through the URL and counts as a filter', () => {
    expect(DEFAULT_FILTERS.mine).toBe(false);
    const state = f({ mine: true, view: 'wall' });
    expect(toQuery(state)).toBe('?mine=1&view=wall');
    expect(parseQuery(toQuery(state), ctx)).toEqual(state);
    expect(parseQuery('?mine=yes', ctx).mine).toBe(false);
    expect(isFiltered(f({ mine: true }))).toBe(true);
  });
  test('keeps only picked games, and none when nothing is picked', () => {
    expect(slugs(filterGames(INDEX, f({ mine: true }), new Set(['dkc', 'f-zero'])))).toEqual(['f-zero', 'dkc']);
    expect(filterGames(INDEX, f({ mine: true }), new Set())).toEqual([]);
    expect(matches(INDEX[0], f({ mine: true, q: 'zzz' }), new Set(['f-zero']))).toBe(false);
  });
  test('before the picks are known (server, first render) it is not applied yet', () => {
    expect(filterGames(INDEX, f({ mine: true }), null)).toHaveLength(INDEX.length);
    expect(filterGames(INDEX, f({ mine: true }))).toHaveLength(INDEX.length);
  });
  test('without mine the picks change nothing', () => {
    expect(filterGames(INDEX, f(), new Set(['dkc']))).toHaveLength(INDEX.length);
  });
});
