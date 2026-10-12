import type { Metadata } from 'next';
import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import Print from '../components/home/Print';
import FeaturedBuild from '../components/home/FeaturedBuild';
import { featured, type Tape } from '@/lib/projects';
import { getGames, getWeeks } from '@/lib/snes/data';
import { slimWeeks } from '@/lib/snes/onThisDay';
import { TIME_MACHINE, TOP8 } from '@/lib/snes/routes';
import OnThisDay from '../snes/components/OnThisDay';
import SnesCredit from '../snes/components/SnesCredit';
import { vt323 } from '../snes/fonts';
import '../snes/snes.css';

export const metadata: Metadata = {
  title: 'Video games',
  description: "Wes's video game projects.",
  openGraph: {
    title: 'Video games',
    description: "Wes's video game projects.",
    url: '/videogames',
    images: [{ url: '/og-videogames.jpg', width: 1200, height: 630, alt: 'Video games: gameplay clips, the Omaha World-Pixel, a score scatter and a shelf of SNES covers' }],
  },
  twitter: { card: 'summary_large_image', title: 'Video games', description: "Wes's video game projects.", images: ['/og-videogames.jpg'] },
  robots: { index: false, follow: false },
};

// The hub wears the homepage's look (design system › the featured build, tiles): SNES History is the featured
// build, and everything else in the section is a tile whose 2:1 print stands over its card.
type HubTile = {
  name: string;
  subtitle: string;
  badge: string;
  accent?: boolean;
  description: string;
  caption: [string, string];
  image?: string;
  alt?: string;
  href?: string;
  foot: string;
  tilt: number;
  tapes: Tape[];
};

const TILES: HubTile[] = [
  {
    name: 'SNES Time Machine',
    subtitle: '1991–1998, week by week',
    badge: 'New',
    description: 'Every week of the SNES years: the #1 song, album and movie, the news in the Omaha World-Pixel, and the games that came out.',
    caption: ['Time Machine', '372 weeks'],
    image: '/videogames/time-machine.jpg',
    alt: 'The Time Machine on launch week, August 23, 1991: the #1 song, album and movie',
    href: TIME_MACHINE,
    foot: '📼 372 weeks',
    tilt: 1.9,
    tapes: [{ left: '8%', top: '-9px', width: '64px', angle: '-8deg' }],
  },
  {
    name: 'My SNES Top 8',
    subtitle: 'MySpace-style, 1080×1080',
    badge: 'Make yours',
    accent: true,
    description: 'Pick your 8 favorites from anywhere on the site, drag them into order, pick a theme and save the picture to share.',
    caption: ['My SNES Top 8', '6 themes'],
    image: '/videogames/top-8.jpg',
    alt: 'An example Top 8 picture: a snesspace title tile and SNES covers',
    href: TOP8,
    foot: '🏆 Share a link or a picture',
    tilt: -1.3,
    tapes: [{ left: '62%', top: '-9px', width: '70px', angle: '6deg' }],
  },
  {
    name: "Wes's Pocket run",
    subtitle: 'Played · beaten · rated',
    badge: 'Coming soon',
    description: 'My run through the library on an Analogue Pocket: what I played, what I beat, and how it holds up.',
    caption: ['Analogue Pocket', 'soon'],
    foot: '🎮 In progress',
    tilt: 2.9,
    tapes: [{ left: '40%', top: '-9px', width: '60px', angle: '-2deg' }],
  },
];

function Tile({ t }: { t: HubTile }) {
  return (
    <article className="tile">
      <Print
        image={t.image}
        alt={t.alt}
        tilt={t.tilt}
        tapes={t.tapes}
        href={t.href}
        label={t.href ? `Open ${t.name}` : undefined}
        caption={
          <>
            <span>{t.caption[0]}</span>
            <span>{t.caption[1]}</span>
          </>
        }
      >
        {t.image ? undefined : (
          <span className="ph s-vg-soon" role="img" aria-label="Coming soon">
            <b>COMING SOON</b>
            <small>INSERT CARTRIDGE</small>
          </span>
        )}
      </Print>
      <div className="tb">
        <div className="th">
          <h3>{t.name}</h3>
          <span className={t.accent ? 'tag acc' : 'tag'}>{t.badge}</span>
        </div>
        <div className="fn">{t.subtitle}</div>
        <p>{t.description}</p>
        <div className="tf">
          <span className="fine">{t.foot}</span>
          {t.href && <a href={t.href}>Open →</a>}
        </div>
      </div>
    </article>
  );
}

export default function VideoGamesPage() {
  const weeks = slimWeeks(getWeeks(), getGames());
  // The homepage's featured build, with the hub's own picture: the right side of the share card, all windows.
  const snes = { ...featured(), image: '/videogames/snes-history-windows.jpg', alt: 'Gameplay clips, the Omaha World-Pixel, a score scatter and a shelf of SNES covers' };
  return (
    <>
      <Nav theme />
      <main className={`wb wb-page ${vt323.variable}`}>
        <div className="s-wrap s-vg">
          <header className="s-hero">
            <div className="eyebrow">Video games</div>
            <h1>Video games</h1>
            <p>Projects about the games I grew up with, starting with every Super Nintendo game released in America.</p>
          </header>
          <FeaturedBuild project={snes} />
          <OnThisDay weeks={weeks} />
          <section className="s-vg-more" aria-labelledby="vg-more">
            <div className="eyebrow">Play along</div>
            <h2 id="vg-more">More SNES</h2>
            <p>Things to do with the library: go back to the week a game came out, or build your own Top 8.</p>
            <div className="tiles">
              {TILES.map((t) => (
                <Tile key={t.name} t={t} />
              ))}
            </div>
          </section>
          <SnesCredit pop />
        </div>
      </main>
      <Footer />
    </>
  );
}
