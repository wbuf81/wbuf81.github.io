import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import Print from '../components/home/Print';
import ProjectTile from '../components/home/ProjectTile';
import FeaturedBuild from '../components/home/FeaturedBuild';
import Highlights from '../components/home/Highlights';
import ThenNowStill from '../components/home/ThenNowStill';
import TrailerPrint from '../components/home/TrailerPrint';
import TetrisPrint from '../components/home/TetrisPrint';
import GitHubMap from '../components/home/GitHubMap';
import { FilterChips } from '../components/home/ProjectFilter';
import { AGENTS, PERSONAL, GAMES, place, placement, personal, buildCounts, filterItems } from '@/lib/projects';
import contributions from '@/data/github-contributions.json';
import { TOKENS, tokenValues, type TokenGroup } from './tokens';
import SnesKit from './SnesKit';
import { fraktur, vt323 } from '../snes/fonts';
import '../snes/snes.css';
// The write-up pages' own blocks, for their samples below. Their page-wide rules hang off .wb.gm (and .wb.gm.bd),
// which this page's <main> doesn't carry, so only the named blocks (gm-…, bd-…) reach it; a sample that needs a
// page-wide rule (the four facts, a screenshot's shape) sits in its own .wb.gm wrapper (.ds-gm).
import '../games/games.css';
import '../builds/builds.css';

export const metadata: Metadata = {
  title: 'Design system · Wesley Bard',
  description: "How wesleybard.com is built: its colours, type and building blocks, in light and dark.",
};

// Read at build time, so the values shown are always the stylesheet's own.
const VALUES = tokenValues(fs.readFileSync(path.join(process.cwd(), 'app/design-system.css'), 'utf8'));
const GROUPS: TokenGroup[] = ['Surfaces', 'Ink', 'Accent', 'Meaning', 'Prints', 'Arcade', 'GitHub map', 'Charts', 'SNES'];

