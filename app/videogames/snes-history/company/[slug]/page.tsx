import type { Metadata } from 'next';
import { Nav } from '../../../../components/Nav';
import Footer from '../../../../components/Footer';
import { getCompanies, getCompanyNames, getGames } from '@/lib/snes/data';
import { buildIndex } from '@/lib/snes/library';
import CompanyView from '../../../../snes/components/CompanyView';
import '../../../../snes/snes.css';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return getCompanies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const company = getCompanies().find((c) => c.slug === slug);
  return { title: company ? `${company.name} · SNES` : 'SNES', robots: { index: false, follow: false } };
}

export default async function CompanyPage({ params }: Params) {
  const { slug } = await params;
  const company = getCompanies().find((c) => c.slug === slug)!;
  const games = buildIndex(getGames()).filter((g) => g.publisher === slug || g.developers.includes(slug));
  return (
    <>
      <Nav theme />
      <main className="wb wb-page">
        <div className="s-wrap">
          <CompanyView company={company} games={games} names={getCompanyNames()} />
        </div>
      </main>
      <Footer />
    </>
  );
}
