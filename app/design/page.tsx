import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import Print from '../components/home/Print';
import ProjectTile from '../components/home/ProjectTile';
import FeaturedBuild from '../components/home/FeaturedBuild';
import ThenNowStill from '../components/home/ThenNowStill';
import TetrisPrint from '../components/home/TetrisPrint';
import GitHubMap from '../components/home/GitHubMap';
import { AGENTS, PERSONAL, place, featured, buildCounts } from '@/lib/projects';
import contributions from '@/data/github-contributions.json';
import { TOKENS, tokenValues, type TokenGroup } from './tokens';

export const metadata: Metadata = {
  title: 'Design system · Wesley Bard',
  description: "How wesleybard.com is built: its colours, type and building blocks, in light and dark.",
};

// Read at build time, so the values shown are always the stylesheet's own.
const VALUES = tokenValues(fs.readFileSync(path.join(process.cwd(), 'app/design-system.css'), 'utf8'));
const GROUPS: TokenGroup[] = ['Surfaces', 'Ink', 'Accent', 'Meaning', 'Prints', 'Arcade', 'GitHub map'];

const TYPE = [
  { label: 'Name · serif 58', sample: 'Wesley Bard', style: { font: '600 58px/1.02 var(--serif)', letterSpacing: '-.02em' } },
  { label: 'Section · serif 26', sample: 'Personal', style: { font: '600 26px/1.15 var(--serif)' } },
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

  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
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
              Source Serif 4 for the name, headings, tile names and figures; IBM Plex Sans for text; IBM Plex Mono for
              eyebrows, captions, tags and the subtitles under tile names.
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
              Paper bar with a bottom rule: the wordmark (Bard in the accent), Projects and Connect, and the theme
              switch, the same three-way pill as the work tools: light, match my computer, dark. The choice is saved in
              this browser and applied before the page paints, so it never flashes. On a phone the bar wraps instead
              of hiding behind a menu. It&apos;s live at the top of this page.
            </p>
          </section>

          <section className="ch" aria-labelledby="ds-blocks">
            <h2 id="ds-blocks">Building blocks</h2>
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
              <span className="tag acc">Featured build</span>
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
              A print standing over the top of its card. A tile says what the thing does and what it runs on. Personal
              projects add a footer: the board, or what it&apos;s written in, and GitHub when the repo is public.
            </p>
            <div className="tiles">
              <ProjectTile project={lucy} />
              <ProjectTile project={knobdeck} footer />
            </div>

            <h3>The featured build</h3>
            <p>
              A big print over the left edge of its panel. <code>FEATURED</code> in <code>lib/projects.ts</code> picks
              it, and it is left out of its group below.
            </p>
            <FeaturedBuild project={featured()} />

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
              <li>Every block is scoped under <code>.wb</code>, so pages with their own look are untouched.</li>
              <li>Check both themes and a phone (390 px wide) before shipping.</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
