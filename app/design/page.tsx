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
import TetrisPrint from '../components/home/TetrisPrint';
import GitHubMap from '../components/home/GitHubMap';
import HomeNav from '../components/home/HomeNav';
import { AGENTS, PERSONAL, GAMES, place, personal, buildCounts, homeNavItems } from '@/lib/projects';
import contributions from '@/data/github-contributions.json';
import { TOKENS, tokenValues, type TokenGroup } from './tokens';
import SnesKit from './SnesKit';
import { fraktur, vt323 } from '../snes/fonts';
import '../snes/snes.css';
// The write-up pages' own blocks, for their samples below. Their page-wide rules hang off .wb.gm, which this page's
// <main> doesn't carry, so only the named blocks (gm-…, bd-…) reach it.
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

const TYPE = [
  { label: 'Name · serif 58', sample: 'Wesley Bard', style: { font: '600 58px/1.02 var(--serif)', letterSpacing: '-.02em' } },
  { label: 'Section · serif 26', sample: 'Electronics', style: { font: '600 26px/1.15 var(--serif)' } },
  { label: 'Tile name · serif 20', sample: 'Knobdeck', style: { font: '600 20px/1.15 var(--serif)' } },
  { label: 'Figure · serif 24', sample: 'Lockheed Martin', style: { font: '600 24px/1.1 var(--serif)', color: 'var(--accent)' } },
  { label: 'Text · sans 15', sample: 'A desk controller on a round touchscreen you turn.', style: { font: '400 15px/1.55 var(--sans)' } },
  { label: 'Eyebrow · mono 11', sample: 'AUTONOMOUS AI AGENTS', style: { font: '500 11px var(--mono)', letterSpacing: '.08em', color: 'var(--ink-2)' } },
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
              Paper bar with a bottom rule: the wordmark (Bard in the accent), which is the link home, and the theme
              switch, the same three-way pill as the work tools: light, match my computer, dark. The choice is saved in
              this browser and applied before the page paints, so it never flashes. The header carries no other links.
              It&apos;s live at the top of this page.
            </p>

            <h3>The band</h3>
            <p>
              One menu per page, and it is never in the header. A page with parts of its own puts a band first in{' '}
              <code>&lt;main&gt;</code>. It sticks to the top as the header scrolls away, lights the section you are in,
              and scrolls sideways within itself on a phone. <code>HomeNav</code> on the homepage (its six sections,
              then Connect), <code>HealthNav</code> and <code>SnesNav</code> on theirs. This is the homepage&apos;s,
              held still: it doesn&apos;t stick, and its links go to the homepage.
            </p>
            <div className="ds-home-nav">
              <HomeNav items={homeNavItems()} sample="games" />
            </div>
          </section>

          <section className="ch" aria-labelledby="ds-footer">
            <h2 id="ds-footer">The footer</h2>
            <p>
              Paper with a top rule, so the graph paper ends cleanly above it: the name, a Beyond work line, Explore
              (Builds, SNES History, Design system) and Connect, then the year and Back to top over a thin rule. The homepage band&apos;s Connect lands here. It&apos;s live
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
              A print standing over the top of its card. A tile says what the thing does and what it runs on. Outside
              Work, a tile adds a footer: the board, or what it&apos;s written in, then GitHub when the repo is public,
              or a link to its page here when the build lives on this site or has a write-up.
            </p>
            <div className="tiles">
              <ProjectTile project={lucy} />
              <ProjectTile project={knobdeck} footer />
            </div>

            <h3>The trailer print</h3>
            <p>
              A game&apos;s tile can hold its trailer in place of a picture. It starts muted once half of it is on
              screen, and loops. A click on it or Turn sound on gives it sound; scrolling away pauses it and mutes it
              again. A visitor who asked for reduced motion or data saving gets the poster and a Play button, never an
              autoplay. While it holds a trailer the print is not a link: the tile&apos;s footer goes to the game&apos;s
              page.
            </p>
            <div className="tiles">
              <ProjectTile project={conair} footer />
            </div>

            <h3>The highlights row</h3>
            <p>
              The top of the homepage: a row of builds I pick. Each is a print over its card, a size up from the tiles,
              with a button. <code>HIGHLIGHTS</code> in <code>lib/projects.ts</code> is the whole row, in order.{' '}
              <code>LATEST</code> names the one card that wears the filled Latest tag and a strip from a label maker on
              its print; it can be any card in the row. Every card also stays a tile in its own section below. Under
              900px the cards stack.
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
              A page about one build: a game at <code>/games/&lt;slug&gt;</code>, or a build whose repo stays private
              at <code>/builds/&lt;slug&gt;</code>. It opens on a hero with an untilted print beside the name, then a
              facts strip, sections of prints and definition lists, and a closing card. Write-ups are hidden from
              search and out of the sitemap, and each names its own link-preview card. See{' '}
              <a href="/games/con-air">CON AIR</a> and <a href="/builds/photo-frame">Photo Frame Dashboard</a>.
            </p>
            <p>
              The shared blocks are in <code>app/games/games.css</code> (<code>gm-…</code>), a build&apos;s own in{' '}
              <code>app/builds/builds.css</code> (<code>bd-…</code>). These are the ones that exist only there.
            </p>

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
              <code>bd-flow…</code>: three stages joined by labelled arrows, side by side on a wide screen and stacked
              on a phone, in HTML and CSS so the words stay real text. It lives on{' '}
              <a href="/builds/photo-frame">Photo Frame Dashboard</a>, under How everything gets to the frame.
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
              <li>
                A write-up links no private repo, ROM or download, and nothing private goes in its words or pictures.
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
                A page with parts of its own puts its band first in <code>&lt;main&gt;</code>: <code>HomeNav</code>,{' '}
                <code>HealthNav</code> or <code>SnesNav</code>. The header takes no links.
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
