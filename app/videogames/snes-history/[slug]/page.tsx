import type { Metadata } from 'next';
import { Nav } from '../../../components/Nav';
import Footer from '../../../components/Footer';
import { getCompanyNames, getGame, getGames } from '@/lib/snes/data';
import { buildIndex, neighbours } from '@/lib/snes/library';
import GameView from '../../../snes/components/GameView';
import '../../../snes/snes.css';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return getGames().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const game = getGame((await params).slug);
  return { title: game ? `${game.title} · SNES` : 'SNES', robots: { index: false, follow: false } };
}

export default async function GamePage({ params }: Params) {
  const { slug } = await params;
  const game = getGame(slug)!;
  const index = buildIndex(getGames());
  const { prev, next } = neighbours(index, slug);
  const monthKey = game.releasedUS.slice(0, game.datePrecision === 'year' ? 4 : 7);
  const sameMonth = index.filter((g) => g.slug !== slug && g.releasedUS.startsWith(monthKey));
  const bySlug = new Map(index.map((g) => [g.slug, g]));
  const seriesGames = game.series ? index.filter((g) => g.slug !== slug && g.series === game.series).slice(0, 8) : [];
  const similarGames = game.similar.map((s) => bySlug.get(s)).filter((g): g is NonNullable<typeof g> => Boolean(g));
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <div className="s-wrap">
          <GameView game={game} names={getCompanyNames()} prev={prev} next={next} sameMonth={sameMonth} seriesGames={seriesGames} similarGames={similarGames} />
        </div>
      </main>
      <Footer />
    </>
  );
}
