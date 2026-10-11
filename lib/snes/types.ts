/*
 * Shapes for the /snes dataset. games.json holds facts only; Wes's opinions live in wes.json (piece 3),
 * keyed by the same permanent slug. Spec: docs/superpowers/specs/2026-10-11-snes-dataset-design.md
 */

export type DatePrecision = 'day' | 'month' | 'year';

export type Chip =
  | 'Super FX' | 'Super FX 2' | 'SA-1' | 'DSP-1' | 'DSP-2' | 'DSP-3' | 'DSP-4'
  | 'Cx4' | 'S-DD1' | 'SPC7110' | 'ST010' | 'ST011' | 'ST018' | 'OBC1' | 'S-RTC';

export type Esrb = 'K-A' | 'E' | 'T' | 'M';

export interface NintendoPowerScore {
  score: number;
  scale: 5 | 10 | 20;
}

export interface Scores {
  /** IGDB total_rating, 0–100, rounded; null under 3 ratings. */
  aggregate: number | null;
  aggregateCount: number;
  /** IGDB critic score (aggregated_rating), 0–100, rounded; null under 3 ratings. */
  critic: number | null;
  criticCount: number;
  /** IGDB player score (rating), 0–100, rounded; null under 3 ratings. */
  users: number | null;
  usersCount: number;
  /** Each EGM reviewer's score out of 10, as printed. */
  egm: number[] | null;
  nintendoPower: NintendoPowerScore | null;
  /** Remaining SNES review-box fields, raw ("GI": "9.5/10", "GR": "96%"). */
  other: Record<string, string>;
}

export interface Game {
  slug: string;
  title: string;
  releasedUS: string;
  datePrecision: DatePrecision;
  developers: string[];
  publisher: string;
  genres: string[];
  players: number | null;
  chip: Chip | null;
  launchTitle: boolean;
  esrb: Esrb | null;
  summary: string | null;
  /** First IGDB franchise, else first collection. */
  series: string | null;
  /** Slugs of our games IGDB lists as similar, in IGDB's order, at most 6. */
  similar: string[];
  themes: string[];
  perspectives: string[];
  multiplayer: { coop: boolean; versus: boolean };
  scores: Scores;
  boxArt: string | null;
  /** Which of Wes's media exist for this game: public/snes/video|logo|box3d/<slug>.* */
  media: { video: boolean; logo: boolean; box3d: boolean };
  /** Second the 12-second clip starts at (default 4). */
  clipStart?: number;
  sources: { wikipedia: string | null; igdb: number | null };
}

export interface Company {
  slug: string;
  name: string;
  /** Raw names folded into this company by aliases.json. */
  aliases: string[];
  country: string | null;
}

/** One North American release from Wikipedia's list. */
export interface WikiListRow {
  title: string;
  /** Wikipedia article for the game; null when unlinked or linked to a section of another page. */
  article: string | null;
  developers: string[];
  publisher: string;
  releasedUS: string;
  datePrecision: DatePrecision;
}

export interface ChipRow {
  title: string;
  article: string | null;
  chip: Chip;
}

/** The fields of IGDB's /v4/games we request (see scripts/snes/fetch-igdb.mjs). */
export interface IgdbRaw {
  id: number;
  name: string;
  alternative_names?: { name: string }[];
  genres?: { name: string }[];
  game_modes?: { name: string }[];
  multiplayer_modes?: { platform?: number; offlinemax?: number; offlinecoopmax?: number; offlinecoop?: boolean }[];
  franchises?: { name: string }[];
  collections?: { name: string }[];
  similar_games?: number[];
  themes?: { name: string }[];
  player_perspectives?: { name: string }[];
  total_rating?: number;
  total_rating_count?: number;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  rating?: number;
  rating_count?: number;
  summary?: string;
  age_ratings?: { organization?: { name?: string } | number; rating_category?: { rating?: string } | number }[];
}

export interface IgdbFacts {
  id: number;
  genres: string[];
  players: number | null;
  esrb: Esrb | null;
  summary: string | null;
  aggregate: number | null;
  aggregateCount: number;
  series: string | null;
  similarIds: number[];
  themes: string[];
  perspectives: string[];
  coop: boolean;
  versus: boolean;
  critic: number | null;
  criticCount: number;
  userScore: number | null;
  userCount: number;
}

export interface Aliases {
  /** slug → IGDB game id, for titles the matcher can't pair. */
  igdb: Record<string, number>;
  /** slug → libretro Named_Boxarts file name. */
  boxart: Record<string, string>;
  /** raw company name → canonical company name. */
  companies: Record<string, string>;
  /** Wikipedia title → slug, to settle a collision or keep a slug through a rename. */
  slugs: Record<string, string>;
  /** Slugs deliberately dropped from games.json. Any other slug that disappears fails the build. */
  retiredSlugs?: string[];
  /** slug → base name in Wes's media set, for titles the matcher can't pair. */
  media?: Record<string, string>;
}

export type Override = {
  [K in Exclude<keyof Game, 'slug' | 'scores' | 'sources'>]?: Game[K];
} & { scores?: Partial<Scores>; note?: string };

export type Overrides = Record<string, Override>;

export interface CoverageReport {
  games: number;
  companies: number;
  boxArt: number;
  aggregate: number;
  egm: number;
  nintendoPower: number;
  esrb: number;
  /** Games released from Sept 1994, the only ones that can carry an ESRB rating. */
  esrbEligible: number;
  launchTitles: number;
  chips: number;
  igdbFetched: boolean;
  unmatchedIgdb: string[];
  missingBoxArt: string[];
  noArticle: string[];
  possibleDuplicateCompanies: string[][];
}
