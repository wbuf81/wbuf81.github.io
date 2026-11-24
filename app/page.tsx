import { Nav } from './components/Nav';
import Footer from './components/Footer';
import TetrisPrint from './components/home/TetrisPrint';
import ThenNowStill from './components/home/ThenNowStill';
import Highlights from './components/home/Highlights';
import ProjectTile from './components/home/ProjectTile';
import GitHubMap from './components/home/GitHubMap';
import HomeNav from './components/home/HomeNav';
import { homeBuilds, homeNavItems, HOME_SECTIONS, buildCounts } from '@/lib/projects';
import contributions from '@/data/github-contributions.json';

/*
 * The homepage, in the design system (app/design-system.css, shown on /design). Deliberately not a résumé:
 * name, Tetris and the headshot, then the building. Project copy lives in lib/projects.ts.
 */

// Wes's own words for the space under his name (4 Oct 2026): casual, first person, not a tagline.
const INTRO =
  "Hey, I'm Wes. I work in compliance, and before that I spent 12 years as an engineer. These days I'm all in on building with AI agents, using loops and graphs to build AI tools and agents at scale. Here's some of what I've made at work, and what I'm tinkering with at home.";

export default function HomePage() {
  const builds = homeBuilds();
  const heading = (id: string) => HOME_SECTIONS.find((s) => s.id === id)!.heading;
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        {/* The band: where you are on this page. It sticks to the top as the header scrolls away. */}
        <HomeNav items={homeNavItems()} />
        <div className="wrap">
          <section className="hero" aria-label="Wesley Bard">
            <div className="hero-text">
              <div className="eyebrow">Governance, Risk &amp; Compliance · Newfold Digital</div>
              <h1 className="name">Wesley Bard</h1>
              <p className="lede">{INTRO}</p>
            </div>
            <TetrisPrint />
          </section>

          <ThenNowStill counts={buildCounts()} />

          <Highlights />

          {/* The six build sections (Wes, 24 Nov 2026), each newest first: /#builds lands on the first. */}
          <div className="builds" id="builds">
            <section id="work" aria-labelledby="work-h">
              <div className="sec-h">
                <h2 id="work-h">{heading('work')}</h2>
              </div>
              <div className="grp first">
                <div className="eyebrow">Autonomous AI agents</div>
                <p className="gnote">
                  Agents that take the repetitive end of legal and compliance work — scanning, monitoring, reporting,
                  chasing deadlines before they lapse. Each one named after a coworker&apos;s pet, driving engagement
                  and making compliance a little more fun.
                </p>
                <div className="tiles">
                  {builds.work.map((p) => (
                    <ProjectTile key={p.key} project={p} />
                  ))}
                </div>
              </div>
            </section>

            <section className="sec games" id="games" aria-labelledby="games-h">
              <div className="sec-h">
                <h2 id="games-h">{heading('games')}</h2>
              </div>
              <div className="grp first">
                <div className="eyebrow">Games I&apos;ve made</div>
                <p className="gnote">
                  Private builds for friends, so there is nothing to download. Each one has a page on how it plays and
                  how it was built.
                </p>
                <div className="tiles">
                  {builds.games.map((p) => (
                    <ProjectTile key={p.key} project={p} footer />
                  ))}
                </div>
              </div>
              <div className="grp">
                <div className="eyebrow">Other game projects</div>
                <div className="tiles">
                  {builds.otherGames.map((p) => (
                    <ProjectTile key={p.key} project={p} footer />
                  ))}
                </div>
              </div>
            </section>

            {/* Personal's four groups, each a section of its own: the group's name is the heading, shown once. */}
            {builds.groups.map((g) => (
              <section className="sec" id={g.id} aria-labelledby={`${g.id}-h`} key={g.id}>
                <div className="sec-h">
                  <h2 id={`${g.id}-h`}>{heading(g.id)}</h2>
                </div>
                <div className="tiles">
                  {g.items.map((p) => (
                    <ProjectTile key={p.key} project={p} footer />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <GitHubMap data={contributions} />
        </div>
      </main>
      <Footer />
    </>
  );
}
