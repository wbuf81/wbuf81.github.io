import type { Metadata } from 'next';
import { Nav } from '../../../../components/Nav';
import SnesNav from '../../../../snes/components/SnesNav';
import Footer from '../../../../components/Footer';
import { getCompanies, getCompanyNames, getGames } from '@/lib/snes/data';
import { buildIndex } from '@/lib/snes/library';
import CompanyView from '../../../../snes/components/CompanyView';
import SnesCredit from '../../../../snes/components/SnesCredit';
import { companyPath } from '@/lib/snes/routes';
import { titleList } from '@/lib/snes/top8';
import { Top8Scope } from '../../../../snes/components/Top8Tray';
import '../../../../snes/snes.css';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return getCompanies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const company = getCompanies().find((c) => c.slug === slug);
  if (!company) return { title: 'SNES', robots: { index: false, follow: false } };
  const title = `${company.name} · SNES`;
  const description = `Every Super Nintendo game ${company.name} developed or published in America, 1991–1998.`;
  return {
    title,
    description,
    // Its own card, so a shared company link doesn't preview as the homepage.
    openGraph: { title, description, url: companyPath(company.slug), images: [{ url: '/og-snes.jpg', width: 1200, height: 630, alt: 'Every US SNES game, 1991–1998: a wall of box art beside the title' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-snes.jpg'] },
    robots: { index: false, follow: false },
  };
}

export default async function CompanyPage({ params }: Params) {
  const { slug } = await params;
  const company = getCompanies().find((c) => c.slug === slug)!;
  const all = getGames();
  const games = buildIndex(all).filter((g) => g.publisher === slug || g.developers.includes(slug));
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <SnesNav current="games" />
        <div className="s-wrap">
          <Top8Scope titles={titleList(all)}>
            <CompanyView company={company} games={games} names={getCompanyNames()} />
          </Top8Scope>
          <SnesCredit />
        </div>
      </main>
      <Footer />
    </>
  );
}
