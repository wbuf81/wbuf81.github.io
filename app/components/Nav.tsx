'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeSwitch from './ThemeSwitch';

const NAV_LINKS = [
  { label: 'Projects', href: '/#projects' },
  { label: 'Games', href: '/videogames' },
  { label: 'Connect', href: '/#connect' },
];

// The site header, in the design system (app/design-system.css › the header). On a phone the bar wraps
// rather than collapsing into a menu: three links and the theme switch fit on two short lines.
// `theme` shows the light/dark switch: only pages built on the system have a dark look, so a page that keeps
// its own styles gets the header without it, always light. Every page is on the system since /lee was retired
// (9 Nov 2026), so they all pass it.
export function Nav({ theme = false }: { theme?: boolean }) {
  const pathname = usePathname() ?? '';
  const isHome = pathname === '/';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!isHome) return;
    const el = document.getElementById(href.slice(2));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth' });
    history.replaceState(null, '', href.slice(1));
  };

  return (
    // id="top" is where the footer's Back to top lands: a real target, so keyboard focus moves up with the page.
    <header id="top" className="wb wb-head">
      <div className="in">
        <Link href="/" className="brand" aria-label="Wesley Bard">
          <span className="wm">
            Wesley <i>Bard</i>
          </span>
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV_LINKS.map((link) =>
            link.href.startsWith('/#') ? (
              <a key={link.label} href={link.href} onClick={(e) => handleClick(e, link.href)}>
                {link.label}
              </a>
            ) : (
              // a page of its own, not a home-page section: a plain link, current while anywhere under it
              <Link key={link.label} href={link.href} aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'page' : undefined}>
                {link.label}
              </Link>
            ),
          )}
        </nav>
        {theme && (
          <div className="tools">
            <ThemeSwitch />
          </div>
        )}
      </div>
    </header>
  );
}
