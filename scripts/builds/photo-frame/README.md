# Glance demo screenshots

How the public pictures of the photo-frame dashboard ("Glance") were made: a throwaway copy of the
app, run locally, fed made-up data, shot headless. Nothing here holds a key, an address or anything
from the real calendar; keys are generated when the copy is made.

## Files
- `setup-copy.sh` makes the copy: `git archive` of the dashboard (tracked files only), a clone of its
  `node_modules`, `patch-copy.py`, and a `.dev.vars` with fresh random keys pointing the calendar at
  the local fake feed.
- `patch-copy.py` edits the copy only: the home location becomes Cape Canaveral 32920 (place, the
  forecast's title, the weather tile's caption), and the weather route takes an optional
  `X-Demo-Now` header so "current" weather is Open-Meteo's forecast for the frozen clock's hour,
  and the verse route takes an optional `X-Demo-Verse` header naming a verse from the app's own
  THANKS list (fetched from the Bible API as usual). The pictures use Philippians 1:3, which fits
  in two lines of the clock tile; set `DEMO_VERSE` (e.g. "PSA 118:24") to pick another.
- `make-ics.mjs` writes an invented Outlook-style calendar for the current Mon-Fri week (Eastern):
  33 timed events (busy, tentative, free, out of office, working elsewhere; overlaps; a recurring
  standup with one moved occurrence and a recurring Monday sync) and four all-day ones, with
  Thursday out of office for Thanksgiving. `serve-ics.mjs` serves it to the local Worker.
- `push-readings.mjs` pushes invented Claude-usage readings (orgs Apollo and Voyager) and an
  invented car reading (public places near Cape Canaveral) to the local Worker.
- `shoot.cjs` takes the ten 1280x800 pictures with the page clock frozen at today's date.

## Run
```sh
T=<this folder>; W=<empty work dir>
sh $T/setup-copy.sh <photo-frame-dashboard repo> $W http://127.0.0.1:5288/calendar.ics
node $T/serve-ics.mjs 5288 &
(cd $W/dashboard && ./node_modules/.bin/vite --host 127.0.0.1 --port 5287 --strictPort) &
node $T/shoot.cjs $W/dashboard <out dir> http://127.0.0.1:5287 [one-file.png ...]
```
Then stop both servers. Needs Node 25, Google Chrome and playwright-core (installed where Node can find it,
or set `PLAYWRIGHT_CORE` to its folder). Local dev only: nothing talks to the deployed Worker.

## What is live, and what isn't
Verse, gaming history, markets and weather come from their public sources at run time. The Worker
fetches them at the real time, so the shoot script restates each response's `updated` time as two
minutes before the frozen clock (otherwise the tiles would say "updated 300 min ago") and works out
whether the market is open from the frozen clock. That can't honestly show the pre-open state:
before 9:30 AM the frame would show the previous session's close, which a run during the day
doesn't have, so a 9:05 AM shot reads "At close · today" over the current session's prices. Prices and the sparkline are the ones fetched at
run time, so a shot frozen at another time of day shows the session as it stood when it was run.

## From screenshots to the site
`to-site.py` turns the PNGs into what the site serves: the six screens the page shows and the boot
screen as JPEGs in `public/builds/photo-frame/`, the homepage tile (`public/projects/photo-frame.jpg`)
and the link-preview card (`public/og-photo-frame.jpg`). Its header says what it needs. The page uses
six of the ten pictures; the morning shot is left out because of the markets label described above.

## Before any of this goes in the repo
This repo is public. Look at every picture, and search the tools and pictures for anything private
(the real town, ZIP and coordinates, the dashboard's address, keys, the real account names) by reading
those values from the private project at run time, never by writing them down here.

