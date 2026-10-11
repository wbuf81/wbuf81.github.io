import { buildDataset, companyKey, formatReport, type BuildInputs } from '@/lib/snes/build';
import type { WikiListRow, IgdbRaw, Game } from '@/lib/snes/types';

const row = (title: string, over: Partial<WikiListRow> = {}): WikiListRow => ({
  title, article: title, developers: ['Nintendo EAD'], publisher: 'Nintendo',
  releasedUS: '1991-08-23', datePrecision: 'day', ...over,
});

const inputs = (over: Partial<BuildInputs> = {}): BuildInputs => ({
  list: [
    row('F-Zero'),
    row('Super Metroid', { developers: ['Nintendo R&D1', 'Intelligent Systems'], releasedUS: '1994-04-18' }),
    row('Donkey Kong Country', { developers: ['Rare'], releasedUS: '1994-11-21' }),
  ],
  chips: [{ title: 'Super Metroid', article: null, chip: 'SA-1' }],
  reviewBoxes: { 'Super Metroid': '{{Video game reviews\n| EGM = 9/10, 9/10, 9/10, 9/10\n| GI = 9.5/10\n}}' },
  igdb: [
    { id: 1, name: 'F-Zero', total_rating: 80.4, total_rating_count: 30, age_ratings: [{ organization: { name: 'ESRB' }, rating_category: { rating: 'E' } }] },
    { id: 2, name: 'Metroid 3', alternative_names: [{ name: 'Super Metroid' }], total_rating: 93, total_rating_count: 50 },
    { id: 3, name: 'Donkey Kong Country', age_ratings: [{ organization: { name: 'ESRB' }, rating_category: { rating: 'K-A' } }] },
  ] as IgdbRaw[],
  aliases: { igdb: {}, boxart: {}, companies: {}, slugs: {} },
  overrides: {},
  previous: [],
  hasBoxArt: (slug) => slug !== 'donkey-kong-country',
  countRange: [1, 10],
  ...over,
});

test('merges every source into a game record', () => {
  const { games, errors } = buildDataset(inputs());
  expect(errors).toEqual([]);
  const sm = games.find((g) => g.slug === 'super-metroid')!;
  expect(sm).toMatchObject({
    title: 'Super Metroid', developers: ['nintendo-r-and-d1', 'intelligent-systems'], publisher: 'nintendo',
    chip: 'SA-1', launchTitle: false, boxArt: '/snes/box/super-metroid.jpg',
    sources: { wikipedia: 'Super Metroid', igdb: 2 },
  });
  expect(sm.scores).toEqual({ aggregate: 93, aggregateCount: 50, egm: [9, 9, 9, 9], nintendoPower: null, other: { GI: '9.5/10' } });
});

test('sorts by release date and marks launch-day games', () => {
  const { games } = buildDataset(inputs());
  expect(games.map((g) => g.slug)).toEqual(['f-zero', 'super-metroid', 'donkey-kong-country']);
  expect(games[0].launchTitle).toBe(true);
});

test('clears ESRB before Sept 1994', () => {
  const { games } = buildDataset(inputs());
  expect(games.find((g) => g.slug === 'f-zero')!.esrb).toBeNull();
  expect(games.find((g) => g.slug === 'donkey-kong-country')!.esrb).toBe('K-A');
});

test('builds with no IGDB data', () => {
  const { games, report, errors } = buildDataset(inputs({ igdb: null }));
  expect(errors).toEqual([]);
  expect(games.every((g) => g.scores.aggregate === null && g.genres.length === 0 && g.sources.igdb === null)).toBe(true);
  expect(report.igdbFetched).toBe(false);
  expect(report.unmatchedIgdb).toEqual([]);
});

test('keeps the slug from the previous games.json when the title changes upstream', () => {
  const previous = [{ slug: 'f-zero', title: 'F-Zero', sources: { wikipedia: 'F-Zero', igdb: 1 } }] as Game[];
  const list = [row('F-ZERO', { article: 'F-Zero' })];
  const { games } = buildDataset(inputs({ list, previous }));
  expect(games[0]).toMatchObject({ slug: 'f-zero', title: 'F-ZERO' });
});

