import { Nav } from './components/Nav';
import Footer from './components/Footer';
import TetrisPrint from './components/home/TetrisPrint';
import ThenNowStill from './components/home/ThenNowStill';
import Highlights from './components/home/Highlights';
import GitHubMap from './components/home/GitHubMap';
import ProjectFilter from './components/home/ProjectFilter';
import { homeProjects, buildCounts, HIGHLIGHTS } from '@/lib/projects';
import contributions from '@/data/github-contributions.json';

/*
 * The homepage, in the design system (app/design-system.css, shown on /design). Deliberately not a résumé:
 * name, Tetris and the headshot, then the building. Project copy lives in lib/projects.ts.
 */

// Wes's own words for the space under his name (4 Oct 2026): casual, first person, not a tagline.
const INTRO =
  "Hey, I'm Wes. I work in compliance, and before that I spent 12 years as an engineer. These days I'm all in on building with AI agents, using loops and graphs to build AI tools and agents at scale. Here's some of what I've made at work, and what I'm tinkering with at home.";

export default function HomePage() {
  return (
    <>
      {/* The header stays on screen here (only here): the band sticks just under it. */}
      <Nav theme sticky />
      <main className="wb wb-page">
        <div className="wrap wrap-top">
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
        </div>

        {/* The band, the note and one grid of every project, newest first (Wes, 24 Nov 2026). It spans the page, so it
            sits outside the column above and brings its own below, which the GitHub map shares. */}
        <ProjectFilter projects={homeProjects()} highlights={HIGHLIGHTS}>
          <GitHubMap data={contributions} />
        </ProjectFilter>
      </main>
      <Footer />
    </>
  );
}
