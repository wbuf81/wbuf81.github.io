# LegCom-style homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild wesleybard.com's homepage in LegCom's design system (taped prints, featured build, Tetris in a print, GitHub map, light/dark), add `/design`, retire `/uses` and the extra games, redraw the favicon, and deploy.

**Architecture:** One global stylesheet (`app/design-system.css`: tokens on `:root` with dark twins, building blocks scoped under `.wb`) shared by the homepage, the header, the footer and `/design`. Project data moves out of `page.tsx` into `lib/projects.ts`; the page becomes a server component with two client islands (theme switch, Tetris print). Tetris game logic moves to `lib/tetris.ts` so it can be tested; the canvas component draws a contained board. The GitHub map is drawn from `data/github-contributions.json`, refreshed from GitHub's public contributions page at deploy time.

**Tech Stack:** Next.js 16 (app router, `output: 'export'`), React 19, styled-jsx where it already is, plain global CSS for the system, Jest 30 + Testing Library (jsdom), Node script for data, Python + fontTools for the favicon, GitHub Actions → Pages.

**Spec:** `docs/superpowers/specs/2026-10-03-legcom-style-homepage-design.md` (approved 3 Oct 2026, plus: redraw the favicon in Source Serif 4; `/uses` just 404s; daily refresh of the GitHub map).

**Visual source of truth:** the mockup canvas https://claude.ai/artifact/GLGp39JPxCKYSZ8dRwCRKd, artboard "Picked · A with A2's top"; its local file is `/private/tmp/claude-502/-Users-wbard-Vibecoding-personal-website/893f90b1-f733-442c-8ddd-a4ad3cb0dc86/scratchpad/canvas/project/Main.dc.html`. Its `<style>` block is the starting point for the stylesheet.

## Global Constraints

- Colours by token name only (`var(--accent)`), defined once in `app/design-system.css` with a dark twin in both dark blocks; every token is described in `TOKENS` on `/design`.
- Token values are LegCom's (`~/Vibecoding/legcom-platform/landing/css/legcom.css`), including `--ink-3` `#64707c` / `#7f8d9a`.
- Type: Source Serif 4 (titles, name, tile names, big figures), IBM Plex Sans (text), IBM Plex Mono (eyebrows, captions, tags, subtitles).
- Theme: three-way switch Light · Match my computer · Dark, `localStorage` key `wb-theme`, applied before first paint.
- Photos in full colour; no grayscale filters anywhere on the homepage.
- Public copy names no client, vendor, brokerage or figure (no Meta, LexSynergy, Merrill, domain counts); WBDB's copy has no digits; tiles say what a thing does and what it runs on, never repo statistics.
- Works at 390 px with no sideways scroll, as well as 1280 / 1440.
- `prefers-reduced-motion`: no tape-dot breathing, no Tetris auto-play animation.
- Static export: no server code at request time.
- `/health`, `/lee`, `/moonballs`, `/playground`, `/articles` keep their own page styles.
- Work on branch `redesign/legcom-style`; merge to `main` and push only after the final review (Wes approved the deploy).

## Review Focus

1. **Keyboard while playing Tetris:** arrows and space must not scroll the page while playing, and must scroll normally when not playing (Task 6 test).
2. **Theme before paint and after reload:** a saved "dark" must apply before React hydrates, and "Match my computer" must clear the saved choice (Task 2 test).
3. **Phone width:** the hero prints, the GitHub map and tiles must not cause a sideways scroll at 390 px (Task 10 screenshot check plus `overflow-x` assertion).
4. **GitHub data fetch failing in CI:** the build must still succeed with the committed data, never a blank map (Task 5 test).
5. **Shared class names leaking into other pages:** global blocks are scoped under `.wb`, so `/lee`'s styled-jsx classes are untouched (Task 2 test asserts every block selector starts with `.wb`).

---

### Task 1: Retire `/uses` and its helpers

**Files:**
- Delete: `app/uses/` (all), `lib/uses.ts`, `types/uses.ts`, `data/uses.json`, `lib/github.ts`, `lib/metadata-fetcher.ts`, `__tests__/uses.test.ts`, `__tests__/github.test.ts`, `__tests__/components.test.tsx`
- Modify: `__tests__/data-validation.test.ts` (drop the `uses.json` describe block and its import, keep "Articles data validation"), `public/sitemap.xml` (drop the `/uses` url)

**Interfaces:** none produced.

- [ ] **Step 1:** Create the branch: `git checkout -b redesign/legcom-style`.
- [ ] **Step 2:** Delete the files above with `git rm -r`.
- [ ] **Step 3:** Edit `__tests__/data-validation.test.ts`: remove `import { UsesData, UsesItem } from '@/types/uses';` and the whole `describe('Data file validation', …)` block that reads `data/uses.json`; keep the articles block.
- [ ] **Step 4:** Remove the `/uses` `<url>` from `public/sitemap.xml`.
- [ ] **Step 5:** Run `npx jest` → all remaining suites pass; `grep -rn "uses" app lib types __tests__ | grep -v health` shows no references to the removed modules.
- [ ] **Step 6:** Commit: `git commit -m "chore: retire /uses and its admin helpers"`.