test('games sharing one Wikipedia article keep their own previous slugs', () => {
  const article = "Mario's Early Years!";
  const previous = [
    { slug: 'marios-early-years-fun-with-letters', title: "Mario's Early Years! Fun with Letters", sources: { wikipedia: article, igdb: null } },
    { slug: 'marios-early-years-preschool-fun', title: "Mario's Early Years! Preschool Fun", sources: { wikipedia: article, igdb: null } },
  ] as Game[];
  const list = [row("Mario's Early Years! Fun with Letters", { article }), row("Mario's Early Years! Preschool Fun", { article }), row("Mario's Early Years! Fun with Numbers", { article })];
  const { games, errors } = buildDataset(inputs({ list, previous }));
  expect(errors).toEqual([]);
  expect(games.map((g) => g.slug).sort()).toEqual([
    'marios-early-years-fun-with-letters', 'marios-early-years-fun-with-numbers', 'marios-early-years-preschool-fun',
  ]);
});

test('a slug that would disappear fails the build unless retired or re-pointed', () => {
  const previous = [
    { slug: 'f-zero', title: 'F-Zero', sources: { wikipedia: 'F-Zero', igdb: 1 } },
    { slug: 'jeopardy-deluxe-edition', title: 'Jeopardy! Deluxe Edition', sources: { wikipedia: null, igdb: null } },
  ] as Game[];
  const list = [row('F-Zero'), row('Jeopardy! Deluxe', { article: null })];
  const base = { igdb: {}, boxart: {}, companies: {}, slugs: {} };
  expect(buildDataset(inputs({ list, previous })).errors).toEqual([
    expect.stringMatching(/"jeopardy-deluxe-edition".*disappear/),
  ]);
  expect(buildDataset(inputs({ list, previous, aliases: { ...base, retiredSlugs: ['jeopardy-deluxe-edition'] } })).errors).toEqual([]);
  const repointed = buildDataset(inputs({ list, previous, aliases: { ...base, slugs: { 'Jeopardy! Deluxe': 'jeopardy-deluxe-edition' } } }));
  expect(repointed.errors).toEqual([]);
  expect(repointed.games.map((g) => g.slug)).toContain('jeopardy-deluxe-edition');
});

test('rows of the Wikipedia list the parser could not read fail the build', () => {
  expect(buildDataset(inputs({ unreadableRows: 2 })).errors).toEqual([expect.stringMatching(/2 rows.*could not be read/)]);
  expect(buildDataset(inputs({ unreadableRows: 0 })).errors).toEqual([]);
});

test('stale or mistyped aliases and override fields fail the build', () => {
  const base = { igdb: {}, boxart: {}, companies: {}, slugs: {} };
  const errorsFor = (over: Partial<BuildInputs>) => buildDataset(inputs(over)).errors;
  expect(errorsFor({ aliases: { ...base, slugs: { 'No Such Title': 'x' } } })).toEqual([expect.stringMatching(/"slugs".*No Such Title/)]);
  expect(errorsFor({ aliases: { ...base, companies: { 'Nobody Inc.': 'Nobody' } } })).toEqual([expect.stringMatching(/"companies".*Nobody Inc\./)]);
  expect(errorsFor({ aliases: { ...base, igdb: { 'f-zero': 999 } } })).toEqual([expect.stringMatching(/999/)]);
  expect(errorsFor({ igdb: null, aliases: { ...base, igdb: { 'f-zero': 999 } } })).toEqual([]);
  expect(errorsFor({ overrides: { 'f-zero': { relasedUS: '1991-08' } as never } })).toEqual([expect.stringMatching(/relasedUS/)]);
  expect(errorsFor({ overrides: { 'f-zero': { scores: { npower: 3 } } as never } })).toEqual([expect.stringMatching(/npower/)]);
});

