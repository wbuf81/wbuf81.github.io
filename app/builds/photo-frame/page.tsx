import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Nav } from '../../components/Nav';
import Footer from '../../components/Footer';
import Print from '../../components/home/Print';
import { placement } from '@/lib/projects';
import '../../games/games.css';
import '../builds.css';

/*
 * Photo Frame Dashboard, Wes's hacked PF1007L photo frame (spec: docs/superpowers/specs/2026-11-24-photo-frame-build-page-design.md).
 * A write-up, not the code: the repo is private, so there is no link to it, and everything private in the pictures is
 * made up. The page points at the public guide for getting into the frame and never restates its steps. Every outside
 * link here was checked on 24 Nov 2026; __tests__/builds.test.tsx holds them to that list.
 */

const TITLE = 'Photo Frame Dashboard · Wesley Bard';
const DESCRIPTION = 'A Wi-Fi photo frame I opened up and turned into a dashboard for my day, and how to make your own.';
const CARD = { url: '/og-photo-frame.jpg', width: 1200, height: 630, alt: 'The photo frame dashboard at night' };

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // A child route's openGraph replaces the parent's images, so the page names its own card.
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/builds/photo-frame', images: [CARD] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [CARD.url] },
  robots: { index: false, follow: false },
};

const DIR = '/builds/photo-frame';
const U = 'https://github.com/wesbos/photo-frame-dashboard/blob/main';

interface Shot {
  file: string;
  caption: [string, string];
  alt: string;
}

const HERO: Shot = {
  file: 'home-tokyo-night.jpg',
  caption: ['The home screen', 'Tokyo Night, 8:12 PM'],
  alt: 'The dashboard at night: a large clock reading 8:12 PM with a greeting and a Bible verse over a rocket launch, tomorrow\'s calendar, the weather with a Walk with Jeffrey card, the markets, a game released on this day, the car\'s position and two rings of Claude usage.',
};

// How everything gets to the frame: a flowchart for people who don't build things. Each source box feeds the Worker
// by its own labelled arrow; the Worker feeds the frame. Real text throughout, so it reads on a phone and without CSS.
interface FlowSource {
  title: string;
  rows: [string, string][];
  arrow: string;
}

const FLOW_SOURCES: FlowSource[] = [
  {
    title: 'Out on the internet',
    rows: [
      ['The weather', 'Open-Meteo'],
      ['The markets', 'Yahoo Finance'],
      ['Game history', 'Wikidata and Wikipedia'],
      ['The daily verse', 'a free Bible API'],
      ['My calendar', 'a private link only the Worker knows'],
    ],
    arrow: 'The Worker fetches these and keeps a copy',
  },
  {
    title: 'On my Mac',
    rows: [
      ['Where my car is', 'Mac Tesla Tracker'],
      ['My Claude usage', 'a small usage app'],
    ],
    arrow: 'My Mac sends these, checking once a minute',
  },
];

const FLOW_WORKER = {
  title: 'A Cloudflare Worker',
  lead: 'One small program that is always on.',
  points: [
    'Checks for the key. No key, no dashboard.',
    'Trims my calendar down to the days that matter.',
    'Answers from its copies, so the frame never waits on a slow source.',
  ],
  arrow: 'The frame asks again every minute or two',
};

const FLOW_FRAME = {
  title: 'The photo frame',
  points: [
    'A kiosk app opens the one page when it boots.',
    'The page draws the seven tiles and works out my repeating meetings.',
    'A light sensor and a small script turn the screen off when the room goes dark.',
  ],
};

const FLOW_LOOP = {
  label: 'When I change something',
  text: 'I publish a new version, the Worker starts serving it, and within five minutes the frame notices and reloads itself. Nobody touches the frame.',
};

const LOOKS: Shot[] = [
  {
    file: 'home-daylight.jpg',
    caption: ['Daylight', '2:46 PM'],
    alt: 'The same home screen by day: cream frosted tiles over a rocket launch in daylight, the afternoon\'s meetings with a line at the current time, and the car parked at Space Center.',
  },
  {
    file: 'home-paper.jpg',
    caption: ['Paper', 'the first look'],
    alt: 'The home screen in the Paper look: white tiles on graph paper with serif headings, showing the same afternoon.',
  },
];