### Task 2: Design system foundation (fonts, tokens, theme)

**Files:**
- Create: `app/design-system.css`, `app/components/ThemeSwitch.tsx`, `lib/theme.ts`, `__tests__/design-system.test.ts`, `__tests__/theme-switch.test.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties `--bg --paper --ink --ink-2 --ink-3 --rule --rule-soft --accent --accent-soft --accent-deep --on-accent --core --tape --screen --screen-ink --screen-ink-2 --h0 --h1 --h2 --h3 --h4 --serif --sans --mono`; block classes under `.wb` (`.wb-head`, `.wrap`, `.eyebrow`, `.stats`, `.tag`, `.btn`, `.print`, `.cap`, `.tape`, `.tiles`, `.tile`, `.tb`, `.feat`, `.fpanel`, `.chip`, `.card`, `.ch`, `.heat*`, `.wb-foot`).
- Produces: `lib/theme.ts` → `export type ThemeMode = 'light' | 'auto' | 'dark'; export const THEME_KEY = 'wb-theme'; export function readMode(): ThemeMode; export function applyMode(mode: ThemeMode): void; export const THEME_BOOT_SCRIPT: string`.
- Produces: `<ThemeSwitch />` (client) rendering `div.theme[role=group][aria-label="Colour theme"]` with three buttons labelled "Light", "Match my computer", "Dark", `aria-pressed` on the current one.

- [ ] **Step 1: Write the failing tests.** `__tests__/theme-switch.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSwitch from '@/app/components/ThemeSwitch';
import { THEME_KEY } from '@/lib/theme';

beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-theme'); });

test('dark sets the attribute and remembers it', () => {
  render(<ThemeSwitch />);
  fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
});

test('match my computer clears the saved choice', () => {
  localStorage.setItem(THEME_KEY, 'light');
  document.documentElement.setAttribute('data-theme', 'light');
  render(<ThemeSwitch />);
  fireEvent.click(screen.getByRole('button', { name: 'Match my computer' }));
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  expect(localStorage.getItem(THEME_KEY)).toBeNull();
});

test('starts from the saved choice', () => {
  localStorage.setItem(THEME_KEY, 'light');
  render(<ThemeSwitch />);
  expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
});
```

`__tests__/design-system.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(process.cwd(), 'app/design-system.css'), 'utf8');
function block(selector: string): string {
  const i = css.indexOf(selector);
  if (i < 0) throw new Error(`missing ${selector}`);
  const open = css.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === '{') depth++;
    if (css[j] === '}' && --depth === 0) return css.slice(open + 1, j);
  }
  throw new Error('unbalanced');
}
const names = (s: string) => Array.from(s.matchAll(/(--[a-z0-9-]+)\s*:/g), (m) => m[1]);
const FONT_ONLY = ['--serif', '--sans', '--mono'];

test('every colour token has a dark twin in both dark blocks', () => {
  const light = names(block(':root {')).filter((n) => !FONT_ONLY.includes(n));
  const media = names(block(':root:not([data-theme="light"]) {'));
  const forced = names(block(':root[data-theme="dark"] {'));
  expect(light.length).toBeGreaterThan(15);
  for (const n of light) {
    expect(media).toContain(n);
    expect(forced).toContain(n);
  }
});

test('the two dark blocks agree', () => {
  expect(block(':root:not([data-theme="light"]) {').replace(/\s+/g, ''))
    .toBe(block(':root[data-theme="dark"] {').replace(/\s+/g, ''));
});

test('blocks are scoped under .wb so other pages are untouched', () => {
  const body = css.replace(/@media[^{]*\{/g, '').replace(/@keyframes[\s\S]*?\}\s*\}/g, '');
  const selectors = Array.from(body.matchAll(/(^|\})\s*([^{}@]+)\{/g), (m) => m[2].trim()).filter(Boolean);
  for (const sel of selectors) {
    for (const part of sel.split(',')) {
      const p = part.trim();
      if (p.startsWith(':root') || p === 'html' || p === 'body') continue;
      expect(p.startsWith('.wb')).toBe(true);
    }
  }
});
```

- [ ] **Step 2:** Run `npx jest __tests__/theme-switch.test.tsx __tests__/design-system.test.ts` → FAIL (modules and file missing).
- [ ] **Step 3: `lib/theme.ts`:**

```ts
export type ThemeMode = 'light' | 'auto' | 'dark';
export const THEME_KEY = 'wb-theme';

