import Link from 'next/link';
import ThemeSwitch from './ThemeSwitch';

// The site header, in the design system (app/design-system.css › the header): the name, the link home, on the left;
// Connect, which lands on the footer of whatever page you are on (id="connect"), and the theme switch on the right.
// On a phone the header is a single row: the switch is hidden there, so it is the name and Connect.
// `sticky` keeps it on screen (the homepage only, Wes, 24 Nov 2026): the homepage's slim filter bar sits just under it. The
// SNES and health pages stick their own bands to the top, so theirs scroll away, as on every other page.
// `theme` shows the light/dark switch: only pages built on the system have a dark look, so a page that keeps
// its own styles gets the header without it, always light. Every page is on the system since /lee was retired
// (9 Nov 2026), so they all pass it.
export function Nav({ theme = false, sticky = false }: { theme?: boolean; sticky?: boolean }) {
  return (
    // id="top" is where the footer's Back to top lands: a real target, so keyboard focus moves up with the page.
    <header id="top" className={sticky ? 'wb wb-head is-sticky' : 'wb wb-head'}>
      <div className="in">
        <Link href="/" className="brand" aria-label="Wesley Bard">
          <span className="wm">
            Wesley <i>Bard</i>
          </span>
        </Link>
        <a href="#connect" className="connect">
          Connect
        </a>
        {theme && (
          <div className="tools">
            <ThemeSwitch />
          </div>
        )}
      </div>
    </header>
  );
}
