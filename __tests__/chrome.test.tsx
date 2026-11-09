import fs from 'fs';
import path from 'path';
import { render, screen, within } from '@testing-library/react';
import { Nav } from '@/app/components/Nav';
import Footer from '@/app/components/Footer';

let mockPath = '/';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath }));
beforeEach(() => { mockPath = '/'; });

test('header has the wordmark, the three links and the theme switch', () => {
  render(<Nav theme />);
  expect(screen.getByRole('link', { name: 'Wesley Bard' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/#projects');
  expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/videogames');
  expect(screen.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '/#connect');
  expect(screen.getByRole('group', { name: 'Colour theme' })).toBeInTheDocument();
});

test('pages outside the design system get the header without the theme switch', () => {
  render(<Nav />);
  expect(screen.getByRole('link', { name: 'Wesley Bard' })).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Colour theme' })).toBeNull();
});

test('header and footer carry the design system scope', () => {
  const { container } = render(
    <>
      <Nav />
      <Footer />
    </>,
  );
  expect(container.querySelector('header.wb.wb-head')).not.toBeNull();
  expect(container.querySelector('footer.wb.wb-foot')).not.toBeNull();
});

test('footer links: Explore on the site, Connect out to new tabs', () => {
  render(<Footer />);
  within(screen.getByRole('navigation', { name: 'Footer' })).getByRole('list', { name: 'Explore' });
  const explore = within(screen.getByRole('list', { name: 'Explore' })).getAllByRole('link');
  expect(explore.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['Projects', '/#projects'],
    ['Games', '/videogames'],
    ['Design system', '/design'],
  ]);
  const connect = within(screen.getByRole('list', { name: 'Connect' })).getAllByRole('link');
  expect(connect.map((a) => a.getAttribute('href'))).toEqual(['https://github.com/wbuf81', 'https://www.linkedin.com/in/wesleybard/']);
  for (const a of connect) {
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    expect(a).toHaveAccessibleName(/^(GitHub|LinkedIn) \(opens in a new tab\)$/);
  }
});

test('Back to top lands on the header', () => {
  const { container } = render(
    <>
      <Nav theme />
      <Footer />
    </>,
  );
  expect(screen.getByRole('link', { name: 'Back to top' })).toHaveAttribute('href', '#top');
  expect(container.querySelector('#top')).toBe(container.querySelector('header.wb-head'));
});

test('every page with the footer renders the header first, so Back to top has somewhere to land', () => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const pages = walk('app').filter((f) => f.endsWith('.tsx') && /<Footer\b/.test(fs.readFileSync(f, 'utf8')));
  expect(pages.length).toBeGreaterThan(5);
  for (const f of pages) {
    const src = fs.readFileSync(f, 'utf8');
    expect(src.indexOf('<Nav')).toBeGreaterThan(-1);
    expect(src.indexOf('<Nav')).toBeLessThan(src.indexOf('<Footer'));
  }
});

test("the footer's drawing is decoration, and the year is the build's", () => {
  const { container } = render(<Footer />);
  const art = container.querySelector('.f-art');
  expect(art).toHaveAttribute('aria-hidden', 'true');
  expect(art?.textContent).toBe('');
  expect(screen.getByText(`© ${new Date().getFullYear()} Wesley Bard`)).toBeInTheDocument();
});

test("the footer's drawing is a local file, masked rather than shown as an image", () => {
  const css = fs.readFileSync('app/design-system.css', 'utf8');
  const urls = Array.from(css.matchAll(/url\("(\/footer\/[^"]+)"\)/g), (m) => m[1]);
  expect(urls.length).toBeGreaterThan(0);
  for (const u of new Set(urls)) expect(fs.existsSync(path.join('public', u))).toBe(true);
  expect(css).toMatch(/mask-image: url\("\/footer\/coastal-family\.png"\)/);
});

test('the nav order is Projects, Games, Connect', () => {
  render(<Nav />);
  expect(within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link').map((a) => a.textContent)).toEqual(['Projects', 'Games', 'Connect']);
});

test('Games is marked current under /videogames, and only there', () => {
  mockPath = '/videogames/snes-history';
  const { unmount } = render(<Nav />);
  expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current');
  unmount();
  mockPath = '/';
  render(<Nav />);
  expect(screen.getByRole('link', { name: 'Games' })).not.toHaveAttribute('aria-current');
});

test('Games is current on /videogames itself and below it, but not on a look-alike path', () => {
  for (const [path, current] of [['/videogames', true], ['/videogames/snes-history/f-zero', true], ['/videogamesxyz', false]] as const) {
    mockPath = path;
    const { unmount } = render(<Nav />);
    const games = screen.getByRole('link', { name: 'Games' });
    if (current) expect(games).toHaveAttribute('aria-current', 'page');
    else expect(games).not.toHaveAttribute('aria-current');
    unmount();
  }
});
