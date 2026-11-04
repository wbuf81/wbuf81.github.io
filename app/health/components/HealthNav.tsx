import Link from 'next/link';
import { SECTIONS, type HealthSection } from '../sections';

/** /health's own menu, built like SnesNav: a sticky row of tabs under the site header, one page per section.
 * On a phone the icons drop and the labels shorten, so all five fit one row at 375px without sliding. */
export default function HealthNav({ current }: { current: HealthSection }) {
  return (
    <nav className="h-nav" aria-label="Health">
      <div className="h-nav-in">
        <span className="h-nav-k" aria-hidden="true">Health ▸</span>
        {SECTIONS.map((s) => (
          <Link key={s.id} href={s.href} className="h-nav-a" aria-current={s.id === current ? 'page' : undefined}>
            <span className="h-nav-i" aria-hidden="true">{s.icon}</span>
            <span className="h-nav-l">{s.label}</span>
            <span className="h-nav-s">{s.short}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
