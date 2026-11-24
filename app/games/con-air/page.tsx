import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Nav } from '../../components/Nav';
import Footer from '../../components/Footer';
import Print from '../../components/home/Print';
import { placement } from '@/lib/projects';
import '../games.css';

/*
 * CON AIR, a Game Boy Advance game Wes made (spec: docs/superpowers/specs/2026-11-24-games-section-con-air-design.md).
 * A page about the game, not the game: no ROM, no download, no link to the private repo, and never a word about the
 * unlinked web games. Every number here was checked against the game's code on 24 Nov 2026.
 */

const DESCRIPTION = 'A one-button flying game I made for the Game Boy Advance: how it plays and how it was built.';
const CARD = { url: '/og-con-air.png', width: 1200, height: 630, alt: 'The CON AIR title screen' };

export const metadata: Metadata = {
  title: 'CON AIR · Wesley Bard',
  description: DESCRIPTION,
  // A child route's openGraph replaces the parent's images, so the page names its own card.
  openGraph: { title: 'CON AIR · Wesley Bard', description: DESCRIPTION, url: '/games/con-air', images: [CARD] },
  twitter: { card: 'summary_large_image', title: 'CON AIR · Wesley Bard', description: DESCRIPTION, images: [CARD.url] },
  robots: { index: false, follow: false },
};

const DIR = '/games/con-air';

interface Shot {
  file: string;
  caption: [string, string];
  alt: string;
}

const STORY: Shot[] = [
  { file: 'story-1-city.png', caption: ['Intro', '1 of 6'], alt: 'A full moon over a city skyline. Caption: Jacksonville. A long time ago.' },
  { file: 'story-2-bet.png', caption: ['Intro', '2 of 6'], alt: 'Connie, tattooed and smoking, counting cash at a betting window. Caption: One man. One bet.' },
  { file: 'story-3-wife.png', caption: ['Intro', '3 of 6'], alt: 'Hayley looking sideways. Caption: His wife does not know. Yet.' },
  { file: 'story-4-inside.png', caption: ['Intro', '4 of 6'], alt: 'A man in a headset with a finger to his nose. Caption: His guy on the inside says: "Trust me."' },
  { file: 'story-5-dog.png', caption: ['Intro', '5 of 6'], alt: 'Teddy the corgi running. Caption: His dog believes in him.' },
  { file: 'story-6-launch.png', caption: ['Intro', '6 of 6'], alt: 'Connie lifting off the street on a cloud. Caption: So he will stay in the air as long as it takes.' },
];

const LEVELS: Shot[] = [
  ['zone-1-drive-thru.png', 'The Drive-Thru', 'his 20s'],
  ['zone-2-back-nine.png', 'The Back Nine', 'his 30s'],
  ['zone-3-game-day.png', 'Game Day', 'his 40s'],
  ['zone-4-casino.png', 'The Casino', 'his 50s'],
  ['zone-5-super-bowl.png', 'The Super Bowl', 'his 70s'],
].map(([file, name, age], i): Shot => ({ file, caption: [name, age], alt: `Level ${i + 1}, ${name}: Connie flying through the level` }));

const WAYS: (Shot & { name: string; line: string })[] = [
  {
    file: 'ending.png', name: 'Story', caption: ['Story', 'The ending'],
    line: 'Five levels and an ending. It is tuned so that most players will see it.',
    alt: 'The ending: a football player in a stadium holding up a trophy under confetti. Caption: It took 50 years.',
  },
  {
    file: 'menu.png', name: 'Endless', caption: ['Endless', 'Main menu'],
    line: 'One run that gets tighter and faster every lap. The top ten lives on the cartridge, with three-letter initials.',
    alt: 'The main menu with Endless selected: Story mode, Endless, Versus, How to play, Extras',
  },
  {
    file: 'versus-ranking.png', name: 'Versus', caption: ['Versus', 'Final ranking'],
    line: 'Two to four players pass one handheld around and fly the same course. The longest flight wins.',
    alt: 'The versus results: three players ranked by distance',
  },
  {
    file: 'level-select.png', name: 'Level select', caption: ['Level select', 'Medals'],
    line: "Replay any level you have reached for a medal: bronze for finishing, silver for 60% of the coins, gold for 90% of them without Teddy's help.",
    alt: 'The level select list: five levels with their ages and medals',
  },
  {
    file: 'credits.png', name: 'Extras', caption: ['Extras', 'Credits'],
    line: 'Winning the story unlocks a gallery of every picture and a jukebox. The credits roll either way.',
    alt: 'The credit roll over the skyline: Game Boy Advance version, 2026',
  },
];

