# wesleybard.com in LegCom's style — design

**Date:** 3 Oct 2026 · **Status:** awaiting Wes's review
**Mockup:** https://claude.ai/artifact/GLGp39JPxCKYSZ8dRwCRKd — the artboard "Picked · A with A2's top" is the target. A, B, C and A1–A3 are the options it came from.

## What we're doing

Rebuild the homepage in the look of the LegCom landing page (`~/Vibecoding/legcom-platform/landing`, itself WBDB's design system): taped, tilted prints for every project, a featured build at the top, a stat strip, light and dark themes. Add a `/design` page that documents the system the way WBDB's and LegCom's `/design` pages do. Retire `/uses`, Ms. Pac-Man and Galaga.

## Decisions already made (Wes, 3 Oct)

| Topic | Decision |
|---|---|
| Layout | Option A's page with A2's top: name on the left, Tetris as a taped print beside a taped headshot print on the right. |
| Games | Tetris only, played inside its print (Play / Stop in the print's caption). Ms. Pac-Man and Galaga are removed. No game button in the top bar. |
| Photos | Full colour. The "grayscale at rest, colour on hover" rule is retired. |
| Theme | Keep LegCom's three-way switch: Light · Match my computer · Dark. |
| GitHub map | Keep it, redrawn in the site's own colours (it is the `ghchart` image today). |
| New tiles | LUCY (work agent) and WBDB (work, "Domain intelligence") as private repos; OmaFinance as a private personal repo under Omarchy Linux. |
| WBDB copy | No numbers, no domain counts, nothing about Meta. |
| OmaFinance picture | A made-up illustration (no real data): `public/projects/omafinance.svg`, drawn for the mockup. |
| `/uses` | Removed. |
| `/design` | New page, like WBDB's. |

## The design system

One stylesheet, `app/design-system.css`, imported by the root layout. It holds everything a page needs to look like this; the homepage and `/design` use its classes, so `/design` always shows the real thing.

**Colour tokens** on `:root`, light first, each with a dark twin under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and again under `:root[data-theme="dark"]`. The values are LegCom's (`legcom.css`), so the two sites match:

- Surfaces: `--bg`, `--paper`, `--rule`, `--rule-soft`
- Ink: `--ink`, `--ink-2`, `--ink-3` (LegCom's AA-raised values)
- Accent: `--accent`, `--accent-soft`, `--accent-deep`, `--on-accent`
- Meaning: `--core` (green: "playing", "up")
- Prints: `--tape`
- The arcade screen: `--screen` and its HUD ink, fixed dark in both themes
- GitHub map: `--h0`…`--h4`, a teal scale ending in `--accent`, with dark twins

Rule, as on WBDB: **colours by name only**. A new colour goes in the stylesheet (light and dark) and in `TOKENS` on `/design`, or the test fails.

**Type** (via `next/font/google`, as CSS variables): Source Serif 4 for the name, headings, tile titles and big figures; IBM Plex Sans for text; IBM Plex Mono for eyebrows, captions, tags and the subtitles under tile names.

**Theme switch:** the LegCom pill (sun · half-circle · moon) with its hover card. The choice is saved in `localStorage` under `wb-theme` and applied by a tiny inline script in `<head>` before first paint, so there's no flash. With no choice saved, the page follows the computer.

**Building blocks** (class names follow LegCom's where they exist):

| Block | What it is |
|---|---|
| Header | Paper bar, bottom rule: "Wesley **Bard**" wordmark (Bard in accent), Projects · Connect, theme switch on the right. Wraps on a phone; the switch stays. |
| `.print` | A taped photo: paper border with a wide bottom lip, a mono caption (name left, kind right), one or two strips of tape, tilted. Tilt and tape come by position from two lists (LegCom's `TILT` / `TAPE`), so a row looks hand-placed whatever moves. |
| `.tile` | A print standing over the top of a card: name + tag (`Private repo` / `Open source`), mono subtitle, description, and for personal projects a footer (the board it runs on with its thumbnail, or the language; GitHub → when public). |
| `.feat` | The featured build: a big print over the left edge of a panel with the copy, a "Runs on" line and chips. One constant, `FEATURED`, picks it (Stream Deck Neo Takeover to start). It is left out of its group below. |
| `.stats` | The stat strip, used for Then / Now / Still. |
| Tetris print | The arcade print: a dark screen with the board and a two-figure HUD (Score, Lines), caption "Tetris" with Play / Stop; while playing the caption shows the keys. |
| GitHub map | A card with the 53-week grid in `--h0`…`--h4`, month and day labels, Less → More key, and "Most projects are in private repositories." It fills the card's width; on a phone it scrolls inside the card. |
| `.card` | Link cards for Beyond work and Connect. |
| Footer | Wordmark · © year, then LinkedIn →, GitHub →, Design system →. |

## The homepage, top to bottom

1. **Header.**
2. **Hero:** eyebrow "Governance, Risk & Compliance · Newfold Digital", the name, and on the right the Tetris print with the headshot print overlapping it. On a phone the prints stack under the name and the HUD hides.
3. **Then / Now / Still** strip: Lockheed Martin · Engineer; Newfold Digital · Governance, Risk & Compliance; Building stuff · "Nine builds at work, nine at home". The counts are computed from the project lists and spelled out, so they can't go stale.
4. **Featured build.**
5. **Work:** "Autonomous AI agents" (the existing note about coworkers' pets) with OSCAR, SMORES, MAISIE, SNOOP, RHINO, PABSTY, BEASLEY, LUCY; then "Domain intelligence" with WBDB.
6. **Personal:** Omarchy Linux (Idle Screen Counter, Workspace Labels, OmaFinance), Microcontrollers, Everything else, with the featured build left out.
7. **GitHub activity.**
8. **Beyond work + Connect:** STEM Mentoring, Autism & Inclusivity Advocate, LinkedIn ("Feel free to reach out. Resume available upon request."), GitHub.
9. **Footer.**

Four across on a wide screen, two on a tablet, one on a phone. Unlike LegCom (desktop only), every page must work at 390 px with no sideways scroll.

### New copy

| Tile | Subtitle | Description |
|---|---|---|
| LUCY · Pit and lab mix | Litigation Utility for Conflicts on Your Brand | Polls a domain-name watch service every couple of hours for newly registered look-alike domains, works out which brand in the portfolio manages each one, and emails Legal a digest with Take action and Dismiss buttons — then follows every actioned domain until it's gone. |
| WBDB · The lab | Domain intelligence · the company's domains, read for risk and value | Where you bring a question about the domains on the platform. Scores how convincingly a look-alike domain impersonates a brand, finds the banks, credit unions, hospitals and nonprofits among them, and checks every domain against public lists, from the FDIC and NCUA to the SEC and the Fortune 500. |
| OmaFinance · QML · Quickshell | wbuf81/OmaFinance | A portfolio and market workspace that lives in Omarchy — live quotes with per-row freshness, holdings across accounts, cash-flow-adjusted returns, a privacy mode, and a scrolling bar ticker, all themed from the active Omarchy palette. Portfolio data stays on the machine. QML, with a SwiftUI sibling for macOS called BARD//OS. |

Public copy names no client, vendor, brokerage or figure: no Meta, no LexSynergy, no Merrill, no domain counts. Existing tile copy is unchanged. LUCY's photo is LegCom's `lucy-header.jpg` (800 px wide, like the others); WBDB's picture is LegCom's drawing of the WBDB lab bench, as an image.

## Tetris

`TetrisBackground.tsx` today draws a board across the whole hero behind the text. It becomes `TetrisBoard.tsx`: the same game (auto-play AI, player mode, scoring, line clears, keys) drawn on a fixed-size canvas inside the print's screen. Idle, it plays itself in dim greys; playing, it switches to the classic colours. It takes the keyboard only while playing, as now, and stops auto-play under `prefers-reduced-motion`. The Play / Stop button is a real `<button>`; the HUD figures are announced politely to screen readers.

## The GitHub map's data

The site is a static export, so the map reads `data/github-contributions.json`: `{ from, to, levels }`, where `levels` holds one digit (0–4) per day, the same levels GitHub's public profile shows. Today's file was checked against the public chart: the same 145 active days.

- `scripts/github-contributions.mjs` fetches the last year from GitHub's GraphQL API and writes the file. The deploy workflow runs it before the build, using the workflow's `GITHUB_TOKEN`.
- A committed copy keeps local builds and tests working. If the fetch fails, the deploy uses the committed copy and prints a warning; the map is never blank.
- To keep it current between pushes, add a daily `schedule` to the deploy workflow (see open questions).

## `/design`

A page in the new style, like LegCom's `/design`. It draws everything with the site's own classes, so switching the theme shows both versions:

1. **Colour:** every token as a swatch with its job and its light · dark values, from a `TOKENS` list on the page.
2. **Type:** the three faces and the scale (name, section, tile title, big figure, text, eyebrow, caption).
3. **The header** and the theme switch.
4. **Building blocks:** buttons, tags and chips, the stat strip, a print (with the tilt and tape rule), a tile, the featured block, the Tetris print, the GitHub map, link cards.
5. **Writing:** what a tile says (what it does and what it runs on, never repo statistics); no client, vendor or money names; counts spelled out and computed; plain English.
6. **Using it on a page:** link the stylesheet, use the classes, colours by name only, check both themes and a phone.

It's in the footer (Design system →) and the sitemap, not the main nav.

## What goes away

- **`/uses`:** `app/uses/`, `lib/uses.ts`, `types/uses.ts`, `data/uses.json`, `lib/github.ts` and `lib/metadata-fetcher.ts` (only the admin used them), their tests (`uses.test.ts`, `github.test.ts`, `components.test.tsx`, the uses half of `data-validation.test.ts`), and the sitemap entry. The URL will 404; it isn't linked from anywhere.
- **Ms. Pac-Man and Galaga:** `MsPacManBackground.tsx`, `GalagaBackground.tsx` and the game switcher.
- The `ghchart.rshah.org` image and the grayscale filters.

Kept as they are: `/health`, `/lee`, `/moonballs`, `/playground`, `/articles`. They pick up the new header (it's the shared `Nav`) but keep their own page styles, and Playfair and Outfit stay loaded for them.

## Code layout

- `app/design-system.css`: tokens and blocks.
- `app/layout.tsx`: the three new fonts, the theme script, the stylesheet.
- `app/components/Nav.tsx`: restyled header with the theme switch (`ThemeSwitch.tsx`, client).
- `app/components/Footer.tsx`: new.
- `app/components/home/`: `Print.tsx`, `ProjectTile.tsx`, `FeaturedBuild.tsx`, `ThenNowStill.tsx`, `GitHubMap.tsx`, `TetrisPrint.tsx` (client: holds play state, renders `TetrisBoard`).
- `lib/projects.ts`: `AGENTS`, `TOOLS`, `PERSONAL`, `GROUPS`, `FEATURED`, `TILT`, `TAPE`, and the counts for the strip. It replaces the arrays in `page.tsx`.
- `app/page.tsx`: a server component that lays the sections out; only the Tetris print and the theme switch are client code.
- `app/design/page.tsx`: the design page.
- `public/agents/lucy.jpg`, `public/projects/wbdb-lab.jpg`, `public/projects/omafinance.svg`: new images.

## Testing

- **Design system** (`__tests__/design-system.test.ts`): every token in `design-system.css` has a dark twin in both dark blocks and an entry in `/design`'s `TOKENS`. No hex colours in `app/components/home/` or `app/design/`.
- **Projects** (`__tests__/projects.test.ts`): every tile has a name, subtitle, description and badge, and an image file that exists in `public/`. `FEATURED` names a real personal project. WBDB's copy contains no digits; no tile's copy names Meta, LexSynergy or Merrill. The strip's counts match the lists.
- **GitHub data** (`__tests__/github-contributions.test.ts`): the committed file parses, `levels` is only 0–4, and its length matches `from` to `to`.
- **Tetris:** the existing game logic keeps its behaviour. Unit tests cover line clears, scoring and the play / stop toggle.
- `npm test` (which builds first) passes, and the deploy workflow stays green.
- **Visual check before shipping:** Playwright screenshots of `/` and `/design` at 390, 1280 and 1440, in light and dark. Play Tetris with the keyboard and confirm the page doesn't scroll.

## CLAUDE.md updates

Replace the grayscale and "3-up agent-grid" rules with the print and tile rules above. Add the design system section (the stylesheet, colours by name only, `/design`), the copy rules for public tiles, how the GitHub data refreshes, and that `/uses` and the extra games are gone.

## Open questions for Wes

1. **Favicon and link-preview cards** use Playfair (the W, and `scripts/og`). Keep them for now, or redraw them in Source Serif 4 to match the new name? *Recommendation:* keep them, and do it as a follow-up.
2. **Daily refresh of the GitHub map:** add a daily scheduled run of the deploy workflow? It redeploys the site once a day even with no changes. *Recommendation:* yes; it's cheap and keeps the map honest.
3. **`/uses` links out there:** a plain 404 is the plan. Want a redirect stub to the homepage instead?
