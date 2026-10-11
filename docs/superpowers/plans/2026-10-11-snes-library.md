# SNES Library and Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/snes` (a hero, a filter bar and five views: Timeline, Heatmap, Cover wall, Game shelf, Score scatter), 717 booklet-style game pages and the company pages. Gameplay clips with sound play on hover and on game pages. Everything is generated statically from piece 1's dataset.

**Architecture:**
- Pure, tested logic lives in `lib/snes/library.ts`, which handles filtering, sorting, grouping, heatmap counts, scatter points and URL state, and in `lib/snes/display.ts`, which handles labels and magazine names.
- `/snes` is a server page that renders one client component, `Library`. Library is server-rendered with the full Timeline, so the content exists without JavaScript. After hydration it reads the filters from the URL and switches views. The non-Timeline views are code-split with `React.lazy`.
- Game and company pages are static (`generateStaticParams`). They share `GameTile`, a client component whose hover plays a 12-second clip.
- Three dataset additions feed it:
  - US titles for Final Fantasy II and III
  - 96 px thumbnails
  - Wes's media, imported into clips, logos and 3D boxes

**Tech Stack:** Next 16 (app router, `output: 'export'`), React 19, TypeScript, Jest with Testing Library (`next/jest`, jsdom). The media and box-art scripts use ffmpeg and macOS `sips`. There are **no new npm dependencies**.

**Spec:** `docs/superpowers/specs/2026-10-11-snes-library-design.md`. It builds on piece 1: `docs/superpowers/specs/2026-10-11-snes-dataset-design.md` and `docs/superpowers/plans/2026-10-11-snes-dataset.md`.

## Global Constraints

**Site and pages**
- The site stays a static export. Nothing is fetched at runtime; pages read `data/snes/*.json` at build time.
- Every `/snes` route has `robots: { index: false, follow: false }`. `public/robots.txt` gains `Disallow: /snes`. `public/sitemap.xml` does not list `/snes`.
- `/snes` is not linked from the site nav or homepage.
- Pages built on the system use `<Nav theme />`, then `<main className="wb wb-page">`, then `<Footer />`.
- The layout must work at 390 px with no sideways scroll, in both themes.

**Styles and tokens**
- In `app/snes/snes.css`, every selector sits under `.wb`, and colors are tokens only, never a hex.
- The single permitted raw color is black at low alpha, written `rgba(0, 0, 0, …)`, used for the CRT scanlines and spine shading.
- Every new token goes in `:root`, in **both** dark blocks of `app/design-system.css`, and in `TOKENS` in `app/design/tokens.ts`.
- New tokens, with light and dark values:

  | Token | Light | Dark |
  |---|---|---|
  | `--snes` | `#4f3d8f` | `#b3a6ea` |
  | `--snes-glow` | `#8a7cc4` | `#8a7cc4` |
  | `--snes-soft` | `#ebe7f7` | `#2b2546` |
  | `--screen-2` | `#1b2530` | `#1b2530` |
  | `--screen-rule` | `#2a3640` | `#2a3640` |
  | `--snes-h1` | `#d9d3ef` | `#2b2546` |
  | `--snes-h2` | `#ab9fd8` | `#4a3d80` |
  | `--snes-h3` | `#7a69bd` | `#6f5fb8` |
  | `--snes-h4` | `#4f3d8f` | `#a99be0` |
  | `--booklet` | `#fbfaf6` | `#1d222a` |
  | `--shelf` | `#e9dcc6` | `#2a241d` |
  | `--plank` | `#8b6a42` | `#5a4329` |

- **Hover scanlines:** `repeating-linear-gradient(0deg, rgba(0, 0, 0, .28) 0 1px, transparent 1px 3px)` plus `radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, .28))`. They ease in over 0.4 s, with no flicker, and come with a `saturate(1.12) contrast(1.05)` lift.

**Behavior**
- **Sound** is on by default. Clips stay muted until the visitor's first `pointerdown`, `keydown` or `touchstart` on the page, or until `navigator.userActivation.hasBeenActive` is true.
- The 🔊 button mutes and unmutes. A mute is stored in `localStorage` under `snes-sound` = `off`.
- **Hover clips** start after 300 ms of hover. Only one plays at a time.
- Touch devices (`(hover: hover)` false) and `prefers-reduced-motion: reduce` get no hover playback.

**Media files**
- Clips are 12 seconds long, starting at `clipStart`, which defaults to 4.
- Encoding: 360 px wide, H.264 CRF 30 with `-maxrate 260k -bufsize 520k`, AAC 56 kbit/s mono, `+faststart`. Output goes to `public/snes/video/<slug>.mp4`.
- Logos are 480 px wide, at `public/snes/logo/<slug>.png`. 3D boxes are 420 px tall, at `public/snes/box3d/<slug>.png`, and are skipped for `(Japan` files.
- Budgets:
  - all video at most 350 MB
  - each clip at most 600 KB
  - all of `public/snes` at most 600 MB
- Wes's raw media lives at `SNES_MEDIA_DIR` (from `.env.local`), defaulting to `../snes-media` relative to the repo. It is never committed. `out/` is wiped by every build, so nothing is ever kept there.

**Code rules**
- `lib/snes/*.ts` keeps the piece 1 rules: `import type` for types, `.ts` extensions on relative imports, no `@/` imports, no `enum`. Scripts load these files through ts-node.
- Manuals are out of scope (paused by Wes): no manual links or embeds anywhere.

## Review Focus

1. **Moving fast across many tiles** must never leave two clips playing or audio stuck on. Pinned in Task 7 (`only one clip plays at a time`).
2. **Phones and reduced-motion users** must never get autoplaying video. Pinned in Task 7 (`no hover playback on touch or reduced motion`).
3. **A visitor who muted** must stay muted after a reload. Pinned in Task 7 (`a stored mute survives a reload`).
4. **Filters that match nothing** must give a friendly state in every view: Timeline and Shelf show "No carts match", the Heatmap is all zeros, and the Scatter says it has no points. Pinned in Tasks 8, 9 and 10 (`… with no matches`).
5. **A year tab for a year with no matching games** must be disabled rather than scrolling nowhere. Pinned in Task 8 (`year tabs disable years with no matches`).

---

### Task 1: US titles for Final Fantasy II and III

**Files:**
- Modify: `data/snes/aliases.json`, `data/snes/overrides.json`
- Modify: `__tests__/snes-data.test.ts`
- Regenerated: `data/snes/games.json`, `public/snes/box/*`

