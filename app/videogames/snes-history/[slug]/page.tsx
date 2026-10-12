import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { Nav } from '../../../components/Nav';
import Footer from '../../../components/Footer';
import { getCompanyNames, getGame, getGames, getPrices, getWeeks } from '@/lib/snes/data';
import { buildIndex, neighbours } from '@/lib/snes/library';
import { formatRelease } from '@/lib/snes/display';
import { panelWeekFor } from '@/lib/snes/weeks';
import { consolePrice, gamePrice } from '@/lib/snes/prices';
import { webpSize } from '@/lib/snes/webpSize';
import { fraktur, vt323 } from '../../../snes/fonts';
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
  const weeks = getWeeks();
  const { index: wi, label } = panelWeekFor(weeks, game);
  const prices = getPrices();
  const gp = gamePrice(prices, game.slug);
  const cp = consolePrice(prices);
  const rewind = {
    week: weeks[wi], weekNumber: wi + 1, label,
    monthName: formatRelease(game.releasedUS, 'month'),
    price: gp ? { usd: gp.usd, year: Number(gp.date.slice(0, 4)), what: 'game' as const } : { usd: cp.usd, year: Number(cp.date.slice(0, 4)), what: 'console' as const },
  };
  // The logo's own pixel size, read at build time, so the <img> reserves its space and the page doesn't shift.
  let logoSize: [number, number] | undefined;
  if (game.media.logo) {
    logoSize = webpSize(fs.readFileSync(path.join(process.cwd(), 'public/snes/logo', `${slug}.webp`))) ?? undefined;
    if (!logoSize) throw new Error(`Cannot read the size of the logo for ${slug}`);
  }
  return (
    <>
      <Nav theme />
      <main className={`wb wb-page ${vt323.variable} ${fraktur.variable}`}>
        <div className="s-wrap">
          <GameView game={game} names={getCompanyNames()} prev={prev} next={next} sameMonth={sameMonth} seriesGames={seriesGames} similarGames={similarGames} rewind={rewind} logoSize={logoSize} />
        </div>
      </main>
      <Footer />
    </>
  );
}