export function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function applyMode(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  try {
    if (mode === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
}

// Runs in <head> before first paint, so a saved theme never flashes.
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
```

- [ ] **Step 4: `app/components/ThemeSwitch.tsx`:** a client component holding `mode` in state (initialised to `'auto'`, set from `readMode()` in `useEffect`), rendering LegCom's pill: `<div className="theme" role="group" aria-label="Colour theme">` with three `<button type="button" aria-label=… aria-pressed=…>` holding LegCom's sun / half-circle / moon SVGs (copy the `<svg>` markup from `legcom-platform/landing/index.html`), and LegCom's hover card `<span className="tip" role="tooltip">` ("Theme" · "Light, dark, or match your computer." · "The sun is light, the moon is dark, and the middle one follows your computer's setting. Your choice is saved in this browser."). Click → `applyMode(m); setMode(m)`.
- [ ] **Step 5: `app/design-system.css`:** tokens on `:root` (light), `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }`, `:root[data-theme="dark"] { … }` with identical dark values; then `color-scheme` per theme; then every block from the mockup's `<style>`, rewritten from `.wb .x` selectors as `.wb .x` (keep the `.wb` scope; the root wrapper of the homepage, `/design`, the header and the footer carry `className="wb"`). Token values: copy LegCom's for `--bg … --core`; `--tape: rgba(255,226,150,.72)` / `rgba(224,176,90,.40)`; `--screen: #121a22` and `--screen-ink: #e6ebf0`, `--screen-ink-2: #8d9aa7` in both themes; `--h0..--h4` light `#e4e9ee #b6d6de #78afbd #3a8095 #0f4c5c`, dark `#26313b #1d4550 #2b6a79 #4f9aac #8fd0de`; `--serif: var(--font-serif), Georgia, serif; --sans: var(--font-sans), "Helvetica Neue", Arial, sans-serif; --mono: var(--font-mono), Menlo, Consolas, monospace` (light block only). Do **not** include the mockup's grayscale filters. Add `@media (prefers-reduced-motion: reduce)` turning off `.wb .pill.on i` animation and print transitions.
- [ ] **Step 6: `app/layout.tsx`:** add `Source_Serif_4` (`weight: ['500','600']`, `style: ['normal','italic']`, `variable: '--font-serif'`), `IBM_Plex_Sans` (`weight: ['400','500','600']`, `variable: '--font-sans'`), `IBM_Plex_Mono` (`weight: ['400','500']`, `variable: '--font-mono'`) from `next/font/google`, all `display: 'swap'`, `subsets: ['latin']`; keep Playfair and Outfit (other pages use them). Put all five variables on `<html>`, add `suppressHydrationWarning` to `<html>`, add `<script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />` first in `<head>`, `import './design-system.css'` after `globals.css`. Change `theme-color` to `#0f4c5c`.
- [ ] **Step 7:** Run the two test files → PASS. Run `npx jest` → all pass.
- [ ] **Step 8:** Commit: `feat: add the design system tokens, fonts and theme switch`.

### Task 3: Header and footer

**Files:**
- Modify: `app/components/Nav.tsx`
- Create: `app/components/Footer.tsx`, `__tests__/chrome.test.tsx`

**Interfaces:**
- Consumes: `ThemeSwitch` (Task 2), `.wb-head` / `.wb-foot` styles.
- Produces: `export function Nav()` (unchanged export, new look), `export default function Footer()`.

- [ ] **Step 1: Failing test** `__tests__/chrome.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
import { Nav } from '@/app/components/Nav';
import Footer from '@/app/components/Footer';

test('header has the wordmark, the two links and the theme switch', () => {
  render(<Nav />);
  expect(screen.getByRole('link', { name: 'Wesley Bard' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/#projects');
  expect(screen.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '/#connect');
  expect(screen.getByRole('group', { name: 'Colour theme' })).toBeInTheDocument();
});

test('footer links LinkedIn, GitHub and the design system', () => {
  render(<Footer />);
  expect(screen.getByRole('link', { name: /Design system/ })).toHaveAttribute('href', '/design');
  expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/wesleybard/');
  expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/wbuf81');
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Rewrite `Nav.tsx`: `<header className="wb wb-head"><div className="in">` with `<Link href="/" className="brand" aria-label="Wesley Bard"><span className="wm">Wesley <i>Bard</i></span></Link>`, `<nav className="nav" aria-label="Main">` with Projects (`/#projects`) and Connect (`/#connect`) keeping the existing smooth-scroll on the homepage, and `<div className="tools"><ThemeSwitch /></div>`. Drop the hamburger: the bar wraps on a phone (`flex-wrap`). Remove the old styled-jsx block. Keep the export name `Nav` (used by `/lee` and `/articles`).
- [ ] **Step 4:** Create `Footer.tsx`: `<footer className="wb wb-foot"><div className="in"><span><span className="wmk">Wesley <i>Bard</i></span> · © {year}</span><nav aria-label="Footer">` LinkedIn →, GitHub →, `<Link href="/design">Design system →</Link>`; `year = new Date().getFullYear()` (build time, static).
- [ ] **Step 5:** Run → PASS; `npx jest` all pass.
- [ ] **Step 6:** Commit: `feat: restyle the header and add the footer`.

### Task 4: Project data

**Files:**
- Create: `lib/projects.ts`, `__tests__/projects.test.ts`, `public/agents/lucy.jpg` (from `~/Vibecoding/legcom-platform/landing/images/lucy-header.jpg`, 800 px wide JPEG), `public/projects/wbdb-lab.jpg` (from the scratchpad `assets/work-wbdb-lab.jpg`), `public/projects/omafinance.svg` (from scratchpad `assets/projects-omafinance.svg`)

**Interfaces:**
- Produces:

```ts
export interface Hardware { label: string; href: string; image: string }
export interface Project {
  key: string; name: string; kind: string; subtitle: string; description: string;
  badge: 'Private repo' | 'Open source'; image: string; alt: string;
  fit: 'photo' | 'shot' | 'board'; href?: string; hardware?: Hardware; group?: string;
}
export interface Placed extends Project { tilt: number; tapes: Tape[] }
export interface Tape { left: string; top: string; width: string; angle: string }
export const AGENTS: Project[];   // OSCAR … BEASLEY, LUCY (8)
export const TOOLS: Project[];    // WBDB (1)
export const PERSONAL: Project[]; // 9, each with group
export const GROUPS: readonly ['Omarchy Linux', 'Microcontrollers', 'Everything else'];
export const FEATURED: string;    // 'neo'
export function place(list: Project[], start: number): Placed[];
export function personalGroups(): { label: string; items: Placed[] }[]; // featured left out, positions continue after agents + tools
export function featured(): Project;
export function spelled(n: number): string; // 1–20 in words, capitalised by caller
export function buildCounts(): { work: number; home: number };
```

- [ ] **Step 1: Failing test** `__tests__/projects.test.ts`:

```ts
import fs from 'fs';
import path from 'path';
import { AGENTS, TOOLS, PERSONAL, GROUPS, FEATURED, place, personalGroups, featured, spelled, buildCounts } from '@/lib/projects';

const all = [...AGENTS, ...TOOLS, ...PERSONAL];

test('every tile is complete and its picture exists', () => {
  for (const p of all) {
    expect(p.name && p.subtitle && p.description && p.badge && p.alt).toBeTruthy();
    expect(fs.existsSync(path.join(process.cwd(), 'public', p.image))).toBe(true);
    if (p.hardware) expect(fs.existsSync(path.join(process.cwd(), 'public', p.hardware.image))).toBe(true);
  }
});

test('the new tiles are there', () => {
  expect(AGENTS.map((a) => a.name)).toEqual(['OSCAR', 'SMORES', 'MAISIE', 'SNOOP', 'RHINO', 'PABSTY', 'BEASLEY', 'LUCY']);
  expect(TOOLS.map((t) => t.name)).toEqual(['WBDB']);
  expect(PERSONAL.find((p) => p.name === 'OmaFinance')).toMatchObject({ group: 'Omarchy Linux', badge: 'Private repo' });
});

test('public copy rules', () => {
  const wbdb = TOOLS[0];
  expect(`${wbdb.subtitle} ${wbdb.description}`).not.toMatch(/\d/);
  for (const p of all) expect(`${p.subtitle} ${p.description}`).not.toMatch(/\b(Meta|LexSynergy|Merrill|OneTrust|SharePoint)\b/);
});

test('featured is a real personal project and is left out of its group', () => {
  expect(PERSONAL.some((p) => p.key === FEATURED)).toBe(true);
  expect(featured().key).toBe(FEATURED);
  const grouped = personalGroups().flatMap((g) => g.items.map((i) => i.key));
  expect(grouped).not.toContain(FEATURED);
  expect(personalGroups().map((g) => g.label)).toEqual([...GROUPS]);
});

test('placing tiles follows the tilt and tape pattern', () => {
  const placed = place(AGENTS, 0);
  expect(placed[0].tilt).toBe(-2.6);
  expect(placed[1].tapes).toHaveLength(2);   // null pattern → two corner tapes
  expect(placed[0].tapes).toHaveLength(1);
});

test('counts for the strip', () => {
  expect(buildCounts()).toEqual({ work: 9, home: 9 });
  expect(spelled(9)).toBe('nine');
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Write `lib/projects.ts`: move the existing `REPO_CARDS` / `PERSONAL_CARDS` text from `app/page.tsx` verbatim into `AGENTS` / `PERSONAL` (keys: oscar, smores, maisie, snoop, rhino, pabsty, beasley; spotify, knobdeck, aac, neo, daisy, gbforge, idle, labels), add LUCY, WBDB and OmaFinance with the spec's copy, kinds (`Bernese mountain dog`, `Schnoodle`, `Tabby cat`, `Detective beagle`, `Rhinoceros`, `British shorthair`, `Aussiedoodle`, `Pit and lab mix`; WBDB `The lab`; personal kinds as in the mockup data), alts as in the mockup. `fit`: agents `photo`, screenshots `shot`, the AAC device `board`. Idle Screen Counter's picture: download `https://raw.githubusercontent.com/wbuf81/omarchy-idle-screencounter/main/preview.png` to `public/projects/omarchy-idle-screencounter.jpg` (800 px JPEG) so nothing is hotlinked. `TILT = [-2.6, 1.9, -1.3, 2.9, 2.2, -3, 1.4, -2.1]`, `TAPE = [[38,-4,74], null, [56,-7,66], [30,3,88], null, [22,8,78], null, [34,4,68]]`; `place()` maps index `start + i` to `tilt` and `tapes` (null → `[{left:'-18px',top:'-6px',width:'56px',angle:'-38deg'},{left:'calc(100% - 38px)',top:'-6px',width:'56px',angle:'38deg'}]`, else `[{left:`${l}%`,top:'-10px',width:`${w}px`,angle:`${a}deg`}]`). `personalGroups()` starts at `AGENTS.length + TOOLS.length`. `spelled()` covers zero–twenty.
- [ ] **Step 4:** Copy the three images into `public/` as listed.
- [ ] **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit: `feat: move project data to lib/projects and add LUCY, WBDB, OmaFinance`.

### Task 5: GitHub contributions data

**Files:**
- Create: `lib/githubContributions.ts`, `scripts/github-contributions.mjs`, `data/github-contributions.json`, `__tests__/github-contributions.test.ts`
- Modify: `.github/workflows/deploy.yml`, `package.json` (script `github:contributions`)

**Interfaces:**
- Produces:

```ts
export interface Contributions { user: string; from: string; to: string; levels: string }
export function parseContributionsHtml(html: string): { from: string; to: string; levels: string };
export interface MapCell { date: string; level: number }
export interface MonthLabel { col: number; label: string }
export function buildMap(c: Contributions): { cells: MapCell[]; months: MonthLabel[]; weeks: number };
```

- [ ] **Step 1: Failing test:**

```ts
import data from '@/data/github-contributions.json';
import { parseContributionsHtml, buildMap } from '@/lib/githubContributions';

const td = (date: string, level: number) => `<td data-date="${date}" id="x" data-level="${level}" class="ContributionCalendar-day"></td>`;

test('parses GitHub public calendar cells in date order', () => {
  const html = td('2026-01-02', 3) + td('2026-01-01', 0) + td('2026-01-03', 4) + '<span data-level="2" class="legend"></span>';
  expect(parseContributionsHtml(html)).toEqual({ from: '2026-01-01', to: '2026-01-03', levels: '034' });
});

test('rejects gaps and junk', () => {
  expect(() => parseContributionsHtml(td('2026-01-01', 0) + td('2026-01-03', 1))).toThrow(/gap/);
  expect(() => parseContributionsHtml('<html></html>')).toThrow(/no days/);
});

test('the committed file is a year of 0–4 levels, one per day', () => {
  expect(data.levels).toMatch(/^[0-4]+$/);
  const days = Math.round((Date.parse(data.to) - Date.parse(data.from)) / 86400000) + 1;
  expect(data.levels.length).toBe(days);
  expect(days).toBeGreaterThanOrEqual(364);
});

test('buildMap lays days into Sunday-first weeks with month labels', () => {
  const m = buildMap({ user: 'x', from: '2025-09-28', to: '2025-10-11', levels: '01234000000000' });
  expect(m.weeks).toBe(2);
  expect(m.cells[0]).toEqual({ date: '2025-09-28', level: 0 });
  expect(m.months.map((x) => x.label)).toEqual(['Oct']);
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `lib/githubContributions.ts`: regex `/data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="([0-4])"/g`, sort by date, verify each day is the previous + 1 (UTC date maths) else throw `gap at <date>`, none → throw `no days`. `buildMap`: pad the start back to its Sunday with `-1` cells omitted (GitHub already starts on a Sunday; if `from` isn't one, leave empty leading cells `{date:'', level:-1}`), `weeks = Math.ceil(cells/7)`, a month label at the first week whose first day starts a new month, dropping the first label if the second is under 3 columns away.
- [ ] **Step 4:** Implement `scripts/github-contributions.mjs` (Node ≥ 22 strips the TypeScript import, as `add-health-week.mjs` does): fetch `https://github.com/users/wbuf81/contributions`, parse, write `data/github-contributions.json` as `{ user, from, to, levels }` with a trailing newline. On any error print `warning: GitHub contributions not refreshed (<reason>); using the committed file` and exit 0.
- [ ] **Step 5:** Run the script once to create the committed file; run the tests → PASS.
- [ ] **Step 6:** Workflow: add `schedule: - cron: '23 10 * * *'` under `on:` and a step `- name: Refresh the GitHub map` / `run: node scripts/github-contributions.mjs` before "Build". Add `"github:contributions": "node scripts/github-contributions.mjs"` to `package.json`.
- [ ] **Step 7:** Commit: `feat: draw the GitHub map from public contribution data`.

### Task 6: Tetris in a print

**Files:**
- Create: `lib/tetris.ts`, `app/components/home/TetrisBoard.tsx`, `__tests__/tetris.test.ts`
- Delete: `app/components/TetrisBackground.tsx`, `app/components/MsPacManBackground.tsx`, `app/components/GalagaBackground.tsx`

**Interfaces:**
- Produces from `lib/tetris.ts`: `COLS`, `ROWS`, `POINTS`, `PIECES`, `WALL_KICKS`, `I_WALL_KICKS`, types `TetrisState`, `ActivePiece`, and the pure helpers `createEmptyGrid`, `getShape`, `collides`, `lockPiece`, `findFullRows`, `clearRows`, `ghostY`, `fillBag`, `spawnPiece`, `computeAiTarget`, `evaluateGrid`, plus `isGameKey(key: string): boolean` (`ArrowLeft ArrowRight ArrowDown ArrowUp` and space).
- Produces `TetrisBoard` (client): `forwardRef<TetrisHandle, { onStateChange?(s: { isPlaying: boolean; score: number; lines: number }): void }>`, `TetrisHandle = { togglePlay(): void }`. It fills its parent box (the print's screen sets the size).

- [ ] **Step 1: Failing test:**

```ts
import { createEmptyGrid, lockPiece, findFullRows, clearRows, collides, getShape, POINTS, ROWS, COLS, isGameKey } from '@/lib/tetris';

test('a full row is found and cleared, rows above drop', () => {
  const g = createEmptyGrid();
  g[ROWS - 1] = Array(COLS).fill(1);
  g[ROWS - 2][0] = 2;
  expect(findFullRows(g)).toEqual([ROWS - 1]);
  clearRows(g, [ROWS - 1]);
  expect(g[ROWS - 1][0]).toBe(2);
  expect(g[0].every((c) => c === null)).toBe(true);
});

test('pieces collide with walls and the stack', () => {
  const g = createEmptyGrid();
  const o = getShape(1, 0);
  expect(collides(g, o, -1, 0)).toBe(true);
  expect(collides(g, o, 0, ROWS - 2)).toBe(false);
  lockPiece(g, { type: 1, rotation: 0, x: 0, y: ROWS - 2 });
  expect(collides(g, o, 0, ROWS - 3)).toBe(true);
});

test('scoring table and game keys', () => {
  expect(POINTS).toEqual([0, 100, 300, 500, 800]);
  expect(isGameKey(' ')).toBe(true);
  expect(isGameKey('Tab')).toBe(false);
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Create `lib/tetris.ts` by moving lines 1–325 of `TetrisBackground.tsx` (constants, pieces, kicks, types, helpers) and exporting them; drop `COLORS_*` and `GRID_COLOR` (they move to the board); add `isGameKey`.
- [ ] **Step 4:** Create `TetrisBoard.tsx` from the rest of `TetrisBackground.tsx`, importing from `lib/tetris`, with these changes: the wrapper is `position: relative; width: 100%; height: 100%`; the canvas has no opacity changes (delete every `style.opacity` line); `resize()` sizes the board to the wrapper (`cs = Math.floor(Math.min(rect.height / ROWS, rect.width / COLS))`) and uses a `ResizeObserver` on the wrapper as well as `window` resize; palette `playing ? VIVID : DIM` with `VIVID = ['#06b6d4','#eab308','#a855f7','#22c55e','#ef4444','#3b82f6','#f97316']`, `DIM = ['#556170','#5e6a78','#4b5664','#586472','#515c6a','#5a6674','#4f5a68']`; grid lines `rgba(255,255,255,0.045)`; the board outline when playing `rgba(255,255,255,0.14)`; remove the NEXT preview; overlay text colours `#e6ebf0` / `#9aa7b3` and fonts read once from `getComputedStyle(wrapper).getPropertyValue('--serif')` / `'--sans'`; the key handler uses `isGameKey`; under `matchMedia('(prefers-reduced-motion: reduce)')` the loop draws but skips `update()` while in auto mode.
- [ ] **Step 5:** Delete the three old game components. Run `npx jest` → PASS (page.tsx still imports them until Task 7; do Task 7 before running `next build`).
- [ ] **Step 6:** Commit: `refactor: Tetris logic into lib/tetris and a contained board; drop Ms. Pac-Man and Galaga`.

### Task 7: The homepage

**Files:**
- Create: `app/components/home/Print.tsx`, `ProjectTile.tsx`, `FeaturedBuild.tsx`, `ThenNowStill.tsx`, `GitHubMap.tsx`, `TetrisPrint.tsx`, `__tests__/home.test.tsx`
- Rewrite: `app/page.tsx`

**Interfaces:**
- Consumes: `lib/projects` (Task 4), `lib/githubContributions` + `data/github-contributions.json` (Task 5), `TetrisBoard` (Task 6), `Nav` / `Footer` (Task 3).
- Produces: `<Print image alt caption={[left,right]} tilt tapes fit className? href? />`, `<ProjectTile project={Placed} footer?: boolean />`, `<FeaturedBuild project={Project} />`, `<ThenNowStill counts={{work,home}} />`, `<GitHubMap data={Contributions} />`, `<TetrisPrint />`.

- [ ] **Step 1: Failing test** `__tests__/home.test.tsx`:

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProjectTile from '@/app/components/home/ProjectTile';
import TetrisPrint from '@/app/components/home/TetrisPrint';
import GitHubMap from '@/app/components/home/GitHubMap';
import data from '@/data/github-contributions.json';
import { place, PERSONAL, TOOLS } from '@/lib/projects';

beforeAll(() => {
  // jsdom has no canvas
  HTMLCanvasElement.prototype.getContext = jest.fn(() => new Proxy({}, { get: () => jest.fn() })) as never;
  (global as any).ResizeObserver = class { observe() {} disconnect() {} };
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
});

test('a personal tile shows its badge, board link and GitHub link', () => {
  const p = place(PERSONAL.filter((x) => x.key === 'knobdeck'), 0)[0];
  render(<ProjectTile project={p} footer />);
  expect(screen.getByRole('heading', { name: 'Knobdeck' })).toBeInTheDocument();
  expect(screen.getByText('Open source')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Waveshare/ })).toHaveAttribute('href', 'https://www.waveshare.com/esp32-s3-knob-touch-lcd-1.8.htm');
  expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/wbuf81/esp32-knobdeck');
});