**Interfaces:**
- Consumes: piece 1's `aliases.json` keys `slugs` and `retiredSlugs`, and `overrides.json`, all applied by `buildDataset`.
- Produces: the slugs `final-fantasy-ii` and `final-fantasy-iii`. The old slugs `final-fantasy-iv` and `final-fantasy-vi` are retired.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/snes-data.test.ts`:
```ts
test('Final Fantasy IV and VI carry their US names, II and III', () => {
  const ff = Object.fromEntries(games.filter((g) => g.slug.startsWith('final-fantasy')).map((g) => [g.slug, g.title]));
  expect(ff['final-fantasy-ii']).toBe('Final Fantasy II');
  expect(ff['final-fantasy-iii']).toBe('Final Fantasy III');
  expect(ff['final-fantasy-iv']).toBeUndefined();
  expect(ff['final-fantasy-vi']).toBeUndefined();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest __tests__/snes-data.test.ts -t "US names"`
Expected: FAIL. `ff['final-fantasy-ii']` is undefined.

- [ ] **Step 3: Add the slug aliases, retirements and title overrides**

In `data/snes/aliases.json`:
- add `"Final Fantasy IV": "final-fantasy-ii"` and `"Final Fantasy VI": "final-fantasy-iii"` inside `"slugs"`
- add the key `"retiredSlugs": ["final-fantasy-iv", "final-fantasy-vi"]`

Then in `data/snes/overrides.json`, add:
```json
  "final-fantasy-ii": { "title": "Final Fantasy II", "note": "Released in North America as Final Fantasy II; Wikipedia lists it as Final Fantasy IV." },
  "final-fantasy-iii": { "title": "Final Fantasy III", "note": "Released in North America as Final Fantasy III; Wikipedia lists it as Final Fantasy VI." }
```

- [ ] **Step 4: Rebuild, fetch the renamed games' box art, rebuild**

Run: `NODE_NO_WARNINGS=1 npm run -s snes:build && NODE_NO_WARNINGS=1 npm run -s snes:fetch:boxart && NODE_NO_WARNINGS=1 npm run -s snes:build | head -3`
Expected:
- Both builds succeed.
- The box-art step downloads 2 images and prunes `final-fantasy-iv.jpg` and `final-fantasy-vi.jpg`.
- The report still says 714 or more box art.

- [ ] **Step 5: Run the data tests**

Run: `npx jest __tests__/snes-data.test.ts`
Expected: PASS, including the new test.

- [ ] **Step 6: Commit**

```bash
git add data/snes public/snes/box __tests__/snes-data.test.ts
git commit -m "data(snes): Final Fantasy II and III under their US names"
```

---

### Task 2: 96 px thumbnails

**Files:**
- Modify: `scripts/snes/fetch-boxart.mjs`
- Modify: `__tests__/snes-data.test.ts`
- Generated: `public/snes/thumb/<slug>.jpg`

**Interfaces:**
- Consumes: `public/snes/box/<slug>.jpg` and `games.json`.
- Produces: `public/snes/thumb/<slug>.jpg` for every game with `boxArt`, 96 px wide, JPEG quality 75. Task 5's `buildIndex` sets `thumb` to `/snes/thumb/<slug>.jpg`.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/snes-data.test.ts`:
```ts
test('every cover has a 96px thumbnail, and no thumbnail is orphaned', () => {
  const dir = path.join(process.cwd(), 'public/snes/thumb');
  const thumbs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')) : [];
  expect(thumbs.sort()).toEqual(games.filter((g) => g.boxArt).map((g) => `${g.slug}.jpg`).sort());
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest __tests__/snes-data.test.ts -t thumbnail`
Expected: FAIL, because the received array is empty.

- [ ] **Step 3: Make the fetcher write and prune thumbnails**

In `scripts/snes/fetch-boxart.mjs`:

1. After `fs.mkdirSync(BOX_DIR, { recursive: true });`, add:
```js
const THUMB_DIR = path.join(BOX_DIR, '..', 'thumb');
fs.mkdirSync(THUMB_DIR, { recursive: true });
// The cover wall and shelf show 717 covers at once; a 96px copy keeps that to a few MB.
const makeThumb = (from, slug) =>
  spawnSync('sips', ['--resampleWidth', '96', '-s', 'format', 'jpeg', '-s', 'formatOptions', '75', from, '--out', path.join(THUMB_DIR, `${slug}.jpg`)], { encoding: 'utf8' });
```

2. Right after `sources[game.slug] = file;`, add `makeThumb(out, game.slug);`

3. Before the comment `// A slug that left games.json …`, add:
```js
// Covers made before thumbnails existed get one from the local image, with no download.
for (const game of games) {
  const out = path.join(BOX_DIR, `${game.slug}.jpg`);
  if (fs.existsSync(out) && !fs.existsSync(path.join(THUMB_DIR, `${game.slug}.jpg`))) makeThumb(out, game.slug);
}
```

4. Inside the pruning block, after the `for (const file of fs.readdirSync(BOX_DIR))` loop, add:
```js
for (const file of fs.readdirSync(THUMB_DIR)) {
  if (file.endsWith('.jpg') && !slugs.has(file.slice(0, -4))) fs.rmSync(path.join(THUMB_DIR, file));
}
```

- [ ] **Step 4: Run it**

Run: `NODE_NO_WARNINGS=1 npm run -s snes:fetch:boxart | tail -2 && ls public/snes/thumb | wc -l && du -sh public/snes/thumb`
Expected: about 716 thumbnails, about 3–5 MB in total.

- [ ] **Step 5: Run the data tests**

Run: `npx jest __tests__/snes-data.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/snes/fetch-boxart.mjs public/snes/thumb __tests__/snes-data.test.ts
git commit -m "feat(snes): 96px cover thumbnails for the wall and shelf"
```

---

### Task 3: Import Wes's media (clips with sound, logos, 3D boxes)

**Files:**
- Create: `lib/snes/media.ts`
- Create: `scripts/snes/import-media.mjs`
- Modify: `lib/snes/types.ts`, `lib/snes/build.ts`, `scripts/snes/build-games.mjs`, `package.json`, `.env.example`
- Modify: `data/snes/aliases.json`
- Test: `__tests__/snes-media.test.ts`, `__tests__/snes-build.test.ts`, `__tests__/snes-data.test.ts`
- Generated: `public/snes/video/*.mp4`, `public/snes/logo/*.png`, `public/snes/box3d/*.png`, `public/snes/media-sources.json`, `public/snes/SOURCES.md`

**Interfaces:**
- Consumes:
  - `parseLibretroName(file: string): { file; key; rank } | null` from `lib/snes/boxart.ts`
  - `normalizeTitle` from `lib/snes/titles.ts`
- Produces:
  - `type MediaKind = 'image' | 'marquee' | 'thumb' | 'video'`
  - `splitMediaName(file: string): { base: string; kind: MediaKind } | null`
  - `interface MediaEntry { base: string; kinds: MediaKind[]; japan: boolean }`
  - `indexMedia(files: string[]): Map<string, MediaEntry>`, keyed by normalized title
  - `mediaFor(index: Map<string, MediaEntry>, title: string, alias?: string): MediaEntry | null`
  - On `Game`: `media: { video: boolean; logo: boolean; box3d: boolean }` and `clipStart?: number`
  - On `BuildInputs`: `hasMedia?: (slug: string, kind: 'video' | 'logo' | 'box3d') => boolean`
  - On `Aliases`: `media?: Record<string, string>`, mapping slug to file base name

- [ ] **Step 1: Write the failing matcher tests**

`__tests__/snes-media.test.ts`:
```ts
import { indexMedia, mediaFor, splitMediaName } from '@/lib/snes/media';

const FILES = [
  'F-Zero (USA)-image.png', 'F-Zero (USA)-marquee.png', 'F-Zero (USA)-thumb.png', 'F-Zero (USA)-video.mp4',
  'Super Metroid (Japan, USA) (En,Ja)-image.png', 'Super Metroid (Japan, USA) (En,Ja)-video.mp4',
  'Dino City (USA)-video.mp4', 'Dino City (USA)-marquee.png',
  'Arcus Odyssey (USA) (Proto)-video.mp4',
  'F-Zero (Japan)-video.mp4',
  'notes.txt',
];

test('splits a media file name into its base and kind', () => {
  expect(splitMediaName('7th Saga, The (USA)-marquee.png')).toEqual({ base: '7th Saga, The (USA)', kind: 'marquee' });
  expect(splitMediaName('F-Zero (USA)-video.mp4')).toEqual({ base: 'F-Zero (USA)', kind: 'video' });
  expect(splitMediaName('notes.txt')).toBeNull();
});

test('indexes US files by title with every kind found, skipping prototypes and Japan-only files', () => {
  const index = indexMedia(FILES);
  expect(mediaFor(index, 'F-Zero')).toEqual({ base: 'F-Zero (USA)', kinds: ['image', 'marquee', 'thumb', 'video'], japan: false });
  expect(mediaFor(index, 'Super Metroid')).toEqual({ base: 'Super Metroid (Japan, USA) (En,Ja)', kinds: ['image', 'video'], japan: true });
  expect(mediaFor(index, 'Arcus Odyssey')).toBeNull();
});

test('an alias names the file base when titles differ', () => {
  const index = indexMedia(FILES);
  expect(mediaFor(index, 'DinoCity')).toBeNull();
  expect(mediaFor(index, 'DinoCity', 'Dino City (USA)')?.kinds).toEqual(['marquee', 'video']);
  expect(mediaFor(index, 'DinoCity', 'Nope (USA)')).toBeNull();
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-media.test.ts`
Expected: FAIL with "Cannot find module '@/lib/snes/media'".

- [ ] **Step 3: Implement the matcher**

`lib/snes/media.ts`:
```ts
/*
 * Matches Wes's scraped media set (snes-media/images and /videos: "<No-Intro name>-<kind>.<ext>") to games,
 * with the same title matching and region rules as the box art: US files only, never prototypes or betas.
 * "(Japan, USA)" files are US releases but carry Japanese box art, so callers skip their 3D box.
 */
import { parseLibretroName } from './boxart.ts';
import { normalizeTitle } from './titles.ts';

export type MediaKind = 'image' | 'marquee' | 'thumb' | 'video';
const KINDS: MediaKind[] = ['image', 'marquee', 'thumb', 'video'];

export interface MediaEntry {
  base: string;
  kinds: MediaKind[];
  japan: boolean;
}

export function splitMediaName(file: string): { base: string; kind: MediaKind } | null {
  const m = file.match(/^(.*)-(image|marquee|thumb|video)\.(png|mp4)$/);
  return m ? { base: m[1], kind: m[2] as MediaKind } : null;
}

export function indexMedia(files: string[]): Map<string, MediaEntry> {
  const byBase = new Map<string, Set<MediaKind>>();
  for (const f of files) {
    const s = splitMediaName(f);
    if (!s) continue;
    if (!byBase.has(s.base)) byBase.set(s.base, new Set());
    byBase.get(s.base)!.add(s.kind);
  }
  const best = new Map<string, MediaEntry & { rank: number }>();
  for (const [base, kinds] of byBase) {
    const parsed = parseLibretroName(`${base}.png`);
    if (!parsed) continue;
    const cur = best.get(parsed.key);
    if (cur && cur.rank >= parsed.rank) continue;
    best.set(parsed.key, { base, kinds: KINDS.filter((k) => kinds.has(k)), japan: /\(Japan/.test(base), rank: parsed.rank });
  }
  return new Map(Array.from(best, ([key, { rank: _rank, ...entry }]) => [key, entry]));
}

export function mediaFor(index: Map<string, MediaEntry>, title: string, alias?: string): MediaEntry | null {
  if (alias) {
    for (const entry of index.values()) if (entry.base === alias) return entry;
    return null;
  }
  return index.get(normalizeTitle(title)) ?? null;
}
```

- [ ] **Step 4: Run the matcher tests and confirm they pass**

Run: `npx jest __tests__/snes-media.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing build test for media flags**

Append to `__tests__/snes-build.test.ts`:
```ts
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
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npx jest __tests__/snes-build.test.ts -t "media flags"`
Expected: FAIL, because `fz.media` is undefined (TypeScript may also flag `hasMedia` and `clipStart` as unknown).

- [ ] **Step 7: Add the fields and wire them into the build**

In `lib/snes/types.ts`:

1. In `interface Game`, after `boxArt: string | null;`, add:
```ts
  /** Which of Wes's media exist for this game: public/snes/video|logo|box3d/<slug>.* */
  media: { video: boolean; logo: boolean; box3d: boolean };
  /** Second the 12-second clip starts at (default 4). */
  clipStart?: number;
```

2. In `interface Aliases`, after `retiredSlugs?: string[];`, add:
```ts
  /** slug → base name in Wes's media set, for titles the matcher can't pair. */
  media?: Record<string, string>;
```

In `lib/snes/build.ts`:

1. In `BuildInputs`, add:
```ts
  /** Whether a generated media file exists for a game (the import script writes them). */
  hasMedia?: (slug: string, kind: 'video' | 'logo' | 'box3d') => boolean;
```

2. In `OVERRIDE_FIELDS`, add `'clipStart'`.

3. In the `games.push({ … })` object, after `boxArt: …,`, add:
```ts
      media: {
        video: input.hasMedia?.(slug, 'video') ?? false,
        logo: input.hasMedia?.(slug, 'logo') ?? false,
        box3d: input.hasMedia?.(slug, 'box3d') ?? false,
      },
```

4. Change `for (const kind of ['igdb', 'boxart'] as const) {` and its inner loop to:
```ts
  for (const kind of ['igdb', 'boxart', 'media'] as const) {
    for (const slug of Object.keys(aliases[kind] ?? {})) {
```

In `scripts/snes/build-games.mjs`, after the `hasBoxArt:` line, add:
```js
  hasMedia: (slug, kind) =>
    fs.existsSync(path.join(BOX_DIR, '..', kind, `${slug}.${kind === 'video' ? 'mp4' : 'png'}`)),
```

- [ ] **Step 8: Run the build tests**

Run: `npx jest __tests__/snes-build.test.ts`
Expected: PASS (all, including the new one).

- [ ] **Step 9: Write the import script**

`scripts/snes/import-media.mjs`:
```js
#!/usr/bin/env node
/**
 * Turns Wes's scraped media set into what the site serves:
 *   public/snes/video/<slug>.mp4   12s clip with sound (360px, H.264 CRF30 ≤260k, AAC 56k mono, faststart)
 *   public/snes/logo/<slug>.png    title logo, 480px wide
 *   public/snes/box3d/<slug>.png   3D box render, 420px tall (skipped for "(Japan" files: Japanese art)
 * The raw set lives outside the repo at SNES_MEDIA_DIR (.env.local), default ../snes-media. Never in out/:
 * every build wipes out/. Re-runs only redo what changed (a new clipStart, a new alias). Then run snes:build.
 *
 *   npm run snes:media [-- --refresh]
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { DATA_DIR, loadTs, readJson, refresh, repoRoot, writeJson } from './lib.mjs';

const envFile = path.join(repoRoot, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const MEDIA = path.resolve(repoRoot, process.env.SNES_MEDIA_DIR || '../snes-media');
if (!fs.existsSync(path.join(MEDIA, 'videos'))) {
  console.error(`No media set at ${MEDIA} (expected images/ and videos/). Set SNES_MEDIA_DIR in .env.local.`);
  process.exit(1);
}
const { indexMedia, mediaFor } = loadTs('lib/snes/media.ts');
const games = readJson(path.join(DATA_DIR, 'games.json'), []);
const aliases = readJson(path.join(DATA_DIR, 'aliases.json'), {});
const PUB = path.join(repoRoot, 'public/snes');
const DIRS = { video: path.join(PUB, 'video'), logo: path.join(PUB, 'logo'), box3d: path.join(PUB, 'box3d') };
for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });

const index = indexMedia([...fs.readdirSync(path.join(MEDIA, 'images')), ...fs.readdirSync(path.join(MEDIA, 'videos'))]);
const sourcesFile = path.join(PUB, 'media-sources.json');
const sources = readJson(sourcesFile, {});
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.trim().split('\n').pop()}`);
};
const missing = [];
let clips = 0;

for (const game of games) {
  const entry = mediaFor(index, game.title, aliases.media?.[game.slug]);
  if (!entry) {
    missing.push(game.title);
    continue;
  }
  const clipStart = game.clipStart ?? 4;
  const was = sources[game.slug] ?? {};
  const changed = refresh || was.base !== entry.base;
  const video = path.join(DIRS.video, `${game.slug}.mp4`);
  if (entry.kinds.includes('video') && (changed || was.clipStart !== clipStart || !fs.existsSync(video))) {
    run('ffmpeg', ['-v', 'error', '-y', '-ss', String(clipStart), '-t', '12', '-i', path.join(MEDIA, 'videos', `${entry.base}-video.mp4`),
      '-vf', 'scale=360:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-maxrate', '260k', '-bufsize', '520k',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '56k', '-ac', '1', video]);
    clips++;
  }
  const logo = path.join(DIRS.logo, `${game.slug}.png`);
  if (entry.kinds.includes('marquee') && (changed || !fs.existsSync(logo))) {
    run('sips', ['--resampleWidth', '480', path.join(MEDIA, 'images', `${entry.base}-marquee.png`), '--out', logo]);
  }
  const box3d = path.join(DIRS.box3d, `${game.slug}.png`);
  if (entry.kinds.includes('image') && !entry.japan && (changed || !fs.existsSync(box3d))) {
    run('sips', ['--resampleHeight', '420', path.join(MEDIA, 'images', `${entry.base}-image.png`), '--out', box3d]);
  }
  sources[game.slug] = { base: entry.base, clipStart };
  if (clips && clips % 50 === 0) {
    writeJson(sourcesFile, sources);
    console.log(`  ${clips} clips`);
  }
}

// A slug that left games.json takes its media with it.
const slugs = new Set(games.map((g) => g.slug));
for (const slug of Object.keys(sources)) if (!slugs.has(slug)) delete sources[slug];
for (const [kind, dir] of Object.entries(DIRS)) {
  for (const f of fs.readdirSync(dir)) if (!slugs.has(f.replace(/\.(mp4|png)$/, ''))) fs.rmSync(path.join(dir, f));
}
writeJson(sourcesFile, sources);
fs.writeFileSync(path.join(PUB, 'SOURCES.md'),
  '# SNES media\n\nGameplay clips (12 seconds, re-encoded), title logos and 3D box renders come from Wes\'s personal scraped media ' +
  'library, matched to each game by its No-Intro name (`media-sources.json` lists the file used for every game). They belong to ' +
  "each game's publisher and are shown small and credited in a non-commercial history of the console. Box art credits: `box/SOURCES.md`.\n");
const mb = (dir) => fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0) / 1e6;
console.log(`media: ${clips} clips encoded · video ${mb(DIRS.video).toFixed(0)} MB · logos ${mb(DIRS.logo).toFixed(0)} MB · 3D boxes ${mb(DIRS.box3d).toFixed(0)} MB`);
if (missing.length) console.log(`  no media (add aliases.json "media" entries): ${missing.join('; ')}`);
```

- [ ] **Step 10: Add the npm script, document the setting, add the aliases**

In `package.json` `"scripts"`, add `"snes:media": "node scripts/snes/import-media.mjs"`.

Append to `.env.example`:
```
# SNES media: Wes's scraped clips/logos/3D boxes (images/ and videos/). Never inside out/ — builds wipe it.
SNES_MEDIA_DIR=../snes-media
```

In `data/snes/aliases.json`, add the key `"media"` with these entries, which were confirmed against the media set on 11 Oct 2026:
```json
  "media": {
    "dinocity": "Dino City (USA)",
    "super-ghouls-n-ghosts": "Super Ghouls'n Ghosts (USA)",
    "super-baseball-2020": "2020 Super Baseball (USA)",
    "michael-andrettis-indy-car-challenge": "Michael Andretti's IndyCar Challenge (USA)",
    "doom-troopers": "Doom Troopers - Mutant Chronicles (USA)",
    "uncharted-waters-new-horizons": "New Horizons (USA)",
    "nobunagas-ambition-lord-of-darkness": "Lord of Darkness (USA)",
    "final-fantasy-ii": "Final Fantasy II (USA) (Rev 1)",
    "final-fantasy-iii": "Final Fantasy III (USA) (Rev 1)"
  }
```

Before saving, confirm each slug exists:

Run: `node -e "const g=new Set(require('./data/snes/games.json').map(x=>x.slug));for(const s of ['dinocity','super-ghouls-n-ghosts','super-baseball-2020','michael-andrettis-indy-car-challenge','doom-troopers','uncharted-waters-new-horizons','nobunagas-ambition-lord-of-darkness','final-fantasy-ii','final-fantasy-iii'])if(!g.has(s))console.log('missing',s)"`

Fix any slug it prints, using the real slug from `games.json`, before continuing.

- [ ] **Step 11: Run the import (about 10–20 minutes for 716 clips), then rebuild**

Run: `NODE_NO_WARNINGS=1 npm run -s snes:media && NODE_NO_WARNINGS=1 npm run -s snes:build | head -3`
Expected:
- The import reports about 716 clips and video around 250–350 MB.
- The only game with no media is Soccer Kid.
- The build passes.

- [ ] **Step 12: Write the data tests for flags and budgets**

Append to `__tests__/snes-data.test.ts`:
```ts
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
```

Run: `npx jest __tests__/snes-data.test.ts __tests__/snes-media.test.ts __tests__/snes-build.test.ts`
Expected: PASS.

- [ ] **Step 13: Commit (code first, then the large media commit)**

```bash
git add lib/snes/media.ts lib/snes/types.ts lib/snes/build.ts scripts/snes/import-media.mjs scripts/snes/build-games.mjs package.json .env.example __tests__/snes-media.test.ts __tests__/snes-build.test.ts
git commit -m "feat(snes): import gameplay clips, logos and 3D boxes from Wes's media set"
git add data/snes public/snes/video public/snes/logo public/snes/box3d public/snes/media-sources.json public/snes/SOURCES.md __tests__/snes-data.test.ts
git commit -m "data(snes): 12-second clips with sound, logos and 3D boxes"
```

---

### Task 4: Design-system tokens and the `/snes` stylesheet

**Files:**
- Modify: `app/design-system.css` (the `:root` block and both dark blocks)
- Modify: `app/design/tokens.ts`, `app/design/page.tsx:23`
- Create: `app/snes/snes.css`
- Test: `__tests__/snes-css.test.ts` (new). The existing `__tests__/design-system.test.ts` and `__tests__/design-page.test.tsx` must stay green.

**Interfaces:**
- Produces: the tokens listed in Global Constraints, and the CSS class contract every later task uses:
  - **Page:** `s-wrap s-hero`
  - **Filter bar:** `s-bar s-search s-dd s-pop s-select s-toggle s-sound(.is-on/.is-wait) s-views s-count s-clear s-years`
  - **Timeline:** `s-month s-when s-m s-y s-n s-lbl s-row s-anchor`
  - **Tile:** `s-tile(.is-playing) s-art(.is-on) s-noart s-tb s-tt s-tp s-chips s-day`
  - **Empty state:** `s-empty`
  - **Heatmap:** `s-heat s-heat-row s-heat-cell(.l0–.l4 .is-pre)`
  - **Cover wall:** `s-wall s-wall-item(.is-dim) s-wall-year`
  - **Shelf:** `s-shelf-year s-shelf s-spine s-band s-spine-t s-seal s-spine-tip`
  - **Scatter:** `s-scatter-wrap s-axis-pick s-scatter s-dot(.is-star) s-dot-label s-tick-x s-tick-y`
  - **Game page:** `s-crumb s-game s-frame(.is-crt) s-box3d s-play s-seg s-wes s-booklet s-logo s-title s-bchips s-bchip(.is-day) s-sect s-spec s-none s-bars s-bar4 s-bars-label s-crs s-cr s-also s-steps`
  - **Company page:** `s-company`

- [ ] **Step 1: Write the failing stylesheet test**

`__tests__/snes-css.test.ts`:
```ts
import fs from 'fs';
import path from 'path';

// /snes follows the design system's rules: colours by token, every selector under .wb. The one raw colour
// allowed is black at low alpha, for the CRT scanlines and spine shading.
const css = fs.readFileSync(path.join(process.cwd(), 'app/snes/snes.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('colours come from tokens: no hex, and the only raw colour is translucent black', () => {
  expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  for (const m of css.matchAll(/rgba?\(([^)]*)\)/g)) expect(m[1].replace(/\s/g, '')).toMatch(/^0,0,0,\.?\d/);
});

test('every selector is scoped under .wb', () => {
  const body = css.replace(/@media[^{]*\{/g, '');
  const selectors = Array.from(body.matchAll(/(?:^|[;}])\s*([^{};@]+)\{/g), (m) => m[1].trim()).filter(Boolean);
  expect(selectors.length).toBeGreaterThan(80);
  for (const sel of selectors) for (const part of sel.split(',')) expect(part.trim()).toMatch(/^\.wb\b/);
});

test('the hover scanlines are the light ones Wes chose, easing in', () => {
  expect(css).toContain('repeating-linear-gradient(0deg, rgba(0, 0, 0, .28) 0 1px, transparent 1px 3px)');
  expect(css).toMatch(/\.s-art::after[^}]*transition: opacity \.4s/);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx jest __tests__/snes-css.test.ts`
Expected: FAIL with ENOENT for `app/snes/snes.css`.

- [ ] **Step 3: Add the tokens**

In `app/design-system.css`, append this line inside `:root {`, after the `--screen` line:
```css
  --snes: #4f3d8f; --snes-glow: #8a7cc4; --snes-soft: #ebe7f7; --screen-2: #1b2530; --screen-rule: #2a3640; --snes-h1: #d9d3ef; --snes-h2: #ab9fd8; --snes-h3: #7a69bd; --snes-h4: #4f3d8f; --booklet: #fbfaf6; --shelf: #e9dcc6; --plank: #8b6a42;
```

Then append this **identical** line inside **both** dark blocks (`:root:not([data-theme="light"]):has(.wb-page) {` and `:root[data-theme="dark"]:has(.wb-page) {`), after their `--screen` line:
```css
    --snes: #b3a6ea; --snes-glow: #8a7cc4; --snes-soft: #2b2546; --screen-2: #1b2530; --screen-rule: #2a3640; --snes-h1: #2b2546; --snes-h2: #4a3d80; --snes-h3: #6f5fb8; --snes-h4: #a99be0; --booklet: #1d222a; --shelf: #2a241d; --plank: #5a4329;
```

In `app/design/tokens.ts`:
- Change the `TokenGroup` type to:
  ```ts
  export type TokenGroup = 'Surfaces' | 'Ink' | 'Accent' | 'Meaning' | 'Prints' | 'Arcade' | 'GitHub map' | 'Charts' | 'SNES';
  ```
- Append to `TOKENS`, after the `--screen-ink-2` entry:
  ```ts
  { name: '--screen-2', job: 'Game tiles on /snes: a card in the screen colour', group: 'Arcade' },
  { name: '--screen-rule', job: 'Borders and chips on screen-coloured tiles', group: 'Arcade' },
  ```
- Append at the end of `TOKENS`:
  ```ts
  { name: '--snes', job: 'The SNES purple: active filters, EGM bars, Day One', group: 'SNES' },
  { name: '--snes-glow', job: 'Hover and focus glow on games', group: 'SNES' },
  { name: '--snes-soft', job: 'Fills behind SNES-purple text', group: 'SNES' },
  { name: '--snes-h1', job: 'Release heatmap: a few games', group: 'SNES' },
  { name: '--snes-h2', job: 'Release heatmap: some', group: 'SNES' },
  { name: '--snes-h3', job: 'Release heatmap: many', group: 'SNES' },
  { name: '--snes-h4', job: 'Release heatmap: the busiest months', group: 'SNES' },
  { name: '--booklet', job: 'The instruction-booklet paper on game pages', group: 'SNES' },
  { name: '--shelf', job: 'Back of the game shelf', group: 'SNES' },
  { name: '--plank', job: 'Shelf planks under the spines', group: 'SNES' },
  ```

In `app/design/page.tsx:23`, change `GROUPS` to:
```ts
const GROUPS: TokenGroup[] = ['Surfaces', 'Ink', 'Accent', 'Meaning', 'Prints', 'Arcade', 'GitHub map', 'Charts', 'SNES'];
```

- [ ] **Step 4: Write the stylesheet**

`app/snes/snes.css`:
```css
/* /snes — the SNES library, timeline and game pages (docs/superpowers/specs/2026-10-11-snes-library-design.md).
   Colours by token only; the one raw colour is translucent black, for the CRT scanlines and spine shading.
   Every selector under .wb, blocks prefixed s-. */

.wb .s-wrap { max-width: 1380px; margin: 0 auto; padding: 0 clamp(16px, 3vw, 40px) 60px; }
.wb .s-hero { padding: 30px 0 6px; }
.wb .s-hero h1 { font: 600 clamp(32px, 4.4vw, 52px)/1.05 var(--serif); letter-spacing: -.01em; margin: 6px 0 8px; color: var(--ink); }
.wb .s-hero p { margin: 0; max-width: 62ch; font-size: 16px; color: var(--ink-2); }

/* filter bar */
.wb .s-bar { position: sticky; top: 0; z-index: 15; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 20px 0 10px; padding: 8px; background: var(--paper); border: 1px solid var(--rule); border-radius: 6px; }
.wb .s-search { flex: 1 1 200px; min-width: 0; height: 32px; padding: 0 10px; border: 1px solid var(--rule); border-radius: 4px; background: var(--paper); color: var(--ink); font: 14px var(--sans); }
.wb .s-dd { position: relative; }
.wb .s-dd > summary, .wb .s-select, .wb .s-toggle, .wb .s-sound { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border: 1px solid var(--rule); border-radius: 4px; background: var(--paper); color: var(--ink-2); font: 500 11.5px var(--mono); white-space: nowrap; cursor: pointer; list-style: none; }
.wb .s-dd > summary::-webkit-details-marker { display: none; }
.wb .s-dd[open] > summary, .wb .s-dd.is-on > summary, .wb .s-select.is-on, .wb .s-toggle[aria-pressed="true"], .wb .s-sound.is-on { border-color: var(--snes); color: var(--snes); background: var(--snes-soft); }
.wb .s-sound.is-wait { border-style: dashed; color: var(--snes); }
.wb .s-pop { position: absolute; top: calc(100% + 6px); left: 0; z-index: 20; display: grid; gap: 6px; min-width: 200px; padding: 10px; background: var(--paper); border: 1px solid var(--rule); border-radius: 6px; box-shadow: 0 12px 24px -16px color-mix(in srgb, var(--ink) 60%, transparent); }
.wb .s-pop label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-2); cursor: pointer; }
.wb .s-views { display: inline-flex; margin-left: auto; border: 1px solid var(--rule); border-radius: 16px; overflow: hidden; }
.wb .s-views button { padding: 6px 11px; border: 0; background: none; color: var(--ink-2); font: 500 11.5px var(--mono); cursor: pointer; }
.wb .s-views button[aria-selected="true"] { background: var(--accent); color: var(--on-accent); }
.wb .s-count { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font: 500 11.5px var(--mono); color: var(--ink-3); }
.wb .s-clear { padding: 0; border: 0; background: none; color: var(--accent); font: inherit; cursor: pointer; }
.wb .s-years { display: flex; flex-wrap: wrap; gap: 4px; margin: 0 0 22px; }
.wb .s-years button { padding: 4px 10px; border: 0; border-radius: 3px; background: var(--rule-soft); color: var(--ink-2); font: 500 11px var(--mono); cursor: pointer; }
.wb .s-years button:disabled { opacity: .4; cursor: default; }

/* timeline */
.wb .s-month { display: grid; grid-template-columns: 86px 1fr; gap: 0 18px; padding-bottom: 30px; scroll-margin-top: 70px; }
.wb .s-when { padding-right: 14px; border-right: 2px solid var(--rule); text-align: right; }
.wb .s-m { font: 600 24px/1.1 var(--serif); color: var(--ink); }
.wb .s-y { font: 500 11px var(--mono); letter-spacing: .08em; color: var(--ink-3); }
.wb .s-n { margin-top: 6px; font: 500 10.5px var(--mono); color: var(--ink-2); }
.wb .s-lbl { margin: 0 0 12px; font: 500 10.5px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); }
.wb .s-row { display: flex; flex-wrap: wrap; gap: 16px; }
.wb .s-anchor { display: block; scroll-margin-top: 70px; }

/* game tile: a card in the screen colour; hover glows and eases the TV scanlines in */
.wb .s-tile { position: relative; display: block; width: 136px; overflow: hidden; background: var(--screen-2); border: 1px solid var(--screen-rule); border-radius: 5px; color: var(--screen-ink); text-decoration: none; transition: box-shadow .25s; }
.wb .s-tile:hover, .wb .s-tile:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--snes-glow), 0 0 20px color-mix(in srgb, var(--snes-glow) 50%, transparent); }
.wb .s-art { position: relative; display: block; aspect-ratio: 300 / 209; overflow: hidden; background: var(--screen); }
.wb .s-art img, .wb .s-art video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.wb .s-art::after { content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: 0; transition: opacity .4s ease;
  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, .28) 0 1px, transparent 1px 3px), radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, .28)); }