const TAPS: Shot[] = [
  {
    file: 'week-daylight.jpg',
    caption: ['The work week', 'tap the calendar'],
    alt: 'The work week, Monday to Friday: meetings as coloured blocks by busy, tentative, free and out of office, all-day events along the top, and a line at the current time.',
  },
  {
    file: 'forecast-tokyo-night.jpg',
    caption: ['The full forecast', 'tap the weather'],
    alt: 'The full forecast: now, the next 24 hours, seven days with rain and temperature bars, a large Walk with Jeffrey card and a sprinkler card.',
  },
  {
    file: 'settings-tokyo-night.jpg',
    caption: ['The gear screen', 'brightness, sleep, walk time, theme'],
    alt: 'The settings screen: a brightness slider, sleep modes, the walk\'s start and end times, and four theme buttons.',
  },
];

const BOOT: Shot = {
  file: 'boot.jpg',
  caption: ['The boot screen', '18 seconds of liftoff'],
  alt: 'The boot screen: a Starship lifting off through clouds of smoke, with the words Starting up, Wes\'s Dashboard, Launching and an orange progress bar.',
};

const TILES: [string, string][] = [
  ['Clock', 'The time, a greeting, my next meeting and a verse of thanks that changes every day. After 5 PM the meeting line becomes the evening walk.'],
  ['Calendar', 'Today as a day grid, coloured by busy, tentative, free and out of office. Once today\'s meetings are over it shows the next day that has any.'],
  ['Weather', 'Now, the week ahead, a sentence about today in plain words, and whether the sprinklers should run.'],
  ['Markets', 'The day\'s biggest mover gets the big spot: price, change, the day\'s line, where it sits in its 52-week range and a headline. Three more sit under it as rows.'],
  ['Car', 'Where my car is on a small map, its charge and whether it is locked. The reading comes from Mac Tesla Tracker, another thing I built.'],
  ['On this day in gaming', 'The best-known game first released on today\'s date between 1980 and 2006, with its box art and a few more from the same day.'],
  ['Claude usage', 'A ring for each account\'s week and a bar for its current five-hour window.'],
];

const WORKER: [string, string][] = [
  ['Locked', 'A workers.dev address is public and this page shows a calendar, so every request needs a key. Without it the Worker answers 404 to everything, as if nothing were there.'],
  ['The calendar', 'Working out every repeating meeting in a calendar feed took about 270 ms in my tests, 27 times the allowance. So the Worker only trims the feed to the days that matter, about 1.4 ms, and the frame works out the meetings itself on a background thread, so the clock never stalls.'],
  ['Fetched once', 'The verse and the gaming list are fetched once a day and kept. Weather is kept for ten minutes.'],
  ['Updates', 'Every build has an ID. The page asks for it every five minutes and reloads when it changes, so a new version reaches the frame by itself.'],
  ['From my Mac', 'Two tiles do need a computer: my Mac sends the car\'s reading and my Claude usage, checking once a minute. When it is off those two tiles say so and the rest carries on.'],
  ['Slow Wi-Fi', 'After a power cut the page loads before Wi-Fi does. Every tile keeps the last good data, says how old it is and tries again.'],
];

const OLD_SCREEN: [string, string][] = [
  ['A browser from 2022', 'Even upgraded, the frame\'s engine is Chrome 106. No color-mix, no nesting, no :has(), and it refuses the four- and eight-digit hex colours Chrome 106 is supposed to accept. Colours are written the long way and every tint is worked out ahead of time.'],
  ['No blur, no emoji', 'The graphics chip is too weak for live blur, and Android 6 has no emoji font, so emoji are stripped from meeting titles before they turn into boxes.'],
  ['One pixel per pixel', 'The panel is 1280 × 800 with no retina scaling, so nothing is drawn at double size and every layout is fixed to that width.'],
  ['A slow chip', 'Heavy work goes to a background thread, and the page reloads itself at 3 AM to clear anything that has built up.'],
  ['Old certificates', 'The frame doesn\'t trust some of today\'s certificate authorities, so the Worker fetches box art itself and hands it over, and the frame never has to talk to those sites.'],
];

