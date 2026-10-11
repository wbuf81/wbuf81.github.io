import Link from 'next/link';
import type { Company } from '@/lib/snes/types';
import type { IndexGame } from '@/lib/snes/library';
import { gameCount } from '@/lib/snes/display';
import { SNES_BASE } from '@/lib/snes/routes';
import Timeline from './views/Timeline';
import { SoundProvider } from './sound';

// A studio or publisher: how many games it made and published, then those games on the same month timeline.
export default function CompanyView({ company, games, names }: { company: Company; games: IndexGame[]; names: Record<string, string> }) {
  const developed = games.filter((g) => g.developers.includes(company.slug)).length;
  const published = games.filter((g) => g.publisher === company.slug).length;
  const facts = [`Developed ${gameCount(developed)}`, `published ${gameCount(published)}`];
  if (company.aliases.length) facts.push(`also credited as ${company.aliases.join(', ')}`);
  return (
    <SoundProvider>
      <header className="s-company">
        <div className="eyebrow"><Link href={SNES_BASE}>SNES</Link> · Studio &amp; publisher</div>
        <h1>{company.name}</h1>
        <p>{facts.join(' · ')}</p>
      </header>
      <Timeline games={games} names={names} />
    </SoundProvider>
  );
}