.wb .s-tile:hover .s-art::after, .wb .s-tile:focus-visible .s-art::after, .wb .s-art.is-on::after { opacity: 1; }
.wb .s-tile:hover .s-art img, .wb .s-tile:hover .s-art video, .wb .s-tile:focus-visible .s-art img { filter: saturate(1.12) contrast(1.05); }
.wb .s-noart { position: absolute; inset: 0; display: grid; place-items: center; padding: 8px; text-align: center; font: 600 13px/1.2 var(--serif); color: var(--screen-ink-2); }
.wb .s-tb { display: block; padding: 7px 8px 9px; }
.wb .s-tt { display: block; font: 600 13px/1.2 var(--serif); color: var(--screen-ink); }
.wb .s-tp { display: block; margin-top: 2px; font: 400 10px var(--mono); color: var(--screen-ink-2); }
.wb .s-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.wb .s-chips span { padding: 1px 5px; border-radius: 3px; background: var(--screen-rule); color: var(--screen-ink-2); font: 500 9.5px var(--mono); }
.wb .s-chips b { font-weight: 500; color: var(--screen-ink); }
.wb .s-chips .s-day { background: color-mix(in srgb, var(--snes-glow) 40%, var(--screen-2)); color: var(--screen-ink); text-transform: uppercase; letter-spacing: .06em; }
.wb .s-empty { padding: 40px 0; text-align: center; color: var(--ink-2); }
.wb .s-empty p { margin: 0 0 10px; font: 600 20px var(--serif); color: var(--ink); }

/* release heatmap */
.wb .s-heat { display: grid; gap: 4px; max-width: 900px; }
.wb .s-heat-row { display: grid; grid-template-columns: 44px repeat(12, 1fr); align-items: center; gap: 4px; }
.wb .s-heat-row > span { font: 500 11px var(--mono); color: var(--ink-2); }
.wb .s-heat-row > em { font: 500 10px var(--mono); font-style: normal; text-align: center; color: var(--ink-3); }
.wb .s-heat-cell { display: grid; place-items: center; aspect-ratio: 1.6; border: 0; border-radius: 4px; background: var(--rule-soft); color: var(--ink-3); font: 500 10px var(--mono); cursor: pointer; }
.wb .s-heat-cell.l1 { background: var(--snes-h1); color: var(--ink); }
.wb .s-heat-cell.l2 { background: var(--snes-h2); color: var(--ink); }
.wb .s-heat-cell.l3 { background: var(--snes-h3); color: var(--paper); }
.wb .s-heat-cell.l4 { background: var(--snes-h4); color: var(--paper); }
.wb .s-heat-cell.is-pre { background: none; border: 1px dashed var(--rule); }
.wb .s-heat-cell:disabled { cursor: default; }
.wb .s-heat-cell:not(:disabled):hover, .wb .s-heat-cell:focus-visible { outline: 2px solid var(--snes-glow); outline-offset: 1px; }

/* cover wall */
.wb .s-wall { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 3px; padding: 8px; background: var(--screen); border-radius: 6px; }
.wb .s-wall-item { position: relative; display: block; aspect-ratio: 96 / 67; overflow: hidden; border-radius: 2px; background: var(--screen-2); transition: opacity .2s, transform .2s; }
.wb .s-wall-item img { width: 100%; height: 100%; object-fit: cover; }
.wb .s-wall-item.is-dim { opacity: .18; filter: saturate(.2); }
.wb .s-wall-item:hover, .wb .s-wall-item:focus-visible { z-index: 3; transform: scale(1.6); opacity: 1; filter: none; outline: none; box-shadow: 0 6px 18px rgba(0, 0, 0, .6); }
.wb .s-wall-item .s-noart { font-size: 8px; }
.wb .s-wall-year { grid-column: 1 / -1; padding: 6px 2px 2px; font: 500 11px var(--mono); letter-spacing: .08em; color: var(--screen-ink-2); scroll-margin-top: 70px; }

/* game shelf: drawn spines, each a slice of its own cover */
.wb .s-shelf-year { margin: 16px 0 26px; scroll-margin-top: 70px; }
.wb .s-shelf-year h3 { margin: 0 0 8px; font: 600 20px var(--serif); color: var(--ink); }
.wb .s-shelf { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 2px; padding: 0 12px 14px; border-radius: 6px; background: repeating-linear-gradient(to bottom, var(--shelf) 0 210px, var(--plank) 210px 224px); }
.wb .s-spine { position: relative; flex: none; display: flex; flex-direction: column; align-items: center; width: 32px; height: 210px; border-radius: 2px 2px 0 0; color: var(--screen-ink); text-decoration: none;
  background-color: var(--screen-2); background-image: var(--art, none); background-position: center; background-size: auto 100%; background-repeat: no-repeat; box-shadow: inset -3px 0 0 rgba(0, 0, 0, .22); transition: transform .2s; }
.wb .s-spine::after { content: ''; position: absolute; inset: 56px 0 0; background: linear-gradient(90deg, rgba(0, 0, 0, .55), rgba(0, 0, 0, .25) 50%, rgba(0, 0, 0, .55)); }
.wb .s-spine:hover, .wb .s-spine:focus-visible { z-index: 4; transform: translateY(-16px); outline: none; }
.wb .s-band { display: flex; align-items: center; justify-content: center; flex: none; width: 100%; height: 56px; background: var(--screen); border-bottom: 2px solid var(--screen-ink-2); }
.wb .s-band b { writing-mode: vertical-rl; transform: rotate(180deg); font: 700 6px/1 var(--sans); letter-spacing: .06em; color: var(--screen-ink); }
.wb .s-spine-t { position: relative; z-index: 1; margin: auto 0; max-height: 118px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; writing-mode: vertical-rl; transform: rotate(180deg); font: 600 12.5px/1 var(--serif); text-shadow: 0 1px 2px rgba(0, 0, 0, .8); }
.wb .s-seal { position: relative; z-index: 1; flex: none; width: 14px; height: 14px; margin-bottom: 7px; border: 2px solid currentColor; border-radius: 50%; opacity: .7; }
.wb .s-spine-tip { position: absolute; bottom: calc(100% + 8px); left: 50%; z-index: 5; width: 150px; margin-left: -75px; padding: 6px; background: var(--paper); border: 1px solid var(--rule); border-radius: 6px; font: 600 12px/1.2 var(--serif); color: var(--ink); opacity: 0; pointer-events: none; transition: opacity .15s; }
.wb .s-spine:hover .s-spine-tip, .wb .s-spine:focus-visible .s-spine-tip { opacity: 1; }
.wb .s-spine-tip img { width: 100%; margin-bottom: 5px; border-radius: 3px; }

/* score scatter */
.wb .s-scatter-wrap { max-width: 1000px; }
.wb .s-axis-pick { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
.wb .s-scatter { position: relative; height: 320px; margin: 18px 0 34px 30px; border-left: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
.wb .s-dot { position: absolute; width: 8px; height: 8px; margin: 0 0 -4px -4px; border-radius: 50%; background: var(--snes-glow); opacity: .6; }
.wb .s-dot:hover, .wb .s-dot:focus-visible { z-index: 3; transform: scale(1.8); background: var(--snes); opacity: 1; outline: none; }
.wb .s-dot.is-star { width: 10px; height: 10px; margin: 0 0 -5px -5px; background: var(--snes); opacity: 1; }
.wb .s-dot-label { position: absolute; left: 12px; top: -7px; white-space: nowrap; pointer-events: none; font: 500 10.5px var(--mono); color: var(--ink); }
.wb .s-tick-x { position: absolute; bottom: -22px; transform: translateX(-50%); font: 500 10px var(--mono); color: var(--ink-3); }
.wb .s-tick-y { position: absolute; left: -28px; transform: translateY(50%); font: 500 10px var(--mono); color: var(--ink-3); }

/* game page: cover/3D box/clip on the left, the instruction booklet on the right */
.wb .s-crumb { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 20px 0 16px; font: 500 11px var(--mono); letter-spacing: .03em; color: var(--ink-3); }
.wb .s-game { display: grid; grid-template-columns: minmax(260px, 340px) 1fr; align-items: start; gap: 34px; }
.wb .s-frame { position: relative; aspect-ratio: 300 / 209; overflow: hidden; background: var(--screen-2); border: 1px solid var(--screen-rule); border-radius: 6px; box-shadow: 0 0 0 2px var(--snes-glow), 0 0 26px color-mix(in srgb, var(--snes-glow) 45%, transparent); }
.wb .s-frame > img, .wb .s-frame > video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.wb .s-frame.is-crt > img, .wb .s-frame.is-crt > video { filter: saturate(1.1) contrast(1.04); }
.wb .s-frame.is-crt::after { content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, .28) 0 1px, transparent 1px 3px), radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, .28)); }
.wb .s-frame > .s-box3d { object-fit: contain; padding: 10px; background: radial-gradient(circle at 50% 40%, var(--screen-rule), var(--screen)); }
.wb .s-play { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; border: 0; background: none; cursor: pointer; }
.wb .s-play span { display: grid; place-items: center; width: 58px; height: 58px; padding-left: 4px; border: 2px solid var(--snes-glow); border-radius: 50%; background: color-mix(in srgb, var(--screen) 75%, transparent); color: var(--screen-ink); font-size: 22px; }
.wb .s-seg { display: flex; width: max-content; margin-top: 10px; border: 1px solid var(--rule); border-radius: 16px; overflow: hidden; }
.wb .s-seg button { padding: 6px 12px; border: 0; background: var(--paper); color: var(--ink-2); font: 500 11.5px var(--mono); cursor: pointer; }
.wb .s-seg button[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); }
.wb .s-wes { margin-top: 16px; padding: 12px 14px; border: 1px dashed var(--snes-glow); border-radius: 6px; background: var(--snes-soft); color: var(--snes); font-size: 13px; }
.wb .s-wes b { display: block; font: 600 15px var(--serif); }
.wb .s-booklet { position: relative; padding: 24px 26px 26px; background: var(--booklet); border: 1px solid var(--rule); border-radius: 6px; }
.wb .s-booklet::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; opacity: .6; background: repeating-linear-gradient(180deg, var(--rule) 0 2px, transparent 2px 9px); }
.wb .s-logo { width: 100%; max-width: 420px; margin: 6px 0 10px; }
.wb .s-title { margin: 6px 0 10px; font: 600 clamp(30px, 3.6vw, 42px)/1.05 var(--serif); color: var(--ink); }
.wb .s-bchips { display: flex; flex-wrap: wrap; gap: 6px; }
.wb .s-bchip { padding: 2px 8px; border-radius: 3px; background: var(--rule-soft); color: var(--ink-2); font: 500 11px var(--mono); }
.wb .s-bchip.is-day { background: var(--snes-soft); color: var(--snes); text-transform: uppercase; letter-spacing: .05em; }
.wb .s-sect { margin-top: 20px; padding-top: 9px; border-top: 2px solid var(--ink); }
.wb .s-sect h2 { margin: 0 0 8px; font: 600 11.5px var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); }
.wb .s-sect p { margin: 0; max-width: 64ch; color: var(--ink-2); }
.wb .s-spec { display: grid; grid-template-columns: 120px 1fr; gap: 5px 14px; margin: 0; font-size: 14px; }
.wb .s-spec dt { padding-top: 3px; font: 500 10.5px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); }
.wb .s-spec dd { margin: 0; color: var(--ink); }
.wb .s-none { margin: 4px 0 10px; font: 500 11.5px var(--mono); color: var(--ink-3); }
.wb .s-bars { display: flex; align-items: flex-end; gap: 7px; height: 100px; margin: 22px 0 14px; }
.wb .s-bar4 { position: relative; width: 26px; border-radius: 3px 3px 0 0; background: var(--snes); }
.wb .s-bar4 i { position: absolute; top: -19px; left: -6px; right: -6px; text-align: center; font: 600 13px var(--serif); font-style: normal; color: var(--ink); }
.wb .s-bars-label { align-self: center; margin-left: 8px; font: 500 10.5px var(--mono); color: var(--ink-3); }
.wb .s-crs { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 2px 22px; margin: 0; }
.wb .s-cr { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; border-bottom: 1px solid var(--rule-soft); font-size: 13.5px; color: var(--ink-2); }
.wb .s-cr dd { margin: 0; white-space: nowrap; font: 500 12.5px var(--mono); color: var(--ink); }
.wb .s-also { margin-top: 34px; }
.wb .s-also .s-row { margin-top: 12px; }
.wb .s-steps { display: flex; justify-content: space-between; gap: 12px; margin-top: 26px; font: 500 12.5px var(--mono); }
.wb .s-steps span { color: var(--ink-3); }

/* company page */
.wb .s-company { padding: 26px 0 18px; }
.wb .s-company h1 { margin: 6px 0 6px; font: 600 clamp(30px, 3.6vw, 44px)/1.05 var(--serif); color: var(--ink); }
.wb .s-company p { margin: 0; color: var(--ink-2); }

