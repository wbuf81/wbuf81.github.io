import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import Print from '../components/home/Print';
import ProjectTile from '../components/home/ProjectTile';
import { AGENTS, TOOLS, place, placement, project } from '@/lib/projects';
import '../games/games.css';
import '../builds/builds.css';
import './work.css';

/*
 * The pals: Wes's day-job work as a write-up, linked from every Work tile on the homepage. The roster and WBDB come
 * from AGENTS and TOOLS in lib/projects.ts; everything else is wording filtered from the pals' private repos for what
 * is safe to say in public (Wes approved it, 24 Nov 2026). Write no fact about the pals that isn't already here or in
 * lib/projects.ts; __tests__/work.test.tsx holds the page.
 */

const TITLE = 'The pals · Wesley Bard';
const DESCRIPTION = "Nine small apps I built for legal and compliance work, each named after a coworker's pet, and how they work.";
// The site's own card, the homepage's (OG_IMAGE in app/layout.tsx, which a layout can't export; the test keeps the
// two in step). A child route's openGraph replaces the parent's images, so the page has to name it again.
const CARD = { url: '/og-image.png?v=4', width: 1200, height: 630, alt: 'Wesley Bard' };

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/work', images: [CARD] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [CARD.url] },
  robots: { index: false, follow: false },
};

const OSCAR = project('oscar');
const WBDB = TOOLS[0];

const FLOW_WATCH = {
  title: 'Something that changes',
  rows: [
    ['A shared inbox', 'WINNIE, BEASLEY'],
    ['Newly registered look-alike domains', 'LUCY'],
    ["The company's websites", 'OSCAR'],
    ['Renewals and filing deadlines', 'SMORES'],
    ['A sanctions list', 'MAISIE'],
    ['Policies and the risk register', 'SNOOP, RHINO'],
    ['Privacy request data', 'PABSTY'],
  ] as [string, string][],
  arrow: 'It saves everything first, so nothing is lost',
};

const FLOW_PAL = {
  title: 'The pal',
  lead: 'Fixed rules, written in code.',
  points: [
    'Sorts what needs action from what is noise.',
    'Works out which brand a thing belongs to.',
    'Puts anything it is unsure of in a review queue, with the evidence.',
  ],
  arrow: 'It hands over',
};

const FLOW_PERSON = {
  title: 'Someone on the team',
  points: [
    'Decides from a queue, or straight from the email, in one click.',
    'Gets a weekly email that reads like a note from a colleague who already looked.',
    'Can see every change: who, when, and the value before and after.',
  ],
};

const FLOW_LOOP = {
  label: 'Then it goes round again',
  text: 'It follows up until the thing is done, and flags anything that comes back.',
};

const WHO_DECIDES: [string, string][] = [
  [
    'A person decides, every time',
    'SMORES, SNOOP, LUCY and WINNIE. SMORES reminds, but keeping or dropping a mark is a person\'s click. SNOOP reads a new version of a policy and a person approves it. LUCY asks Legal to take action or dismiss, straight from the email. WINNIE proposes, and anything that would go out waits for an approver.',
  ],
  ['Reads and reports, on its own', 'OSCAR, MAISIE and PABSTY. They scan, watch and count, then send the report. They change nothing they look at.'],
  [
    'Acts on its own when it is sure',
    'BEASLEY. A complaint about a domain it can place goes straight to that brand\'s team. Anything it can\'t place waits for a person, and one switch pauses it.',
  ],
];

const WHERE_AI: [string, string][] = [
  ['SNOOP', 'When a policy changes, it asks Claude to review the change: what it means, what it touches, what to double-check. A person still approves the update.'],
  ['PABSTY', 'Its insights panel sends Claude only the figures on screen, never a request or a person. The footnotes print each figure from what was sent, not from the model\'s words.'],
  ['WINNIE', 'No AI runs on the server. Its sorting rules are written with Claude Code from real mail and the team\'s corrections, and every rule change ships as a tested release.'],
];

const STEPS: [string, string][] = [
  ['Ask in plain words.', 'What should change, and why.'],
  ['Write it down first.', 'House rules every session reads, then a design and a plan before any code.'],
  ['Pick from mockups.', 'Lettered options, and a person picks.'],
  ['Cut what doesn\'t earn its place.', 'From a numbered list a person picks from. Nothing is cut silently.'],
  ['Tests before it ships.', 'A failing test stops the deploy.'],
  ['Sweep the fleet.', 'The same change goes into every pal on the same day.'],
  ['Watch it run.', 'What the monitor finds becomes the next request, and the loop starts again.'],
];