const WARNINGS = [
  'This can break a frame for good. Read the project\'s guide for the actual steps; this page is only the map.',
  'Back the frame up, and check the backup, before you change anything.',
  'Frames differ even under the same name and listing. Match the model on the About screen and stop at the first thing that doesn\'t match the guide.',
  'Never cut the power during a write.',
  'Keep your backups private. They hold your Wi-Fi password.',
];

interface Step {
  title: string;
  text: string;
  links: [string, string][];
}

const STEPS: Step[] = [
  {
    title: 'Get a frame the project supports.',
    text: 'Go by the model on the frame\'s About screen, not the brand on the box. The same listing can ship different boards.',
    links: [['Device index', `${U}/docs/devices.md`]],
  },
  {
    title: 'Follow the start-here guide.',
    text: 'It covers backing the frame up and getting developer access, with a check after every step. Stop at the first check that fails.',
    links: [['PF1007L: start here', `${U}/docs/pf1007l-start-here.md`]],
  },
  {
    title: 'Replace the photo app and upgrade the browser engine.',
    text: 'The engine it ships with is far too old for a modern page. The guide swaps in Chrome 106\'s.',
    links: [['The PF1007L guide', `${U}/docs/allwinner-a33-pf1007l.md`]],
  },
  {
    title: 'Install the kiosk app and make it the Home app.',
    text: 'It opens one address full screen at every boot and keeps retrying until Wi-Fi is up.',
    links: [['The kiosk app', `${U}/dashboard/kiosk/README.md`]],
  },
  {
    title: 'Build your page for 1280 × 800 and Chrome 106.',
    text: 'Set your bundler\'s targets the way the builder\'s guide says, or newer CSS will quietly break.',
    links: [['Building for the frame', `${U}/docs/building-for-the-frame.md`]],
  },
  {
    title: 'Host it somewhere that is always on.',
    text: 'I use a Cloudflare Worker on the free plan, with KV for the few things it has to remember. Mind the 10 ms of processor time per request.',
    links: [
      ['Cloudflare Workers', 'https://developers.cloudflare.com/workers/'],
      ['its limits', 'https://developers.cloudflare.com/workers/platform/limits/'],
      ['KV', 'https://developers.cloudflare.com/kv/'],
    ],
  },
  {
    title: 'Point the kiosk at your page.',
    text: 'Save the address once. Give your page a version check and it will pick up new deploys by itself.',
    links: [],
  },
  {
    title: 'Optional: make it boot reliably.',
    text: 'The project\'s boot fixes give the frame one Wi-Fi address and the right time after a power cut.',
    links: [['Boot fixes', `${U}/docs/pf1007l-boot-fixes.md`]],
  },
  {
    title: 'Optional: your own boot screens.',
    text: 'Three images to replace. Follow that doc\'s cautions closely, because a bad write here can damage the frame.',
    links: [['Boot screens', `${U}/docs/allwinner-a33-boot-screens.md`]],
  },
];

const BUILT_WITH = ['JavaScript', 'Vite', 'Cloudflare Workers', 'Workers KV', 'ical.js', 'Android 6'];

// An outside link: always a new tab, never the opener.
function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

