import fs from 'fs';
import { render, screen, act, within } from '@testing-library/react';
import HomeNav from '@/app/components/home/HomeNav';
import { homeNavItems, AGENTS, TOOLS, GAMES, PERSONAL } from '@/lib/projects';

const ITEMS = homeNavItems();
const IDS = ['work', 'games', 'mac', 'linux', 'electronics', 'more'];

// Lay the six sections out on a fake page: each 1,000px tall, the first starting `first`px below the top of the screen.
function page(first: number) {
  let scrolled = 0;
  for (const [i, id] of IDS.entries()) {
    const s = document.createElement('section');
    s.id = id;
    s.getBoundingClientRect = () => ({ top: first + i * 1000 - scrolled, bottom: first + (i + 1) * 1000 - scrolled } as DOMRect);
    document.body.appendChild(s);
  }
  return (y: number) => {
    scrolled = y;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
  };
}

let raf: typeof window.requestAnimationFrame;
beforeEach(() => {
  raf = window.requestAnimationFrame;
  // Run the throttled update at once.
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof window.requestAnimationFrame;
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
});
afterEach(() => {
  window.requestAnimationFrame = raf;
  for (const s of document.querySelectorAll('body > section')) s.remove();
});

const lit = () => screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'true');

test('a nav named for the page, six section links with counts from the data, then Connect', () => {
  render(<HomeNav items={ITEMS} />);
  const nav = screen.getByRole('navigation', { name: 'Builds on this page' });
  const links = within(nav).getAllByRole('link');
  expect(links).toHaveLength(7);
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['#work', '#games', '#mac', '#linux', '#electronics', '#more', '#connect']);
  expect(links.map((a) => a.querySelector('.home-nav-l')?.textContent)).toEqual(['Work', 'Gaming', 'Mac apps', 'Linux', 'Electronics', 'More', 'Connect']);
  expect(links.map((a) => a.querySelector('.home-nav-i')?.textContent)).toEqual(['🤖', '🎮', '💻', '🐧', '🔌', '✨', '✉️']);
  const counts = links.map((a) => a.querySelector('.home-nav-n')?.textContent ?? null);
  expect(counts).toEqual([
    String(AGENTS.length + TOOLS.length),
    String(GAMES.length + PERSONAL.filter((p) => p.group === 'Gaming').length),
    '3', '3', '5', '1', null,
  ]);
  expect(nav).toHaveTextContent('Builds ▸');
});

test('More is named Everything else for assistive tech, and each name keeps its visible label', () => {
  render(<HomeNav items={ITEMS} />);
  expect(screen.getByRole('link', { name: /Everything else/ })).toHaveAttribute('href', '#more');
  expect(screen.getByRole('link', { name: 'More, Everything else, 1 build' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Omarchy Linux, 3 builds' })).toHaveAttribute('href', '#linux');
  expect(screen.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '#connect');
});

test('nothing is lit above the first section; the section being read is; Connect never is', () => {
  render(<HomeNav items={ITEMS} />);
  const scrollTo = page(1500);
  scrollTo(0);
  expect(lit()).toHaveLength(0);
  scrollTo(1500 - 60);
  expect(lit().map((a) => a.getAttribute('href'))).toEqual(['#work']);
  scrollTo(1500 + 2500);
  expect(lit().map((a) => a.getAttribute('href'))).toEqual(['#mac']);
  scrollTo(1500 + 5100);
  expect(lit().map((a) => a.getAttribute('href'))).toEqual(['#more']);
  // Past the last section (the GitHub map and the footer): nothing.
  scrollTo(1500 + 7000);
  expect(lit()).toHaveLength(0);
  expect(screen.getByRole('link', { name: 'Connect' })).not.toHaveAttribute('aria-current');
});

test('works without IntersectionObserver or requestAnimationFrame', () => {
  const io = (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
  delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
  // @ts-expect-error simulate a browser without it
  window.requestAnimationFrame = undefined;
  expect(() => render(<HomeNav items={ITEMS} />)).not.toThrow();
  const scrollTo = page(1500);
  scrollTo(1500 + 1100);
  expect(lit().map((a) => a.getAttribute('href'))).toEqual(['#games']);
  if (io) (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = io;
});

test('the band sticks, slides on a phone without a scrollbar, and the sections clear it', () => {
  const css = fs.readFileSync('app/design-system.css', 'utf8');
  expect(css).toMatch(/\.wb \.home-nav \{[^}]*position: sticky; top: 0;/);
  expect(css).toMatch(/\.wb \.home-nav-in \{[^}]*overflow-x: auto;[^}]*scrollbar-width: none;/);
  expect(css).toMatch(/\.wb \.builds, \.wb \.builds > section \{ scroll-margin-top: calc\(var\(--home-nav-h\) \+ 16px\); \}/);
  expect(css).toMatch(/\.wb \.home-nav-end \{ margin-left: auto; \}/);
});
