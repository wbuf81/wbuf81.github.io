# Photo Frame Dashboard: a tile and a write-up page

Date: 24 Nov 2026. For Wes's hacked PF1007L photo frame (private project in `~/Vibecoding/PF1007L`).

## What Wes asked

"can you add a tile and a page and repo to my PF1007L project? obviously please strip out my personal data and render new screens without my actual calendar, but build me a writeup page similiar to conair about it and a tile on the main homepage where you think it shoudl go. i think i maybe need a new section now of electronics or home hacking or things like that?"

Then: "can you make a page similiar to the conair detail page about this project tho and show the details and instructions and links if someone wanted to make their own ?"

## What he decided (asked 24 Nov 2026)

- **The repo stays private.** No public repo, no GitHub link. The tile's badge is `Private repo`.
- **The group is "Electronics"** (renamed from Microcontrollers): M5 Spotify Deck, Knobdeck, Personal AAC Device, the photo frame, Stream Deck Neo Takeover.
- **Tidemark stays the Latest card.**
- **The screens keep his personal touches** (the greeting by first name, the daily verse, the Walk with Jeffrey card) and fake everything private: the calendar, the location, the car's position, the Claude account names.

## Rules

- Nothing private anywhere in the repo: not the real town, ZIP or coordinates, not the dashboard's address, no key, no email, no employer or calendar detail, not the real Claude account names. That includes tests and scripts: a test must never name a private value in order to ban it.
- The page does not say who Jeffrey is. It only uses the card's own name, "Walk with Jeffrey".
- No procedure for getting into the frame. The page points at the public guide for that.
- No link to the private repo. External links are only the ones listed below; every one was checked on 24 Nov 2026.
- Copy is first person, plain, no taglines, no em dashes. No repo statistics.
- "Wes Bos" is the author of the upstream project and a different person from Wes. Always write his full name.

## Approaches considered

1. **A page like CON AIR's, reusing its blocks** (chosen). Same hero with a print, facts strip, sections of prints and definition lists, a closing card. New: screenshots that open at full size, a numbered "make your own" list, and a warning card.
2. A long how-to that restates the upstream guide. Rejected: the guide is maintained, units differ, and a stale copy of risky steps on this site could break someone's frame.
3. Tile only, no page. Rejected: he asked for the page.

## Assets (already in the repo; don't regenerate)

- `public/builds/photo-frame/`: `home-tokyo-night.jpg`, `home-daylight.jpg`, `home-paper.jpg`, `week-daylight.jpg`, `forecast-tokyo-night.jpg`, `settings-tokyo-night.jpg`, `boot.jpg` (all 1280x800), and `jeffrey-walk.png` (a 960x110 sprite sheet: 16 frames of 60x110, left to right).
- `public/projects/photo-frame.jpg` (1200x600, the homepage tile) and `public/og-photo-frame.jpg` (1200x630, the link-preview card).
- `scripts/builds/photo-frame/`: how the screenshots were made (a throwaway copy of the dashboard, fed made-up data, shot headless). Leave it alone.

## Build

### 1. `lib/projects.ts`

A new `PERSONAL` entry after `aac` and before `neo`:

```ts
{
  key: 'frame', name: 'Photo Frame Dashboard', group: 'Electronics', kind: 'Android · JS', fit: 'shot', badge: 'Private repo',
  image: '/projects/photo-frame.jpg',
  alt: "The photo frame at night: a large clock over a rocket launch, tomorrow's calendar, the weather and the markets",
  subtitle: 'A hacked photo frame that shows my day',
  description: 'A 10.1-inch Wi-Fi photo frame, opened up and given a new job: my calendar, the weather, the markets, where my car is and my Claude usage, in three looks and one that follows the sun. A Cloudflare Worker serves it, so no computer has to be on.',
  href: '/builds/photo-frame', cta: 'How I built it →',
},
```

