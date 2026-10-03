import Link from 'next/link';

// The site footer: wordmark and year, then the ways out. The year is fixed at build time (static export).
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="wb wb-foot">
      <div className="in">
        <span>
          <span className="wmk">
            Wesley <i>Bard</i>
          </span>{' '}
          · © {year}
        </span>
        <nav aria-label="Footer">
          <a href="https://www.linkedin.com/in/wesleybard/" target="_blank" rel="noopener noreferrer">
            LinkedIn →
          </a>
          <a href="https://github.com/wbuf81" target="_blank" rel="noopener noreferrer">
            GitHub →
          </a>
          <Link href="/design">Design system →</Link>
        </nav>
      </div>
    </footer>
  );
}
