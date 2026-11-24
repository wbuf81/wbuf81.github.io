import Link from 'next/link';
import ThemeSwitch from './ThemeSwitch';

// The site header, in the design system (app/design-system.css › the header): the name, the link home, and the theme
// switch, and nothing else. There is one menu at the top of a page (Wes, 24 Nov 2026: "i only want one menu please"):
// the homepage's band (HomeNav) with Connect at its end, SnesNav and HealthNav on theirs. The footer's Explore list
// links the rest. On a phone the header is a single row.
// `theme` shows the light/dark switch: only pages built on the system have a dark look, so a page that keeps
// its own styles gets the header without it, always light. Every page is on the system since /lee was retired
// (9 Nov 2026), so they all pass it.
export function Nav({ theme = false }: { theme?: boolean }) {
  return (
    // id="top" is where the footer's Back to top lands: a real target, so keyboard focus moves up with the page.
    <header id="top" className="wb wb-head">
      <div className="in">
        <Link href="/" className="brand" aria-label="Wesley Bard">
          <span className="wm">
            Wesley <i>Bard</i>
          </span>
        </Link>
        {theme && (
          <div className="tools">
            <ThemeSwitch />
          </div>
        )}
      </div>
    </header>
  );
}
