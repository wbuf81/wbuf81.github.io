import { Nav } from './components/Nav';
import Footer from './components/Footer';
import TetrisPrint from './components/home/TetrisPrint';
import ThenNowStill from './components/home/ThenNowStill';
import FeaturedBuild from './components/home/FeaturedBuild';
import ProjectTile from './components/home/ProjectTile';
import GitHubMap from './components/home/GitHubMap';
import { AGENTS, TOOLS, place, personalGroups, featured, buildCounts } from '@/lib/projects';
import contributions from '@/data/github-contributions.json';

/*
 * The homepage, in the design system (app/design-system.css, shown on /design). Deliberately not a résumé:
 * name, Tetris and the headshot, then the building. Project copy lives in lib/projects.ts.
 */

const BEYOND = [
  {
    title: 'STEM Mentoring',
    description: 'GatorLaunch mentor at the University of Florida and Big Brothers Big Sisters volunteer since 2011.',
  },
  {
    title: 'Autism & Inclusivity Advocate',
    description: 'Championing neurodiversity awareness and inclusive environments for families and workplaces.',
  },
];

export default function HomePage() {
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <div className="wrap">
          <section className="hero" aria-label="Wesley Bard">
            <div className="hero-text">
              <div className="eyebrow">Governance, Risk &amp; Compliance · Newfold Digital</div>
              <h1 className="name">Wesley Bard</h1>
            </div>
            <TetrisPrint />
          </section>

          <ThenNowStill counts={buildCounts()} />

          <FeaturedBuild project={featured()} />

          <section id="projects" aria-labelledby="work-h">
            <div className="sec-h">
              <h2 id="work-h">Work</h2>
            </div>
            <div className="grp first">
              <div className="eyebrow">Autonomous AI agents</div>
              <p className="gnote">
                Agents that take the repetitive end of legal and compliance work — scanning, monitoring, reporting,
                chasing deadlines before they lapse. Each one named after a coworker&apos;s pet, driving engagement
                and making compliance a little more fun.
              </p>
              <div className="tiles">
                {place(AGENTS, 0).map((p) => (
                  <ProjectTile key={p.key} project={p} />
                ))}
              </div>
            </div>
            <div className="grp">
              <div className="eyebrow">Domain intelligence</div>
              <div className="tiles">
                {place(TOOLS, AGENTS.length).map((p) => (
                  <ProjectTile key={p.key} project={p} />
                ))}
              </div>
            </div>
          </section>

          <section className="sec" aria-labelledby="personal-h">
            <div className="sec-h">
              <h2 id="personal-h">Personal</h2>
            </div>
            {personalGroups().map((g) => (
              <div className="grp" key={g.label}>
                <div className="eyebrow">{g.label}</div>
                <div className="tiles">
                  {g.items.map((p) => (
                    <ProjectTile key={p.key} project={p} footer />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <GitHubMap data={contributions} />

          <section id="connect" className="links" aria-label="Beyond work, and how to reach me">
            {BEYOND.map((b) => (
              <div className="card" key={b.title}>
                <div className="eyebrow">Beyond work</div>
                <h3>{b.title}</h3>
                <p>{b.description}</p>
              </div>
            ))}
            <a className="card" href="https://www.linkedin.com/in/wesleybard/" target="_blank" rel="noopener noreferrer">
              <div className="eyebrow">Connect</div>
              <h3>Feel free to reach out.</h3>
              <p>Resume available upon request.</p>
              <span className="go">LinkedIn →</span>
            </a>
            <a className="card" href="https://github.com/wbuf81" target="_blank" rel="noopener noreferrer">
              <div className="eyebrow">Connect</div>
              <h3>@wbuf81 on GitHub</h3>
              <p>The open-source builds above.</p>
              <span className="go">GitHub →</span>
            </a>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