const SQUAD: Shot[] = [
  ['nick', 'Nick', 'Buzz', 'slow motion for 4 seconds'],
  ['hamzah', 'Hamzah', 'Beef Blast', 'fast and invincible for 2.5 seconds'],
  ['pearce', 'Pearce', 'Fireball', 'burns through obstacles for 4 seconds'],
  ['dettmer', 'Dettmer', 'Hazy', 'a coin magnet and double bonuses for 6 seconds'],
  ['wes', 'Wes', 'Gains', 'a shield that takes one hit'],
  ['rob', 'Rob', 'Booster', 'rests Teddy so he can save you again'],
].map(([key, name, power, does]): Shot => ({ file: `squad-${key}.png`, caption: [name, power], alt: `${name}'s squad card: ${power}, ${does}` }));

const HOOD: [string, string][] = [
  ['The machine', 'A 16.78 MHz ARM processor with no floating point and no divide instruction, 288 KB of working memory and 96 KB of video memory. The screen is 240 by 160 pixels.'],
  ['Whole numbers only', 'The physics run 120 times a second, two steps for every frame, in fixed-point integers. There is not a float in it.'],
  ['What you see is what you hit', 'The tunnel is streamed in a column at a time as the world scrolls, and its edge is drawn to the pixel, so the wall on screen is the wall you crash into.'],
  ['Fast memory for the hot code', "Most of the game is compact Thumb code that runs from the cartridge. The parts that run every frame (sound mixing, sprites, text, the tunnel) are built as ARM code and run from the console's 32 KB of fast memory."],
  ['Pictures', 'The 29 full-screen pictures are each reduced to their own 256-colour palette, dithered and compressed on the cartridge.'],
  ['Sound', 'Music streams off the cartridge as 8-bit samples at 18,157 Hz. Effects go through a four-voice software mixer on the second sound channel.'],
  ['Saving', 'The whole save is 124 bytes, kept twice. The game always overwrites the older copy, so pulling the power mid-save cannot lose your scores.'],
  ['Every course is beatable', 'The rules are plain C that also compiles on a Mac, so bots can play it. A perfect bot has to finish the story on every test course and survive 4,000 metres of endless mode before a build counts.'],
  ['Tested without a screen', 'Other tests boot the real ROM in a headless emulator, press its buttons, read its memory and take screenshots. After that it gets played on the real thing.'],
];

const HOOD_SHOTS: Shot[] = [
  { file: 'how-to-play.png', caption: ['How to play', 'Page 1'], alt: 'The how to play page: hold A to rise, let go to fall' },
  { file: 'power-ups.png', caption: ['Power-ups', 'The bank'], alt: 'The power-ups page: left and right pick from the bank, R uses it' },
];

const BUILT_WITH = ['C', 'libtonc', 'Arm GNU Toolchain', 'mGBA', 'Python', 'ffmpeg'];