(`kind` was first 'Android · Cloudflare Workers', which the print's caption cut off beside the long name.)

`__tests__/projects.test.ts` says a `Private repo` has no `href`. New rule: a `Private repo` either has no `href`, or its `href` is a write-up on this site matching `/builds/<slug>`; never an outside address. The Then / Now / Still strip becomes "Ten builds at work, fifteen at home".

### 2. The page: `app/builds/photo-frame/page.tsx` (+ `app/builds/builds.css`)

A server component on the design system, built like `app/games/con-air/page.tsx`: `<Nav theme />`, `<main className="wb wb-page gm bd">`, `<Footer />`. Import `../../games/games.css` for the shared `gm-…` blocks and `../builds.css` for what is new (blocks named `bd-…`, tokens only, every selector under `.wb`).

Metadata: title `Photo Frame Dashboard · Wesley Bard`; description "A Wi-Fi photo frame I opened up and turned into a dashboard for my day, and how to make your own."; its own `openGraph` and `twitter` (`summary_large_image`) with `/og-photo-frame.jpg` (1200x630, alt "The photo frame dashboard at night") and url `/builds/photo-frame`; `robots: { index: false, follow: false }`. Not added to `public/sitemap.xml`.

Screenshots are 16:10, so `.wb.gm.bd .print .ph { aspect-ratio: 16 / 10; }`. Each screenshot print **is a link to its own full-size picture** (the same tab; `aria-label` "Open the full-size picture: <caption>"), because the text in them is small. Images carry `width={1280} height={800}` and must not stretch (`height: auto`); the hero's is `loading="eager"`, the rest lazy. Tilt and tape from `placement(i)` as the CON AIR page does; the hero print is untilted.

External links open in a new tab with `rel="noopener noreferrer"`.

Must hold at 390px with no sideways scroll, in light and dark.

#### Hero

- Eyebrow: `Electronics · Android photo frame · 2026`
- `h1`: `Photo Frame Dashboard`
- Lede: "A 10.1-inch Wi-Fi photo frame, the kind that cycles through family pictures, that I opened up and gave a new job. It shows my day now: my calendar, the weather, the markets, where my car is and how much Claude I have used. It still runs the frame's own Android 6, and the page comes from a Cloudflare Worker, so no computer has to be on."
- A small note under the lede (`.gnote` or the system's fine print): "Everything private in these pictures is made up: the calendar, the location, the car's position and the account names. The rest is the real thing."
- Print (untilted, like the CON AIR trailer print): `home-tokyo-night.jpg`, caption "The home screen" / "Tokyo Night, 8:12 PM". Alt: "The dashboard at night: a large clock reading 8:12 PM with a greeting and a Bible verse over a rocket launch, tomorrow's calendar, the weather with a Walk with Jeffrey card, the markets, a game released on this day, the car's position and two rings of Claude usage."

#### Facts strip (`.stats`, four cells; 4 across, 2x2, then 1 as on the CON AIR page)

| k | n | l |
| --- | --- | --- |
| The frame | PF1007L | a 10.1-inch touch screen sold under several brand names |
| Screen | 1280 × 800 | one pixel per pixel, so every screen is drawn for exactly this |
| Runs on | Android 6 | with its browser engine upgraded to Chrome 106 |
| Served by | Cloudflare Workers | the free plan, no computer attached |

#### What's on it

"The home screen is seven tiles. Two of them open into a full screen when I tap them."

A definition list (`gm-dl`):

- **Clock**: "The time, a greeting, my next meeting and a verse of thanks that changes every day. After 5 PM the meeting line becomes the evening walk."
- **Calendar**: "Today as a day grid, coloured by busy, tentative, free and out of office. Once today's meetings are over it shows the next day that has any."
- **Weather**: "Now, the week ahead, a sentence about today in plain words, and whether the sprinklers should run."
- **Markets**: "The day's biggest mover gets the big spot: price, change, the day's line, where it sits in its 52-week range and a headline. Three more sit under it as rows."
- **Car**: "Where my car is on a small map, its charge and whether it is locked. The reading comes from Mac Tesla Tracker, another thing I built."
- **On this day in gaming**: "The best-known game first released on today's date between 1980 and 2006, with its box art and a few more from the same day."
- **Claude usage**: "A ring for each account's week and a bar for its current five-hour window."

Then a card (`.card`, new block `bd-walk`): on the left the sprite, walking; on the right:

- `h3`: "Walk with Jeffrey"
- "The weather tile also answers one question every evening: is it a good night for the walk? It checks storms, rain, heat, cold and wind in that order, and the first one that applies is the verdict. On a good night Jeffrey walks across the card. On a stay-in night he stands still."

The sprite: a `span` (`bd-jeffrey`, `role="img"`, `aria-label="Jeffrey, a pixel-art figure, walking"`) drawn from `/builds/photo-frame/jeffrey-walk.png` at twice its size (120x220 per frame, the sheet at 1920x220) with `image-rendering: pixelated`, stepping through the 16 frames in 1.92 s (`steps(16)`), forever. Under `prefers-reduced-motion: reduce` it holds the first frame.

#### Three looks, and one that follows the sun

"The first look was Paper: white tiles on graph paper, like this site. Tokyo Night, the one at the top of this page, borrows Omarchy's Tokyo Night theme and its liftoff wallpaper, with the rocket climbing through a clear clock window. Daylight is the same layout over the launch in daylight colours. Auto switches between the two: Daylight from sunrise to sunset, Tokyo Night after dark. The frame works out sunrise and sunset itself, to within a few minutes."

"The frosted glass is a trick. This frame can't blur anything live, so each window sits on a copy of the wallpaper that was blurred ahead of time and lined up behind it."

Two prints side by side (stacked on a phone):

- `home-daylight.jpg`, "Daylight" / "2:46 PM". Alt: "The same home screen by day: cream frosted tiles over a rocket launch in daylight, the afternoon's meetings with a line at the current time, and the car parked at Space Center."
- `home-paper.jpg`, "Paper" / "the first look". Alt: "The home screen in the Paper look: white tiles on graph paper with serif headings, showing the same afternoon."

"Omarchy" links to `https://github.com/omacom/omarchy`.

#### Tap for more

"It is a touch screen. Tapping the calendar opens the work week and tapping the weather opens the full forecast. Any screen but home goes back by itself after a minute without a touch."

Three prints (`gm-grid`):

- `week-daylight.jpg`, "The work week" / "tap the calendar". Alt: "The work week, Monday to Friday: meetings as coloured blocks by busy, tentative, free and out of office, all-day events along the top, and a line at the current time."
- `forecast-tokyo-night.jpg`, "The full forecast" / "tap the weather". Alt: "The full forecast: now, the next 24 hours, seven days with rain and temperature bars, a large Walk with Jeffrey card and a sprinkler card."
- `settings-tokyo-night.jpg`, "The gear screen" / "brightness, sleep, walk time, theme". Alt: "The settings screen: a brightness slider, sleep modes, the walk's start and end times, and four theme buttons."

#### No computer attached

"One Cloudflare Worker serves the page and answers every request for data. It is on the free plan, which allows 10 milliseconds of processor time per request. That limit shaped most of it."

A definition list:

- **Locked**: "A workers.dev address is public and this page shows a calendar, so every request needs a key. Without it the Worker answers 404 to everything, as if nothing were there."
- **The calendar**: "Working out every repeating meeting in a calendar feed took about 270 ms in my tests, 27 times the allowance. So the Worker only trims the feed to the days that matter, about 1.4 ms, and the frame works out the meetings itself on a background thread, so the clock never stalls."
- **Fetched once**: "The verse and the gaming list are fetched once a day and kept. Weather is kept for ten minutes."
- **Updates**: "Every build has an ID. The page asks for it every five minutes and reloads when it changes, so a new version reaches the frame by itself."
- **From my Mac**: "Two tiles do need a computer: my Mac sends the car's reading and my Claude usage, checking once a minute. When it is off those two tiles say so and the rest carries on."
- **Slow Wi-Fi**: "After a power cut the page loads before Wi-Fi does. Every tile keeps the last good data, says how old it is and tries again."

#### On the frame itself

"The frame ships locked down as a photo app. Wes Bos's photo-frame-dashboard project documents how to get developer access to this model and many others, and I followed its guide one checked step at a time, after backing the whole frame up. Most of what now runs on the frame is that project's work: the kiosk app that opens one page full screen at every boot, a newer browser engine, and fixes so it comes back properly after a power cut."

("photo-frame-dashboard" links to `https://github.com/wesbos/photo-frame-dashboard`.)

Two short blocks, each an `h3` and a paragraph, beside one print:

- **It sleeps when the room is dark**: "My addition is a small script that runs on the frame. Every five seconds it reads the light sensor. When the room has been dark for five minutes it switches the backlight off, and when the lights come back so does the screen. A tap wakes it for five minutes. Android never learns the screen went dark, which is why the sensor and the touch screen keep working."
- **It boots on a rocket launch**: "The three boot screens are replaced too. The frame starts on a Starship standing on the pad, then plays the launch as its boot animation: 216 frames at 12 a second, 18 seconds in all, with a progress bar under the words."
- Print: `boot.jpg`, "The boot screen" / "18 seconds of liftoff". Alt: "The boot screen: a Starship lifting off through clouds of smoke, with the words Starting up, Wes's Dashboard, Launching and an orange progress bar."

#### Built for an old, slow screen

A definition list:

- **A browser from 2022**: "Even upgraded, the frame's engine is Chrome 106. No color-mix, no nesting, no :has(), and it refuses the four- and eight-digit hex colours Chrome 106 is supposed to accept. Colours are written the long way and every tint is worked out ahead of time."
- **No blur, no emoji**: "The graphics chip is too weak for live blur, and Android 6 has no emoji font, so emoji are stripped from meeting titles before they turn into boxes."
- **One pixel per pixel**: "The panel is 1280 × 800 with no retina scaling, so nothing is drawn at double size and every layout is fixed to that width."
- **A slow chip**: "Heavy work goes to a background thread, and the page reloads itself at 3 AM to clear anything that has built up."
- **Old certificates**: "The frame doesn't trust some of today's certificate authorities, so the Worker fetches box art itself and hands it over, and the frame never has to talk to those sites."

#### Make your own

"My code stays private because it is wired to my calendar and my home. But nearly everything it stands on is public and well documented. Start with Wes Bos's video and the project's README, then this is the order I would do it in."

("video" links to `https://youtu.be/ZLycoUMltNI`; "README" to `https://github.com/wesbos/photo-frame-dashboard/blob/main/README.md`.)

A warning card first (`.card`, new block `bd-warn`), `h3` "Before you start":

- "This can break a frame for good. Read the project's guide for the actual steps; this page is only the map."
- "Back the frame up, and check the backup, before you change anything."
- "Frames differ even under the same name and listing. Match the model on the About screen and stop at the first thing that doesn't match the guide."
- "Never cut the power during a write."
- "Keep your backups private. They hold your Wi-Fi password."

Then an ordered list (`ol`, new block `bd-steps`: a real numbered list, each item a bold first sentence, a second sentence, and its links). `U` is `https://github.com/wesbos/photo-frame-dashboard/blob/main`.

1. **Get a frame the project supports.** "Go by the model on the frame's About screen, not the brand on the box. The same listing can ship different boards." Link: "Device index" → `U/docs/devices.md`
2. **Follow the start-here guide.** "It covers backing the frame up and getting developer access, with a check after every step. Stop at the first check that fails." Link: "PF1007L: start here" → `U/docs/pf1007l-start-here.md`
3. **Replace the photo app and upgrade the browser engine.** "The engine it ships with is far too old for a modern page. The guide swaps in Chrome 106's." Link: "The PF1007L guide" → `U/docs/allwinner-a33-pf1007l.md`
4. **Install the kiosk app and make it the Home app.** "It opens one address full screen at every boot and keeps retrying until Wi-Fi is up." Link: "The kiosk app" → `U/dashboard/kiosk/README.md`
5. **Build your page for 1280 × 800 and Chrome 106.** "Set your bundler's targets the way the builder's guide says, or newer CSS will quietly break." Link: "Building for the frame" → `U/docs/building-for-the-frame.md`
6. **Host it somewhere that is always on.** "I use a Cloudflare Worker on the free plan, with KV for the few things it has to remember. Mind the 10 ms of processor time per request." Links: "Cloudflare Workers" → `https://developers.cloudflare.com/workers/`, "its limits" → `https://developers.cloudflare.com/workers/platform/limits/`, "KV" → `https://developers.cloudflare.com/kv/`
7. **Point the kiosk at your page.** "Save the address once. Give your page a version check and it will pick up new deploys by itself." No link.
8. **Optional: make it boot reliably.** "The project's boot fixes give the frame one Wi-Fi address and the right time after a power cut." Link: "Boot fixes" → `U/docs/pf1007l-boot-fixes.md`
9. **Optional: your own boot screens.** "Three images to replace. Follow that doc's cautions closely, because a bad write here can damage the frame." Link: "Boot screens" → `U/docs/allwinner-a33-boot-screens.md`

Then `h3` "Where my data comes from", a plain list:

- "Weather, the walk and the sprinklers: Open-Meteo, free and with no key." → `https://open-meteo.com/en/docs`
- "Gaming history: Wikidata's query service, with box art through Wikipedia's API." → `https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service`, `https://en.wikipedia.org/api/rest_v1/`
- "The verse: the Free Use Bible API, serving the Berean Standard Bible, which is in the public domain." → `https://bible.helloao.org/docs/`
- "The calendar: a published calendar link, read with ical.js." → `https://github.com/kewisch/ical.js`
- "Sunrise and sunset: the maths from SunCalc." → `https://github.com/mourner/suncalc`
- "Markets come from an unofficial Yahoo Finance endpoint, so there is no manual to point you at." No link.

#### Credit (closing card, like the CON AIR page's "Not for download")

- `h2`: "Credit where it's due"
- "The hardware work is Wes Bos's photo-frame-dashboard and its contributors, under the MIT licence: the device research, the kiosk app, the boot fixes and the boot-screen method. The night look is Omarchy's Tokyo Night theme and its liftoff wallpaper. The type is IBM Plex, Source Serif 4 and JetBrains Mono. Weather is from Open-Meteo, game history from Wikidata and Wikipedia, verses from the Berean Standard Bible and map tiles from Esri."
- "The dashboard, its Worker, the sleep script and the boot screens are mine, built with Claude Code starting in October 2026. The repo is private."
- Chips: JavaScript · Vite · Cloudflare Workers · Workers KV · ical.js · Android 6
- A button "Back to the homepage" → `/`

### 3. Tests: `__tests__/builds.test.tsx` (and the homepage's)

- One `h1`, "Photo Frame Dashboard"; metadata has the title, its own card (file exists), and `robots` noindex; the page is not in `public/sitemap.xml`.
- Every `src` and screenshot `href` on the page exists under `public/`; every screenshot `img` is 1280x800 with alt text and sits in a link to its own file.
- Every outside link has `target="_blank"` and `rel` with `noopener`, and its address is one of the addresses listed in this spec (an allow-list in the test), so a new link has to be added on purpose.
- Nothing private by shape: no link to `github.com/wbuf81/…`, no address ending `.workers.dev`, no IP address, no email address, no `/health` or friend-game link. The test must not name any real private value.
- The seven tiles, the nine steps and the five warnings are all there (count the list items).
- Homepage and data: the Electronics group reads M5 Spotify Deck, Knobdeck, Personal AAC Device, Photo Frame Dashboard, Stream Deck Neo Takeover; the tile's link reads "How I built it →" and goes to `/builds/photo-frame`; counts are `{ work: 10, home: 15 }`; the `Private repo` rule above.

### For the builder

Left to you: the layout of each section within the system's blocks, the `bd-…` CSS, and how the hero's note is set. Not left to you: any wording, any link, any number, the file names, and the rules at the top.

## Changes after Wes saw the page (24 Nov 2026)

"i want to better feature the photo frame dashboard too please, i love your page for it - on your detailed page can you make a flowchart that shows how everything gets to the frame? i think that will better explain it to non technical people"

1. **It becomes the Latest card** (he picked that from four options: Latest, swap for Mac Tesla Tracker, swap for My Office in 3D, four cards). `LATEST = 'frame'`; Tidemark stays under Mac apps. This replaces "Tidemark stays the Latest card" above.
2. **A flowchart section**, "How everything gets to the frame", between "What's on it" and "Three looks". Three stages joined by labelled arrows, in HTML and CSS so every word is real text:
   - 1 · Where it comes from: "Out on the internet" (the weather · Open-Meteo; the markets · Yahoo Finance; game history · Wikidata and Wikipedia; the daily verse · a free Bible API; my calendar · a private link only the Worker knows) with the arrow "The Worker fetches these and keeps a copy", and "On my Mac" (where my car is · Mac Tesla Tracker; my Claude usage · a small usage app) with the arrow "My Mac sends these, checking once a minute".
   - 2 · In the cloud: "A Cloudflare Worker": one small program that is always on; checks for the key; trims the calendar; answers from its copies. Arrow: "The frame asks again every minute or two".
   - 3 · On the wall: "The photo frame": the kiosk app opens the one page at boot; the page draws the seven tiles and works out repeating meetings; a light sensor and a small script turn the screen off in the dark.
   - Under them, "When I change something": publish, the Worker serves it, the frame notices within five minutes and reloads.