const FLEET: [string, string][] = [
  ['A shared kit', 'The same design system, page header and job reporting are copied into every pal, and a script checks each one against a written standard.'],
  ['Something is always watching', 'A monitor checks every pal every few minutes and emails when one stops answering. One pal watches the monitor back.'],
  ['One rule per figure', 'Every count is defined once in code, and every page, email and export reads it from there. A test fails if anything works one out for itself.'],
  ['Emails are frozen by tests', 'A test keeps a copy of every email exactly as it should read, so an accidental change fails.'],
  ['The mascot is the sender', 'Each email comes from the pet, with its picture, and reads like a note from a colleague who already looked.'],
  ['New emails start switched off', 'They come to me as test copies first, and are switched on only after approval.'],
];

const PRODUCT: [string, string][] = [
  ['Watched every few minutes', 'Every pal is checked every few minutes. Two misses in a row and an email goes out. When it recovers, another says how long it was down.'],
  ['A status page', 'It answers two questions: is it up, and is the work getting done? It keeps thirty days of history for each pal, every deploy by day, and each scheduled job marked on time, late or failed.'],
  ['One company sign-in', "Every pal uses the company's single sign-on. Being able to sign in opens nothing by itself: access is granted per person, per pal, with a role, and each person is emailed when theirs changes. Nobody can make themselves an admin, and removing someone cuts them off everywhere within minutes."],
  ['Checked for known flaws', "Every pal's software packages are checked each morning and after each deploy. A serious flaw stays on a watch list until it is fixed, and one can only be set aside with a written reason and an end date."],
  ["The company's security tools", "The company's endpoint, malware and logging tools run on the server. I installed them myself, and the platform checks that each one is still running."],
  ['Deploys that roll themselves back', "A deploy ships exactly what passed the tests, and backs up first. If the new version doesn't answer, the old one goes back in by itself."],
  ['A trail an auditor would like', 'A written design comes before code. A person runs every command that changes the server. Every release has notes in plain English, and every access change is on permanent record.'],
  ['A playbook', 'I wrote up how it is done, so another team can stand up its own server the same way.'],
];

const BUILT_WITH = ['Node.js', 'Express', 'React', 'Vite', 'SQLite', 'Scheduled jobs', 'Vitest', 'Playwright', 'Python (WBDB)'];

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

