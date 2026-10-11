import type { Metadata } from 'next';
import { Nav } from '../../components/Nav';
import Footer from '../../components/Footer';
import { getCompanyNames, getGames } from '@/lib/snes/data';
import { buildIndex, facets } from '@/lib/snes/library';
import Library from '../../snes/components/Library';
import '../../snes/snes.css';

const TITLE = 'Every US SNES game';
const DESCRIPTION = 'Every Super Nintendo game released in America, 1991–1998, month by month.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Unlinked and kept out of search until Wes's played-games layer (piece 3) ships.
  robots: { index: false, follow: false },
};

export default function SnesPage() {
  const index = buildIndex(getGames());
  const names = getCompanyNames();
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <div className="s-wrap">
          <header className="s-hero">
            <div className="eyebrow">The Super Nintendo in America</div>
            <h1>Every US SNES game, 1991–1998</h1>
            <p>
              {index.length} games, month by month — from launch day on August 23, 1991, when F-Zero and Super Mario World hit the shelves,
              to the last cart in 1998.
            </p>
          </header>
          <Library games={index} names={names} facets={facets(index, names)} />
        </div>
      </main>
      <Footer />
    </>
  );
}
