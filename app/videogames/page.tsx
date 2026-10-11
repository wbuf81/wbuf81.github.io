import type { Metadata } from 'next';
import { Nav } from '../components/Nav';
import Footer from '../components/Footer';
import { SNES_BASE } from '@/lib/snes/routes';
import '../snes/snes.css';

export const metadata: Metadata = {
  title: 'Video games',
  description: "Wes's video game projects.",
  robots: { index: false, follow: false },
};

export default function VideoGamesPage() {
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <div className="s-wrap">
          <header className="s-hero">
            <div className="eyebrow">Video games</div>
            <h1>Video games</h1>
            <p>Projects about the games I grew up with — starting with every Super Nintendo game released in America.</p>
          </header>
          <div className="s-hub">
            <a className="s-hub-card" href={SNES_BASE}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/snes/box/super-mario-world.jpg" alt="" width={300} height={209} />
              <span className="s-hub-t">Super Nintendo history</span>
              <span className="s-hub-p">717 games, 1991–1998 — timeline, cover wall, shelf and more</span>
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
