'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { label: 'About', href: '/#about' },
  { label: 'Experience', href: '/#experience' },
  { label: 'Projects', href: '/#beyond' },
  { label: 'Writing', href: '/articles' },
  { label: 'Connect', href: '/#connect' },
];

export function Nav() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isHome && href.startsWith('/#')) {
      e.preventDefault();
      const id = href.slice(2);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setMenuOpen(false);
  };

  return (
    <>
      <nav className={`site-nav${scrolled ? ' site-nav-scrolled' : ''}`}>
        <div className="nav-inner">
          <Link href="/" className="nav-brand">Wesley Bard</Link>
          <button
            className="nav-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            <span className={`hamburger${menuOpen ? ' open' : ''}`} />
          </button>
          <div className={`nav-links${menuOpen ? ' nav-links-open' : ''}`}>
            {NAV_LINKS.map((link) =>
              link.href.startsWith('/#') ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="nav-link"
                  onClick={(e) => handleClick(e, link.href)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`nav-link${pathname === link.href ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      <style jsx>{`
        .site-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          padding: 0 24px;
          background: transparent;
          border-bottom: 1px solid #e5e7eb;
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }
        .site-nav-scrolled {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .nav-inner {
          max-width: 1000px;
          margin: 0 auto;
          padding: 32px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-brand {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #1f2937;
          text-decoration: none;
          white-space: nowrap;
        }
        .nav-brand:hover {
          text-decoration: none;
          color: #1f2937;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .nav-link {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: #6b7280;
          text-decoration: none;
          transition: color 0.2s ease;
          white-space: nowrap;
        }
        .nav-link:hover {
          color: #1f2937;
          text-decoration: none;
        }
        .nav-link.active {
          color: #1f2937;
        }
        .nav-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
        }
        .hamburger {
          display: block;
          width: 20px;
          height: 2px;
          background: #1f2937;
          position: relative;
          transition: background 0.2s ease;
        }
        .hamburger::before,
        .hamburger::after {
          content: '';
          position: absolute;
          left: 0;
          width: 20px;
          height: 2px;
          background: #1f2937;
          transition: transform 0.2s ease;
        }
        .hamburger::before {
          top: -6px;
        }
        .hamburger::after {
          top: 6px;
        }
        .hamburger.open {
          background: transparent;
        }
        .hamburger.open::before {
          top: 0;
          transform: rotate(45deg);
        }
        .hamburger.open::after {
          top: 0;
          transform: rotate(-45deg);
        }

        @media (max-width: 768px) {
          .nav-toggle {
            display: block;
          }
          .nav-links {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            flex-direction: column;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            padding: 16px 0 24px;
            gap: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
            align-items: flex-start;
          }
          .nav-links-open {
            display: flex;
          }
        }
      `}</style>
    </>
  );
}
