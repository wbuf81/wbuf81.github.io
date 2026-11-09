import Link from 'next/link';

// The site footer, the coastal one (Wes, 9 Nov 2026; app/design-system.css › the footer): the name and a line,
// Explore and Connect, the year and Back to top, then the boardwalk drawing in a band of its own. The drawing is
// decoration only (aria-hidden; no words in it). Back to top lands on the header's id="top" (Nav), which every page
// with this footer renders first. The year is fixed at build time (static export).

const EXPLORE = [
  { label: 'Projects', href: '/#projects' },
  { label: 'Games', href: '/videogames' },
  { label: 'Design system', href: '/design' },
];

const CONNECT = [
  { label: 'GitHub', href: 'https://github.com/wbuf81' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/wesleybard/' },
];

// Drawn, not typed: the fonts are cut to latin and carry no diagonal arrow.
function Arrow({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={up ? 'M12 19V5M6 11l6-6 6 6' : 'M7 17 17 7M8 7h9v9'} />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="wb wb-foot">
      <div className="in">
        <div>
          <p className="eyebrow">wesleybard.com</p>
          <p className="f-name">
            Wesley <i>Bard</i>
          </p>
          <p className="f-line">Feel free to reach out.</p>
        </div>
        <nav className="f-nav" aria-label="Footer">
          <div>
            <p className="eyebrow" id="foot-explore">
              Explore
            </p>
            <ul aria-labelledby="foot-explore">
              {EXPLORE.map((l) => (
                <li key={l.label}>
                  {/* a home-page section is a plain link, as in the header; a page of its own is a Link */}
                  {l.href.startsWith('/#') ? <a href={l.href}>{l.label}</a> : <Link href={l.href}>{l.label}</Link>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow" id="foot-connect">
              Connect
            </p>
            <ul aria-labelledby="foot-connect">
              {CONNECT.map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label} <Arrow />
                    <span className="vh"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="f-base">
          <small>© {year} Wesley Bard</small>
          <a className="f-top" href="#top">
            Back to top <Arrow up />
          </a>
        </div>
      </div>
      <div className="f-art" aria-hidden="true" />
    </footer>
  );
}
