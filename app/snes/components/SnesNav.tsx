'use client';

import Link from 'next/link';
import { SNES_BASE, TIME_MACHINE, TOP8 } from '@/lib/snes/routes';
import { useTop8 } from '../top8/store';

export type SnesSection = 'games' | 'time' | 'top8';

// `short` is the phone label: all three tabs fit one row at 375px without sliding.
const TABS: { id: SnesSection; href: string; icon: string; label: string; short: string }[] = [
  { id: 'games', href: SNES_BASE, icon: '🎮', label: 'All games', short: 'Games' },
  { id: 'time', href: TIME_MACHINE, icon: '📼', label: 'Time Machine', short: 'Time Machine' },
  { id: 'top8', href: TOP8, icon: '🏆', label: 'My Top 8', short: 'Top 8' },
];

/** The SNES section's own menu: a sticky row of tabs under the site header on every SNES page. Game and company
 * pages count as "All games". The Top 8 count comes from the shared store, so it never renders on the server. */
export default function SnesNav({ current }: { current: SnesSection }) {
  const [top8] = useTop8();
  const picked = top8 ? top8.slots.filter(Boolean).length : 0;
  return (
    <nav className="s-nav" aria-label="SNES">
      <div className="s-nav-in">
        <span className="s-nav-k" aria-hidden="true">SNES ▸</span>
        {TABS.map((t) => (
          <Link key={t.id} href={t.href} className="s-nav-a" aria-current={t.id === current ? 'page' : undefined}>
            <span aria-hidden="true">{t.icon}</span>
            <span className="s-nav-l">{t.label}</span>
            <span className="s-nav-s">{t.short}</span>
            {t.id === 'top8' && picked > 0 && (
              <span className="s-nav-n" aria-label={`${picked} of 8 picked`}>{picked}/8</span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