// A screenshot as a taped print, not a link. The width and height keep its 3:2 room while it loads; games.css
// sets the height back to auto so the attribute never stretches it.
function ShotPrint({ shot, at }: { shot: Shot; at: number }) {
  const { tilt, tapes } = placement(at);
  return (
    <Print
      tilt={tilt}
      tapes={tapes}
      caption={
        <>
          <span>{shot.caption[0]}</span>
          <span>{shot.caption[1]}</span>
        </>
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, images are served as they are */}
      <img className="ph shot" src={`${DIR}/${shot.file}`} alt={shot.alt} width={960} height={640} loading="lazy" />
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

export default function ConAirPage() {
  // Prints take their tilt and tape by position, counting down the page, like the homepage's tiles.
  const levelsAt = STORY.length;
  const waysAt = levelsAt + LEVELS.length;
  const squadAt = waysAt + WAYS.length;
  const hoodAt = squadAt + SQUAD.length;

  return (
    <>
      <Nav theme />
      <main className="wb wb-page gm">
        <div className="wrap">
          <section className="hero" aria-label="CON AIR">
            <div className="hero-text">
              <div className="eyebrow">Games I&apos;ve made · Game Boy Advance · 2026</div>
              <h1 className="name">CON AIR</h1>
              <p className="lede">
                A one-button flying game I made for the Game Boy Advance. Hold A to rise, let go to fall, and keep Connie in
                the air until his bet comes in. It runs on real hardware at 60 frames a second. I play it on an Analogue
                Pocket.
              </p>
            </div>
            {/* The trailer keeps its sound (the game's own soundtrack), so it never plays by itself. */}
            <Print
              className="gm-trailer"
              tilt={0}
              tapes={[{ left: '41%', top: '-10px', width: '100px', angle: '-4deg' }]}
              caption={
                <>
                  <span>Trailer</span>
                  <span>59 seconds, with sound</span>
                </>
              }
            >
              <video controls playsInline preload="metadata" poster={`${DIR}/title.png`} width={960} height={640} aria-label="CON AIR trailer">
                <source src={`${DIR}/trailer.mp4`} type="video/mp4" />
              </video>
            </Print>
          </section>

          <div className="stats">
            <div>
              <div className="k">Runs on</div>
              <div className="n">Game Boy Advance</div>
              <div className="l">and the Analogue Pocket</div>
            </div>
            <div>
              <div className="k">Screen</div>
              <div className="n">240 × 160</div>
              <div className="l">pixels, at 60 frames a second</div>
            </div>
            <div>
              <div className="k">Controls</div>
              <div className="n">One button</div>
              <div className="l">hold A to rise, let go to fall</div>
            </div>
            <div>
              <div className="k">Cartridge</div>
              <div className="n">15 MB</div>
              <div className="l">most of it music, with a battery save</div>
            </div>
          </div>

          <Section id="story-h" title="The story">
            <p className="gnote">
              Jacksonville, a long time ago. Connie puts the house on the Jaguars to win the Super Bowl. His wife does not
              know yet. His guy on the inside says to trust him. His dog believes in him. So he stays in the air for as long
              as it takes, which turns out to be fifty years.
            </p>
            <div className="gm-grid">
              {STORY.map((s, i) => (
                <ShotPrint key={s.file} shot={s} at={i} />
              ))}
            </div>
          </Section>

          <Section id="levels-h" title="Five levels, fifty years">
            <p className="gnote">
              Story mode is five levels. Each one is a decade or more after the last, and Connie ages with it. Crash and you
              carry on from the level you reached.
            </p>
            <div className="gm-grid five">
              {LEVELS.map((s, i) => (
                <ShotPrint key={s.file} shot={s} at={levelsAt + i} />
              ))}
            </div>
          </Section>

          <Section id="ways-h" title="Ways to play">
            <div className="gm-grid">
              {WAYS.map((w, i) => (
                <article className="gm-way" key={w.file}>
                  <ShotPrint shot={w} at={waysAt + i} />
                  <h3>{w.name}</h3>
                  <p>{w.line}</p>
                </article>
              ))}
            </div>
          </Section>

          <Section id="squad-h" title="The squad">
            <p className="gnote">
              Six friends are in the game as power-ups. Four of them go into a three-slot bank to fire when you choose. The
              other two work on their own. Teddy the corgi runs along the ground and saves you once.
            </p>
            <div className="gm-grid">
              {SQUAD.map((s, i) => (
                <ShotPrint key={s.file} shot={s} at={squadAt + i} />
              ))}
            </div>
          </Section>

          <Section id="hood-h" title="Under the hood">
            <p className="gnote">The Game Boy Advance came out in 2001. Everything here has to fit what it can do.</p>
            <div className="gm-hood">
              <dl className="gm-dl">
                {HOOD.map(([term, text]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{text}</dd>
                  </div>
                ))}
              </dl>
              <div className="gm-hood-shots">
                {HOOD_SHOTS.map((s, i) => (
                  <ShotPrint key={s.file} shot={s} at={hoodAt + i} />
                ))}
              </div>
            </div>
          </Section>

          <Section id="built-h" title="How it was built">
            <p className="gnote">
              I built it with Claude Code. One model planned the work and reviewed it, and others wrote the engine,
              converted the art and sound, and wrote the tests. I set the direction, decided how hard it should be (the
              story easy, endless harder every lap) and played it on the Pocket to check it on real hardware.
            </p>
            <div className="gm-built">
              <div className="act-h">Built with</div>
              <div className="chips">
                {BUILT_WITH.map((c) => (
                  <span className="chip" key={c}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          <aside className="card gm-note" aria-labelledby="note-h">
            <h2 id="note-h">Not for download</h2>
            <p>CON AIR is a private build for my friends, who are in it. There is no ROM here and the code is not public.</p>
            <a className="go" href="/#games">
              Back to the homepage
            </a>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