@media (max-width: 760px) {
  .wb .s-game { grid-template-columns: 1fr; }
  .wb .s-month { grid-template-columns: 58px 1fr; gap: 0 10px; }
  .wb .s-row { gap: 10px; }
  .wb .s-tile { width: calc(50% - 5px); }
  .wb .s-views { margin-left: 0; }
  .wb .s-spec { grid-template-columns: 96px 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .wb .s-art::after, .wb .s-tile, .wb .s-wall-item, .wb .s-spine, .wb .s-spine-tip { transition: none; }
}
```

- [ ] **Step 5: Run the stylesheet and design-system tests**

Run: `npx jest __tests__/snes-css.test.ts __tests__/design-system.test.ts __tests__/design-page.test.tsx`
Expected: PASS. If the design-page test fails on swatch count, check that every new token in `:root` also appears in `TOKENS`.

- [ ] **Step 6: Check the heatmap and chip contrast with the dataviz validator**

Load the `dataviz` skill and run its validator on the heatmap steps. Each `l1`–`l4` count text must reach at least 4.5:1 against its cell, in both themes:
- light: `--snes-h1`/`--snes-h2` with `--ink`, and `--snes-h3`/`--snes-h4` with `--paper`
- dark: the same pairings using the dark values

Also check `--snes` on `--snes-soft` in both themes. If a pair fails, adjust that token's value in all three blocks and in this plan's Global Constraints table, and re-run Step 5.

- [ ] **Step 7: Commit**

```bash
git add app/design-system.css app/design/tokens.ts app/design/page.tsx app/snes/snes.css __tests__/snes-css.test.ts
git commit -m "feat(snes): SNES tokens and the /snes stylesheet"
```

---

### Task 5: Library logic (`lib/snes/library.ts`)

**Files:**
- Create: `lib/snes/library.ts`
- Test: `__tests__/snes-library.test.ts`

**Interfaces:**
- Consumes:
  - `Game` and `DatePrecision` from `lib/snes/types.ts`, including `media` from Task 3
  - `normalizeTitle` and `slugify` from `lib/snes/titles.ts`
- Produces (every name below is exported):
  - `type ScoreFlag = 'egm' | 'np' | 'egm8'`, `type SortKey = 'date' | 'title' | 'egm' | 'np' | 'aggregate'`
  - `type ViewKey = 'timeline' | 'heatmap' | 'wall' | 'shelf' | 'scatter'`, `type ScoreAxis = 'egm' | 'np' | 'aggregate'`
  - `VIEWS: ViewKey[]`, `SORTS: SortKey[]`, `AXES: ScoreAxis[]`, `SCORE_FLAGS: ScoreFlag[]`, `FIRST_YEAR = 1991`, `LAST_YEAR = 1998`
  - `interface IndexGame { slug; title; search; releasedUS; datePrecision; publisher; developers: string[]; genres: string[]; players: number | null; chip: string | null; chipSlug: string | null; launchTitle: boolean; egmAvg: number | null; np10: number | null; aggregate: number | null; boxArt: string | null; thumb: string | null; video: string | null }`
  - `buildIndex(games: Game[]): IndexGame[]` (returned sorted by `compareRelease`)
  - `compareRelease(a: { releasedUS: string; datePrecision: DatePrecision; title: string }, b: same): number`
  - `interface Filters { q: string; years: number[]; publisher: string | null; developer: string | null; chip: string | null; scores: ScoreFlag[]; launch: boolean; genre: string | null; players: number | null; sort: SortKey; view: ViewKey; y: ScoreAxis }`
  - `DEFAULT_FILTERS: Filters`
  - `matches(g: IndexGame, f: Filters): boolean`, `filterGames(games: IndexGame[], f: Filters): IndexGame[]`, `isFiltered(f: Filters): boolean`
  - `sortGames(games: IndexGame[], key: SortKey): IndexGame[]`
  - `interface Facet { slug: string; name: string; count: number }`
  - `interface Facets { publishers: Facet[]; developers: Facet[]; chips: Facet[]; genres: string[]; players: number[] }`
  - `facets(games: IndexGame[], names: Record<string, string>): Facets`
  - `interface QueryContext { publishers: Set<string>; developers: Set<string>; chips: Set<string>; genres: Set<string> }`, `queryContext(f: Facets): QueryContext`
  - `parseQuery(search: string, ctx: QueryContext): Filters`, `toQuery(f: Filters): string` (returns `''` or `'?…'`)
  - `interface MonthGroup { key: string; year: number; month: number | null; games: IndexGame[] }`, `groupByMonth(games: IndexGame[]): MonthGroup[]`
  - `interface HeatCell { key: string; year: number; month: number; count: number; level: 0 | 1 | 2 | 3 | 4; pre: boolean }`, `heatmapCounts(games: IndexGame[]): HeatCell[]`
  - `interface ScatterPoint { slug: string; title: string; x: number; y: number }`, `scatterPoints(games: IndexGame[], axis: ScoreAxis): ScatterPoint[]`, `xForDate(releasedUS: string): number`
  - `labelPoints(points: ScatterPoint[], max?: number): string[]` (slugs to label)
  - `neighbours(sorted: IndexGame[], slug: string): { prev: IndexGame | null; next: IndexGame | null }`

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-library.test.ts`:
```ts
import {
  buildIndex, compareRelease, DEFAULT_FILTERS, facets, filterGames, groupByMonth, heatmapCounts, isFiltered, labelPoints,
  matches, neighbours, parseQuery, queryContext, scatterPoints, sortGames, toQuery, xForDate, type Filters, type IndexGame,
} from '@/lib/snes/library';
import type { Game } from '@/lib/snes/types';

const game = (slug: string, over: Partial<Game> = {}): Game => ({
  slug, title: slug, releasedUS: '1994-04', datePrecision: 'month', developers: ['nintendo-ead'], publisher: 'nintendo',
  genres: [], players: null, chip: null, launchTitle: false, esrb: null, summary: null,
  scores: { aggregate: null, aggregateCount: 0, egm: null, nintendoPower: null, other: {} },
  boxArt: `/snes/box/${slug}.jpg`, media: { video: false, logo: false, box3d: false },
  sources: { wikipedia: null, igdb: null }, ...over,
});

const GAMES: Game[] = [
  game('super-metroid', { title: 'Super Metroid', releasedUS: '1994-04-18', datePrecision: 'day', scores: { aggregate: 95, aggregateCount: 40, egm: [9, 9, 9, 9], nintendoPower: null, other: {} }, media: { video: true, logo: true, box3d: true } }),
  game('f-zero', { title: 'F-Zero', releasedUS: '1991-08-23', datePrecision: 'day', launchTitle: true }),
  game('pilotwings', { title: 'Pilotwings', releasedUS: '1991-08-23', datePrecision: 'day', launchTitle: true, chip: 'DSP-1', scores: { aggregate: null, aggregateCount: 0, egm: [7.75], nintendoPower: { score: 3.8, scale: 5 }, other: {} } }),
  game('pokemon-ish', { title: 'Pokémon Puzzle', releasedUS: '1994-04', publisher: 'konami', developers: ['konami'], genres: ['Puzzle'], players: 2 }),
  game('mystery', { title: 'Mystery Year', releasedUS: '1994', datePrecision: 'year', boxArt: null }),
  game('dkc', { title: 'Donkey Kong Country', releasedUS: '1994-11-21', datePrecision: 'day', developers: ['rare'], scores: { aggregate: null, aggregateCount: 0, egm: [10, 9, 9, 9], nintendoPower: null, other: {} } }),
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
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-library.test.ts`
Expected: FAIL with "Cannot find module '@/lib/snes/library'".

- [ ] **Step 3: Implement**

`lib/snes/library.ts`:
```ts
/*
 * Everything /snes computes from the dataset, pure and tested: the slim index the browser gets, filters,
 * sorting, URL state, month groups, heatmap counts, scatter points and timeline neighbours.
 */
import type { DatePrecision, Game } from './types.ts';
import { normalizeTitle, slugify } from './titles.ts';

export type ScoreFlag = 'egm' | 'np' | 'egm8';
export type SortKey = 'date' | 'title' | 'egm' | 'np' | 'aggregate';
export type ViewKey = 'timeline' | 'heatmap' | 'wall' | 'shelf' | 'scatter';
export type ScoreAxis = 'egm' | 'np' | 'aggregate';
export const VIEWS: ViewKey[] = ['timeline', 'heatmap', 'wall', 'shelf', 'scatter'];
export const SORTS: SortKey[] = ['date', 'title', 'egm', 'np', 'aggregate'];
export const AXES: ScoreAxis[] = ['egm', 'np', 'aggregate'];
export const SCORE_FLAGS: ScoreFlag[] = ['egm', 'np', 'egm8'];
export const FIRST_YEAR = 1991;
export const LAST_YEAR = 1998;

export interface IndexGame {
  slug: string;
  title: string;
  /** normalizeTitle(title), for search. */
  search: string;
  releasedUS: string;
  datePrecision: DatePrecision;
  publisher: string;
  developers: string[];
  genres: string[];
  players: number | null;
  chip: string | null;
  chipSlug: string | null;
  launchTitle: boolean;
  egmAvg: number | null;
  /** Nintendo Power on a 0–10 scale. */
  np10: number | null;
  aggregate: number | null;
  boxArt: string | null;
  thumb: string | null;
  video: string | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

type Dated = { releasedUS: string; datePrecision: DatePrecision; title: string };
const dateParts = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return { y, m: m || 13, day: day || 0 }; // a year-only date sorts after December
};

export function compareRelease(a: Dated, b: Dated): number {
  const pa = dateParts(a.releasedUS);
  const pb = dateParts(b.releasedUS);
  if (pa.y !== pb.y) return pa.y - pb.y;
  if (pa.m !== pb.m) return pa.m - pb.m;
  const ra = a.datePrecision === 'day' ? 0 : 1;
  const rb = b.datePrecision === 'day' ? 0 : 1;
  if (ra !== rb) return ra - rb;
  if (pa.day !== pb.day) return pa.day - pb.day;
  return a.title.localeCompare(b.title);
}

export function buildIndex(games: Game[]): IndexGame[] {
  return games
    .map((g) => {
      const egm = g.scores.egm;
      const np = g.scores.nintendoPower;
      return {
        slug: g.slug,
        title: g.title,
        search: normalizeTitle(g.title),
        releasedUS: g.releasedUS,
        datePrecision: g.datePrecision,
        publisher: g.publisher,
        developers: g.developers,
        genres: g.genres,
        players: g.players,
        chip: g.chip,
        chipSlug: g.chip ? slugify(g.chip) : null,
        launchTitle: g.launchTitle,
        egmAvg: egm && egm.length ? round1(egm.reduce((s, n) => s + n, 0) / egm.length) : null,
        np10: np ? round1((np.score / np.scale) * 10) : null,
        aggregate: g.scores.aggregate,
        boxArt: g.boxArt,
        thumb: g.boxArt ? `/snes/thumb/${g.slug}.jpg` : null,
        video: g.media?.video ? `/snes/video/${g.slug}.mp4` : null,
      };
    })
    .sort(compareRelease);
}

export interface Filters {
  q: string;
  years: number[];
  publisher: string | null;
  developer: string | null;
  chip: string | null;
  scores: ScoreFlag[];
  launch: boolean;
  genre: string | null;
  players: number | null;
  sort: SortKey;
  view: ViewKey;
  y: ScoreAxis;
}

export const DEFAULT_FILTERS: Filters = {
  q: '', years: [], publisher: null, developer: null, chip: null, scores: [], launch: false,
  genre: null, players: null, sort: 'date', view: 'timeline', y: 'egm',
};

export function matches(g: IndexGame, f: Filters): boolean {
  if (f.q) {
    const q = normalizeTitle(f.q);
    if (q && !g.search.includes(q)) return false;
  }
  if (f.years.length && !f.years.includes(Number(g.releasedUS.slice(0, 4)))) return false;
  if (f.publisher && g.publisher !== f.publisher) return false;
  if (f.developer && !g.developers.includes(f.developer)) return false;
  if (f.chip && g.chipSlug !== f.chip) return false;
  if (f.scores.includes('egm') && g.egmAvg === null) return false;
  if (f.scores.includes('np') && g.np10 === null) return false;
  if (f.scores.includes('egm8') && (g.egmAvg ?? 0) < 8) return false;
  if (f.launch && !g.launchTitle) return false;
  if (f.genre && !g.genres.includes(f.genre)) return false;
  if (f.players && (g.players ?? 0) < f.players) return false;
  return true;
}

export const filterGames = (games: IndexGame[], f: Filters) => games.filter((g) => matches(g, f));

export function isFiltered(f: Filters): boolean {
  return Boolean(f.q || f.years.length || f.publisher || f.developer || f.chip || f.scores.length || f.launch || f.genre || f.players);
}

const scoreOf = (g: IndexGame, key: 'egm' | 'np' | 'aggregate') => (key === 'egm' ? g.egmAvg : key === 'np' ? g.np10 : g.aggregate);

export function sortGames(games: IndexGame[], key: SortKey): IndexGame[] {
  const out = [...games];
  if (key === 'date') return out.sort(compareRelease);
  if (key === 'title') return out.sort((a, b) => a.search.localeCompare(b.search) || compareRelease(a, b));
  return out.sort((a, b) => {
    const sa = scoreOf(a, key);
    const sb = scoreOf(b, key);
    if (sa === null && sb === null) return compareRelease(a, b);
    if (sa === null) return 1;
    if (sb === null) return -1;
    return sb - sa || compareRelease(a, b);
  });
}

export interface Facet {
  slug: string;
  name: string;
  count: number;
}
export interface Facets {
  publishers: Facet[];
  developers: Facet[];
  chips: Facet[];
  genres: string[];
  players: number[];
}

const tally = (entries: [string, string][]): Facet[] => {
  const map = new Map<string, Facet>();
  for (const [slug, name] of entries) {
    const cur = map.get(slug) ?? { slug, name, count: 0 };
    cur.count++;
    map.set(slug, cur);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export function facets(games: IndexGame[], names: Record<string, string>): Facets {
  return {
    publishers: tally(games.map((g) => [g.publisher, names[g.publisher] ?? g.publisher])),
    developers: tally(games.flatMap((g) => g.developers.map((d): [string, string] => [d, names[d] ?? d]))),
    chips: tally(games.filter((g) => g.chip).map((g) => [g.chipSlug!, g.chip!])),
    genres: [...new Set(games.flatMap((g) => g.genres))].sort(),
    players: [...new Set(games.map((g) => g.players ?? 0).filter((n) => n >= 2))].sort((a, b) => a - b),
  };
}

export interface QueryContext {
  publishers: Set<string>;
  developers: Set<string>;
  chips: Set<string>;
  genres: Set<string>;
}

export function queryContext(f: Facets): QueryContext {
  return {
    publishers: new Set(f.publishers.map((p) => p.slug)),
    developers: new Set(f.developers.map((d) => d.slug)),
    chips: new Set(f.chips.map((c) => c.slug)),
    genres: new Set(f.genres),
  };
}

export function parseQuery(search: string, ctx: QueryContext): Filters {
  const p = new URLSearchParams(search);
  const list = (k: string) => (p.get(k) ?? '').split(',').filter(Boolean);
  const pick = <T extends string>(k: string, allowed: readonly T[], fallback: T) => {
    const v = p.get(k) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  };
  const inSet = (k: string, set: Set<string>) => {
    const v = p.get(k);
    return v && set.has(v) ? v : null;
  };
  const players = Number(p.get('players'));
  return {
    q: (p.get('q') ?? '').slice(0, 80),
    years: [...new Set(list('year').map(Number).filter((y) => Number.isInteger(y) && y >= FIRST_YEAR && y <= LAST_YEAR))].sort(),
    publisher: inSet('publisher', ctx.publishers),
    developer: inSet('developer', ctx.developers),
    chip: inSet('chip', ctx.chips),
    scores: SCORE_FLAGS.filter((s) => list('scores').includes(s)),
    launch: p.get('launch') === '1',
    genre: inSet('genre', ctx.genres),
    players: Number.isInteger(players) && players >= 2 && players <= 8 ? players : null,
    sort: pick('sort', SORTS, 'date'),
    view: pick('view', VIEWS, 'timeline'),
    y: pick('y', AXES, 'egm'),
  };
}

export function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.years.length) p.set('year', f.years.join(','));
  if (f.publisher) p.set('publisher', f.publisher);
  if (f.developer) p.set('developer', f.developer);
  if (f.chip) p.set('chip', f.chip);
  if (f.scores.length) p.set('scores', f.scores.join(','));
  if (f.launch) p.set('launch', '1');
  if (f.genre) p.set('genre', f.genre);
  if (f.players) p.set('players', String(f.players));
  if (f.sort !== 'date') p.set('sort', f.sort);
  if (f.view !== 'timeline') p.set('view', f.view);
  if (f.y !== 'egm') p.set('y', f.y);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export interface MonthGroup {
  key: string;
  year: number;
  month: number | null;
  games: IndexGame[];
}

export function groupByMonth(games: IndexGame[]): MonthGroup[] {
  const out: MonthGroup[] = [];
  for (const g of games) {
    const key = g.datePrecision === 'year' ? g.releasedUS.slice(0, 4) : g.releasedUS.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.key === key) last.games.push(g);
    else out.push({ key, year: Number(key.slice(0, 4)), month: key.length === 7 ? Number(key.slice(5, 7)) : null, games: [g] });
  }
  return out;
}

export interface HeatCell {
  key: string;
  year: number;
  month: number;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  pre: boolean;
}

export function heatmapCounts(games: IndexGame[]): HeatCell[] {
  const counts = new Map<string, number>();
  for (const g of games) if (g.releasedUS.length >= 7) counts.set(g.releasedUS.slice(0, 7), (counts.get(g.releasedUS.slice(0, 7)) ?? 0) + 1);
  const max = Math.max(1, ...counts.values());
  const cells: HeatCell[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const count = counts.get(key) ?? 0;
      const level = (count === 0 ? 0 : Math.min(4, 1 + Math.floor((count / max) * 3.999))) as HeatCell['level'];
      cells.push({ key, year, month, count, level, pre: year === FIRST_YEAR && month < 8 });
    }
  }
  return cells;
}

export interface ScatterPoint {
  slug: string;
  title: string;
  x: number;
  y: number;
}

const START = FIRST_YEAR * 12 + 7; // August 1991, months counted from year 0
const END = LAST_YEAR * 12 + 12; // the end of December 1998

export function xForDate(releasedUS: string): number {
  const [y, m, d] = releasedUS.split('-').map(Number);
  const month = m ? m - 1 : 6;
  const within = d ? (d - 1) / 31 : m ? 0.5 : 0;
  return Math.min(100, Math.max(0, ((y * 12 + month + within - START) / (END - START)) * 100));
}

export function scatterPoints(games: IndexGame[], axis: ScoreAxis): ScatterPoint[] {
  return games
    .map((g) => {
      const v = scoreOf(g, axis);
      return v === null ? null : { slug: g.slug, title: g.title, x: xForDate(g.releasedUS), y: axis === 'aggregate' ? round1(v / 10) : v };
    })
    .filter((p): p is ScatterPoint => p !== null);
}

/** The best-scoring points that can carry a label without two labels touching. */
export function labelPoints(points: ScatterPoint[], max = 8): string[] {
  const chosen: ScatterPoint[] = [];
  for (const p of [...points].sort((a, b) => b.y - a.y || a.x - b.x)) {
    if (chosen.length >= max) break;
    if (chosen.every((c) => Math.abs(c.x - p.x) >= 9 || Math.abs(c.y - p.y) >= 0.9)) chosen.push(p);
  }
  return chosen.map((p) => p.slug);
}

export function neighbours(sorted: IndexGame[], slug: string): { prev: IndexGame | null; next: IndexGame | null } {
  const i = sorted.findIndex((g) => g.slug === slug);
  return { prev: i > 0 ? sorted[i - 1] : null, next: i >= 0 && i < sorted.length - 1 ? sorted[i + 1] : null };
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-library.test.ts`
Expected: PASS. The heatmap rule is `level = 1 + floor(count / peak × 3.999)`, capped at 4. So half the peak is level 2, and the peak is level 4.

- [ ] **Step 5: Commit**

```bash
git add lib/snes/library.ts __tests__/snes-library.test.ts
git commit -m "feat(snes): library logic — index, filters, URL state, months, heatmap, scatter"
```

---

### Task 6: Display helpers (`lib/snes/display.ts`)

**Files:**
- Create: `lib/snes/display.ts`
- Test: `__tests__/snes-display.test.ts`

**Interfaces:**
- Consumes: `DatePrecision`, `Esrb` and `NintendoPowerScore` from types.
- Produces:
  - `MONTHS: string[]` (full names) and `SHORT_MONTHS: string[]`
  - `formatRelease(releasedUS: string, precision: DatePrecision): string`
  - `MAGAZINES: Record<string, string>` and `magazineName(key: string): string`
  - `displayedMagazines(other: Record<string, string>, skip?: string[]): { name: string; score: string }[]`
  - `reviewerScores(value: string | undefined): number[] | null`
  - `npLabel(np: NintendoPowerScore): string`
  - `playersLabel(n: number): string`
  - `ratingLabel(esrb: Esrb | null, releasedUS: string): string`
  - `gameCount(n: number): string`

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-display.test.ts`:
```ts
import { displayedMagazines, formatRelease, gameCount, magazineName, npLabel, playersLabel, ratingLabel, reviewerScores } from '@/lib/snes/display';

test('release dates read at their real precision', () => {
  expect(formatRelease('1994-04-18', 'day')).toBe('April 18, 1994');
  expect(formatRelease('1994-04', 'month')).toBe('April 1994');
  expect(formatRelease('1994', 'year')).toBe('1994');
});

test('magazine abbreviations are expanded; unknown keys stay as written', () => {
  expect(magazineName('GI')).toBe('Game Informer');
  expect(magazineName('Fam')).toBe('Famitsu');
  expect(magazineName('Hippon Super!')).toBe('Hippon Super!');
});

test('displayedMagazines drops award and empty-reviewer fields and anything skipped', () => {
  expect(displayedMagazines({ GR: '83%', award1: 'Best', award1Pub: 'X', rev1: 'Y', Fam: '7/10, 8/10', 'Play Time': '55%' }, ['Fam'])).toEqual([
    { name: 'GameRankings', score: '83%' },
    { name: 'Play Time', score: '55%' },
  ]);
});

test('reviewerScores reads a multi-reviewer score, else null', () => {
  expect(reviewerScores('7/10, 8/10, 8/10, 9/10')).toEqual([7, 8, 8, 9]);
  expect(reviewerScores('9/10')).toBeNull();
  expect(reviewerScores(undefined)).toBeNull();
});

test('small labels', () => {
  expect(npLabel({ score: 3.8, scale: 5 })).toBe('3.8/5');
  expect(playersLabel(1)).toBe('1 player');
  expect(playersLabel(4)).toBe('1–4 players');
  expect(ratingLabel(null, '1991-08-23')).toBe('Pre-ESRB');
  expect(ratingLabel(null, '1995-01')).toBe('Not rated');
  expect(ratingLabel('T', '1995-01')).toBe('ESRB T');
  expect(gameCount(1)).toBe('1 game');
  expect(gameCount(48)).toBe('48 games');
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-display.test.ts`
Expected: FAIL with "Cannot find module '@/lib/snes/display'".

- [ ] **Step 3: Implement**

`lib/snes/display.ts`:
```ts
/* Labels for /snes pages: dates at their real precision, magazine names, scores, players, ratings. */
import type { DatePrecision, Esrb, NintendoPowerScore } from './types.ts';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

export function formatRelease(releasedUS: string, precision: DatePrecision): string {
  const [y, m, d] = releasedUS.split('-').map(Number);
  if (precision === 'year' || !m) return String(y);
  if (precision === 'month' || !d) return `${MONTHS[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** Review-box abbreviations whose meaning is certain; anything else is shown as written. */
export const MAGAZINES: Record<string, string> = {
  GR: 'GameRankings', MC: 'Metacritic', GI: 'Game Informer', Fam: 'Famitsu', CVG: 'Computer and Video Games',
  EGM: 'Electronic Gaming Monthly', NP: 'Nintendo Power', TOT: 'Total!', SP: 'Super Play', Allgame: 'AllGame',
  ONM: 'Official Nintendo Magazine', NGen: 'Next Generation', VGCE: 'VideoGames & Computer Entertainment',
  GMaster: 'GamesMaster', MF: 'Mega Fun', NLife: 'Nintendo Life', PO: 'Player One', CP: 'Consoles +',
  MM: 'Mean Machines', ASM: 'Aktueller Software Markt', HC: 'Hobby Consolas', SJ: 'Super Juegos',
  IGN: 'IGN', GSpot: 'GameSpot', EuroG: 'Eurogamer', '1UP': '1UP.com',
};

export const magazineName = (key: string) => MAGAZINES[key] ?? key;

const HIDDEN = /^(award\d+(pub)?|rev\d+(score)?)$/i;

export function displayedMagazines(other: Record<string, string>, skip: string[] = []): { name: string; score: string }[] {
  return Object.entries(other)
    .filter(([k]) => !HIDDEN.test(k) && !skip.includes(k))
    .map(([k, score]) => ({ name: magazineName(k), score }));
}

export function reviewerScores(value: string | undefined): number[] | null {
  if (!value) return null;
  const scores = Array.from(value.matchAll(/(\d+(?:\.\d+)?)\s*\/\s*10\b/g), (m) => Number(m[1]));
  return scores.length >= 2 ? scores : null;
}

export const npLabel = (np: NintendoPowerScore) => `${np.score}/${np.scale}`;
export const playersLabel = (n: number) => (n === 1 ? '1 player' : `1–${n} players`);
export const ratingLabel = (esrb: Esrb | null, releasedUS: string) => (esrb ? `ESRB ${esrb}` : releasedUS < '1994-09' ? 'Pre-ESRB' : 'Not rated');
export const gameCount = (n: number) => `${n} ${n === 1 ? 'game' : 'games'}`;
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-display.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/snes/display.ts __tests__/snes-display.test.ts
git commit -m "feat(snes): display helpers — dates, magazine names, labels"
```

---

### Task 7: Sound and the game tile with hover clips

**Files:**
- Create: `app/snes/components/sound.tsx`
- Create: `app/snes/components/GameTile.tsx`
- Test: `__tests__/snes-tile.test.tsx`

**Interfaces:**
- Consumes:
  - `IndexGame` from `@/lib/snes/library`
  - `formatRelease` and `SHORT_MONTHS` from `@/lib/snes/display`
- Produces:
  - `SoundProvider({ children })`
  - `useSound(): { on: boolean; waiting: boolean; muted: boolean; toggle: () => void }`
  - `SoundButton()`
  - `GameTile({ game, publisherName, genre }: { game: IndexGame; publisherName: string; genre?: string })`. The default export is also `GameTile`.

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-tile.test.tsx`:
```tsx
import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { GameTile } from '@/app/snes/components/GameTile';
import { SoundButton, SoundProvider } from '@/app/snes/components/sound';
import type { IndexGame } from '@/lib/snes/library';

const base: IndexGame = {
  slug: 'f-zero', title: 'F-Zero', search: 'f zero', releasedUS: '1991-08-23', datePrecision: 'day', publisher: 'nintendo',
  developers: ['nintendo-ead'], genres: [], players: null, chip: null, chipSlug: null, launchTitle: true, egmAvg: null, np10: 7.6,
  aggregate: null, boxArt: '/snes/box/f-zero.jpg', thumb: '/snes/thumb/f-zero.jpg', video: '/snes/video/f-zero.mp4',
};
const other: IndexGame = { ...base, slug: 'pilotwings', title: 'Pilotwings', video: '/snes/video/pilotwings.mp4' };

let hover = true;
let reduced = false;
beforeEach(() => {
  hover = true;
  reduced = false;
  localStorage.clear();
  jest.useFakeTimers();
  window.matchMedia = ((q: string) => ({ matches: q.includes('hover') ? hover && !reduced : false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = jest.fn();
});
afterEach(() => jest.useRealTimers());

const enter = (el: Element) => {
  fireEvent.mouseEnter(el);
  act(() => { jest.advanceTimersByTime(300); });
};

test('shows the cover, title, publisher, chips and links to the game page', () => {
  render(<GameTile game={base} publisherName="Nintendo" genre="Racing" />);
  const link = screen.getByRole('link', { name: /F-Zero, August 23, 1991/ });
  expect(link).toHaveAttribute('href', '/snes/f-zero');
  expect(link.querySelector('img')).toHaveAttribute('src', '/snes/box/f-zero.jpg');
  expect(screen.getByText('Nintendo · Racing')).toBeInTheDocument();
  expect(screen.getByText('Day One')).toBeInTheDocument();
  expect(link).toHaveTextContent('NP 7.6');
});

test('a game with no box art shows its title in place of the cover', () => {
  render(<GameTile game={{ ...base, boxArt: null }} publisherName="Nintendo" />);
  expect(screen.getByRole('link').querySelector('img')).toBeNull();
  expect(screen.getAllByText('F-Zero')).toHaveLength(2);
});

test('hovering 300ms plays the clip; leaving stops it', () => {
  render(<GameTile game={base} publisherName="Nintendo" />);
  const link = screen.getByRole('link');
  fireEvent.mouseEnter(link);
  act(() => { jest.advanceTimersByTime(200); });
  expect(link.querySelector('video')).toBeNull();
  act(() => { jest.advanceTimersByTime(100); });
  expect(link.querySelector('video')).toHaveAttribute('src', '/snes/video/f-zero.mp4');
  expect(link).toHaveClass('is-playing');
  fireEvent.mouseLeave(link);
  expect(link.querySelector('video')).toBeNull();
});

test('only one clip plays at a time', () => {
  render(<><GameTile game={base} publisherName="Nintendo" /><GameTile game={other} publisherName="Nintendo" /></>);
  const [a, b] = screen.getAllByRole('link');
  enter(a);
  enter(b);
  expect(a.querySelector('video')).toBeNull();
  expect(b.querySelector('video')).not.toBeNull();
});

test('no hover playback on touch or reduced motion, or for a game without a clip', () => {
  hover = false;
  const { unmount } = render(<GameTile game={base} publisherName="Nintendo" />);
  enter(screen.getByRole('link'));
  expect(screen.getByRole('link').querySelector('video')).toBeNull();
  unmount();
  hover = true;
  reduced = true;
  const second = render(<GameTile game={base} publisherName="Nintendo" />);
  enter(screen.getByRole('link'));
  expect(screen.getByRole('link').querySelector('video')).toBeNull();
  second.unmount();
  reduced = false;
  render(<GameTile game={{ ...base, video: null }} publisherName="Nintendo" />);
  enter(screen.getByRole('link'));
  expect(screen.getByRole('link').querySelector('video')).toBeNull();
});

test('sound waits for the first interaction, then hover clips play unmuted', () => {
  render(<SoundProvider><SoundButton /><GameTile game={base} publisherName="Nintendo" /></SoundProvider>);
  expect(screen.getByRole('button', { name: /Click anywhere for sound/ })).toBeInTheDocument();
  const link = screen.getByRole('link');
  enter(link);
  expect((link.querySelector('video') as HTMLVideoElement).muted).toBe(true);
  fireEvent.mouseLeave(link);
  act(() => { fireEvent.pointerDown(document.body); });
  expect(screen.getByRole('button', { name: /Sound on/ })).toBeInTheDocument();
  enter(link);
  expect((link.querySelector('video') as HTMLVideoElement).muted).toBe(false);
});

test('the button mutes after sound is on, and a stored mute survives a reload', () => {
  const first = render(<SoundProvider><SoundButton /></SoundProvider>);
  act(() => { fireEvent.pointerDown(document.body); });
  fireEvent.click(screen.getByRole('button', { name: /Sound on/ }));
  expect(screen.getByRole('button', { name: /Muted/ })).toBeInTheDocument();
  expect(localStorage.getItem('snes-sound')).toBe('off');
  first.unmount();
  render(<SoundProvider><SoundButton /></SoundProvider>);
  expect(screen.getByRole('button', { name: /Muted/ })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-tile.test.tsx`
Expected: FAIL with "Cannot find module '@/app/snes/components/GameTile'".

- [ ] **Step 3: Implement sound**

`app/snes/components/sound.tsx`:
```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Browsers allow audio only after the visitor has interacted with the page, so sound is on by default but
// waits for the first click, tap or keypress anywhere. The button mutes and unmutes; a mute is remembered.
type Sound = { on: boolean; waiting: boolean; muted: boolean; toggle: () => void };
const SoundContext = createContext<Sound>({ on: false, waiting: false, muted: false, toggle: () => {} });
const KEY = 'snes-sound';
const EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(KEY) === 'off');
    } catch {
      /* storage blocked: stay unmuted */
    }
    if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) {
      setUnlocked(true);
      return;
    }
    const unlock = () => setUnlocked(true);
    for (const e of EVENTS) window.addEventListener(e, unlock, { once: true, capture: true });
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, unlock, { capture: true });
    };
  }, []);

  const toggle = useCallback(() => {
    if (!unlocked) {
      setUnlocked(true); // the first click only grants sound
      return;
    }
    setMuted((m) => {
      try {
        localStorage.setItem(KEY, m ? 'on' : 'off');
      } catch {
        /* storage blocked */
      }
      return !m;
    });
  }, [unlocked]);

  return <SoundContext.Provider value={{ on: unlocked && !muted, waiting: !unlocked && !muted, muted, toggle }}>{children}</SoundContext.Provider>;
}

export const useSound = () => useContext(SoundContext);

export function SoundButton() {
  const { on, waiting, toggle } = useSound();
  const label = on ? '🔊 Sound on' : waiting ? '🔊 Click anywhere for sound' : '🔇 Muted';
  return (
    <button type="button" className={`s-sound${on ? ' is-on' : waiting ? ' is-wait' : ''}`} onClick={toggle}>
      {label}
    </button>
  );
}
```

- [ ] **Step 4: Implement the tile**

`app/snes/components/GameTile.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { IndexGame } from '@/lib/snes/library';
import { formatRelease } from '@/lib/snes/display';
import { useSound } from './sound';

// One clip at a time across the whole page: starting a tile stops whichever tile was playing.
let stopPlaying: (() => void) | null = null;
const canPreview = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;

export function GameTile({ game, publisherName, genre }: { game: IndexGame; publisherName: string; genre?: string }) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const video = useRef<HTMLVideoElement>(null);
  const sound = useSound();

  const start = () => {
    if (!game.video || !canPreview()) return;
    timer.current = setTimeout(() => {
      stopPlaying?.();
      stopPlaying = () => setPlaying(false);
      setPlaying(true);
    }, 300);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setPlaying(false);
  };

  useEffect(() => {
    const v = video.current;
    if (!playing || !v) return;
    v.muted = !sound.on;
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  useEffect(() => {
    if (video.current) video.current.muted = !sound.on;
  }, [sound.on]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const when = formatRelease(game.releasedUS, game.datePrecision);
  const label = [game.title, when, game.egmAvg !== null ? `EGM ${game.egmAvg.toFixed(1)}` : ''].filter(Boolean).join(', ');
  return (
    <Link href={`/snes/${game.slug}`} className={`s-tile${playing ? ' is-playing' : ''}`} aria-label={label} onMouseEnter={start} onMouseLeave={stop}>
      <span className="s-art">
        {game.boxArt ? <img src={game.boxArt} alt="" width={300} height={209} loading="lazy" decoding="async" /> : <span className="s-noart">{game.title}</span>}
        {playing && game.video ? <video ref={video} src={game.video} loop playsInline autoPlay muted={!sound.on} /> : null}
      </span>
      <span className="s-tb">
        <span className="s-tt">{game.title}</span>
        <span className="s-tp">{[publisherName, genre].filter(Boolean).join(' · ')}</span>
        <span className="s-chips">
          {game.egmAvg !== null ? <span>EGM <b>{game.egmAvg.toFixed(1)}</b></span> : null}
          {game.np10 !== null ? <span>NP <b>{game.np10.toFixed(1)}</b></span> : null}
          {game.launchTitle ? <span className="s-day">Day One</span> : null}
        </span>
      </span>
    </Link>
  );
}

export default GameTile;
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-tile.test.tsx`
Expected: PASS (7 tests).

If the "only one clip" test fails, confirm that `stopPlaying` is module-level, not per-component.

- [ ] **Step 6: Commit**

```bash
git add app/snes/components/sound.tsx app/snes/components/GameTile.tsx __tests__/snes-tile.test.tsx
git commit -m "feat(snes): game tile with hover clips and sound that waits for the first click"
```

---

### Task 8: The `/snes` page: data loader, Library, filter bar, Timeline

**Files:**
- Create: `lib/snes/data.ts`
- Create: `app/snes/page.tsx`
- Create: `app/snes/components/Library.tsx`, `app/snes/components/FilterBar.tsx`, `app/snes/components/views/Timeline.tsx`
- Create stubs, filled in by Tasks 9–10: `app/snes/components/views/Heatmap.tsx`, `CoverWall.tsx`, `Shelf.tsx`, `Scatter.tsx`
- Modify: `public/robots.txt`
- Test: `__tests__/snes-library-page.test.tsx`

**Interfaces:**
- Consumes:
  - From Task 5: `buildIndex`, `facets`, `queryContext`, `parseQuery`, `toQuery`, `filterGames`, `sortGames`, `isFiltered`, `groupByMonth`, `DEFAULT_FILTERS`, `FIRST_YEAR`, `LAST_YEAR`
  - From Task 6: `SHORT_MONTHS`, `MONTHS`, `gameCount`
  - From Task 7: `GameTile`, `SoundProvider`, `SoundButton`
- Produces:
  - `lib/snes/data.ts`: `getGames(): Game[]`, `getCompanies(): Company[]`, `getCompanyNames(): Record<string, string>`, `getGame(slug: string): Game | undefined`
  - `Library({ games, names, facets }: { games: IndexGame[]; names: Record<string, string>; facets: Facets })`, the default export
  - `Timeline({ games, names }: { games: IndexGame[]; names: Record<string, string> })`, the default export
  - `Empty({ onClear }: { onClear: () => void })`, exported from `Library.tsx`
  - The view components' props, which Tasks 9–10 must keep:
    - `Heatmap({ games, onPick }: { games: IndexGame[]; onPick: (monthKey: string) => void })`
    - `CoverWall({ games, matched }: { games: IndexGame[]; matched: Set<string> })`
    - `Shelf({ games, byYear }: { games: IndexGame[]; byYear: boolean })`
    - `Scatter({ games, axis, onAxis }: { games: IndexGame[]; axis: ScoreAxis; onAxis: (a: ScoreAxis) => void })`

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-library-page.test.tsx`:
```tsx
import React from 'react';
import fs from 'fs';
import path from 'path';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Library from '@/app/snes/components/Library';
import { buildIndex, facets } from '@/lib/snes/library';
import type { Game } from '@/lib/snes/types';

const game = (slug: string, title: string, releasedUS: string, over: Partial<Game> = {}): Game => ({
  slug, title, releasedUS, datePrecision: releasedUS.length === 10 ? 'day' : 'month', developers: ['nintendo-ead'], publisher: 'nintendo',
  genres: [], players: null, chip: null, launchTitle: releasedUS === '1991-08-23', esrb: null, summary: null,
  scores: { aggregate: null, aggregateCount: 0, egm: null, nintendoPower: null, other: {} }, boxArt: `/snes/box/${slug}.jpg`,
  media: { video: false, logo: false, box3d: false }, sources: { wikipedia: null, igdb: null }, ...over,
});
const INDEX = buildIndex([
  game('f-zero', 'F-Zero', '1991-08-23'),
  game('gradius-iii', 'Gradius III', '1991-08-23', { publisher: 'konami', developers: ['konami'] }),
  game('super-metroid', 'Super Metroid', '1994-04-18', { scores: { aggregate: null, aggregateCount: 0, egm: [9, 9, 9, 9], nintendoPower: null, other: {} } }),
]);
const NAMES = { nintendo: 'Nintendo', konami: 'Konami', 'nintendo-ead': 'Nintendo EAD' };
const setup = (search = '') => {
  window.history.replaceState(null, '', `/snes${search}`);
  return render(<Library games={INDEX} names={NAMES} facets={facets(INDEX, NAMES)} />);
};

beforeEach(() => {
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollIntoView = jest.fn();
});

test('renders the timeline by month with every game', () => {
  setup();
  expect(screen.getByText('Launch day · Aug 23')).toBeInTheDocument();
  expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/snes/f-zero', '/snes/gradius-iii', '/snes/super-metroid']);
  expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true');
});

test('reads filters from the URL', () => {
  setup('?publisher=konami');
  expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/snes/gradius-iii']);
  expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
});

test('typing a search filters and writes the URL', () => {
  setup();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search games' }), { target: { value: 'metroid' } });
  expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/snes/super-metroid']);
  expect(window.location.search).toBe('?q=metroid');
});

test('the timeline with no matches says so, and Clear filters brings everything back', () => {
  setup('?q=zzzz');
  expect(screen.getByText('No carts match those filters')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
  expect(screen.getAllByRole('link')).toHaveLength(3);
  expect(window.location.search).toBe('');
});

test('year tabs disable years with no matches', () => {
  setup();
  expect(screen.getByRole('button', { name: '1991' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '1992' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '1994' }));
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
});

test('switching views updates the URL and the tab', async () => {
  setup();
  fireEvent.click(screen.getByRole('tab', { name: 'Heatmap' }));
  expect(screen.getByRole('tab', { name: 'Heatmap' })).toHaveAttribute('aria-selected', 'true');
  expect(window.location.search).toBe('?view=heatmap');
  await act(async () => {});
});

test('the sort control appears only on the wall and shelf', () => {
  setup();
  expect(screen.queryByRole('combobox', { name: 'Sort' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Wall' }));
  expect(screen.getByRole('combobox', { name: 'Sort' })).toBeInTheDocument();
});

test('genre and players controls stay hidden until the data has them', () => {
  setup();
  expect(screen.queryByRole('combobox', { name: 'Genre' })).toBeNull();
  expect(screen.queryByRole('combobox', { name: 'Players' })).toBeNull();
});

test('/snes is kept out of search engines', () => {
  expect(fs.readFileSync(path.join(process.cwd(), 'public/robots.txt'), 'utf8')).toMatch(/^Disallow: \/snes$/m);
  expect(fs.readFileSync(path.join(process.cwd(), 'public/sitemap.xml'), 'utf8')).not.toMatch(/\/snes/);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { metadata } = require('@/app/snes/page');
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-library-page.test.tsx`
Expected: FAIL with "Cannot find module '@/app/snes/components/Library'".

- [ ] **Step 3: Write the data loader**

`lib/snes/data.ts`:
```ts
/* Build-time access to the SNES dataset for pages (never imported by client components). */
import type { Company, Game } from './types.ts';
import games from '../../data/snes/games.json';
import companies from '../../data/snes/companies.json';

export const getGames = () => games as unknown as Game[];
export const getCompanies = () => companies as Company[];
export const getCompanyNames = (): Record<string, string> => Object.fromEntries(getCompanies().map((c) => [c.slug, c.name]));
export const getGame = (slug: string) => getGames().find((g) => g.slug === slug);
```

- [ ] **Step 4: Write the view stubs** (Tasks 9 and 10 replace their bodies; the props must stay as listed under Interfaces)

`app/snes/components/views/Heatmap.tsx`:
```tsx
'use client';
import type { IndexGame } from '@/lib/snes/library';
export default function Heatmap({ games }: { games: IndexGame[]; onPick: (monthKey: string) => void }) {
  return <div className="s-heat" data-count={games.length} />;
}
```
`app/snes/components/views/CoverWall.tsx`:
```tsx
'use client';
import type { IndexGame } from '@/lib/snes/library';
export default function CoverWall({ games }: { games: IndexGame[]; matched: Set<string> }) {
  return <div className="s-wall" data-count={games.length} />;
}
```
`app/snes/components/views/Shelf.tsx`:
```tsx
'use client';
import type { IndexGame } from '@/lib/snes/library';
export default function Shelf({ games }: { games: IndexGame[]; byYear: boolean }) {
  return <div className="s-shelf" data-count={games.length} />;
}
```
`app/snes/components/views/Scatter.tsx`:
```tsx
'use client';
import type { IndexGame, ScoreAxis } from '@/lib/snes/library';
export default function Scatter({ games }: { games: IndexGame[]; axis: ScoreAxis; onAxis: (a: ScoreAxis) => void }) {
  return <div className="s-scatter" data-count={games.length} />;
}
```

- [ ] **Step 5: Write the Timeline**

`app/snes/components/views/Timeline.tsx`:
```tsx
import { groupByMonth, type IndexGame } from '@/lib/snes/library';
import { gameCount, MONTHS, SHORT_MONTHS } from '@/lib/snes/display';
import { GameTile } from '../GameTile';

// Month rows down the page: the month on the left rail, its games wrapping to the right. Each year's first
// row carries an anchor (#y-1994) for the year tabs; each row its own (#m-1994-04) for the heatmap.
export default function Timeline({ games, names }: { games: IndexGame[]; names: Record<string, string> }) {
  let lastYear = 0;
  return (
    <div className="s-timeline">
      {groupByMonth(games).map((group) => {
        const yearStart = group.year !== lastYear;
        lastYear = group.year;
        const launch = group.key === '1991-08' && group.games.some((g) => g.launchTitle);
        return (
          <section key={group.key} className="s-month" id={`m-${group.key}`} aria-label={group.month ? `${MONTHS[group.month - 1]} ${group.year}` : `Sometime in ${group.year}`}>
            {yearStart ? <span className="s-anchor" id={`y-${group.year}`} /> : null}
            <div className="s-when">
              <div className="s-m">{group.month ? SHORT_MONTHS[group.month - 1] : '—'}</div>
              <div className="s-y">{group.year}</div>
              <div className="s-n">{gameCount(group.games.length)}</div>
            </div>
            <div>
              <p className="s-lbl">{launch ? 'Launch day · Aug 23' : group.month ? MONTHS[group.month - 1] : `Sometime in ${group.year}`}</p>
              <div className="s-row">
                {group.games.map((g) => (
                  <GameTile key={g.slug} game={g} publisherName={names[g.publisher] ?? ''} genre={g.genres[0]} />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Write the filter bar**

`app/snes/components/FilterBar.tsx`:
```tsx
'use client';

import { FIRST_YEAR, LAST_YEAR, type Facets, type Filters, type ScoreFlag, type ViewKey } from '@/lib/snes/library';
import { SoundButton } from './sound';

const VIEW_LABELS: [ViewKey, string][] = [['timeline', 'Timeline'], ['heatmap', 'Heatmap'], ['wall', 'Wall'], ['shelf', 'Shelf'], ['scatter', 'Scatter']];
const SCORE_LABELS: [ScoreFlag, string][] = [['egm', 'Has an EGM score'], ['np', 'Has a Nintendo Power score'], ['egm8', 'EGM average 8+']];
const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

type Props = { filters: Filters; facets: Facets; onChange: (patch: Partial<Filters>) => void };

export default function FilterBar({ filters: f, facets, onChange }: Props) {
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div className="s-bar" role="search">
      <input className="s-search" type="search" aria-label="Search games" placeholder="Search 717 games…" value={f.q} onChange={(e) => onChange({ q: e.target.value })} />
      <details className={`s-dd${f.years.length ? ' is-on' : ''}`}>
        <summary>Year{f.years.length ? ` (${f.years.length})` : ''} ▾</summary>
        <div className="s-pop">
          {YEARS.map((y) => (
            <label key={y}><input type="checkbox" checked={f.years.includes(y)} onChange={() => onChange({ years: toggleIn(f.years, y).sort() })} /> {y}</label>
          ))}
        </div>
      </details>
      <select aria-label="Publisher" className={`s-select${f.publisher ? ' is-on' : ''}`} value={f.publisher ?? ''} onChange={(e) => onChange({ publisher: e.target.value || null })}>
        <option value="">Any publisher</option>
        {facets.publishers.map((p) => <option key={p.slug} value={p.slug}>{p.name} ({p.count})</option>)}
      </select>
      <select aria-label="Developer" className={`s-select${f.developer ? ' is-on' : ''}`} value={f.developer ?? ''} onChange={(e) => onChange({ developer: e.target.value || null })}>
        <option value="">Any developer</option>
        {facets.developers.map((d) => <option key={d.slug} value={d.slug}>{d.name} ({d.count})</option>)}
      </select>
      <select aria-label="Chip" className={`s-select${f.chip ? ' is-on' : ''}`} value={f.chip ?? ''} onChange={(e) => onChange({ chip: e.target.value || null })}>
        <option value="">Any chip</option>
        {facets.chips.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.count})</option>)}
      </select>
      {facets.genres.length ? (
        <select aria-label="Genre" className={`s-select${f.genre ? ' is-on' : ''}`} value={f.genre ?? ''} onChange={(e) => onChange({ genre: e.target.value || null })}>
          <option value="">Any genre</option>
          {facets.genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      ) : null}
      {facets.players.length ? (
        <select aria-label="Players" className={`s-select${f.players ? ' is-on' : ''}`} value={f.players ?? ''} onChange={(e) => onChange({ players: Number(e.target.value) || null })}>
          <option value="">Any players</option>
          {facets.players.map((n) => <option key={n} value={n}>{n}+ players</option>)}
        </select>
      ) : null}
      <details className={`s-dd${f.scores.length ? ' is-on' : ''}`}>
        <summary>Scores{f.scores.length ? ` (${f.scores.length})` : ''} ▾</summary>
        <div className="s-pop">
          {SCORE_LABELS.map(([k, label]) => (
            <label key={k}><input type="checkbox" checked={f.scores.includes(k)} onChange={() => onChange({ scores: toggleIn(f.scores, k) })} /> {label}</label>
          ))}
        </div>
      </details>
      <button type="button" className="s-toggle" aria-pressed={f.launch} onClick={() => onChange({ launch: !f.launch })}>Launch day</button>
      {f.view === 'wall' || f.view === 'shelf' ? (
        <select aria-label="Sort" className="s-select" value={f.sort} onChange={(e) => onChange({ sort: e.target.value as Filters['sort'] })}>
          <option value="date">Release date</option>
          <option value="title">Title</option>
          <option value="egm">EGM average</option>
          <option value="np">Nintendo Power</option>
          <option value="aggregate">Aggregate</option>
        </select>
      ) : null}
      <SoundButton />
      <div className="s-views" role="tablist" aria-label="View">
        {VIEW_LABELS.map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={f.view === v} onClick={() => onChange({ view: v })}>{label}</button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write the Library**

`app/snes/components/Library.tsx`:
```tsx
'use client';

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FILTERS, FIRST_YEAR, LAST_YEAR, filterGames, isFiltered, parseQuery, queryContext, sortGames, toQuery,
  type Facets, type Filters, type IndexGame,
} from '@/lib/snes/library';
import FilterBar from './FilterBar';
import { SoundProvider } from './sound';
import Timeline from './views/Timeline';

const Heatmap = lazy(() => import('./views/Heatmap'));
const CoverWall = lazy(() => import('./views/CoverWall'));
const Shelf = lazy(() => import('./views/Shelf'));
const Scatter = lazy(() => import('./views/Scatter'));
const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

export function Empty({ onClear }: { onClear: () => void }) {
  return (
    <div className="s-empty">
      <p>No carts match those filters</p>
      <button type="button" className="s-clear" onClick={onClear}>Clear filters</button>
    </div>
  );
}

// The interactive layer of /snes. Rendered on the server with the default filters (the full timeline), then
// it reads the URL, applies the filters and keeps the URL in step, so any view can be shared as a link.
export default function Library({ games, names, facets }: { games: IndexGame[]; names: Record<string, string>; facets: Facets }) {
  const ctx = useMemo(() => queryContext(facets), [facets]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [ready, setReady] = useState(false);
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  useEffect(() => {
    setFilters(parseQuery(window.location.search, ctx));
    setReady(true);
  }, [ctx]);
  useEffect(() => {
    if (ready) window.history.replaceState(null, '', `${window.location.pathname}${toQuery(filters)}`);
  }, [filters, ready]);
  useEffect(() => {
    if (!scrollTo) return;
    document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setScrollTo(null);
  }, [scrollTo, filters.view]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const clear = () => setFilters((f) => ({ ...DEFAULT_FILTERS, view: f.view, y: f.y, sort: f.sort }));
  const matched = useMemo(() => filterGames(games, filters), [games, filters]);
  const matchedSet = useMemo(() => new Set(matched.map((g) => g.slug)), [matched]);
  const years = useMemo(() => new Set(matched.map((g) => Number(g.releasedUS.slice(0, 4)))), [matched]);
  const { view } = filters;
  const showYears = view === 'timeline' || view === 'wall' || (view === 'shelf' && filters.sort === 'date');

  return (
    <SoundProvider>
      {ready ? <FilterBar filters={filters} facets={facets} onChange={update} /> : null}
      {ready && isFiltered(filters) ? (
        <p className="s-count">
          Showing {matched.length} of {games.length}
          <button type="button" className="s-clear" onClick={clear}>Clear filters</button>
        </p>
      ) : null}
      {showYears ? (
        <nav className="s-years" aria-label="Jump to year">
          {YEARS.map((y) => (
            <button key={y} type="button" disabled={!years.has(y)} onClick={() => setScrollTo(`y-${y}`)}>{y}</button>
          ))}
        </nav>
      ) : null}
      <div role="tabpanel">
        <Suspense fallback={<p className="s-none">Loading…</p>}>
          {view === 'timeline' ? (matched.length ? <Timeline games={matched} names={names} /> : <Empty onClear={clear} />) : null}
          {view === 'heatmap' ? (
            <Heatmap games={matched} onPick={(key) => { update({ view: 'timeline' }); setScrollTo(`m-${key}`); }} />
          ) : null}
          {view === 'wall' ? <CoverWall games={sortGames(games, filters.sort)} matched={matchedSet} /> : null}
          {view === 'shelf' ? (matched.length ? <Shelf games={sortGames(matched, filters.sort)} byYear={filters.sort === 'date'} /> : <Empty onClear={clear} />) : null}
          {view === 'scatter' ? <Scatter games={matched} axis={filters.y} onAxis={(y) => update({ y })} /> : null}
        </Suspense>
      </div>
    </SoundProvider>
  );
}
```

- [ ] **Step 8: Write the page and the robots rule**

`app/snes/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import { getCompanyNames, getGames } from '@/lib/snes/data';
import { buildIndex, facets } from '@/lib/snes/library';
import Library from './components/Library';
import './snes.css';

const TITLE = 'Every US SNES game';
const DESCRIPTION = 'Every Super Nintendo game released in America, 1991–1998, month by month.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Unlinked and kept out of search until Wes's played-games layer (piece 3) ships.
  robots: { index: false, follow: false },
};

export default function SnesPage() {
  const index = buildIndex(getGames());
  const names = getCompanyNames();
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <div className="s-wrap">
          <header className="s-hero">
            <div className="eyebrow">The Super Nintendo in America</div>
            <h1>Every US SNES game, 1991–1998</h1>
            <p>
              {index.length} games, month by month — from launch day on August 23, 1991, when F-Zero and Super Mario World hit the shelves,
              to the last cart in 1998.
            </p>
          </header>
          <Library games={index} names={names} facets={facets(index, names)} />
        </div>
      </main>
      <Footer />
    </>
  );
}
```

In `public/robots.txt`, after the line `Disallow: /health`, add:
```
Disallow: /snes
```

- [ ] **Step 9: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-library-page.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 10: Commit**

```bash
git add lib/snes/data.ts app/snes/page.tsx app/snes/components public/robots.txt __tests__/snes-library-page.test.tsx
git commit -m "feat(snes): /snes page — filter bar, URL state, timeline, year tabs"
```

---

### Task 9: Heatmap and Cover wall

**Files:**
- Modify (replace stubs): `app/snes/components/views/Heatmap.tsx`, `app/snes/components/views/CoverWall.tsx`
- Test: `__tests__/snes-views.test.tsx` (new). Task 10 appends to it.

**Interfaces:**
- Consumes: `heatmapCounts`, `IndexGame` (Task 5); `MONTHS`, `gameCount` (Task 6); `formatRelease` (Task 6).
- Produces: the same props as the stubs in Task 8.

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-views.test.tsx`:
```tsx
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import Heatmap from '@/app/snes/components/views/Heatmap';
import CoverWall from '@/app/snes/components/views/CoverWall';
import type { IndexGame } from '@/lib/snes/library';

export const g = (slug: string, releasedUS: string, over: Partial<IndexGame> = {}): IndexGame => ({
  slug, title: slug.toUpperCase(), search: slug, releasedUS, datePrecision: releasedUS.length === 10 ? 'day' : 'month', publisher: 'nintendo',
  developers: [], genres: [], players: null, chip: null, chipSlug: null, launchTitle: false, egmAvg: null, np10: null, aggregate: null,
  boxArt: `/snes/box/${slug}.jpg`, thumb: `/snes/thumb/${slug}.jpg`, video: null, ...over,
});
const GAMES = [g('a', '1991-08-23'), g('b', '1991-08'), g('c', '1994-11'), g('d', '1995-02', { thumb: null, boxArt: null })];

describe('Heatmap', () => {
  test('a cell per month with its count; clicking a month picks it', () => {
    const onPick = jest.fn();
    render(<Heatmap games={GAMES} onPick={onPick} />);
    const aug = screen.getByRole('button', { name: 'August 1991: 2 games' });
    expect(aug).toHaveClass('l4');
    fireEvent.click(aug);
    expect(onPick).toHaveBeenCalledWith('1991-08');
    expect(screen.getByRole('button', { name: 'July 1991: before launch' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'March 1992: 0 games' })).toBeDisabled();
  });
  test('with no matches every month is zero and nothing is clickable', () => {
    render(<Heatmap games={[]} onPick={jest.fn()} />);
    expect(screen.getAllByRole('button').every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByText(/No games match/)).toBeInTheDocument();
  });
});

describe('CoverWall', () => {
  test('every cover in order, non-matches dimmed, year markers for jumping', () => {
    const { container } = render(<CoverWall games={GAMES} matched={new Set(['a', 'c'])} />);
    const items = screen.getAllByRole('link');
    expect(items.map((a) => a.getAttribute('href'))).toEqual(['/snes/a', '/snes/b', '/snes/c', '/snes/d']);
    expect(items[1]).toHaveClass('is-dim');
    expect(items[0]).not.toHaveClass('is-dim');
    expect(items[0].querySelector('img')).toHaveAttribute('src', '/snes/thumb/a.jpg');
    expect(items[3].querySelector('img')).toBeNull();
    expect(Array.from(container.querySelectorAll('.s-wall-year'), (e) => e.id)).toEqual(['y-1991', 'y-1994', 'y-1995']);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-views.test.tsx`
Expected: FAIL. The stubs render no buttons or links.

- [ ] **Step 3: Implement the Heatmap**

`app/snes/components/views/Heatmap.tsx`:
```tsx
'use client';

import { FIRST_YEAR, LAST_YEAR, heatmapCounts, type IndexGame } from '@/lib/snes/library';
import { gameCount, MONTHS } from '@/lib/snes/display';

// Years down, months across; darker purple = more releases. Clicking a month opens the timeline there.
export default function Heatmap({ games, onPick }: { games: IndexGame[]; onPick: (monthKey: string) => void }) {
  const cells = heatmapCounts(games);
  const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  return (
    <div>
      {games.length === 0 ? <p className="s-none">No games match those filters.</p> : null}
      <div className="s-heat" role="grid" aria-label="Games released per month">
        <div className="s-heat-row" aria-hidden="true">
          <span />
          {MONTHS.map((m) => <em key={m}>{m[0]}</em>)}
        </div>
        {years.map((year) => (
          <div className="s-heat-row" key={year} role="row">
            <span role="rowheader">{year}</span>
            {cells.filter((c) => c.year === year).map((c) => (
              <button
                key={c.key}
                type="button"
                role="gridcell"
                className={`s-heat-cell l${c.level}${c.pre ? ' is-pre' : ''}`}
                disabled={c.pre || c.count === 0}
                aria-label={`${MONTHS[c.month - 1]} ${c.year}: ${c.pre ? 'before launch' : gameCount(c.count)}`}
                onClick={() => onPick(c.key)}
              >
                {c.count || ''}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement the Cover wall**

`app/snes/components/views/CoverWall.tsx`:
```tsx
'use client';

import Link from 'next/link';
import type { IndexGame } from '@/lib/snes/library';
import { formatRelease } from '@/lib/snes/display';

// Every cover at once on a dark screen, in the order given. Filtered-out games stay in place, dimmed, so you
// see where the matches sit in history. A year marker opens each year (only when the order is by date).
export default function CoverWall({ games, matched }: { games: IndexGame[]; matched: Set<string> }) {
  const byDate = games.every((g, i) => i === 0 || games[i - 1].releasedUS.slice(0, 4) <= g.releasedUS.slice(0, 4));
  let lastYear = '';
  return (
    <div className="s-wall">
      {games.flatMap((g) => {
        const year = g.releasedUS.slice(0, 4);
        const marker = byDate && year !== lastYear ? (
          <span key={`y-${year}`} id={`y-${year}`} className="s-wall-year">{year}</span>
        ) : null;
        lastYear = year;
        const item = (
          <Link
            key={g.slug}
            href={`/snes/${g.slug}`}
            className={`s-wall-item${matched.has(g.slug) ? '' : ' is-dim'}`}
            aria-label={`${g.title}, ${formatRelease(g.releasedUS, g.datePrecision)}`}
            title={g.title}
          >
            {g.thumb ? <img src={g.thumb} alt="" width={96} height={67} loading="lazy" decoding="async" /> : <span className="s-noart">{g.title}</span>}
          </Link>
        );
        return marker ? [marker, item] : [item];
      })}
    </div>
  );
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-views.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/snes/components/views/Heatmap.tsx app/snes/components/views/CoverWall.tsx __tests__/snes-views.test.tsx
git commit -m "feat(snes): release heatmap and cover wall views"
```

---

### Task 10: Game shelf and Score scatter

**Files:**
- Modify (replace stubs): `app/snes/components/views/Shelf.tsx`, `app/snes/components/views/Scatter.tsx`
- Test: append to `__tests__/snes-views.test.tsx`

**Interfaces:**
- Consumes: `scatterPoints`, `labelPoints`, `xForDate` and `ScoreAxis` (Task 5); `formatRelease` (Task 6).
- Produces: the same props as the stubs in Task 8.

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/snes-views.test.tsx`. Merge the imports into the file's import block:
```tsx
import Shelf from '@/app/snes/components/views/Shelf';
import Scatter from '@/app/snes/components/views/Scatter';

describe('Shelf', () => {
  test('a shelf per year of spines, each a slice of its own cover, linking to the game', () => {
    const { container } = render(<Shelf games={GAMES} byYear />);
    expect(Array.from(container.querySelectorAll('.s-shelf-year'), (e) => e.id)).toEqual(['y-1991', 'y-1994', 'y-1995']);
    const spine = screen.getByRole('link', { name: /^A,/ });
    expect(spine).toHaveAttribute('href', '/snes/a');
    expect(spine.getAttribute('style')).toContain('url(/snes/thumb/a.jpg)');
    expect(spine).toHaveTextContent('SUPER NINTENDO');
  });
  test('sorted any other way it is one shelf with no year jumps', () => {
    const { container } = render(<Shelf games={GAMES} byYear={false} />);
    expect(container.querySelectorAll('.s-shelf-year')).toHaveLength(1);
    expect(container.querySelector('.s-shelf-year')!.id).toBe('');
  });
});

describe('Scatter', () => {
  const scored = [g('a', '1991-08-23', { egmAvg: 9.5 }), g('b', '1993-06', { egmAvg: 6 }), g('c', '1995-01', { np10: 8 })];
  test('a dot per game with the chosen score, the best labelled, and a table for screen readers', () => {
    render(<Scatter games={scored} axis="egm" onAxis={jest.fn()} />);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/snes/a', '/snes/b']);
    expect(screen.getByRole('table', { name: /EGM average/ })).toBeInTheDocument();
    expect(screen.getByText('A', { selector: '.s-dot-label' })).toBeInTheDocument();
  });
  test('switching the axis asks the library', () => {
    const onAxis = jest.fn();
    render(<Scatter games={scored} axis="egm" onAxis={onAxis} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nintendo Power' }));
    expect(onAxis).toHaveBeenCalledWith('np');
    expect(screen.getByRole('button', { name: 'Aggregate' })).toBeDisabled();
  });
  test('with no matches it says there is nothing to plot', () => {
    render(<Scatter games={[]} axis="egm" onAxis={jest.fn()} />);
    expect(screen.getByText('No games with EGM scores match those filters.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-views.test.tsx -t "Shelf|Scatter"`
Expected: FAIL.

- [ ] **Step 3: Implement the Shelf**

`app/snes/components/views/Shelf.tsx`:
```tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { IndexGame } from '@/lib/snes/library';
import { formatRelease } from '@/lib/snes/display';

// Drawn spines standing on planks: a black SUPER NINTENDO band, then a vertical slice of the game's own cover
// behind its title. One shelf per year when ordered by date; one long shelf for any other order.
export default function Shelf({ games, byYear }: { games: IndexGame[]; byYear: boolean }) {
  const groups = byYear
    ? [...new Set(games.map((g) => g.releasedUS.slice(0, 4)))].map((y) => ({ year: y, games: games.filter((g) => g.releasedUS.startsWith(y)) }))
    : [{ year: '', games }];
  return (
    <div>
      {groups.map((group) => (
        <section key={group.year || 'all'} className="s-shelf-year" id={group.year ? `y-${group.year}` : undefined}>
          {group.year ? <h3>{group.year}</h3> : null}
          <div className="s-shelf">
            {group.games.map((g) => (
              <Link
                key={g.slug}
                href={`/snes/${g.slug}`}
                className="s-spine"
                aria-label={`${g.title}, ${formatRelease(g.releasedUS, g.datePrecision)}`}
                style={g.thumb ? ({ '--art': `url(${g.thumb})` } as CSSProperties) : undefined}
              >
                <span className="s-band"><b>SUPER NINTENDO</b></span>
                <span className="s-spine-t">{g.title}</span>
                <span className="s-seal" />
                <span className="s-spine-tip" aria-hidden="true">
                  {g.thumb ? <img src={g.thumb} alt="" width={96} height={67} loading="lazy" /> : null}
                  {g.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement the Scatter**

`app/snes/components/views/Scatter.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { labelPoints, scatterPoints, xForDate, type IndexGame, type ScoreAxis } from '@/lib/snes/library';

const AXIS_LABEL: Record<ScoreAxis, string> = { egm: 'EGM average', np: 'Nintendo Power', aggregate: 'Aggregate' };
const AXIS_BUTTON: Record<ScoreAxis, string> = { egm: 'EGM', np: 'Nintendo Power', aggregate: 'Aggregate' };
const YEAR_TICKS = [1992, 1993, 1994, 1995, 1996, 1997, 1998];

// Every game with the chosen score as a dot: release date across, score (0–10) up. The best-scoring games that
// fit get a label; hovering or focusing any dot names it, and a hidden table carries the same data.
export default function Scatter({ games, axis, onAxis }: { games: IndexGame[]; axis: ScoreAxis; onAxis: (a: ScoreAxis) => void }) {
  const points = scatterPoints(games, axis);
  const labelled = new Set(labelPoints(points));
  const available = (a: ScoreAxis) => scatterPoints(games, a).length > 0;
  return (
    <div className="s-scatter-wrap">
      <div className="s-axis-pick">
        {(['egm', 'np', 'aggregate'] as ScoreAxis[]).map((a) => (
          <button key={a} type="button" className="s-toggle" aria-pressed={axis === a} disabled={!available(a) && axis !== a} onClick={() => onAxis(a)}>
            {AXIS_BUTTON[a]}
          </button>
        ))}
      </div>
      {points.length === 0 ? (
        <p className="s-none">No games with {AXIS_BUTTON[axis]} scores match those filters.</p>
      ) : (
        <>
          <div className="s-scatter" aria-hidden="false">
            {points.map((p) => (
              <Link
                key={p.slug}
                href={`/snes/${p.slug}`}
                className={`s-dot${labelled.has(p.slug) ? ' is-star' : ''}`}
                style={{ left: `${p.x}%`, bottom: `${p.y * 10}%` }}
                title={`${p.title} — ${p.y}`}
                aria-label={`${p.title}, ${AXIS_LABEL[axis]} ${p.y}`}
              >
                {labelled.has(p.slug) ? <span className="s-dot-label">{p.title}</span> : null}
              </Link>
            ))}
            {YEAR_TICKS.map((y) => <span key={y} className="s-tick-x" style={{ left: `${xForDate(`${y}-01-01`)}%` }}>{y}</span>)}
            {[0, 5, 10].map((v) => <span key={v} className="s-tick-y" style={{ bottom: `${v * 10}%` }}>{v}</span>)}
          </div>
          <table className="vh">
            <caption>{AXIS_LABEL[axis]} by release date</caption>
            <thead><tr><th>Game</th><th>Score</th></tr></thead>
            <tbody>{points.map((p) => <tr key={p.slug}><td>{p.title}</td><td>{p.y}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-views.test.tsx`
Expected: PASS. If the `getByRole('table', …)` lookup fails because `.vh` hides the table: the design system's `.vh` is clip-based and stays in the accessibility tree, so check that the caption text matches `/EGM average/`.

- [ ] **Step 6: Commit**

```bash
git add app/snes/components/views/Shelf.tsx app/snes/components/views/Scatter.tsx __tests__/snes-views.test.tsx
git commit -m "feat(snes): game shelf with cover-slice spines, and the score scatter"
```

---

### Task 11: Game pages (the instruction booklet)

**Files:**
- Create: `app/snes/[slug]/page.tsx`
- Create: `app/snes/components/GameView.tsx`, `app/snes/components/MediaFrame.tsx`, `app/snes/components/Booklet.tsx`
- Test: `__tests__/snes-game-page.test.tsx`

**Interfaces:**
- Consumes:
  - `Game` (Task 3 fields)
  - From Task 5: `IndexGame`, `buildIndex`, `neighbours`
  - From Task 6: `formatRelease`, `MONTHS`, `displayedMagazines`, `reviewerScores`, `npLabel`, `playersLabel`, `ratingLabel`, `gameCount`
  - `GameTile` (Task 7); `getGames`, `getGame`, `getCompanyNames` (Task 8)
- Produces:
  - `GameView({ game, names, prev, next, sameMonth }: { game: Game; names: Record<string, string>; prev: IndexGame | null; next: IndexGame | null; sameMonth: IndexGame[] })`
  - `MediaFrame({ game }: { game: Game })`
  - `Booklet({ game, names }: { game: Game; names: Record<string, string> })`

- [ ] **Step 1: Write the failing tests**

`__tests__/snes-game-page.test.tsx`:
```tsx
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import GameView from '@/app/snes/components/GameView';
import { buildIndex } from '@/lib/snes/library';
import type { Game } from '@/lib/snes/types';

const full: Game = {
  slug: 'f-zero', title: 'F-Zero', releasedUS: '1991-08-23', datePrecision: 'day', developers: ['nintendo-ead'], publisher: 'nintendo',
  genres: ['Racing'], players: 1, chip: null, launchTitle: true, esrb: null, summary: 'Race at 400 km/h above the cities of 2560.',
  scores: { aggregate: null, aggregateCount: 0, egm: [8, 9, 8, 7], nintendoPower: { score: 4, scale: 5 }, other: { GR: '83%', Fam: '7/10, 8/10, 8/10, 9/10', award1: 'x' } },
  boxArt: '/snes/box/f-zero.jpg', media: { video: true, logo: true, box3d: true }, sources: { wikipedia: 'F-Zero (video game)', igdb: null },
};
const bare: Game = {
  ...full, slug: 'bare', title: 'Bare Cart', releasedUS: '1995-03', datePrecision: 'month', genres: [], players: null, launchTitle: false,
  summary: null, scores: { aggregate: null, aggregateCount: 0, egm: null, nintendoPower: null, other: {} }, boxArt: null,
  media: { video: false, logo: false, box3d: false },
};
const NAMES = { nintendo: 'Nintendo', 'nintendo-ead': 'Nintendo EAD' };
const [gradius] = buildIndex([{ ...full, slug: 'gradius-iii', title: 'Gradius III', media: { video: false, logo: false, box3d: false } }]);

beforeEach(() => {
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

test('a full game page: logo title, chips, story, specifications, magazines, neighbours and the month strip', () => {
  render(<GameView game={full} names={NAMES} prev={null} next={gradius} sameMonth={[gradius]} />);
  expect(screen.getByRole('heading', { level: 1, name: 'F-Zero' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'F-Zero' })).toHaveAttribute('src', '/snes/logo/f-zero.png');
  for (const chip of ['Racing', '1 player', 'Day One', 'Pre-ESRB']) expect(screen.getAllByText(chip).length).toBeGreaterThan(0);
  expect(screen.getByText('Race at 400 km/h above the cities of 2560.')).toBeInTheDocument();
  const spec = screen.getByRole('region', { name: 'Specifications' });
  expect(within(spec).getByRole('link', { name: 'Nintendo EAD' })).toHaveAttribute('href', '/snes/company/nintendo-ead');
  expect(within(spec).getByText('August 23, 1991 — launch day')).toBeInTheDocument();
  const mags = screen.getByRole('region', { name: 'What the magazines said' });
  expect(within(mags).getByText('EGM · four reviewers')).toBeInTheDocument();
  expect(within(mags).getByText('Famitsu · four reviewers')).toBeInTheDocument();
  expect(within(mags).getByText('4/5')).toBeInTheDocument();
  expect(within(mags).getByText('GameRankings')).toBeInTheDocument();
  expect(within(mags).queryByText('award1')).toBeNull();
  expect(screen.getAllByText('Start of the timeline')).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: /Gradius III/ })[0]).toHaveAttribute('href', '/snes/gradius-iii');
  expect(screen.getByText(/Also out in August 1991/)).toBeInTheDocument();
  expect(screen.getByText(/Wes's take/)).toBeInTheDocument();
});

test('the media switch flips between cover, 3D box and gameplay; play starts the clip with sound', () => {
  const { container } = render(<GameView game={full} names={NAMES} prev={null} next={null} sameMonth={[]} />);
  const frame = container.querySelector('.s-frame')!;
  expect(frame).toHaveClass('is-crt');
  fireEvent.click(screen.getByRole('button', { name: '3D box' }));
  expect(frame.querySelector('img.s-box3d')).toHaveAttribute('src', '/snes/box3d/f-zero.png');
  expect(frame).not.toHaveClass('is-crt');
  fireEvent.click(screen.getByRole('button', { name: 'Cover' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play gameplay with sound' }));
  const video = frame.querySelector('video') as HTMLVideoElement;
  expect(video).toHaveAttribute('src', '/snes/video/f-zero.mp4');
  expect(video.muted).toBe(false);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
});

test('a bare game page renders every absent state without gaps', () => {
  const { container } = render(<GameView game={bare} names={NAMES} prev={gradius} next={null} sameMonth={[]} />);
  expect(screen.getByRole('heading', { level: 1, name: 'Bare Cart' })).toHaveClass('s-title');
  expect(screen.getByText('No summary yet.')).toBeInTheDocument();
  expect(screen.getByText('No magazine scores on record yet.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '3D box' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Play/ })).toBeNull();
  expect(screen.getAllByText('End of the timeline')).toHaveLength(2);
  expect(container.textContent).not.toMatch(/undefined|NaN|null/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest __tests__/snes-game-page.test.tsx`
Expected: FAIL with "Cannot find module '@/app/snes/components/GameView'".

- [ ] **Step 3: Implement MediaFrame**

`app/snes/components/MediaFrame.tsx`:
```tsx
'use client';

import { useRef, useState } from 'react';
import type { Game } from '@/lib/snes/types';

type Mode = 'cover' | 'box3d' | 'clip';

// The game page's screen: the cover under light scanlines, the 3D box render, or the gameplay clip with sound
// (the click on ▶ is the interaction browsers need before they allow audio).
export default function MediaFrame({ game }: { game: Game }) {
  const [mode, setMode] = useState<Mode>('cover');
  const video = useRef<HTMLVideoElement>(null);
  const modes: [Mode, string][] = [['cover', 'Cover'], ...(game.media.box3d ? [['box3d', '3D box'] as [Mode, string]] : []), ...(game.media.video ? [['clip', 'Gameplay'] as [Mode, string]] : [])];

  const play = () => {
    setMode('clip');
    requestAnimationFrame(() => {
      const v = video.current;
      if (!v) return;
      v.muted = false;
      v.play().catch(() => {});
    });
  };
  const choose = (m: Mode) => {
    if (m !== 'clip') video.current?.pause();
    setMode(m);
  };

  return (
    <div>
      <div className={`s-frame${mode === 'box3d' ? '' : ' is-crt'}`}>
        {mode === 'cover' ? (
          game.boxArt ? <img src={game.boxArt} alt={`${game.title} box art`} width={300} height={209} /> : <span className="s-noart">{game.title}</span>
        ) : null}
        {mode === 'box3d' ? <img className="s-box3d" src={`/snes/box3d/${game.slug}.png`} alt={`${game.title} box, 3D`} /> : null}
        {game.media.video ? (
          <video
            ref={(el) => {
              video.current = el;
              if (el && mode === 'clip') {
                el.muted = false;
                el.play().catch(() => {});
              }
            }}
            src={`/snes/video/${game.slug}.mp4`}
            poster={game.boxArt ?? undefined}
            controls
            playsInline
            preload="none"
            hidden={mode !== 'clip'}
          />
        ) : null}
        {mode === 'cover' && game.media.video ? (
          <button type="button" className="s-play" aria-label="Play gameplay with sound" onClick={play}>
            <span aria-hidden="true">▶</span>
          </button>
        ) : null}
      </div>
      {modes.length > 1 ? (
        <div className="s-seg" role="group" aria-label="Show">
          {modes.map(([m, label]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => (m === 'clip' ? play() : choose(m))}>{label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Implement the Booklet**

`app/snes/components/Booklet.tsx`:
```tsx
import Link from 'next/link';
import type { Game } from '@/lib/snes/types';
import { displayedMagazines, formatRelease, npLabel, playersLabel, ratingLabel, reviewerScores } from '@/lib/snes/display';

const COUNT_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const reviewers = (n: number) => `${COUNT_WORDS[n] ?? n} reviewer${n === 1 ? '' : 's'}`;

function Bars({ scores, label }: { scores: number[]; label: string }) {
  return (
    <div className="s-bars">
      {scores.map((s, i) => (
        <div key={i} className="s-bar4" style={{ height: `${s * 8}px` }}><i>{s}</i></div>
      ))}
      <span className="s-bars-label">{label}</span>
    </div>
  );
}

// The right-hand column of a game page, laid out like the game's instruction booklet.
export default function Booklet({ game, names }: { game: Game; names: Record<string, string> }) {
  const when = formatRelease(game.releasedUS, game.datePrecision);
  const { egm, nintendoPower, other } = game.scores;
  const fam = reviewerScores(other.Fam);
  const rest = displayedMagazines(other, fam ? ['Fam'] : []);
  const anyScore = Boolean(egm || nintendoPower || fam || rest.length);
  const company = (slug: string) => <Link href={`/snes/company/${slug}`}>{names[slug] ?? slug}</Link>;

  return (
    <article className="s-booklet">
      <div className="eyebrow">Instruction booklet · {when}</div>
      {game.media.logo ? (
        <>
          <h1 className="vh">{game.title}</h1>
          <img className="s-logo" src={`/snes/logo/${game.slug}.png`} alt={game.title} />
        </>
      ) : (
        <h1 className="s-title">{game.title}</h1>
      )}
      <div className="s-bchips">
        {game.genres.map((g) => <span key={g} className="s-bchip">{g}</span>)}
        {game.players ? <span className="s-bchip">{playersLabel(game.players)}</span> : null}
        {game.launchTitle ? <span className="s-bchip is-day">Day One</span> : null}
        <span className="s-bchip">{ratingLabel(game.esrb, game.releasedUS)}</span>
        {game.chip ? <span className="s-bchip">{game.chip}</span> : null}
      </div>

      <section className="s-sect" aria-labelledby="sect-story">
        <h2 id="sect-story">The story</h2>
        <p>{game.summary ?? 'No summary yet.'}</p>
      </section>

      <section className="s-sect" aria-labelledby="sect-spec">
        <h2 id="sect-spec">Specifications</h2>
        <dl className="s-spec">
          <dt>Released</dt>
          <dd>{when}{game.launchTitle ? ' — launch day' : ''}</dd>
          <dt>{game.developers.length > 1 ? 'Developers' : 'Developer'}</dt>
          <dd>{game.developers.map((d, i) => <span key={d}>{i ? ', ' : ''}{company(d)}</span>)}</dd>
          <dt>Publisher</dt>
          <dd>{company(game.publisher)}</dd>
          {game.players ? <><dt>Players</dt><dd>{game.players}</dd></> : null}
          {game.genres.length ? <><dt>Genre</dt><dd>{game.genres.join(' · ')}</dd></> : null}
          <dt>Rating</dt>
          <dd>{ratingLabel(game.esrb, game.releasedUS)}</dd>
          {game.chip ? <><dt>Chip</dt><dd>{game.chip}</dd></> : null}
        </dl>
      </section>

      <section className="s-sect" aria-labelledby="sect-mags">
        <h2 id="sect-mags">What the magazines said</h2>
        {!anyScore ? <p className="s-none">No magazine scores on record yet.</p> : (
          <>
            {egm ? <Bars scores={egm} label={`EGM · ${reviewers(egm.length)}`} /> : <p className="s-none">EGM · not on record yet</p>}
            {fam ? <Bars scores={fam} label={`Famitsu · ${reviewers(fam.length)}`} /> : null}
            <dl className="s-crs">
              {nintendoPower ? <div className="s-cr"><dt>Nintendo Power</dt><dd>{npLabel(nintendoPower)}</dd></div> : null}
              {rest.map((m) => <div key={m.name} className="s-cr"><dt>{m.name}</dt><dd>{m.score}</dd></div>)}
            </dl>
          </>
        )}
      </section>
    </article>
  );
}
```

- [ ] **Step 5: Implement GameView and the page**

`app/snes/components/GameView.tsx`:
```tsx
import Link from 'next/link';
import type { Game } from '@/lib/snes/types';
import type { IndexGame } from '@/lib/snes/library';
import { MONTHS } from '@/lib/snes/display';
import Booklet from './Booklet';
import MediaFrame from './MediaFrame';
import { GameTile } from './GameTile';

const STRIP = 8;

export default function GameView({ game, names, prev, next, sameMonth }: {
  game: Game; names: Record<string, string>; prev: IndexGame | null; next: IndexGame | null; sameMonth: IndexGame[];
}) {
  const [year, month] = game.releasedUS.split('-').map(Number);
  const monthName = month ? `${MONTHS[month - 1]} ${year}` : String(year);
  const monthKey = month ? game.releasedUS.slice(0, 7) : String(year);
  const step = (g: IndexGame | null, dir: 'prev' | 'next') =>
    g ? <Link href={`/snes/${g.slug}`}>{dir === 'prev' ? `◀ ${g.title}` : `${g.title} ▶`}</Link> : <span>{dir === 'prev' ? 'Start of the timeline' : 'End of the timeline'}</span>;

  return (
    <>
      <nav className="s-crumb" aria-label="Breadcrumb">
        <span>
          <Link href="/snes">SNES</Link> / <Link href={`/snes#y-${year}`}>{year}</Link>
          {month ? <> / <Link href={`/snes#m-${monthKey}`}>{MONTHS[month - 1]}</Link></> : null}
        </span>
        <span>{step(prev, 'prev')} · {step(next, 'next')}</span>
      </nav>
      <div className="s-game">
        <div>
          <MediaFrame game={game} />
          <div className="s-wes">
            <b>Wes&apos;s take — coming soon</b>
            Played? Beaten? 100%? Rating, tier and a Pocket log line will live here.
          </div>
        </div>
        <Booklet game={game} names={names} />
      </div>
      {sameMonth.length ? (
        <section className="s-also" aria-label={`Also out in ${monthName}`}>
          <div className="eyebrow">
            Also out in {monthName}
            {sameMonth.length > STRIP ? <> · <Link href={`/snes#m-${monthKey}`}>{sameMonth.length - STRIP} more →</Link></> : null}
          </div>
          <div className="s-row">
            {sameMonth.slice(0, STRIP).map((g) => <GameTile key={g.slug} game={g} publisherName={names[g.publisher] ?? ''} genre={g.genres[0]} />)}
          </div>
        </section>
      ) : null}
      <div className="s-steps">{step(prev, 'prev')}{step(next, 'next')}</div>
    </>
  );
}
```

`app/snes/[slug]/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { Nav } from '../../components/Nav';
import Footer from '../../components/Footer';
import { getCompanyNames, getGame, getGames } from '@/lib/snes/data';
import { buildIndex, neighbours } from '@/lib/snes/library';
import GameView from '../components/GameView';
import '../snes.css';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return getGames().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const game = getGame((await params).slug);
  return { title: game ? `${game.title} · SNES` : 'SNES', robots: { index: false, follow: false } };
}

export default async function GamePage({ params }: Params) {
  const { slug } = await params;
  const game = getGame(slug)!;
  const index = buildIndex(getGames());
  const { prev, next } = neighbours(index, slug);
  const monthKey = game.releasedUS.slice(0, game.datePrecision === 'year' ? 4 : 7);
  const sameMonth = index.filter((g) => g.slug !== slug && g.releasedUS.startsWith(monthKey));
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <div className="s-wrap">
          <GameView game={game} names={getCompanyNames()} prev={prev} next={next} sameMonth={sameMonth} />
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npx jest __tests__/snes-game-page.test.tsx`
Expected: PASS. Three failures to watch for:
- **The region lookups fail.** `<section aria-labelledby>` has the role `region` only when it's named; check the `id` and `aria-labelledby` pairs.
- **The `/undefined|NaN|null/` text check matches "null".** Find which label printed it, fix that label, then re-run.
- **`requestAnimationFrame` is missing in jsdom.** It exists in jsdom 20+; if it's absent, change `play()` to call `setMode('clip')` and rely on the `ref` callback, which already plays when `mode === 'clip'`.

- [ ] **Step 7: Commit**

```bash
git add 'app/snes/[slug]/page.tsx' app/snes/components/GameView.tsx app/snes/components/MediaFrame.tsx app/snes/components/Booklet.tsx __tests__/snes-game-page.test.tsx
git commit -m "feat(snes): game pages — instruction booklet, cover/3D box/gameplay, magazines"
```

---

### Task 12: Company pages

**Files:**
- Create: `app/snes/company/[slug]/page.tsx`
- Create: `app/snes/components/CompanyView.tsx`
- Test: `__tests__/snes-company-page.test.tsx`

**Interfaces:**
- Consumes: `Company`; `IndexGame` and `buildIndex` (Task 5); `gameCount` (Task 6); `Timeline` (Task 8); `SoundProvider` (Task 7); `getCompanies`, `getGames`, `getCompanyNames` (Task 8).
- Produces: `CompanyView({ company, games, names }: { company: Company; games: IndexGame[]; names: Record<string, string> })`.

- [ ] **Step 1: Write the failing test**

`__tests__/snes-company-page.test.tsx`:
```tsx
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CompanyView from '@/app/snes/components/CompanyView';
import { buildIndex } from '@/lib/snes/library';
import type { Game } from '@/lib/snes/types';

const game = (slug: string, publisher: string, developers: string[], releasedUS: string): Game => ({
  slug, title: slug, releasedUS, datePrecision: 'month', developers, publisher, genres: [], players: null, chip: null, launchTitle: false,
  esrb: null, summary: null, scores: { aggregate: null, aggregateCount: 0, egm: null, nintendoPower: null, other: {} }, boxArt: null,
  media: { video: false, logo: false, box3d: false }, sources: { wikipedia: null, igdb: null },
});

test('a company page counts its games as developer and publisher and lays them on a timeline', () => {
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
  const games = buildIndex([game('a', 'konami', ['konami'], '1992-03'), game('b', 'nintendo', ['konami'], '1993-05'), game('c', 'konami', ['other'], '1993-06')]);
  render(<CompanyView company={{ slug: 'konami', name: 'Konami', aliases: ['Ultra Games'], country: null }} games={games} names={{ konami: 'Konami', nintendo: 'Nintendo', other: 'Other' }} />);
  expect(screen.getByRole('heading', { level: 1, name: 'Konami' })).toBeInTheDocument();
  expect(screen.getByText('Developed 2 games · published 2 games · also credited as Ultra Games')).toBeInTheDocument();
  expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/snes', '/snes/a', '/snes/b', '/snes/c']);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest __tests__/snes-company-page.test.tsx`
Expected: FAIL with "Cannot find module '@/app/snes/components/CompanyView'".

- [ ] **Step 3: Implement**

`app/snes/components/CompanyView.tsx`:
```tsx
import Link from 'next/link';
import type { Company } from '@/lib/snes/types';
import type { IndexGame } from '@/lib/snes/library';
import { gameCount } from '@/lib/snes/display';
import Timeline from './views/Timeline';
import { SoundProvider } from './sound';

// A studio or publisher: how many games it made and published, then those games on the same month timeline.
export default function CompanyView({ company, games, names }: { company: Company; games: IndexGame[]; names: Record<string, string> }) {
  const developed = games.filter((g) => g.developers.includes(company.slug)).length;
  const published = games.filter((g) => g.publisher === company.slug).length;
  const facts = [`Developed ${gameCount(developed)}`, `published ${gameCount(published)}`];
  if (company.aliases.length) facts.push(`also credited as ${company.aliases.join(', ')}`);
  return (
    <SoundProvider>
      <header className="s-company">
        <div className="eyebrow"><Link href="/snes">SNES</Link> · Studio &amp; publisher</div>
        <h1>{company.name}</h1>
        <p>{facts.join(' · ')}</p>
      </header>
      <Timeline games={games} names={names} />
    </SoundProvider>
  );
}
```

`app/snes/company/[slug]/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { Nav } from '../../../components/Nav';
import Footer from '../../../components/Footer';
import { getCompanies, getCompanyNames, getGames } from '@/lib/snes/data';
import { buildIndex } from '@/lib/snes/library';
import CompanyView from '../../components/CompanyView';
import '../../snes.css';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return getCompanies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const company = getCompanies().find((c) => c.slug === (await params).slug);
  return { title: company ? `${company.name} · SNES` : 'SNES', robots: { index: false, follow: false } };
}

export default async function CompanyPage({ params }: Params) {
  const { slug } = await params;
  const company = getCompanies().find((c) => c.slug === slug)!;
  const games = buildIndex(getGames()).filter((g) => g.publisher === slug || g.developers.includes(slug));
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <div className="s-wrap">
          <CompanyView company={company} games={games} names={getCompanyNames()} />
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest __tests__/snes-company-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'app/snes/company/[slug]/page.tsx' app/snes/components/CompanyView.tsx __tests__/snes-company-page.test.tsx
git commit -m "feat(snes): company pages"
```

---

### Task 13: Real-data render, docs and browser check

**Files:**
- Test: `__tests__/snes-real-data.test.tsx`
- Modify: `CLAUDE.md`
- Create: `.claude/launch.json` (static preview of `out/`) if it doesn't exist; otherwise add the configuration to it

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the real-data render test**

`__tests__/snes-real-data.test.tsx`:
```tsx
import React from 'react';
import fs from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import GameView from '@/app/snes/components/GameView';
import Library from '@/app/snes/components/Library';
import { getCompanyNames, getGames } from '@/lib/snes/data';
import { buildIndex, facets, neighbours } from '@/lib/snes/library';

// Every real game renders without gaps, and every image or clip it points at exists.
const games = getGames();
const index = buildIndex(games);
const names = getCompanyNames();
const pub = (p: string) => path.join(process.cwd(), 'public', p);

test('every game page renders with no undefined, NaN or missing files', () => {
  for (const game of games) {
    const { prev, next } = neighbours(index, game.slug);
    const html = renderToStaticMarkup(<GameView game={game} names={names} prev={prev} next={next} sameMonth={[]} />);
    expect(html).not.toMatch(/undefined|NaN|>null</);
    for (const m of html.matchAll(/(?:src|poster)="(\/snes\/[^"]+)"/g)) expect(fs.existsSync(pub(m[1]))).toBe(true);
  }
});

test('the server-rendered library stays inside the page budget', () => {
  const html = renderToStaticMarkup(<Library games={index} names={names} facets={facets(index, names)} />);
  expect(html.length).toBeLessThan(450_000);
  expect(html).toContain(`href="/snes/${index[0].slug}"`);
});
```

- [ ] **Step 2: Run it**

Run: `npx jest __tests__/snes-real-data.test.tsx`
Expected: PASS. Then act on any failure:
- **A failure naming a game** points to a real data or label bug. Fix the cause (a label or a data override), not the test.
- **The size check fails.** Trim per-tile markup first, for example by dropping the `decoding` attribute.
  - If it still fails, fall back as the spec allows: the server renders only the first year and the client renders the rest. Record that ruling.

- [ ] **Step 3: Run the whole suite, including the site build**

Run: `npm test > /tmp/snes-suite.log 2>&1; tail -5 /tmp/snes-suite.log`
Expected:
- All suites pass.
- `next build` generates `/snes`, all 717 `/snes/<slug>` pages and all company pages.

Then run: `ls out/snes | head; ls out/snes/company | wc -l; wc -c out/snes.html`
Expected:
- `out/snes.html` is under 600 KB (the spec's budget). Record the measured number.
- About 278 company files.

- [ ] **Step 4: Preview the built site in the browser**

Create `.claude/launch.json`, or add this entry to an existing one:
```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "snes-static", "runtimeExecutable": "python3", "runtimeArgs": ["-m", "http.server", "4321", "-d", "out"], "port": 4321 }
  ]
}
```

Then use `preview_start` with `name: "snes-static"` and check each item below, with screenshots:
1. `/snes.html` renders the hero, the filter bar and the timeline.
2. Hovering a tile plays its clip within about 300 ms, under the light scanlines. After one click on the page, the next hover is unmuted. Check this with `javascript_tool` reading `document.querySelector('.s-tile.is-playing video').muted === false`.
3. Each view tab works, and the URL changes, e.g. `?view=heatmap`. Clicking a heatmap month lands on that month in the timeline.
4. `/snes.html?publisher=konami&view=wall` reloads into the same state.
5. `/snes/f-zero.html` shows the logo, the booklet, and the Cover / 3D box / Gameplay switch. ▶ plays with sound.
6. `resize_window` to the mobile preset: no sideways scroll (`document.documentElement.scrollWidth <= innerWidth`), and tiles sit two across.
7. `resize_window` with `colorScheme: "dark"`: the page goes dark and the tiles stay screen-colored.

Reset the viewport with the `desktop` preset afterwards. Fix any issue found with a failing test first, where the behavior is testable, then re-run Step 3.

- [ ] **Step 5: Document `/snes` in CLAUDE.md**

Add this section to `CLAUDE.md`, directly after the `## /snes dataset` section:
````markdown
## /snes pages
Piece 2 (spec `docs/superpowers/specs/2026-10-11-snes-library-design.md`, plan `docs/superpowers/plans/2026-10-11-snes-library.md`).
**Unlinked and noindex** (`Disallow: /snes` in robots.txt, absent from the sitemap) until piece 3 ships; don't add a nav link before then.

- **Routes:**
  - `/snes`: hero, sticky filter bar and five views (Timeline · Heatmap · Wall · Shelf · Scatter).
  - `/snes/<slug>`: 717 instruction-booklet game pages.
  - `/snes/company/<slug>`: company pages.
  - All are static (`generateStaticParams`, `dynamicParams = false`).
- **Code:**
  - Logic lives in `lib/snes/library.ts`: index, filters, URL state, months, heatmap, scatter, neighbours. Labels live in `lib/snes/display.ts`. Both are tested.
  - Pages read `lib/snes/data.ts`, which client components never import. `/snes` passes a slim index (`buildIndex`) to the client `Library`.
- **URL state:** filters live in the query string (`?q=&year=&publisher=&developer=&chip=&scores=&launch=1&genre=&players=&sort=&view=&y=`). Invalid values are dropped, never an error.
- **Tiles and hover:**
  - Tiles are dark screen-colored cards.
  - Hover gives a purple glow, with **light** scanlines easing in. Wes found the heavier "arcade" scanlines too much, and rejected a power-on flicker, so don't reintroduce either.
  - After 300 ms of hover the game's 12-second clip plays in the tile. One plays at a time; there's none on touch or with reduced motion.
- **Sound:** on by default, but browsers block audio until the first click, tap or keypress, so hover clips are muted until then. The 🔊 button mutes, and a mute is stored as `localStorage` `snes-sound=off`.
- **Media:** clips, logos and 3D boxes come from Wes's media set via `npm run snes:media`, from `SNES_MEDIA_DIR` (default `../snes-media`).
  - **Never keep the media in `out/`;** every build wipes it.
  - Budgets: video at most 350 MB, each clip at most 600 KB, `public/snes` at most 600 MB. `snes-data.test.ts` enforces them, because GitHub Pages caps a site at 1 GB.
  - To pick a better moment for a clip, set `clipStart` (seconds) in `overrides.json`, then run `snes:media` and `snes:build`. Batch these changes: every re-encode adds to git history.
- **Not here yet:**
  - Manuals are paused for their own phase.
  - Toys (controller, blow-on-the-cart, Mode 7) are deferred.
  - Genre, players and summaries fill in once IGDB keys land; their controls stay hidden until the data exists.
````

- [ ] **Step 6: Commit**

```bash
git add __tests__/snes-real-data.test.tsx CLAUDE.md .claude/launch.json
git commit -m "test(snes): render every real game; docs for /snes pages"
```

- [ ] **Step 7: Do not merge or push**

`main` auto-deploys. Report the measured page size, the suite result and the screenshots to Wes. Integration is his call: he chose to ship pieces 1 and 2 together.

---

## Addendum (11 Oct 2026): IGDB extras

Wes supplied IGDB keys mid-run and chose these extras:
- series and similar games
- critic and player scores, shown separately
- themes, camera view, and co-op/versus

The dry run against the cached IGDB data (1,994 SNES games) matched 688 of 717 games. This addendum adds Tasks 3b and 5b and extends Tasks 8 and 11. **The order is 3 → 3b → 4 → (5, 6 already done) → 5b → 7 → …**

### Task 3b: IGDB data pass (fields, extras, aliases)

**Files:**
- Modify: `scripts/snes/fetch-igdb.mjs`, `lib/snes/types.ts`, `lib/snes/igdb.ts`, `lib/snes/build.ts`, `data/snes/aliases.json`
- Test: `__tests__/snes-igdb.test.ts`, `__tests__/snes-build.test.ts`, `__tests__/snes-data.test.ts`
- Regenerated: `data/snes/games.json`

**Interfaces:**
- **Produces, on `IgdbRaw`:**
  - `franchises?: { name: string }[]`, `collections?: { name: string }[]`, `similar_games?: number[]`
  - `themes?: { name: string }[]`, `player_perspectives?: { name: string }[]`
  - `aggregated_rating?`, `aggregated_rating_count?`, `rating?`, `rating_count?`
  - `multiplayer_modes[]` also gains `offlinecoop?: boolean`
- **Produces, on `IgdbFacts`:**
  - `series: string | null` (the first franchise's name, else the first collection's, else null)
  - `similarIds: number[]`, `themes: string[]`, `perspectives: string[]`
  - `coop: boolean` (any SNES-or-unspecified multiplayer mode with `offlinecoop` true, or `offlinecoopmax` ≥ 2)
  - `versus: boolean` (any such mode with `offlinemax` ≥ 2)
  - `critic: number | null`, `criticCount: number`. Rounded `aggregated_rating`, null under 3 ratings.
  - `players: number | null`, `playersCount: number`. Rounded `rating`, null under 3. Named `userScore` / `userCount` in code to avoid clashing with the existing `players` (head count) field.
- **Produces, on `Game`:**
  - `series: string | null`
  - `similar: string[]`: slugs of *our* games whose `sources.igdb` is in that game's `similarIds`, in the IGDB list's order, at most 6
  - `themes: string[]`, `perspectives: string[]`, `multiplayer: { coop: boolean; versus: boolean }`
  - `scores.critic: number | null`, `scores.criticCount: number`, `scores.users: number | null`, `scores.usersCount: number`
  - These fields always exist on built games, with empty, false or null when IGDB has nothing.
- `OVERRIDE_FIELDS` gains `series`, `themes`, `perspectives`, `multiplayer`. `SCORE_FIELDS` gains `critic`, `criticCount`, `users`, `usersCount`.

**Steps (TDD):**
1. **igdb tests.** Extend `__tests__/snes-igdb.test.ts` with failing tests:
   - `series` takes the franchise over the collection, and is null when neither exists
   - `coop`/`versus` from `multiplayer_modes`, ignoring other platforms' modes
   - `critic`/`userScore` follow the 3-rating floor
   - `themes`/`perspectives` are name lists
2. **Implement** the mapper changes in `lib/snes/igdb.ts` and the type changes in `lib/snes/types.ts`.
3. **Build tests.** Extend `__tests__/snes-build.test.ts` with failing tests:
   - `similar` resolves IGDB ids to our slugs, skips ids we don't have, caps at 6, and never includes the game itself
   - the new fields default when `igdb` is null
   - the new override and score fields are accepted, and unknown ones are still refused
4. **Implement** in `lib/snes/build.ts`. Resolve `similar` in a second pass, after all games exist, using a map from IGDB id to slug.
5. **Fetch the new fields.** Add the new fields to `FIELDS` in `fetch-igdb.mjs`: `franchises.name`, `collections.name`, `similar_games`, `themes.name`, `player_perspectives.name`, `aggregated_rating`, `aggregated_rating_count`, `rating`, `rating_count`, `multiplayer_modes.offlinecoop`. Then run `NODE_NO_WARNINGS=1 npm run -s snes:fetch:igdb -- --refresh`.
6. **Fix the unmatched titles.** Run `npm run -s snes:build` and read the "unmatched in IGDB" list (29 titles in the dry run). For each one, search `.snes-cache/igdb.json` by name and alternative names, and add `aliases.json` `"igdb": { "<slug>": <id> }`. Confirm each pick is the SNES release by checking its platforms or summary. List any title IGDB truly lacks in the report.
7. **Data tests.** Extend `__tests__/snes-data.test.ts`:
   - every `similar` slug exists and isn't the game itself
   - `scores.critic` and `scores.users` are in 0–100 or null
   - at least 650 games have genres
8. **Commit, then report coverage.** Commit code, then data. The report gives coverage for each new field: series, similar, themes, perspectives, coop, versus, critic, users.

### Task 5b: Library support for series, theme, camera and multiplayer

**Files:** Modify `lib/snes/library.ts`. Test `__tests__/snes-library.test.ts`.

**Interfaces:**
- `IndexGame` gains `series: string | null`, `themes: string[]`, `perspectives: string[]`, `coop: boolean`, `versus: boolean`, `critic: number | null` and `users: number | null`.
- `Filters` gains:
  - `series: string | null`, keyed by `slugify(series)`
  - `theme: string | null` (the theme name)
  - `camera: string | null` (the perspective name)
  - `mp: 'coop' | 'versus' | null`
- `Facets` gains `series: Facet[]` (only series with 2 or more games), `themes: string[]` and `perspectives: string[]`. `QueryContext` gains matching sets.
- URL keys: `series`, `theme`, `camera`, `mp`. Invalid values are dropped. `isFiltered` counts them.
- `SortKey` and `ScoreAxis` gain `critic` and `users`. `sortGames` and `scatterPoints` support them, with `users` and `critic` on 0–100 divided by 10 for the scatter.

**Steps (TDD):** add failing tests for each filter, for facets (series under 2 games omitted), and for the round-trip of the new URL keys and dropping of invalid ones. Then implement, run `npx jest __tests__/snes-library.test.ts`, and commit.

### Additions to Task 8 (filter bar)

- `FilterBar` renders four more selects, each only when its facet list is non-empty:
  - **Series** (`aria-label="Series"`, options `Name (count)`)
  - **Theme**
  - **Camera** (perspective names)
  - **Multiplayer** (options "Co-op", "Versus")
- The Sort select gains "Critic score" and "Player score".
- The test file adds a test that these controls appear when the index has the data and stay hidden otherwise.

### Additions to Task 11 (game page)

- **Booklet, What the magazines said:** when present, a first row reads "Critics" (`critic`, plus `(N reviews)`), then a row "Players" (`users`, plus `(N ratings)`). Both come before Nintendo Power.
- **Booklet, Specifications:** gains rows for Series (when present), Themes (joined with " · "), View (perspectives joined with " · ") and Multiplayer ("Co-op", "Versus", or "Co-op · Versus"). Each row appears only when it has a value.
- **GameView:**
  - Gains a **"More in the <series> series"** strip: up to 8 other games with the same `series`, in release order, using `GameTile`.
  - Gains an **"If you like <title>, try…"** strip built from `game.similar`, shown before "Also out in…".
  - Each strip is omitted when empty.
  - The page passes the extra lists: `seriesGames: IndexGame[]` and `similarGames: IndexGame[]`, both computed in `app/snes/[slug]/page.tsx` from the index.
- **Tests:** the full-page fixture adds `series`, `similar`, `themes`, `perspectives`, `multiplayer` and the critic and user scores, and asserts the new rows and strips. The bare fixture asserts that none of them render.
