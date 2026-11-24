# Games I've made, and the CON AIR page

24 Nov 2026. Wes: "i have started making games, I made a gameboy advance game called Conair ... i dont think i want it
as a public repo but i want info about the game to be on my site. i plan on making many more and sharing them here too.
i dont want to share the game or the rom, just the project info ... and one of the videos about and maybe some screen
art ... make me a section or update my homepage with a games section, then add a page in my page style for CONAIR and
include all the fun info about it being a gameboy advance game. i have other sections on my site that arent published
links that are web games, i dont want to involve them here."

## What Wes decided (asked 24 Nov 2026)

- **Friends' names and portraits stay** ("Everything as it is"): the 60-second trailer and the cut-in art as they are.
- **The trailer keeps its sound.** Its music is the game's own soundtrack. He was told those tracks are commercial 8-bit
  covers and chose to keep the audio.
- **Its own homepage section after Work**, titled "Games I've made" (the header's Games link already goes to the SNES hub).
- **Tidemark stays the Latest card.** CON AIR lives in the new section only.

## Rules

- **No ROM, no download, no link to the private repo**, and nothing that says where to get the game.
- **Never mention or link the unlinked web games**: `/conair`, `/conair-preview-k7q2`, `/arcade`, `/marbles`,
  `/walletroyale`, `/welldone`, `/fivepointtwo`. The GBA game's own docs call it a port of a web game; the site says
  nothing about that. The page's route is `/games/con-air` because `/conair` is taken.
- The page is `noindex` and stays out of `public/sitemap.xml`, like /office and /videogames. It stays crawlable in
  robots.txt so link previews work.
- Copy is dry and factual, first person where natural. No em dashes in new copy. No repo statistics (line, test or
  commit counts). Every number on the page was checked against the game's code on 24 Nov 2026.
- "Game Boy Advance" and "Analogue Pocket" are named as the hardware it runs on. No console maker's logos.

## Approaches considered

1. **Own list (`GAMES`) and own section, newest game in the featured block (chosen).** One entry per game; the first is
   drawn big, any others as tiles. Reads well with one game and still works at five.
2. A group inside Personal. Smallest change, but Wes wants games to be their own thing and to grow.
3. A `/games` index page. Not yet: with one game the homepage section is the index.

## Assets (already in the repo, don't regenerate)

- `public/games/con-air/trailer.mp4`: the 59-second trailer, 960x640, with sound, about 7 MB.
- `public/games/con-air/*.png`: 27 screenshots, each the game's own 240x160 emulator screenshot scaled 4x to 960x640
  with nearest-neighbour, pixel-exact. Names are listed with the copy below.
- `public/projects/con-air.png`: the homepage print, 960x480 (the title screen's top three quarters).
- `public/og-con-air.png`: the link-preview card, 1200x630.

## Build

### 1. `lib/projects.ts`

- `Project['badge']` gains `'Private build'`.
- Export `GAMES: Project[]`, newest first, with one entry:

```ts
{
  key: 'conair', name: 'CON AIR', kind: 'Game Boy Advance · C', fit: 'shot', badge: 'Private build',
  image: '/projects/con-air.png',
  alt: 'The CON AIR title screen: a winged logo over a city skyline at night, with Connie flying past',
  subtitle: 'A one-button flying game for the Game Boy Advance',
  description: 'Hold A to rise, let go to fall. Connie has put the house on the Jaguars winning the Super Bowl, and he stays in the air until the bet comes in. Five story levels, an endless mode that gets harder every lap, and a versus mode where friends pass one handheld around. It runs at 60 frames a second on real hardware and saves to the cartridge.',
  href: '/games/con-air',
  chips: ['Story', 'Endless', 'Versus', 'Level select', 'Gallery', 'Jukebox'],
  chipsLabel: 'On the cartridge',
}
```

- `buildCounts()` counts games as home builds: `home: PERSONAL.length + GAMES.length`.
- Export a small `placement(i)` that returns `{ tilt, tapes }` for position `i` (what `place` already computes), and have
  `place` use it, so a page can tilt and tape prints that aren't projects.

### 2. `FeaturedBuild.tsx`

Two optional props, defaults unchanged so the /videogames hub and /design render as today:
`tag` (default `'Featured build'`, also the article's `aria-label`) and `cta` (the internal-link button text, default
`'Explore it →'`).

### 3. Homepage (`app/page.tsx`)

Between the Work section and the Personal section:

```tsx
<section className="sec" id="games" aria-labelledby="games-h">
  <div className="sec-h"><h2 id="games-h">Games I&apos;ve made</h2></div>
  <p className="gnote">Private builds for friends, so there is nothing to download. Each one has a page on how it plays and how it was built.</p>
  <FeaturedBuild project={GAMES[0]} tag="Newest game" cta="About the game →" />
  {/* any older games: <div className="tiles"> of ProjectTile with footer, placed after the work and personal tiles */}
</section>
```

`.feat` has a 40px bottom margin; make sure the gap to "Personal" matches the gap between other sections.

### 4. The page: `app/games/con-air/page.tsx` (+ `app/games/games.css`)

A server component on the design system: `<Nav theme />`, `<main className="wb wb-page gm">`, `<div className="wrap">`,
`<Footer />`. Metadata: title `CON AIR · Wesley Bard`; description `A one-button flying game I made for the Game Boy
Advance: how it plays and how it was built.`; `openGraph` and `twitter` (`summary_large_image`) with `/og-con-air.png`
(1200x630, alt `The CON AIR title screen`) and url `/games/con-air` (a child route's openGraph replaces the parent's
images, so it must name its own); `robots: { index: false, follow: false }`.

`app/games/games.css` holds the page's own blocks: tokens only, no hex, every selector under `.wb`, new class names
prefixed `gm-`. Reuse the system's blocks wherever one fits (`.hero`, `.eyebrow`, `h1.name`, `.lede`, `.stats`, `.sec`,
`.sec-h`, `.gnote`, `.print` via the `Print` component, `.chips`, `.chip`, `.card`, `.btn`).

Screenshots are 3:2, the system's prints are 2:1: under `.wb.gm`, prints take `aspect-ratio: 3 / 2` and
`object-fit: cover`. Give every `<img>` `width={960} height={640}` and make sure CSS sets `height: auto` so the
attribute never stretches it. Prints get their tilt and tape from `placement(i)`, counting up through the page. All
screenshots `loading="lazy"` except the poster.

Must work at 390px with no sideways scroll, in light and dark.

Sections, top to bottom, with the exact copy:

**Hero.** `.hero` with the text on the left and the trailer on the right.
- eyebrow: `Games I've made · Game Boy Advance · 2026`
- h1 (`.name`): `CON AIR`
- lede: `A one-button flying game I made for the Game Boy Advance. Hold A to rise, let go to fall, and keep Connie in the air until his bet comes in. It runs on real hardware at 60 frames a second. I play it on an Analogue Pocket.`
- The trailer: a print-style frame (paper border, tape, mono caption on the bottom lip, no tilt) holding
  `<video controls playsInline preload="metadata" poster="/games/con-air/title.png" width={960} height={640} aria-label="CON AIR trailer">`
  with `<source src="/games/con-air/trailer.mp4" type="video/mp4">`. Never `autoPlay`, never `muted`. Caption, left and
  right: `Trailer` · `59 seconds, with sound`.

**Facts strip** (`.stats`, four cells):
| k | n | l |
|---|---|---|
| Runs on | Game Boy Advance | and the Analogue Pocket |
| Screen | 240 × 160 | pixels, at 60 frames a second |
| Controls | One button | hold A to rise, let go to fall |
| Cartridge | 15 MB | most of it music, with a battery save |

**The story** (h2 `The story`)
- p: `Jacksonville, a long time ago. Connie puts the house on the Jaguars to win the Super Bowl. His wife does not know yet. His guy on the inside says to trust him. His dog believes in him. So he stays in the air for as long as it takes, which turns out to be fifty years.`
- Six prints in a grid (three across on desktop), the intro as it plays on the cartridge. Caption left / right, and alt:
  - `story-1-city.png` · `Intro` / `1 of 6` · alt `A full moon over a city skyline. Caption: Jacksonville. A long time ago.`
  - `story-2-bet.png` · `Intro` / `2 of 6` · alt `Connie, tattooed and smoking, counting cash at a betting window. Caption: One man. One bet.`
  - `story-3-wife.png` · `Intro` / `3 of 6` · alt `Hayley looking sideways. Caption: His wife does not know. Yet.`
  - `story-4-inside.png` · `Intro` / `4 of 6` · alt `A man in a headset with a finger to his nose. Caption: His guy on the inside says: "Trust me."`
  - `story-5-dog.png` · `Intro` / `5 of 6` · alt `Teddy the corgi running. Caption: His dog believes in him.`
  - `story-6-launch.png` · `Intro` / `6 of 6` · alt `Connie lifting off the street on a cloud. Caption: So he will stay in the air as long as it takes.`

**Five levels, fifty years** (h2)
- p: `Story mode is five levels. Each one is a decade or more after the last, and Connie ages with it. Crash and you carry on from the level you reached.`
- Five prints in a row (five across on a wide screen, wrapping below). Caption left / right:
  - `zone-1-drive-thru.png` · `The Drive-Thru` / `his 20s`
  - `zone-2-back-nine.png` · `The Back Nine` / `his 30s`
  - `zone-3-game-day.png` · `Game Day` / `his 40s`
  - `zone-4-casino.png` · `The Casino` / `his 50s`
  - `zone-5-super-bowl.png` · `The Super Bowl` / `his 70s`
  alt for each: `Level N, <name>: Connie flying through the level` (N = 1 to 5).

**Ways to play** (h2). Five entries, each a print with a heading (h3) and a line under it:
- `ending.png` · **Story** · `Five levels and an ending. It is tuned so that most players will see it.` · caption `Story` / `The ending` · alt `The ending: a football player in a stadium holding up a trophy under confetti. Caption: It took 50 years.`
- `menu.png` · **Endless** · `One run that gets tighter and faster every lap. The top ten lives on the cartridge, with three-letter initials.` · caption `Endless` / `Main menu` · alt `The main menu with Endless selected: Story mode, Endless, Versus, How to play, Extras`
- `versus-ranking.png` · **Versus** · `Two to four players pass one handheld around and fly the same course. The longest flight wins.` · caption `Versus` / `Final ranking` · alt `The versus results: three players ranked by distance`
- `level-select.png` · **Level select** · `Replay any level you have reached for a medal: bronze for finishing, silver for 60% of the coins, gold for 90% of them without Teddy's help.` · caption `Level select` / `Medals` · alt `The level select list: five levels with their ages and medals`
- `credits.png` · **Extras** · `Winning the story unlocks a gallery of every picture and a jukebox. The credits roll either way.` · caption `Extras` / `Credits` · alt `The credit roll over the skyline: Game Boy Advance version, 2026`

**The squad** (h2)
- p: `Six friends are in the game as power-ups. Four of them go into a three-slot bank to fire when you choose. The other two work on their own. Teddy the corgi runs along the ground and saves you once.`
- Six prints (three across). Caption left / right, alt `<Name>'s squad card: <power-up>, <what it does>`:
  - `squad-nick.png` · `Nick` / `Buzz` · slow motion for 4 seconds
  - `squad-hamzah.png` · `Hamzah` / `Beef Blast` · fast and invincible for 2.5 seconds
  - `squad-pearce.png` · `Pearce` / `Fireball` · burns through obstacles for 4 seconds
  - `squad-dettmer.png` · `Dettmer` / `Hazy` · a coin magnet and double bonuses for 6 seconds
  - `squad-wes.png` · `Wes` / `Gains` · a shield that takes one hit
  - `squad-rob.png` · `Rob` / `Booster` · rests Teddy so he can save you again

**Under the hood** (h2), intro p: `The Game Boy Advance came out in 2001. Everything here has to fit what it can do.`
A definition list (`dl`), two columns on desktop, one on a phone. Each `dt` a short label, each `dd` one or two sentences:
- **The machine** · `A 16.78 MHz ARM processor with no floating point and no divide instruction, 288 KB of working memory and 96 KB of video memory. The screen is 240 by 160 pixels.`
- **Whole numbers only** · `The physics run 120 times a second, two steps for every frame, in fixed-point integers. There is not a float in it.`
- **What you see is what you hit** · `The tunnel is streamed in a column at a time as the world scrolls, and its edge is drawn to the pixel, so the wall on screen is the wall you crash into.`
- **Fast memory for the hot code** · `Most of the game is compact Thumb code that runs from the cartridge. The parts that run every frame (sound mixing, sprites, text, the tunnel) are built as ARM code and run from the console's 32 KB of fast memory.`
- **Pictures** · `The 29 full-screen pictures are each reduced to their own 256-colour palette, dithered and compressed on the cartridge.`
- **Sound** · `Music streams off the cartridge as 8-bit samples at 18,157 Hz. Effects go through a four-voice software mixer on the second sound channel.`
- **Saving** · `The whole save is 124 bytes, kept twice. The game always overwrites the older copy, so pulling the power mid-save cannot lose your scores.`
- **Every course is beatable** · `The rules are plain C that also compiles on a Mac, so bots can play it. A perfect bot has to finish the story on every test course and survive 4,000 metres of endless mode before a build counts.`
- **Tested without a screen** · `Other tests boot the real ROM in a headless emulator, press its buttons, read its memory and take screenshots. After that it gets played on the real thing.`
Beside or under the list, two prints: `how-to-play.png` (caption `How to play` / `Page 1`, alt `The how to play page: hold A to rise, let go to fall`) and `power-ups.png` (caption `Power-ups` / `The bank`, alt `The power-ups page: left and right pick from the bank, R uses it`).

**How it was built** (h2)
- p: `I built it with Claude Code. One model planned the work and reviewed it, and others wrote the engine, converted the art and sound, and wrote the tests. I set the direction, decided how hard it should be (the story easy, endless harder every lap) and played it on the Pocket to check it on real hardware.`
- chips, labelled `Built with` (use `.act-h` and `.chips`): `C` · `libtonc` · `Arm GNU Toolchain` · `mGBA` · `Python` · `ffmpeg`

**Closing note** (a `.card`, not a link): heading `Not for download`, text `CON AIR is a private build for my friends, who are in it. There is no ROM here and the code is not public.` Under it a plain link `Back to the homepage` to `/#games`.

### 5. Tests

- `__tests__/projects.test.ts`: `GAMES` joins `all` (complete fields, pictures exist, unique keys, copy rules); a
  `'Private build'` has an `href` under `/games/`; counts become `{ work: 10, home: 14 }`; `placement(i)` matches `place`.
- `__tests__/home.test.tsx`: the games section has its heading and note, shows CON AIR with the `Newest game` tag and an
  `About the game →` button to `/games/con-air` in the same tab, and sits after Work and before Personal. The
  /videogames hub's featured block still says `Featured build` and `Explore it →`.
- New `__tests__/games.test.tsx`: renders the page (mock `next/navigation` as the other page tests do): one `h1`
  `CON AIR`; the video has `controls`, the poster and the mp4 source, and is neither `autoplay` nor `muted`; every
  `/games/con-air/…` and `/projects/…` file the page references exists in `public/`; no `href` or `src` anywhere points
  at `/conair`, `/arcade`, `/marbles`, `/walletroyale`, `/welldone`, `/fivepointtwo`, a `.gba` file or `github.com`; the
  page's metadata is noindex and its card file exists; `public/sitemap.xml` does not list `/games`; `games.css` uses no
  hex colours and scopes every selector under `.wb`.

### For the builder

`npm test`, `npx tsc --noEmit -p .` and `npm run build` must pass. Don't touch `public/games/`, `public/projects/con-air.png`,
`public/og-con-air.png`, `CLAUDE.md`, this spec, the SNES pages or /health. Don't use a browser, a dev server or git.

## Changes after Wes saw the first build (24 Nov 2026)

He liked the look and asked for two things.

1. **The trailer plays on the homepage.** "could the trailer actually play on the main screen tho, could it be embedded with no sound unless they click on it". The featured game's print holds the trailer in place of the still picture (`TrailerPrint`, fed by an optional `trailer` on the `GAMES` entry). It starts muted once half of it is on screen and loops; a click on the picture or "Turn sound on" gives it sound; scrolling away pauses and mutes it. No `autoplay` attribute and `preload="none"`, so the file is fetched only when the block is in view. Visitors who ask for reduced motion or data saving keep the poster and a Play button. The print is no longer a link there; "About the game" still is. The game's own page is unchanged: native controls, never plays by itself.
2. **Highlight cards also stay in their groups.** "even tho the mac tesla tracker and tidemark are in the featured row, shouldnt they also be down below under mac apps too" and "also copy my office in 3D down into everything else". `personalGroups()` no longer filters out the highlights row.
3. **CON AIR is an ordinary tile.** "can you make the conair section just a small tile that looks like all the other ones? right now its large, im gonna add more there". The games section is a row of tiles, newest first; the big featured block is gone from the homepage, and `FeaturedBuild` is back to what the `/videogames` hub uses. The trailer from point 1 plays in the tile's print instead. The tile's link reads "About the game →" through a new optional `cta` on a project.
4. **The section is "Gaming".** "maybe we do a GAMING section with games ive made, and then we can still put the snes history and gbforge projects under it somewhere too". One section, two labelled groups: "Games I've made" (the games, with the nothing-to-download note) and "Other game projects" (SNES History and GBForge Tetris, moved out of Personal › Everything else).