// A screenshot as a taped print that opens its own full-size picture, since the text in it is small. The width and
// height keep its 16:10 room while it loads; games.css sets the height back to auto so the attribute never stretches it.
function ShotPrint({ shot, at, eager = false, className }: { shot: Shot; at?: number; eager?: boolean; className?: string }) {
  const src = `${DIR}/${shot.file}`;
  // The hero is untilted, with one strip of tape across its top, like the CON AIR trailer.
  const { tilt, tapes } = at === undefined ? { tilt: 0, tapes: [{ left: '41%', top: '-10px', width: '100px', angle: '-4deg' }] } : placement(at);
  return (
    <Print
      className={className}
      tilt={tilt}
      tapes={tapes}
      href={src}
      label={`Open the full-size picture: ${shot.caption[0]}`}
      caption={
        <>
          <span>{shot.caption[0]}</span>
          <span>{shot.caption[1]}</span>
        </>
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are served as they are */}
      <img className="ph shot" src={src} alt={shot.alt} width={1280} height={800} loading={eager ? 'eager' : 'lazy'} />
    </Print>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="sec" aria-labelledby={id}>
      <div className="sec-h">
        <h2 id={id}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Notes({ items, className }: { items: [string, string][]; className?: string }) {
  return (
    <dl className={className ? `gm-dl ${className}` : 'gm-dl'}>
      {items.map(([term, text]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}

// An arrow's line and head, drawn in CSS from currentColor; its label beside it is the real text.
function FlowArrow({ label, className }: { label: string; className?: string }) {
  return (
    <div className={className ? `bd-flow-conn ${className}` : 'bd-flow-conn'}>
      <span className="bd-flow-arrow" aria-hidden="true" />
      <p className="bd-flow-says">{label}</p>
    </div>
  );
}

function Flow() {
  return (
    <figure className="bd-flow" aria-label="How data reaches the photo frame, in three stages">
      <ol className="bd-flow-stages">
        <li className="bd-flow-stage bd-flow-from">
          <p className="bd-flow-label">1 · Where it comes from</p>
          <div className="bd-flow-body">
            {FLOW_SOURCES.map((s, i) => (
              <div key={s.title} className={`bd-flow-feed bd-flow-feed-${i + 1}`}>
                <div className="bd-flow-box">
                  <h3>{s.title}</h3>
                  <dl className="bd-flow-rows">
                    {s.rows.map(([thing, from]) => (
                      <div key={thing}>
                        <dt>{thing}</dt>
                        <dd>{from}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <FlowArrow label={s.arrow} />
              </div>
            ))}
          </div>
        </li>
        <li className="bd-flow-stage bd-flow-cloud">
          <p className="bd-flow-label">2 · In the cloud</p>
          <div className="bd-flow-body">
            <div className="bd-flow-feed">
              <div className="bd-flow-box bd-flow-hub">
                <h3>{FLOW_WORKER.title}</h3>
                <p className="bd-flow-lead">{FLOW_WORKER.lead}</p>
                <ul className="bd-flow-points">
                  {FLOW_WORKER.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <FlowArrow label={FLOW_WORKER.arrow} />
            </div>
          </div>
        </li>
        <li className="bd-flow-stage bd-flow-wall">
          <p className="bd-flow-label">3 · On the wall</p>
          <div className="bd-flow-body">
            <div className="bd-flow-box">
              <h3>{FLOW_FRAME.title}</h3>
              <ul className="bd-flow-points">
                {FLOW_FRAME.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </li>
      </ol>
      <div className="bd-flow-loop">
        <p className="bd-flow-label">{FLOW_LOOP.label}</p>
        <p>{FLOW_LOOP.text}</p>
      </div>
    </figure>
  );
}

export default function PhotoFramePage() {
  // Prints take their tilt and tape by position, counting down the page; the hero's is untilted.
  const tapsAt = LOOKS.length;
  const bootAt = tapsAt + TAPS.length;

  return (
    <>
      <Nav theme />
      <main className="wb wb-page gm bd">
        <div className="wrap">
          <section className="hero" aria-label="Photo Frame Dashboard">
            <div className="hero-text">
              <div className="eyebrow">Electronics · Android photo frame · 2026</div>
              <h1 className="name">Photo Frame Dashboard</h1>
              <p className="lede">
                A 10.1-inch Wi-Fi photo frame, the kind that cycles through family pictures, that I opened up and gave a
                new job. It shows my day now: my calendar, the weather, the markets, where my car is and how much Claude I
                have used. It still runs the frame&apos;s own Android 6, and the page comes from a Cloudflare Worker, so no
                computer has to be on.
              </p>
              <p className="fine bd-made-up">
                Everything private in these pictures is made up: the calendar, the location, the car&apos;s position and
                the account names. The rest is the real thing.
              </p>
            </div>
            <ShotPrint shot={HERO} eager className="bd-hero" />
          </section>

          <div className="stats">
            <div>
              <div className="k">The frame</div>
              <div className="n">PF1007L</div>
              <div className="l">a 10.1-inch touch screen sold under several brand names</div>
            </div>
            <div>
              <div className="k">Screen</div>
              <div className="n">1280 × 800</div>
              <div className="l">one pixel per pixel, so every screen is drawn for exactly this</div>
            </div>
            <div>
              <div className="k">Runs on</div>
              <div className="n">Android 6</div>
              <div className="l">with its browser engine upgraded to Chrome 106</div>
            </div>
            <div>
              <div className="k">Served by</div>
              <div className="n">Cloudflare Workers</div>
              <div className="l">the free plan, no computer attached</div>
            </div>
          </div>

          <Section id="on-it-h" title="What's on it">
            <p className="gnote">The home screen is seven tiles. Two of them open into a full screen when I tap them.</p>
            <Notes items={TILES} className="bd-tiles" />
            <aside className="card bd-walk" aria-labelledby="walk-h">
              <span
                className="bd-jeffrey"
                role="img"
                aria-label="Jeffrey, a pixel-art figure, walking"
                style={{ backgroundImage: `url(${DIR}/jeffrey-walk.png)` }}
              />
              <div className="bd-walk-text">
                <h3 id="walk-h">Walk with Jeffrey</h3>
                <p>
                  The weather tile also answers one question every evening: is it a good night for the walk? It checks
                  storms, rain, heat, cold and wind in that order, and the first one that applies is the verdict. On a good
                  night Jeffrey walks across the card. On a stay-in night he stands still.
                </p>
              </div>
            </aside>
          </Section>

          <Section id="flow-h" title="How everything gets to the frame">
            <p className="gnote">
              The frame itself does very little. It opens one web page and asks for fresh numbers every minute or two. A
              small program in the cloud does the fetching, and my Mac adds the two things only it knows.
            </p>
            <Flow />
          </Section>

          <Section id="looks-h" title="Three looks, and one that follows the sun">
            <p className="gnote">
              The first look was Paper: white tiles on graph paper, like this site. Tokyo Night, the one at the top of this
              page, borrows <Ext href="https://github.com/omacom/omarchy">Omarchy</Ext>&apos;s Tokyo Night theme and its
              liftoff wallpaper, with the rocket climbing through a clear clock window. Daylight is the same layout over the
              launch in daylight colours. Auto switches between the two: Daylight from sunrise to sunset, Tokyo Night after
              dark. The frame works out sunrise and sunset itself, to within a few minutes.
            </p>
            <p className="gnote">
              The frosted glass is a trick. This frame can&apos;t blur anything live, so each window sits on a copy of the
              wallpaper that was blurred ahead of time and lined up behind it.
            </p>
            <div className="gm-grid bd-two">
              {LOOKS.map((s, i) => (
                <ShotPrint key={s.file} shot={s} at={i} />
              ))}
            </div>
          </Section>

          <Section id="tap-h" title="Tap for more">
            <p className="gnote">
              It is a touch screen. Tapping the calendar opens the work week and tapping the weather opens the full
              forecast. Any screen but home goes back by itself after a minute without a touch.
            </p>
            <div className="gm-grid">
              {TAPS.map((s, i) => (
                <ShotPrint key={s.file} shot={s} at={tapsAt + i} />
              ))}
            </div>
          </Section>

          <Section id="worker-h" title="No computer attached">
            <p className="gnote">
              One Cloudflare Worker serves the page and answers every request for data. It is on the free plan, which
              allows 10 milliseconds of processor time per request. That limit shaped most of it.
            </p>
            <Notes items={WORKER} />
          </Section>

          <Section id="frame-h" title="On the frame itself">
            <p className="gnote">
              The frame ships locked down as a photo app. Wes Bos&apos;s{' '}
              <Ext href="https://github.com/wesbos/photo-frame-dashboard">photo-frame-dashboard</Ext> project documents how
              to get developer access to this model and many others, and I followed its guide one checked step at a time,
              after backing the whole frame up. Most of what now runs on the frame is that project&apos;s work: the kiosk
              app that opens one page full screen at every boot, a newer browser engine, and fixes so it comes back properly
              after a power cut.
            </p>
            <div className="bd-pair">
              <div className="bd-blocks">
                <div>
                  <h3>It sleeps when the room is dark</h3>
                  <p>
                    My addition is a small script that runs on the frame. Every five seconds it reads the light sensor. When
                    the room has been dark for five minutes it switches the backlight off, and when the lights come back so
                    does the screen. A tap wakes it for five minutes. Android never learns the screen went dark, which is why
                    the sensor and the touch screen keep working.
                  </p>
                </div>
                <div>
                  <h3>It boots on a rocket launch</h3>
                  <p>
                    The three boot screens are replaced too. The frame starts on a Starship standing on the pad, then plays
                    the launch as its boot animation: 216 frames at 12 a second, 18 seconds in all, with a progress bar under
                    the words.
                  </p>
                </div>
              </div>
              <ShotPrint shot={BOOT} at={bootAt} className="bd-boot" />
            </div>
          </Section>

          <Section id="old-h" title="Built for an old, slow screen">
            <Notes items={OLD_SCREEN} />
          </Section>

          <Section id="make-h" title="Make your own">
            <p className="gnote">
              My code stays private because it is wired to my calendar and my home. But nearly everything it stands on is
              public and well documented. Start with Wes Bos&apos;s <Ext href="https://youtu.be/ZLycoUMltNI">video</Ext> and
              the project&apos;s <Ext href={`${U}/README.md`}>README</Ext>, then this is the order I would do it in.
            </p>

            <aside className="card bd-warn" aria-labelledby="warn-h">
              <h3 id="warn-h">Before you start</h3>
              <ul>
                {WARNINGS.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </aside>

            <ol className="bd-steps">
              {STEPS.map((s) => (
                <li key={s.title}>
                  <p>
                    <strong>{s.title}</strong> {s.text}
                  </p>
                  {s.links.length > 0 && (
                    <p className="bd-links">
                      {s.links.map(([label, href]) => (
                        <Ext key={href} href={href}>
                          {label}
                        </Ext>
                      ))}
                    </p>
                  )}
                </li>
              ))}
            </ol>

            <h3 className="bd-h3">Where my data comes from</h3>
            <ul className="bd-sources">
              <li>
                Weather, the walk and the sprinklers: <Ext href="https://open-meteo.com/en/docs">Open-Meteo</Ext>, free and
                with no key.
              </li>
              <li>
                Gaming history:{' '}
                <Ext href="https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service">Wikidata&apos;s query service</Ext>,
                with box art through <Ext href="https://en.wikipedia.org/api/rest_v1/">Wikipedia&apos;s API</Ext>.
              </li>
              <li>
                The verse: the <Ext href="https://bible.helloao.org/docs/">Free Use Bible API</Ext>, serving the Berean
                Standard Bible, which is in the public domain.
              </li>
              <li>
                The calendar: a published calendar link, read with <Ext href="https://github.com/kewisch/ical.js">ical.js</Ext>.
              </li>
              <li>
                Sunrise and sunset: the maths from <Ext href="https://github.com/mourner/suncalc">SunCalc</Ext>.
              </li>
              <li>Markets come from an unofficial Yahoo Finance endpoint, so there is no manual to point you at.</li>
            </ul>
          </Section>

          <aside className="card gm-note bd-credit" aria-labelledby="credit-h">
            <h2 id="credit-h">Credit where it&apos;s due</h2>
            <p>
              The hardware work is Wes Bos&apos;s photo-frame-dashboard and its contributors, under the MIT licence: the
              device research, the kiosk app, the boot fixes and the boot-screen method. The night look is Omarchy&apos;s
              Tokyo Night theme and its liftoff wallpaper. The type is IBM Plex, Source Serif 4 and JetBrains Mono. Weather
              is from Open-Meteo, game history from Wikidata and Wikipedia, verses from the Berean Standard Bible and map
              tiles from Esri.
            </p>
            <p>
              The dashboard, its Worker, the sleep script and the boot screens are mine, built with Claude Code starting in
              October 2026. The repo is private.
            </p>
            <div className="chips">
              {BUILT_WITH.map((c) => (
                <span className="chip" key={c}>
                  {c}
                </span>
              ))}
            </div>
            <a className="go" href="/">
              Back to the homepage
            </a>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