test('applies overrides last, and refuses unknown slugs and slug changes', () => {
  const ok = buildDataset(inputs({ overrides: { 'f-zero': { players: 1, scores: { nintendoPower: { score: 4, scale: 5 } }, note: 'NP Sept 1991' } } }));
  const fz = ok.games.find((g) => g.slug === 'f-zero')!;
  expect(fz.players).toBe(1);
  expect(fz.scores.nintendoPower).toEqual({ score: 4, scale: 5 });
  expect(fz.scores.aggregate).toBe(80);
  expect(fz).not.toHaveProperty('note');

  expect(buildDataset(inputs({ overrides: { 'no-such-game': { players: 2 } } })).errors[0]).toMatch(/no-such-game/);
  expect(buildDataset(inputs({ overrides: { 'f-zero': { slug: 'fzero' } as never } })).errors[0]).toMatch(/slug/);
});

test('fails on a slug collision, an alias for a missing game, a missing publisher, or a bad count', () => {
  expect(buildDataset(inputs({ list: [row('F-Zero'), row('F Zero', { article: 'Other' })] })).errors[0]).toMatch(/collision/);
  expect(buildDataset(inputs({ aliases: { igdb: { ghost: 9 }, boxart: {}, companies: {}, slugs: {} } })).errors[0]).toMatch(/ghost/);
  expect(buildDataset(inputs({ list: [row('F-Zero', { publisher: '' })] })).errors[0]).toMatch(/publisher/);
  expect(buildDataset(inputs({ countRange: [700, 740] })).errors[0]).toMatch(/700/);
});

test('aliases.json can pin an IGDB id, fold companies and settle a slug', () => {
  const { games, companies } = buildDataset(inputs({
    aliases: { igdb: { 'f-zero': 2 }, boxart: {}, companies: { 'Nintendo EAD': 'Nintendo' }, slugs: { 'Donkey Kong Country': 'dkc' } },
  }));
  expect(games.find((g) => g.slug === 'f-zero')!.sources.igdb).toBe(2);
  expect(games.find((g) => g.slug === 'f-zero')!.developers).toEqual(['nintendo']);
  expect(games.some((g) => g.slug === 'dkc')).toBe(true);
  expect(companies.find((c) => c.slug === 'nintendo')).toEqual({ slug: 'nintendo', name: 'Nintendo', aliases: ['Nintendo EAD'], country: null });
});

test('reports coverage, unmatched titles and likely duplicate companies', () => {
  const list = [...inputs().list, row('Mystery Cart', { article: null, publisher: 'SETA Corporation' }), row('Other', { publisher: 'SETA' })];
  const { report } = buildDataset(inputs({ list }));
  expect(report).toMatchObject({ games: 5, boxArt: 4, aggregate: 2, egm: 1, launchTitles: 3, chips: 1, igdbFetched: true });
  expect(report.unmatchedIgdb).toEqual(['Mystery Cart', 'Other']);
  expect(report.missingBoxArt).toEqual(['Donkey Kong Country']);
  expect(report.noArticle).toEqual(['Mystery Cart']);
  expect(report.possibleDuplicateCompanies).toEqual([['SETA', 'SETA Corporation']]);
  expect(formatReport(report)).toMatch(/5 games/);
  expect(formatReport(report)).toMatch(/no Wikipedia article +1/);
});

test('companyKey ignores corporate suffixes', () => {
  expect(companyKey('SETA Corporation')).toBe(companyKey('SETA'));
  expect(companyKey('Konami')).not.toBe(companyKey('Kemco'));
});

test('media flags come from the files on disk, and clipStart is an allowed override', () => {
  const have = new Set(['f-zero:video', 'f-zero:logo']);
  const { games, errors } = buildDataset(inputs({
    hasMedia: (slug, kind) => have.has(`${slug}:${kind}`),
    overrides: { 'f-zero': { clipStart: 9 } },
  }));
  expect(errors).toEqual([]);
  const fz = games.find((g) => g.slug === 'f-zero')!;
  expect(fz.media).toEqual({ video: true, logo: true, box3d: false });
  expect(fz.clipStart).toBe(9);
  expect(games.find((g) => g.slug === 'super-metroid')!.media).toEqual({ video: false, logo: false, box3d: false });
  expect(buildDataset(inputs({ aliases: { igdb: {}, boxart: {}, companies: {}, slugs: {}, media: { ghost: 'X (USA)' } } })).errors[0]).toMatch(/"media".*ghost/);
});
