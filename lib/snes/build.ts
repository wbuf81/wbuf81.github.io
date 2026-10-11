/*
 * Merges the cached sources into games.json and companies.json. Wikipedia's list is the spine (which games,
 * dates, developers, publisher); IGDB, review boxes, the chip list and box art join by article or by
 * normalizeTitle. aliases.json settles what matching can't, and overrides.json is applied last, so
 * re-running never loses a hand correction. Pure: the script does all reading and writing.
 */
import type {
  Aliases, ChipRow, Company, CoverageReport, Game, IgdbRaw, Override, Overrides, WikiListRow,
} from './types.ts';
import { normalizeTitle, slugify } from './titles.ts';
import { reviewFields, reviewScores } from './reviews.ts';
import { mapIgdbGame } from './igdb.ts';

export const ESRB_START = '1994-09';
export const LAUNCH_DAY = '1991-08-23';
export const GAME_COUNT_RANGE: [number, number] = [700, 740];

export interface BuildInputs {
  list: WikiListRow[];
  chips: ChipRow[];
  reviewBoxes: Record<string, string | null>;
  igdb: IgdbRaw[] | null;
  aliases: Aliases;
  overrides: Overrides;
  previous: Game[];
  hasBoxArt: (slug: string) => boolean;
  /** Whether a generated media file exists for a game (the import script writes them). */
  hasMedia?: (slug: string, kind: 'video' | 'logo' | 'box3d') => boolean;
  countRange?: [number, number];
  /** Rows of the Wikipedia list parseSoftwareList skipped as unreadable (its `skipped`). */
  unreadableRows?: number;
}

const OVERRIDE_FIELDS = new Set([
  'title', 'releasedUS', 'datePrecision', 'developers', 'publisher', 'genres', 'players', 'chip', 'launchTitle',
  'esrb', 'summary', 'boxArt', 'scores', 'note', 'clipStart', 'series', 'themes', 'perspectives', 'multiplayer',
]);
const SCORE_FIELDS = new Set(['aggregate', 'aggregateCount', 'critic', 'criticCount', 'users', 'usersCount', 'egm', 'nintendoPower', 'other']);

const SUFFIX = /\b(inc|corp|corporation|co|ltd|limited|company|software|entertainment|games|interactive|of america|usa)\b/g;

export function companyKey(name: string): string {
  return normalizeTitle(name).replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();
}

const byCount = (a: IgdbRaw, b: IgdbRaw | undefined) => !b || (a.total_rating_count ?? 0) > (b.total_rating_count ?? 0);