// Real copy from the Photo Frame Dashboard write-up (app/builds/photo-frame/page.tsx), for the write-up samples.
const PF_GUIDE = 'https://github.com/wesbos/photo-frame-dashboard/blob/main';
const PF_NOTES: [string, string][] = [
  ['Fetched once', 'The verse and the gaming list are fetched once a day and kept. Weather is kept for ten minutes.'],
  ['Slow Wi-Fi', 'After a power cut the page loads before Wi-Fi does. Every tile keeps the last good data, says how old it is and tries again.'],
];
const PF_WARNINGS = [
  'Back the frame up, and check the backup, before you change anything.',
  'Never cut the power during a write.',
];
const PF_DIR = '/builds/photo-frame';
const PF_FACTS: [string, string, string][] = [
  ['The frame', 'PF1007L', 'a 10.1-inch touch screen sold under several brand names'],
  ['Screen', '1280 × 800', 'one pixel per pixel, so every screen is drawn for exactly this'],
  ['Runs on', 'Android 6', 'with its browser engine upgraded to Chrome 106'],
  ['Served by', 'Cloudflare Workers', 'the free plan, no computer attached'],
];
// The flowchart, cut down to two rows a box, in the photo frame page's own words.
const PF_FLOW_SOURCES: { title: string; rows: [string, string][]; arrow: string }[] = [
  {
    title: 'Out on the internet',
    rows: [
      ['The weather', 'Open-Meteo'],
      ['The markets', 'Yahoo Finance'],
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
const PF_BOOT_LABEL =
  'The boot animation: a Starship lifting off through clouds of smoke under the words Starting up, Wes\'s Dashboard, Launching, with an orange progress bar filling';

const TYPE = [
  { label: 'Name · serif 58', sample: 'Wesley Bard', style: { font: '600 58px/1.02 var(--serif)', letterSpacing: '-.02em' } },
  { label: 'Section · serif 26', sample: 'Explore projects', style: { font: '600 26px/1.15 var(--serif)' } },
  { label: 'Tile name · serif 20', sample: 'Knobdeck', style: { font: '600 20px/1.15 var(--serif)' } },
  { label: 'Figure · serif 24', sample: 'Lockheed Martin', style: { font: '600 24px/1.1 var(--serif)', color: 'var(--accent)' } },
  { label: 'Text · sans 15', sample: 'A desk controller on a round touchscreen you turn.', style: { font: '400 15px/1.55 var(--sans)' } },
  { label: 'Eyebrow · mono 11', sample: 'THE PALS', style: { font: '500 11px var(--mono)', letterSpacing: '.08em', color: 'var(--ink-2)' } },
  { label: 'Caption · mono 11', sample: 'wbuf81/esp32-knobdeck', style: { font: '400 11.5px var(--mono)', color: 'var(--ink-3)' } },
];

export default function DesignPage() {
  const lucy = place(AGENTS.filter((a) => a.key === 'lucy'), 0)[0];
  const knobdeck = place(PERSONAL.filter((p) => p.key === 'knobdeck'), 1)[0];
  const oscar = AGENTS[0];
  const conair = place([GAMES[0]], 2)[0];

  return (
    <>
      <Nav theme />
      <main className={`wb wb-page ${vt323.variable} ${fraktur.variable}`}>
        <div className="wrap ds">
          <header className="ds-top">
            <div className="eyebrow">Design system</div>
            <h1 className="name">How wesleybard.com is built.</h1>
            <p className="lede">
              The site wears the same design system as the tools I build at work: one set of colours with a dark twin
              for each, three typefaces, and a handful of building blocks. Everything below is drawn with the
              site&apos;s own styles, so switching the theme at the top shows both. One stylesheet,{' '}
              <code>app/design-system.css</code>, carries all of it.
            </p>
          </header>

          <section className="ch" aria-labelledby="ds-colour">
            <h2 id="ds-colour">Colour</h2>
            <p>
              Colours are used by name only: <code>var(--accent)</code>, never <code>#0f4c5c</code>. Each token has a
              light and a dark value, shown under its name. Text on an accent fill uses <code>--on-accent</code>, never
              white.
            </p>
            {GROUPS.map((g) => (
              <div key={g}>
                <h3>{g}</h3>
                <div className="sws">
                  {TOKENS.filter((t) => t.group === g).map((t) => (
                    <div className="sw" key={t.name}>
                      <i style={{ background: `var(${t.name})` }} />
                      <code>{t.name}</code>
                      <span>{t.job}</span>
                      <small>{`${VALUES[t.name].light} · ${VALUES[t.name].dark}`}</small>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="ch" aria-labelledby="ds-type">
            <h2 id="ds-type">Type</h2>
            <p>
              Geist Serif for the name, headings, tile names and figures; IBM Plex Sans for text; IBM Plex Mono for
              eyebrows, captions, tags and the subtitles under tile names. Geist Serif comes in one weight, so
              headings stand out by size, not boldness.
            </p>
            <div className="type">
              {TYPE.map((t) => (
                <div key={t.label}>
                  <small>{t.label}</small>
                  <span style={t.style}>{t.sample}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="ch" aria-labelledby="ds-header">
            <h2 id="ds-header">The header</h2>
            <p>
              Paper bar with a bottom rule, one row at every width: the wordmark (Bard in the accent), which is the link
              home, then Connect, which lands on the footer of whatever page you are on, and the theme switch, the same
              three-way pill as the work tools: light, match my computer, dark. The choice is saved in this browser and
              applied before the page paints, so it never flashes. On a phone the switch is hidden, so it is the name
              and Connect. On the homepage the header stays on screen; everywhere else it scrolls away, because the
              SNES and health pages stick their own menus to the top. It carries no other links: a page&apos;s own
              menu goes first in <code>&lt;main&gt;</code>, never up here. It&apos;s live at the top of this page.
            </p>

            <h3>The band</h3>
            <p>
              A tinted strip the width of the page, with the pressed item a raised paper key, and it slides sideways
              within itself on a phone. <code>HealthNav</code> and <code>SnesNav</code> are their pages&apos; menus,
              first in <code>&lt;main&gt;</code> and stuck to the top.
            </p>

            <h3>The project filter</h3>
            <p>
              The homepage&apos;s list has no band. Under the highlights row, in the page&apos;s column,{' '}
              <code>ProjectFilter</code> puts an Explore projects heading in the size of a section heading, then a chip
              per filter: All (pressed to start) and each category, with its emoji and its count. The chips are
              outlined on paper, the pressed one filled in ink, and on a phone they wrap so all seven show. A press
              shows only that category in the one grid below, newest first. All leaves out the highlight cards, which
              sit just above, though its count still includes them; a category shows them as ordinary tiles. Two
              categories open with a note above the grid: Work, with a link to how the pals work, and Gaming, saying
              the games are private builds. The others have none. The address keeps the choice (<code>/#work</code>,{' '}
              <code>/#games</code> …, and <code>/#projects</code> for All), so a link can open a category. Once the chips have
              gone up under the header, a slim bar fixed just under it carries the same chips a size down in one row,
              sliding sideways on a phone with a fade at its edge; it goes again above the chips or past the list, and
              the page never moves when it comes or goes. This is the resting control, held still: its chips do
              nothing here.
            </p>
            <div className="pf-rest">
              <h4 className="pf-h">Explore projects</h4>
              <FilterChips items={filterItems()} pressed="all" />
            </div>
          </section>

          <section className="ch" aria-labelledby="ds-footer">
            <h2 id="ds-footer">The footer</h2>
            <p>
              Paper with a top rule, so the graph paper ends cleanly above it: the name, a Beyond work line, Explore
              (Projects, SNES History, Design system) and Connect, then the year and Back to top over a thin rule. The header&apos;s Connect lands here. It&apos;s live
              at the bottom of this page.
            </p>
          </section>

          <section className="ch" aria-labelledby="ds-blocks">
            <h2 id="ds-blocks">Building blocks</h2>
            <h3>The page</h3>
            <p>
              Graph paper: a faint 24px grid in <code>--grid</code> under every page on the system, scrolling with it.
              Cards, prints, the header and the footer are solid, so the grid only shows in the space between them,
              as it does around this card.
            </p>

            <h3>Buttons, tags and chips</h3>
            <div className="spec-row">
              <button type="button" className="btn">
                View on GitHub →
              </button>
              <button type="button" className="btn ghost">
                Ghost
              </button>
              <button type="button" className="btn sm">
                Small
              </button>
              <span className="tag">Private repo</span>
              <span className="tag acc">Highlight</span>
              <span className="tag fill">Latest</span>
              <span className="chip">Claude Code sessions</span>
            </div>

            <h3>The stat strip</h3>
            <ThenNowStill counts={buildCounts()} />

            <h3>A print</h3>
            <p>
              A photo on a paper border with a wide bottom lip and a mono caption, held on with tape and tilted by
              hand. The tilt and tape come by position from two lists in <code>lib/projects.ts</code>, so a row looks
              scattered whatever moves. Photos stay in full colour.
            </p>
            <div className="spec-print">
              <Print
                image={oscar.image}
                alt={oscar.alt}
                tilt={-2.6}
                tapes={[{ left: '38%', top: '-10px', width: '74px', angle: '-4deg' }]}
                caption={
                  <>
                    <span>{oscar.name}</span>
                    <span>{oscar.kind}</span>
                  </>
                }
              />
            </div>

            <h3>Tiles</h3>
            <p>
              A print standing over the top of its card, four across on a wide screen. Every project is the same tile,
              one entry in <code>lib/projects.ts</code>. On the homepage the category sits over the name, in the eyebrow
              style, and pressing it shows only that category. Then the name and its badge, a mono subtitle, and a line
              or two on what the thing does and what it runs on.
            </p>
            <p>
              The footer names the board it runs on, with its picture, or else what it&apos;s written in. Then one
              link, by the badge. <code>Open source</code> links its public repo, GitHub →, in a new tab. A build that
              lives on this site, or has a write-up here, links that page in the same tab, in the words of its{' '}
              <code>cta</code> (How I built it →, About the game →, How they work →; Explore it → when there is none).
              A <code>Private repo</code> tile links only to its write-up, or nowhere, never outside the site; a{' '}
              <code>Private build</code> links its page under <code>/games/</code>. The project tests hold all of it.
            </p>
            <p>
              The grid runs newest first by each project&apos;s <code>added</code> date, the day it went on the site,
              which is never shown. A new project gets today&apos;s date and lands first. Tilt and tape still go by
              position, so the rows look hand-placed whatever moves.
            </p>
            <div className="tiles">
              <ProjectTile project={lucy} category={{ name: 'Work' }} footer />
              <ProjectTile project={knobdeck} category={{ name: 'Electronics' }} footer />
            </div>

            <h3>The trailer print</h3>
            <p>
              A game&apos;s tile can hold its trailer in place of a picture. It starts muted once half of it is on
              screen, and loops. A click on it or Turn sound on gives it sound; scrolling away pauses it and mutes it
              again. A visitor who asked for reduced motion or data saving gets the poster and a Play button, never an
              autoplay. Pause is always there, because anything that moves by itself for more than five seconds needs
              one. The video loads nothing until it is in view. While it holds a trailer the print is not a link: the
              tile&apos;s footer goes to the game&apos;s page. A game gets one by carrying a <code>trailer</code> in{' '}
              <code>GAMES</code>.
            </p>
            <div className="tiles">
              <ProjectTile project={conair} category={{ name: 'Gaming' }} footer />
            </div>
            <p>
              <code>TrailerPrint</code> also works on its own, for a clip with no sound track, like the photo
              frame&apos;s boot animation below. <code>sound={'{false}'}</code> drops the sound button, and a click on
              the picture plays or pauses it. <code>label</code> is the caption&apos;s left-hand words, and the
              trailer&apos;s <code>width</code> and <code>height</code> are the video&apos;s own size, so it keeps its
              shape while it loads. <code>off</code> stops it, muted, when the homepage filter leaves its tile out; it
              starts again once the tile is back on screen.
            </p>
            <div className="wb gm bd ds-gm spec-print">
              <TrailerPrint
                tilt={placement(3).tilt}
                tapes={placement(3).tapes}
                sound={false}
                label="The boot animation"
                trailer={{ src: `${PF_DIR}/boot.mp4`, poster: `${PF_DIR}/boot.jpg`, width: 1280, height: 800, label: PF_BOOT_LABEL }}
              />
            </div>

            <h3>The highlights row</h3>
            <p>
              The top of the homepage: a row of builds I pick. Each is a print over its card, a size up from the tiles,
              with a button. <code>HIGHLIGHTS</code> in <code>lib/projects.ts</code> is the whole row, in order.{' '}
              <code>LATEST</code> names the one card that wears the filled Latest tag and a strip from a label maker on
              its print; it can be any card in the row. The row always shows, whatever filter is pressed. With All
              pressed the grid below leaves its cards out; a category shows them as ordinary tiles. A card with a
              trailer shows its still picture here, so the three prints stay one height. Under 900px the cards stack.
            </p>
            <Highlights />

            <h3>The featured build</h3>
            <p>
              A big print over the left edge of its panel, with the project&apos;s chips beside the words. The{' '}
              <code>/videogames</code> hub shows SNES History in it.
            </p>
            <FeaturedBuild project={personal('snes')} />

            <h3>The arcade print</h3>
            <p>
              Tetris on a dark screen, with Score and Lines beside it. It plays itself in greys until someone presses
              Play, then takes the arrow keys and space, and only then.
            </p>
            <div className="spec-row">
              <TetrisPrint />
            </div>

            <h3>The GitHub map</h3>
            <GitHubMap data={contributions} />

            <h3>Link cards</h3>
            <div className="links">
              <div className="card">
                <div className="eyebrow">Beyond work</div>
                <h3>A plain card</h3>
                <p>For something to read, not to open.</p>
              </div>
              <a className="card" href="#ds-blocks">
                <div className="eyebrow">Connect</div>
                <h3>A link card</h3>
                <p>The whole card is the link; its border takes the accent on hover.</p>
                <span className="go">Go →</span>
              </a>
            </div>
          </section>

          <section className="ch" aria-labelledby="ds-writeups">
            <h2 id="ds-writeups">Write-up pages</h2>
            <p>
              A page about one build, for when the build itself can&apos;t be shared: a game at{' '}
              <code>/games/&lt;slug&gt;</code>, a build whose repo stays private at <code>/builds/&lt;slug&gt;</code>,
              or the work tools at <code>/work</code>. It opens on a hero with an untilted print beside the name, then
              a facts strip, sections of prints, notes and steps, and a closing card. See{' '}
              <a href="/games/con-air">CON AIR</a>, <a href="/builds/photo-frame">Photo Frame Dashboard</a> and{' '}
              <a href="/work">The pals</a>.
            </p>

            <h3>The recipe</h3>
            <ol className="ds-recipe">
              <li>
                Make <code>app/games/&lt;slug&gt;/page.tsx</code> or <code>app/builds/&lt;slug&gt;/page.tsx</code>. Its
                pictures go in <code>public/games/&lt;slug&gt;/</code> or <code>public/builds/&lt;slug&gt;/</code>, served
                from here and never hotlinked.
              </li>
              <li>
                Import <code>app/games/games.css</code>, and for a build <code>app/builds/builds.css</code> after it.
                Render <code>&lt;Nav theme /&gt;</code>, then <code>&lt;main className=&quot;wb wb-page gm&quot;&gt;</code>{' '}
                (<code>wb wb-page gm bd</code> for a build), then <code>&lt;Footer /&gt;</code>. Inside{' '}
                <code>main</code>, one <code>.wrap</code> holds everything.
              </li>
              <li>
                Blocks only this page needs go in a stylesheet beside it, named by a prefix of its own the way{' '}
                <code>/work</code> has <code>work.css</code> and <code>wk-…</code>, with that class on{' '}
                <code>main</code> too. Tokens only, every selector under <code>.wb</code>.
              </li>
              <li>
                Each part is a <code>section.sec</code> with its <code>h2</code> in a <code>.sec-h</code>, and a{' '}
                <code>p.gnote</code> to open it. The page has one <code>h1</code>, the build&apos;s name.
              </li>
              <li>
                Export <code>metadata</code> with a title (&ldquo;Name · Wesley Bard&rdquo;), a description,{' '}
                <code>robots: {'{ index: false, follow: false }'}</code>, and <code>openGraph</code> and{' '}
                <code>twitter</code> (<code>summary_large_image</code>) that name a card. A child route&apos;s{' '}
                <code>openGraph</code> replaces the site&apos;s images, so the card is always named: the page&apos;s own,{' '}
                <code>public/og-&lt;slug&gt;</code> as a PNG or JPEG (never SVG), or the site&apos;s default from{' '}
                <code>app/layout.tsx</code>, as <code>/work</code> does. Leave the page out of{' '}
                <code>public/sitemap.xml</code>.
              </li>
              <li>
                Write <code>__tests__/&lt;slug&gt;.test.tsx</code>, like <code>games.test.tsx</code>,{' '}
                <code>builds.test.tsx</code> and <code>work.test.tsx</code>: one <code>h1</code>; the metadata, the card
                existing in <code>public/</code>, and no sitemap entry; every picture with its alt text and size; every
                outside link on an allow-list and opening in a new tab; nothing private by its shape (a ROM, a private
                repo&apos;s address, an email); the stylesheet tokens-only and under <code>.wb</code>.
              </li>
              <li>
                Link it from the homepage: the project&apos;s entry in <code>lib/projects.ts</code> gets the page as its{' '}
                <code>href</code> and the link&apos;s words as its <code>cta</code>. Its tile then goes there in the same
                tab. The page&apos;s closing card links back to the homepage; an address like <code>/#games</code> or{' '}
                <code>/#work</code> lands with that category pressed.
              </li>
            </ol>

            <h3>The hero</h3>
            <p>
              The homepage&apos;s <code>.hero</code>: an eyebrow (category, what it runs on, the year), the name as the{' '}
              <code>h1</code>, and the lede, beside one print that isn&apos;t tilted, held by one strip of tape across
              its top (<code>gm-trailer</code> for a video, <code>bd-hero</code> for a screenshot). When some of the
              pictures are made up, a <code>p.fine</code> under the lede says which parts, and that the rest is real.
            </p>

            <h3>The facts strip</h3>
            <p>
              The homepage&apos;s <code>.stats</code> with four cells: a mono key, a figure and a line under it. On a
              write-up it goes four across, two by two under 1100px and one under 480px, so it never leaves an empty
              cell. Every figure is checked against the build&apos;s code before it ships.
            </p>
            <div className="wb gm ds-gm">
              <div className="stats">
                {PF_FACTS.map(([k, n, l]) => (
                  <div key={k}>
                    <div className="k">{k}</div>
                    <div className="n">{n}</div>
                    <div className="l">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <h3>Screenshots</h3>
            <p>
              A screenshot is a print in its own shape, not the system&apos;s 2:1: 3:2 for a Game Boy Advance&apos;s
              screen, 16:10 for the photo frame&apos;s. The page&apos;s stylesheet sets the shape for every print on it,
              and each <code>img</code> carries its real width and height so the room is held while it loads. Where the
              text in a picture is small, the print is a link to the full-size file, in the same tab. Rows of prints
              sit in <code>gm-grid</code>: three across (<code>five</code> for five), two under 860px, one under 480px.
              They take their tilt and tape by position, counting down the page, from <code>placement</code>.
            </p>
            <div className="gm-grid ds-shots">
              <div className="wb gm ds-gm">
                <Print
                  tilt={placement(0).tilt}
                  tapes={placement(0).tapes}
                  caption={
                    <>
                      <span>Endless</span>
                      <span>Main menu</span>
                    </>
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are served as they are */}
                  <img
                    className="ph shot"
                    src="/games/con-air/menu.png"
                    alt="The main menu with Endless selected: Story mode, Endless, Versus, How to play, Extras"
                    width={960}
                    height={640}
                    loading="lazy"
                  />
                </Print>
              </div>
              <div className="wb gm bd ds-gm">
                <Print
                  tilt={placement(1).tilt}
                  tapes={placement(1).tapes}
                  href={`${PF_DIR}/home-paper.jpg`}
                  label="Open the full-size picture: Paper"
                  caption={
                    <>
                      <span>Paper</span>
                      <span>the first look</span>
                    </>
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are served as they are */}
                  <img
                    className="ph shot"
                    src={`${PF_DIR}/home-paper.jpg`}
                    alt="The home screen in the Paper look: white tiles on graph paper with serif headings."
                    width={1280}
                    height={800}
                    loading="lazy"
                  />
                </Print>
              </div>
            </div>

            <h3>The definition list</h3>
            <p>
              <code>gm-dl</code>: short notes, a mono term over a line or two. Two columns, one on a phone.
            </p>
            <dl className="gm-dl">
              {PF_NOTES.map(([term, text]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>

            <h3>The warning card</h3>
            <p>
              <code>bd-warn</code>: a card with a <code>--warn</code> rule down its left edge, for what can go wrong,
              before the steps.
            </p>
            <aside className="card bd-warn" aria-labelledby="ds-warn-h">
              <h3 id="ds-warn-h">Before you start</h3>
              <ul>
                {PF_WARNINGS.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </aside>

            <h3>The numbered steps</h3>
            <p>
              <code>bd-steps</code>: how to make your own. The number in the accent, the step in bold, and a row of
              links under a step that has a guide.
            </p>
            <ol className="bd-steps">
              <li>
                <p>
                  <strong>Get a frame the project supports.</strong> Go by the model on the frame&apos;s About screen,
                  not the brand on the box. The same listing can ship different boards.
                </p>
                <p className="bd-links">
                  <a href={`${PF_GUIDE}/docs/devices.md`} target="_blank" rel="noopener noreferrer">
                    Device index
                  </a>
                </p>
              </li>
              <li>
                <p>
                  <strong>Point the kiosk at your page.</strong> Save the address once. Give your page a version check
                  and it will pick up new deploys by itself.
                </p>
              </li>
            </ol>

            <h3>The flowchart</h3>
            <p>
              <code>bd-flow…</code>: how something works, for a reader who doesn&apos;t build things. Three stages
              joined by labelled arrows, with a strip underneath for what happens next time round. It is HTML and CSS,
              not a picture, so every word is real text that reads on a phone and to a screen reader. Side by side on
              a wide screen; at 980px and under the stages stack and the arrows point down, labels beside them.
            </p>
            <p>
              The markup: a <code>figure.bd-flow</code> with an <code>aria-label</code>, holding an{' '}
              <code>ol.bd-flow-stages</code> of three <code>li.bd-flow-stage</code> (<code>bd-flow-from</code>,{' '}
              <code>bd-flow-cloud</code>, <code>bd-flow-wall</code>), each a <code>p.bd-flow-label</code> and a{' '}
              <code>.bd-flow-body</code>. A box is <code>.bd-flow-box</code> with an <code>h3</code> and either a{' '}
              <code>dl.bd-flow-rows</code> or a <code>ul.bd-flow-points</code>; the middle one adds{' '}
              <code>bd-flow-hub</code> and a <code>p.bd-flow-lead</code>. A box with an arrow out of it sits in a{' '}
              <code>.bd-flow-feed</code> with its <code>.bd-flow-conn</code>. Up to two source boxes, numbered{' '}
              <code>bd-flow-feed-1</code> and <code>-2</code>, so a phone shows both boxes before both arrows. The
              strip is <code>.bd-flow-loop</code>. Keep the words plain. This one is cut down from{' '}
              <a href="/builds/photo-frame">Photo Frame Dashboard</a>; <a href="/work">The pals</a> has one with a
              single source box.
            </p>
            <figure className="bd-flow" aria-label="A sample flowchart: how data reaches the photo frame, in three stages">
              <ol className="bd-flow-stages">
                <li className="bd-flow-stage bd-flow-from">
                  <p className="bd-flow-label">1 · Where it comes from</p>
                  <div className="bd-flow-body">
                    {PF_FLOW_SOURCES.map((s, i) => (
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
                        <div className="bd-flow-conn">
                          <span className="bd-flow-arrow" aria-hidden="true" />
                          <p className="bd-flow-says">{s.arrow}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </li>
                <li className="bd-flow-stage bd-flow-cloud">
                  <p className="bd-flow-label">2 · In the cloud</p>
                  <div className="bd-flow-body">
                    <div className="bd-flow-feed">
                      <div className="bd-flow-box bd-flow-hub">
                        <h3>A Cloudflare Worker</h3>
                        <p className="bd-flow-lead">One small program that is always on.</p>
                        <ul className="bd-flow-points">
                          <li>Checks for the key. No key, no dashboard.</li>
                          <li>Answers from its copies, so the frame never waits on a slow source.</li>
                        </ul>
                      </div>
                      <div className="bd-flow-conn">
                        <span className="bd-flow-arrow" aria-hidden="true" />
                        <p className="bd-flow-says">The frame asks again every minute or two</p>
                      </div>
                    </div>
                  </div>
                </li>
                <li className="bd-flow-stage bd-flow-wall">
                  <p className="bd-flow-label">3 · On the wall</p>
                  <div className="bd-flow-body">
                    <div className="bd-flow-box">
                      <h3>The photo frame</h3>
                      <ul className="bd-flow-points">
                        <li>A kiosk app opens the one page when it boots.</li>
                        <li>The page draws the seven tiles and works out my repeating meetings.</li>
                      </ul>
                    </div>
                  </div>
                </li>
              </ol>
              <div className="bd-flow-loop">
                <p className="bd-flow-label">When I change something</p>
                <p>
                  I publish a new version, the Worker starts serving it, and within five minutes the frame notices and
                  reloads itself. Nobody touches the frame.
                </p>
              </div>
            </figure>

            <h3>The roster</h3>
            <p>
              A page about several builds shows them with the homepage&apos;s own tiles, <code>ProjectTile</code>{' '}
              without its <code>footer</code>, so it carries no link back to the page it is on. The words come from{' '}
              <code>lib/projects.ts</code>, so a tile edit changes both. <code>/work</code> puts its nine three across
              (<code>wk-tiles</code>), then two, then one.
            </p>

            <h3>The animated sprite</h3>
            <p>
              Pixel art that moves, like Jeffrey walking across the photo frame&apos;s walk card (<code>bd-jeffrey</code>):
              a sprite sheet stepped through with CSS <code>steps()</code>, drawn with{' '}
              <code>image-rendering: pixelated</code>, with a <code>role=&quot;img&quot;</code> and a label. Under reduced
              motion it holds still on its first frame. Set the sheet on the element&apos;s own style, so the bundler
              never has to resolve it.
            </p>

            <h3>The closing card</h3>
            <p>
              Every write-up ends on a <code>card gm-note</code> with an <code>h2</code>: what isn&apos;t here and why
              (&ldquo;Not for download&rdquo;, &ldquo;What isn&apos;t here&rdquo;), or the credits
              (&ldquo;Credit where it&apos;s due&rdquo;, with <code>bd-credit</code>). It may carry a row of chips for
              what it was built with, and ends with a <code>.go</code> link back to the homepage.
            </p>
          </section>

          <SnesKit />

          <section className="ch" aria-labelledby="ds-writing">
            <h2 id="ds-writing">Writing</h2>
            <ul>
              <li>A tile says what a thing does and what it runs on. Never repo statistics: no line, test or commit counts.</li>
              <li>
                Public copy names no client, vendor, regulator, brokerage or figure: &ldquo;a domain-name watch
                service&rdquo;, not the vendor&apos;s name.
              </li>
              <li>Counts are computed from the project lists and spelled out (&ldquo;nine builds&rdquo;), so they can&apos;t go stale.</li>
              <li>The homepage is about the building, not a résumé. Keep the top terse; no taglines.</li>
              <li>Plain English, from the reader&apos;s side of the screen.</li>
              <li>
                On the SNES pages the newspaper is &ldquo;The Omaha World-Pixel&rdquo;. The real Omaha paper&apos;s name
                never appears anywhere.
              </li>
              <li>
                A price always says when and what kind: &ldquo;$199.99 at launch in 1991&rdquo;, &ldquo;$99.99 in a 1993
                catalog&rdquo;, then &ldquo;about $X today&rdquo;. Never &ldquo;then&rdquo;.
              </li>
              <li>
                The Top 8 says &ldquo;snesspace&rdquo;, never &ldquo;myspace&rdquo;, and its themes use no game logos, ripped
                art or trademarked game names.
              </li>
              <li>Titles are the US titles as printed on the box.</li>
              <li>State the fact and stop. No narration and no captions that explain what the reader can already see.</li>
              <li>
                A write-up never carries a ROM, a download, a save file or a link to a private repo. Nothing private goes
                in it in any form: not in its words, pictures, tests or scripts. This repo is public, so a test bans a
                private thing by its shape and never names the real value to ban it.
              </li>
              <li>
                A picture of something private is made again from made-up data, never a screenshot of the real thing,
                and a fine-print line under the lede says what was made up.
              </li>
              <li>
                A page about work says only what has already been approved for it. It names no vendor, client, person
                or number, and says &ldquo;the company&apos;s single sign-on&rdquo;, not the product.
              </li>
            </ul>
          </section>

          <section className="ch" aria-labelledby="ds-using">
            <h2 id="ds-using">Using it on a page</h2>
            <ul>
              <li>
                The root layout loads the stylesheet. Put the page in <code>&lt;main className=&quot;wb wb-page&quot;&gt;</code> and
                use the classes shown here, with the shared <code>Nav</code> and <code>Footer</code>.
              </li>
              <li>
                A new colour goes in the stylesheet, light and dark, and in <code>TOKENS</code> on this page, or the
                tests fail.
              </li>
              <li>
                One menu per page. A page with parts of its own puts its band first in <code>&lt;main&gt;</code>:{' '}
                <code>HealthNav</code> or <code>SnesNav</code>. The menu never goes in the header, which carries Connect
                and nothing else. Only the homepage&apos;s header stays on screen (<code>&lt;Nav theme sticky /&gt;</code>),
                with the projects&apos; slim bar under it at <code>var(--head-h)</code>.
              </li>
              <li>
                Every card shows. Nothing is folded away behind a toggle, a drop-down or a More link; a filter may narrow
                a list, but it starts on All.
              </li>
              <li>
                A list of builds runs newest first, by <code>added</code>. A story, like the health change log, may run
                oldest first.
              </li>
              <li>
                A page reached from a project tile follows the write-up recipe above, and its tile links it through{' '}
                <code>href</code> and <code>cta</code>.
              </li>
              <li>Every block is scoped under <code>.wb</code>, so pages with their own look are untouched.</li>
              <li>
                A write-up imports <code>app/games/games.css</code>, and <code>app/builds/builds.css</code> for a
                build, and adds <code>gm</code> (and <code>bd</code>) to its <code>&lt;main&gt;</code>.
              </li>
              <li>
                An SNES page also imports <code>app/snes/snes.css</code>, starts <code>&lt;main&gt;</code> with{' '}
                <code>SnesNav</code> and ends with <code>SnesCredit</code>. Route paths come from{' '}
                <code>lib/snes/routes.ts</code>, never typed by hand.
              </li>
              <li>
                Anything else stuck to the top of an SNES page sits under the menu: <code>top: var(--s-nav-h)</code>.
              </li>
              <li>
                The display faces in <code>app/snes/fonts.ts</code> go on <code>&lt;main&gt;</code> only on the pages
                that use them, never site-wide.
              </li>
              <li>
                Nothing that reads the visitor&apos;s saved Top 8 or settings renders on the server: the Top 8 store
                answers <code>null</code> there, and the star, tray and badge appear after load.
              </li>
              <li>Check both themes and a phone (390 px wide) before shipping.</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
