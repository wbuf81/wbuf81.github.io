import fs from 'fs';
import path from 'path';
import { render, screen, within } from '@testing-library/react';
import { Nav } from '@/app/components/Nav';
import Footer from '@/app/components/Footer';

let mockPath = '/';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath }));
beforeEach(() => { mockPath = '/'; });

// One menu at the top of a page (Wes, 24 Nov 2026): the header carries the name and the theme switch, no links.
test('the header is the name, the link home, and the theme switch: no other links', () => {
  for (const p of ['/', '/videogames/snes-history', '/games/con-air', '/builds/photo-frame']) {
    mockPath = p;
    const { container, unmount } = render(<Nav theme />);
    const header = container.querySelector('header.wb-head') as HTMLElement;
    const links = within(header).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Wesley Bard');
    expect(links[0]).toHaveAttribute('href', '/');
    expect(within(header).getByRole('group', { name: 'Colour theme' })).toBeInTheDocument();
    expect(within(header).queryByRole('navigation')).toBeNull();
    for (const name of ['Projects', 'Games', 'Builds', 'SNES History', 'Connect']) {
      expect(within(header).queryByText(name)).toBeNull();
      expect(within(header).queryByRole('link', { name })).toBeNull();
    }
    expect(header.querySelector('[aria-current]')).toBeNull();
    unmount();
  }
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
    ['Builds', '/#builds'],
    ['SNES History', '/videogames'],
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

test('the footer is where Connect lands, and carries the one Beyond work line', () => {
  const { container } = render(<Footer />);
  // The header's Connect (/#connect) scrolls to the footer; the homepage's card row is gone (Wes, 9 Nov 2026).
  expect(container.querySelector('footer#connect.wb-foot')).not.toBeNull();
  expect(fs.readFileSync('app/page.tsx', 'utf8')).not.toMatch(/id="connect"/);
  const beyond = screen.getByRole('group', { name: 'Beyond work' });
  expect(within(beyond).getByText('Autism & Inclusivity Advocate')).toBeInTheDocument();
  expect(within(beyond).getByText(/neurodiversity awareness/)).toBeInTheDocument();
  expect(screen.queryByText('STEM Mentoring')).toBeNull();
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

test("the footer has no drawing any more, and the year is the build's", () => {
  // Wes removed the boardwalk drawing on 10 Nov 2026 ("not crazy about the footer image anymore"); the rest stayed.
  const { container } = render(<Footer />);
  expect(container.querySelector('.f-art')).toBeNull();
  expect(fs.readFileSync('app/design-system.css', 'utf8')).not.toMatch(/\/footer\/|--foot-art|\.f-art/);
  expect(fs.existsSync(path.join('public', 'footer'))).toBe(false);
  expect(screen.getByText(`© ${new Date().getFullYear()} Wesley Bard`)).toBeInTheDocument();
});

test('the header has no link list and its old link styles are gone', () => {
  const css = fs.readFileSync('app/design-system.css', 'utf8');
  expect(css).not.toMatch(/\.wb-head \.nav/);
  expect(fs.readFileSync('app/components/Nav.tsx', 'utf8')).not.toMatch(/NAV_LINKS|aria-current/);
});