test('a private tile has no GitHub link', () => {
  render(<ProjectTile project={place(TOOLS, 0)[0]} />);
  expect(screen.queryByRole('link', { name: /GitHub/ })).toBeNull();
  expect(screen.getByText('Private repo')).toBeInTheDocument();
});

test('Play turns into Stop, and keys only stop scrolling while playing', () => {
  render(<TetrisPrint />);
  const before = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
  act(() => { window.dispatchEvent(before); });
  expect(before.defaultPrevented).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: /Play/ }));
  expect(screen.getByRole('button', { name: /Stop/ })).toBeInTheDocument();
});

test('the GitHub map draws one cell per day', () => {
  const { container } = render(<GitHubMap data={data} />);
  expect(container.querySelectorAll('.heat i[data-date]').length).toBe(data.levels.length);
  expect(screen.getByText('Most projects are in private repositories.')).toBeInTheDocument();
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Build the components to the mockup's markup and class names (the `.wb` blocks from Task 2): `Print` (tape spans with inline `left/top/width/transform`, `img.ph` with `ph shot` / `ph board` by `fit`, `.cap` with two spans; `<a>` when `href` is given, else `<div>`); `ProjectTile` (`article.tile` → `Print` + `.tb` with `h3`, `.tag`, `.fn`, `p`, and when `footer` the `.tf` row: hardware link with its thumbnail or the kind in `.fine`, `GitHub →` when `href`); `FeaturedBuild` (`article.feat` with the "Featured build" + badge tags, `h2`, `.fn`, description, `a.btn` "View on GitHub →", "Runs on" hardware link, chips — the chips are a `chips?: string[]` field on the project, set for Stream Deck Neo: Claude Code sessions, Codex tasks, Spotify, Stocks, Weather, Football, Machine vitals; and for Knobdeck: Music, seven visualisers · Teams mic and camera); `ThenNowStill` (`.stats` with the three cells; third cell `` `${cap(spelled(work))} builds at work, ${spelled(home)} at home` ``); `GitHubMap` (`section.ch` per the mockup, `i` cells with `className={`l${level}`}` and `data-date`, `title` "3 Oct 2026"); `TetrisPrint` (client: `.duo` wrapper with the arcade print — `.screen` holding a fixed-size box `width: 129px; height: 259px` around `TetrisBoard`, `.hud` with Score / Lines in an `aria-live="polite"` region, caption `Tetris` or `Arrows · space drops` while playing, `button.btn.sm` Play / Stop calling `ref.current.togglePlay()` — and the headshot print `/headshot-thumb.jpg`, caption "Wesley Bard" · "Newfold Digital").
- [ ] **Step 4:** Rewrite `app/page.tsx` as a server component: `<Nav />`, `<main className="wb"><div className="wrap">` hero section (eyebrow, `h1.name`, `<TetrisPrint />`), `<ThenNowStill counts={buildCounts()} />`, `<FeaturedBuild project={featured()} />`, Work (`#projects`) with the two groups, Personal with `personalGroups()` (tiles with `footer`), `<GitHubMap data={contributions} />`, the four cards (`#connect`), `</div></main><Footer />`. Keep `INTEREST_CARDS` copy and the Connect sentence verbatim.
- [ ] **Step 5:** Run `npx jest` → PASS; run `npm run build` → succeeds.
- [ ] **Step 6:** Commit: `feat: rebuild the homepage in the LegCom style`.

### Task 8: `/design`

**Files:**
- Create: `app/design/page.tsx`, `app/design/tokens.ts`
- Modify: `__tests__/design-system.test.ts`, `public/sitemap.xml` (add `/design`)

**Interfaces:**
- Produces: `export const TOKENS: { name: string; job: string; group: 'Surfaces'|'Ink'|'Accent'|'Meaning'|'Prints'|'Arcade'|'GitHub map' }[]`.

- [ ] **Step 1: Failing test** (append to `design-system.test.ts`):

```ts
import { TOKENS } from '@/app/design/tokens';
test('every colour token is described on /design', () => {
  const light = names(block(':root {')).filter((n) => !FONT_ONLY.includes(n));
  expect(TOKENS.map((t) => t.name).sort()).toEqual([...light].sort());
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Write `tokens.ts` (one entry per token with its job, e.g. `--bg` "The page", `--paper` "Cards, the header, prints", `--tape` "Tape on a print", `--screen` "Tetris's screen, dark in both themes", `--h0`…`--h4` "GitHub map, none → most").
- [ ] **Step 4:** Write `app/design/page.tsx` (metadata title "Design system · Wesley Bard"): `<Nav />`, `<main className="wb"><div className="wrap">` with eyebrow "Design system", `h1` "How wesleybard.com is built.", lede; sections Colour (swatches from `TOKENS`, each `i` with `background: var(<name>)`, the light · dark values read from the CSS at build time with `fs` so they never drift), Type (the scale), The header (a live `<ThemeSwitch />`), Building blocks (buttons, tags, chips, the stat strip, a `Print`, a `ProjectTile` of LUCY, a `FeaturedBuild`, the `TetrisPrint`, a `GitHubMap`, link cards), Writing (the spec's rules as `ul`), Using it on a page; `<Footer />`.
- [ ] **Step 5:** Run → PASS; `npm run build` succeeds and emits `out/design.html`.
- [ ] **Step 6:** Commit: `feat: add the /design page`.

### Task 9: Favicon in Source Serif 4

**Files:**
- Create: `scripts/og/build-favicon.py`, `scripts/og/source-serif-4-semibold.woff2`
- Modify: `app/icon.svg`, `public/icon-192.svg`, `public/icon-512.svg`

- [ ] **Step 1:** Download Source Serif 4 SemiBold (600) as woff2 from the Google Fonts CSS API (`https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600` with a modern browser User-Agent) into `scripts/og/source-serif-4-semibold.woff2`.
- [ ] **Step 2:** Write `build-favicon.py` (fontTools + brotli): load the font, take the `W` glyph via `SVGPathPen`, compute its bounds, and write all three SVGs with the existing frame (ink `#14130f` rounded square, `rx` 6 / 36 / 96 at 32 / 192 / 512, glyph `#f6f4ef`, glyph width 62 % of the square, centred on its bounds), with the same comment explaining why it's an outline.
- [ ] **Step 3:** Run it (`python3 -m venv` in the scratchpad, `pip install fonttools brotli`), render `app/icon.svg` at 16 px and 512 px (`qlmanage -t -s 16` / `-s 512`) and look at both.
- [ ] **Step 4:** Commit: `feat: redraw the favicon in Source Serif 4`.

### Task 10: Docs, full check, review, deploy

**Files:**
- Modify: `CLAUDE.md`, `app/layout.tsx` (only if metadata needs `/design`), none else.

- [ ] **Step 1:** Update `CLAUDE.md`: Key files (lib/projects.ts, the design system, `/design`, the components), replace the grayscale and "3-up agent-grid" rules with the print/tile rules, add the design-system rules (colours by name, `.wb` scope, TOKENS test), public-copy rules (no Meta/LexSynergy/Merrill/figures; WBDB no digits), the GitHub map refresh, the favicon now Source Serif 4 via `build-favicon.py`, and that `/uses` and the extra games are gone.
- [ ] **Step 2:** `npm test` (builds, then runs everything) → PASS.
- [ ] **Step 3:** Serve `out/` (`npx serve out -l 4173` or `python3 -m http.server -d out 4173`) and take Playwright screenshots of `/` and `/design` at 390, 1280, 1440, light and dark; assert `document.documentElement.scrollWidth <= innerWidth` at 390; press Play, press Space and confirm `scrollY` doesn't change; press Stop, press Space and confirm the page scrolls. Fix anything off.
- [ ] **Step 4:** Dispatch a fresh code reviewer over `main..redesign/legcom-style`; apply findings.
- [ ] **Step 5:** Merge to `main` (`git checkout main && git merge --ff-only redesign/legcom-style`), `git push origin main`, watch the Pages workflow (`gh run watch`), then load https://wesleybard.com and check the live page in both themes.