function Notes({ items }: { items: [string, string][] }) {
  return (
    <dl className="gm-dl">
      {items.map(([term, text]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="bd-flow-conn">
      <span className="bd-flow-arrow" aria-hidden="true" />
      <p className="bd-flow-says">{label}</p>
    </div>
  );
}

function Flow() {
  return (
    <figure className="bd-flow" aria-label="How a pal works, in three stages">
      <ol className="bd-flow-stages">
        <li className="bd-flow-stage bd-flow-from">
          <p className="bd-flow-label">1 · It fetches</p>
          <div className="bd-flow-body">
            <div className="bd-flow-feed bd-flow-feed-1">
              <div className="bd-flow-box">
                <h3>{FLOW_WATCH.title}</h3>
                <dl className="bd-flow-rows">
                  {FLOW_WATCH.rows.map(([thing, who]) => (
                    <div key={thing}>
                      <dt>{thing}</dt>
                      <dd>{who}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <FlowArrow label={FLOW_WATCH.arrow} />
            </div>
          </div>
        </li>
        <li className="bd-flow-stage bd-flow-cloud">
          <p className="bd-flow-label">2 · It works it out</p>
          <div className="bd-flow-body">
            <div className="bd-flow-feed">
              <div className="bd-flow-box bd-flow-hub">
                <h3>{FLOW_PAL.title}</h3>
                <p className="bd-flow-lead">{FLOW_PAL.lead}</p>
                <ul className="bd-flow-points">
                  {FLOW_PAL.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <FlowArrow label={FLOW_PAL.arrow} />
            </div>
          </div>
        </li>
        <li className="bd-flow-stage bd-flow-wall">
          <p className="bd-flow-label">3 · People decide</p>
          <div className="bd-flow-body">
            <div className="bd-flow-box">
              <h3>{FLOW_PERSON.title}</h3>
              <ul className="bd-flow-points">
                {FLOW_PERSON.points.map((p) => (
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

export default function WorkPage() {
  const tool = placement(0);

  return (
    <>
      <Nav theme />
      <main className="wb wb-page gm bd wk">
        <div className="wrap">
          <section className="hero" aria-label="The pals">
            <div className="hero-text">
              <div className="eyebrow">Work · built with Claude Code · 2026</div>
              <h1 className="name">The pals</h1>
              <p className="lede">
                Nine small apps that each take one routine legal or compliance job and see it through: scanning, tracking,
                routing, reminding. People see only the decisions. I built them with Claude Code, and each one is named
                after a coworker&apos;s pet.
              </p>
            </div>
            <Print
              className="bd-hero"
              image={OSCAR.image}
              alt={OSCAR.alt}
              fit={OSCAR.fit}
              tilt={0}
              tapes={[{ left: '41%', top: '-10px', width: '100px', angle: '-4deg' }]}
              eager
              caption={
                <>
                  <span>{OSCAR.name}</span>
                  <span>{OSCAR.kind}</span>
                </>
              }
            />
          </section>

          <div className="stats">
            <div>
              <div className="k">Pals</div>
              <div className="n">Nine</div>
              <div className="l">and one tool, WBDB</div>
            </div>
            <div>
              <div className="k">Built with</div>
              <div className="n">Claude Code</div>
              <div className="l">it does most of the typing</div>
            </div>
            <div>
              <div className="k">AI while running</div>
              <div className="n">Two of nine</div>
              <div className="l">the rest run on rules written down in code</div>
            </div>
            <div>
              <div className="k">Named after</div>
              <div className="n">Coworkers&apos; pets</div>
              <div className="l">each one signs its own emails</div>
            </div>
          </div>

          <Section id="how-h" title="How a pal works">
            <p className="gnote">They do different jobs, but they are all the same shape: fetch, store, work it out, hand over.</p>
            <Flow />
          </Section>

          <Section id="who-h" title="Who decides">
            <p className="gnote">None of them changes anything in an outside system. Past that, it depends on the job.</p>
            <Notes items={WHO_DECIDES} />
          </Section>

          <Section id="ai-h" title="Where the AI is">
            <p className="gnote">
              All nine were built with Claude Code. Only two use an AI model while they run, and both are fenced in.
            </p>
            <Notes items={WHERE_AI} />
          </Section>

          <Section id="change-h" title="How a change gets made">
            <p className="gnote">Every change to any pal goes through the same seven steps.</p>
            <ol className="bd-steps">
              {STEPS.map(([first, second]) => (
                <li key={first}>
                  <p>
                    <strong>{first}</strong> {second}
                  </p>
                </li>
              ))}
            </ol>
            <p className="gnote wk-after">Claude Code does most of the typing. The judgement stays with people.</p>
            <p className="gnote">
              Two things keep that moving. A loop is an agent that comes back to the same job on a timer: watching a deploy,
              checking the status page, working through a list. A graph is a bigger job split into steps that depend on each
              other, handed to several agents at once and checked at the end.
            </p>
          </Section>

          <Section id="fleet-h" title="One fleet">
            <Notes items={FLEET} />
          </Section>

          <Section id="product-h" title="Running it like a product">
            <p className="gnote">
              A tool people rely on has to stay up, stay secure and leave a trail. The company provided the server and its
              security tools. Everything on top of that I set up myself.
            </p>
            <Notes items={PRODUCT} />
          </Section>

          <Section id="roster-h" title="The roster">
            <p className="gnote">
              Nine pals, in the order they were built, from OSCAR in January 2026 to WINNIE in October.
            </p>
            {/* The homepage's own tiles, placed the way the homepage places them: three across, so the nine make a square. */}
            <div className="tiles wk-tiles">
              {place(AGENTS, 0).map((a) => (
                <ProjectTile key={a.key} project={a} />
              ))}
            </div>
          </Section>

          <Section id="tool-h" title="And one tool">
            <div className="wk-tool">
              <Print
                image={WBDB.image}
                alt={WBDB.alt}
                fit={WBDB.fit}
                tilt={tool.tilt}
                tapes={tool.tapes}
                caption={
                  <>
                    <span>{WBDB.name}</span>
                    <span>{WBDB.kind}</span>
                  </>
                }
              />
              <div className="wk-who">
                <h3>{WBDB.name}</h3>
                <p className="wk-kind">{WBDB.subtitle}</p>
                <p>{WBDB.description}</p>
                <p>
                  WBDB is not a pal. It is where you bring a question about the company&apos;s domains, and its design
                  system is the one every pal uses. This site wears it too.
                </p>
              </div>
            </div>
          </Section>

          <Section id="built-h" title="How they were built">
            <p className="gnote">
              I built them with Claude Code, as someone on the legal and compliance team who used to be a software
              engineer.
            </p>
            <div className="chips gm-built">
              {BUILT_WITH.map((c) => (
                <span className="chip" key={c}>
                  {c}
                </span>
              ))}
            </div>
          </Section>

          <aside className="card gm-note bd-credit" aria-labelledby="private-h">
            <h2 id="private-h">What isn&apos;t here</h2>
            <p>
              The repos are private, and so is everything the pals read. This page says what each one does and how they
              work, and nothing about the data.
            </p>
            <a className="go" href="/#work">
              Back to the homepage
            </a>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