export function buildDataset(input: BuildInputs) {
  const errors: string[] = [];
  const { aliases } = input;
  const [lo, hi] = input.countRange ?? GAME_COUNT_RANGE;
  const companyName = (raw: string) => aliases.companies[raw] ?? raw;
  // A previous slug is found by article and title together, then by article alone when only one game
  // used that article (so an upstream retitle keeps its slug), then by title alone for unlinked games.
  // Several games can share one article (Mario's Early Years! has three), so article alone isn't a key.
  const prevExact = new Map(input.previous.map((g) => [`${g.sources.wikipedia}\u0000${g.title}`, g.slug]));
  const articleUses = new Map<string, Game[]>();
  for (const g of input.previous) if (g.sources.wikipedia) articleUses.set(g.sources.wikipedia, [...(articleUses.get(g.sources.wikipedia) ?? []), g]);
  const prevSlugFor = (article: string | null, title: string) => {
    const exact = prevExact.get(`${article}\u0000${title}`);
    if (exact) return exact;
    const uses = article ? articleUses.get(article) : undefined;
    return uses?.length === 1 ? uses[0].slug : undefined;
  };

  const igdbById = new Map<number, IgdbRaw>();
  const igdbPrimary = new Map<string, IgdbRaw>();
  const igdbAlt = new Map<string, IgdbRaw>();
  for (const raw of input.igdb ?? []) {
    igdbById.set(raw.id, raw);
    const key = normalizeTitle(raw.name);
    if (byCount(raw, igdbPrimary.get(key))) igdbPrimary.set(key, raw);
    for (const alt of raw.alternative_names ?? []) {
      const k = normalizeTitle(alt.name);
      if (byCount(raw, igdbAlt.get(k))) igdbAlt.set(k, raw);
    }
  }

  const chipByArticle = new Map<string, ChipRow['chip']>();
  const chipByKey = new Map<string, ChipRow['chip']>();
  for (const c of input.chips) {
    if (c.article) chipByArticle.set(c.article, c.chip);
    chipByKey.set(normalizeTitle(c.title), c.chip);
  }

  const games: Game[] = [];
  const titleOf = new Map<string, string>();
  const unmatchedIgdb: string[] = [];
  const noArticle: string[] = [];
  const similarIdsOf = new Map<string, number[]>();

  for (const row of input.list) {
    const slug = aliases.slugs[row.title] ?? prevSlugFor(row.article, row.title) ?? slugify(row.title);
    if (titleOf.has(slug)) {
      errors.push(`slug collision: "${slug}" for "${titleOf.get(slug)}" and "${row.title}" — settle it in aliases.json "slugs"`);
      continue;
    }
    titleOf.set(slug, row.title);
    const key = normalizeTitle(row.title);
    const pinned = aliases.igdb[slug];
    const igdbRaw = pinned !== undefined ? igdbById.get(pinned) : igdbPrimary.get(key) ?? igdbAlt.get(key);
    if (input.igdb && !igdbRaw) unmatchedIgdb.push(row.title);
    if (!row.article) noArticle.push(row.title);
    const facts = igdbRaw ? mapIgdbGame(igdbRaw) : null;
    const box = row.article ? input.reviewBoxes[row.article] ?? null : null;

    games.push({
      slug,
      title: row.title,
      releasedUS: row.releasedUS,
      datePrecision: row.datePrecision,
      developers: row.developers.map((d) => slugify(companyName(d))),
      publisher: slugify(companyName(row.publisher)),
      genres: facts?.genres ?? [],
      players: facts?.players ?? null,
      chip: (row.article ? chipByArticle.get(row.article) : undefined) ?? chipByKey.get(key) ?? null,
      launchTitle: row.releasedUS === LAUNCH_DAY,
      esrb: facts?.esrb ?? null,
      summary: facts?.summary ?? null,
      series: facts?.series ?? null,
      similar: [],
      themes: facts?.themes ?? [],
      perspectives: facts?.perspectives ?? [],
      multiplayer: { coop: facts?.coop ?? false, versus: facts?.versus ?? false },
      scores: {
        aggregate: facts?.aggregate ?? null, aggregateCount: facts?.aggregateCount ?? 0,
        critic: facts?.critic ?? null, criticCount: facts?.criticCount ?? 0,
        users: facts?.userScore ?? null, usersCount: facts?.userCount ?? 0,
        ...reviewScores(box ? reviewFields(box) : {}),
      },
      boxArt: input.hasBoxArt(slug) ? `/snes/box/${slug}.jpg` : null,
      media: {
        video: input.hasMedia?.(slug, 'video') ?? false,
        logo: input.hasMedia?.(slug, 'logo') ?? false,
        box3d: input.hasMedia?.(slug, 'box3d') ?? false,
      },
      sources: { wikipedia: row.article, igdb: igdbRaw?.id ?? null },
    });
    if (facts) similarIdsOf.set(slug, facts.similarIds);
  }

  const bySlug = new Map(games.map((g) => [g.slug, g]));
  // Second pass: similar games point at our own slugs, so every game must exist first.
  const slugByIgdb = new Map<number, string>();
  for (const g of games) if (g.sources.igdb !== null && !slugByIgdb.has(g.sources.igdb)) slugByIgdb.set(g.sources.igdb, g.slug);
  for (const g of games) {
    g.similar = (similarIdsOf.get(g.slug) ?? [])
      .map((id) => slugByIgdb.get(id))
      .filter((s): s is string => s !== undefined && s !== g.slug)
      .slice(0, 6);
  }
  for (const [slug, override] of Object.entries(input.overrides)) {
    const game = bySlug.get(slug);
    if (!game) {
      errors.push(`overrides.json names "${slug}", which is not a game`);
      continue;
    }
    if ('slug' in override) {
      errors.push(`overrides.json "${slug}" tries to change the slug — slugs are permanent; use aliases.json "slugs" for a collision`);
      continue;
    }
    const unknown = [
      ...Object.keys(override).filter((k) => !OVERRIDE_FIELDS.has(k)),
      ...Object.keys(override.scores ?? {}).filter((k) => !SCORE_FIELDS.has(k)).map((k) => `scores.${k}`),
    ];
    if (unknown.length) {
      errors.push(`overrides.json "${slug}" has unknown fields: ${unknown.join(', ')}`);
      continue;
    }
    const { note: _note, scores, ...fields } = override as Override;
    Object.assign(game, fields);
    if (scores) game.scores = { ...game.scores, ...scores };
  }
  const titles = new Set(input.list.map((r) => r.title));
  for (const title of Object.keys(aliases.slugs)) {
    if (!titles.has(title)) errors.push(`aliases.json "slugs" names "${title}", which is no longer a Wikipedia title — it no longer protects a slug`);
  }
  const rawNames = new Set(input.list.flatMap((r) => [...r.developers, r.publisher]));
  for (const raw of Object.keys(aliases.companies)) {
    if (!rawNames.has(raw)) errors.push(`aliases.json "companies" names "${raw}", which no game uses`);
  }
  if (input.igdb) {
    for (const [slug, id] of Object.entries(aliases.igdb)) {
      if (!igdbById.has(id)) errors.push(`aliases.json "igdb" pins "${slug}" to IGDB id ${id}, which isn't in the IGDB data`);
    }
  }
  for (const kind of ['igdb', 'boxart', 'media'] as const) {
    for (const slug of Object.keys(aliases[kind] ?? {})) {
      if (!bySlug.has(slug)) errors.push(`aliases.json "${kind}" names "${slug}", which is not a game`);
    }
  }
  // Slugs are permanent (wes.json is keyed by them), so one vanishing is never silent: an upstream retitle of
  // an unlinked game, an article move plus retitle, or a dropped row all land here.
  const retired = new Set(aliases.retiredSlugs ?? []);
  for (const prev of input.previous) {
    if (!bySlug.has(prev.slug) && !retired.has(prev.slug)) {
      errors.push(`slug "${prev.slug}" (${prev.title}) would disappear — map its new Wikipedia title to it in aliases.json "slugs", or list it in "retiredSlugs"`);
    }
  }
  for (const game of games) {
    if (game.releasedUS < ESRB_START) game.esrb = null;
    if (!game.publisher) errors.push(`"${game.title}" has no North American publisher`);
  }
  if (input.unreadableRows) {
    errors.push(`${input.unreadableRows} rows of the Wikipedia list could not be read (an unfamiliar date or table shape) — fix the parser before building`);
  }
  if (games.length < lo || games.length > hi) {
    errors.push(`${games.length} games is outside ${lo}–${hi} — the Wikipedia list probably changed shape`);
  }
  games.sort((a, b) => (a.releasedUS === b.releasedUS ? a.title.localeCompare(b.title) : a.releasedUS < b.releasedUS ? -1 : 1));

  const raws = new Map<string, Set<string>>();
  for (const row of input.list) {
    for (const raw of [...row.developers, row.publisher]) {
      if (!raw) continue;
      const name = companyName(raw);
      if (!raws.has(name)) raws.set(name, new Set());
      if (raw !== name) raws.get(name)!.add(raw);
    }
  }
  const companies: Company[] = Array.from(raws, ([name, set]) => ({ slug: slugify(name), name, aliases: [...set].sort(), country: null }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const companySlugs = new Map<string, string>();
  for (const c of companies) {
    if (companySlugs.has(c.slug)) errors.push(`companies "${companySlugs.get(c.slug)}" and "${c.name}" share the slug "${c.slug}" — fold one into the other in aliases.json "companies"`);
    companySlugs.set(c.slug, c.name);
  }
  const groups = new Map<string, string[]>();
  for (const c of companies) groups.set(companyKey(c.name), [...(groups.get(companyKey(c.name)) ?? []), c.name]);

  const report: CoverageReport = {
    games: games.length,
    companies: companies.length,
    boxArt: games.filter((g) => g.boxArt).length,
    aggregate: games.filter((g) => g.scores.aggregate !== null).length,
    egm: games.filter((g) => g.scores.egm).length,
    nintendoPower: games.filter((g) => g.scores.nintendoPower).length,
    esrb: games.filter((g) => g.esrb).length,
    esrbEligible: games.filter((g) => g.releasedUS >= ESRB_START).length,
    launchTitles: games.filter((g) => g.launchTitle).length,
    chips: games.filter((g) => g.chip).length,
    igdbFetched: input.igdb !== null,
    unmatchedIgdb,
    missingBoxArt: games.filter((g) => !g.boxArt).map((g) => g.title),
    noArticle,
    possibleDuplicateCompanies: [...groups.values()].filter((names) => names.length > 1).map((names) => names.sort()),
  };
  return { games, companies, report, errors };
}

const list = (items: string[]) => (items.length ? `  (${items.slice(0, 12).join('; ')}${items.length > 12 ? '; …' : ''})` : '');

export function formatReport(r: CoverageReport): string {
  const pad = (label: string) => `  ${label.padEnd(22)}`;
  return [
    `SNES dataset — ${r.games} games, ${r.companies} companies`,
    `${pad('box art')}${r.boxArt} / ${r.games}${list(r.missingBoxArt)}`,
    `${pad('aggregate score')}${r.igdbFetched ? `${r.aggregate} / ${r.games}` : 'not fetched (no IGDB key)'}`,
    `${pad('EGM')}${r.egm} / ${r.games}`,
    `${pad('Nintendo Power')}${r.nintendoPower} / ${r.games}`,
    `${pad('ESRB')}${r.esrb} / ${r.esrbEligible} games released from Sept 1994`,
    `${pad('launch titles')}${r.launchTitles}`,
    `${pad('enhancement chips')}${r.chips}`,
    `${pad('unmatched in IGDB')}${r.unmatchedIgdb.length}${list(r.unmatchedIgdb)}`,
    `${pad('no Wikipedia article')}${r.noArticle.length}${list(r.noArticle)}`,
    `${pad('possible duplicates')}${r.possibleDuplicateCompanies.length}${list(r.possibleDuplicateCompanies.map((g) => g.join(' / ')))}`,
  ].join('\n');
}
