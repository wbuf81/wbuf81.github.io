import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import ConAirPage, { metadata } from '@/app/games/con-air/page';

jest.mock('next/navigation', () => ({ usePathname: () => '/games/con-air' }));

const inPublic = (p: string) => fs.existsSync(path.join(process.cwd(), 'public', p.split('?')[0]));

test('one h1, the game’s name', () => {
  render(<ConAirPage />);
  const h1s = screen.getAllByRole('heading', { level: 1 });
  expect(h1s).toHaveLength(1);
  expect(h1s[0]).toHaveTextContent('CON AIR');
});

test('the trailer has controls and its sound, and never plays by itself', () => {
  const { container } = render(<ConAirPage />);
  const video = container.querySelector('video')!;
  expect(video).toHaveAttribute('controls');
  expect(video).toHaveAttribute('poster', '/games/con-air/title.png');
  expect(video.querySelector('source')).toHaveAttribute('src', '/games/con-air/trailer.mp4');
  expect(video).not.toHaveAttribute('autoplay');
  expect(video).not.toHaveAttribute('muted');
  expect(video.autoplay).toBe(false);
  expect(video.muted).toBe(false);
});

test('every screenshot is a 960x640 image that is not a link, and every file it names exists', () => {
  const { container } = render(<ConAirPage />);
  const imgs = Array.from(container.querySelectorAll('main img'));
  expect(imgs.length).toBe(24);
  for (const img of imgs) {
    expect(img).toHaveAttribute('width', '960');
    expect(img).toHaveAttribute('height', '640');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img.getAttribute('alt')).toBeTruthy();
    expect(img.closest('a')).toBeNull();
  }
  const refs = Array.from(container.querySelectorAll('[src], [poster]'))
    .flatMap((el) => [el.getAttribute('src'), el.getAttribute('poster')])
    .filter((u): u is string => !!u && /^\/(games\/con-air|projects)\//.test(u));
  expect(refs.length).toBeGreaterThan(24);
  for (const u of refs) expect(inPublic(u)).toBe(true);
});

// The page itself, not the shared footer, whose Connect column links Wes's GitHub profile on every page.
test('nothing on the page points at the web games, a ROM or the code', () => {
  const { container } = render(<ConAirPage />);
  const urls = Array.from(container.querySelectorAll('main [href], main [src]')).map((el) => el.getAttribute('href') ?? el.getAttribute('src')!);
  expect(urls.length).toBeGreaterThan(0);
  // Every link, the shared header and footer included, stays clear of the web games.
  for (const el of Array.from(container.querySelectorAll('[href]'))) {
    expect(el.getAttribute('href')).not.toMatch(/^\/(conair|arcade|marbles|walletroyale|welldone|fivepointtwo)(\/|$|-)/);
  }
  for (const u of urls) {
    expect(u).not.toMatch(/^\/(conair|arcade|marbles|walletroyale|welldone|fivepointtwo)(\/|$|-)/);
    expect(u).not.toMatch(/\.gba\b/i);
    expect(u).not.toMatch(/github\.com/);
  }
});

test('the page stays out of search, has its own card and is not in the sitemap', () => {
  expect(metadata.robots).toEqual({ index: false, follow: false });
  const og = (metadata.openGraph?.images as { url: string }[])[0].url;
  expect(og).toBe('/og-con-air.png');
  expect(inPublic(og)).toBe(true);
  expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: ['/og-con-air.png'] });
  const sitemap = fs.readFileSync(path.join(process.cwd(), 'public/sitemap.xml'), 'utf8');
  expect(sitemap).not.toMatch(/\/games/);
});

// The page's own sheet follows the design system's rules: colours by token, never a hex, so dark mode reaches
// every block; and every selector under .wb, so nothing here can reach another page once loaded.
describe('games.css', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'app/games/games.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  test('colours come from tokens, never a hex', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  test('every selector is scoped under .wb', () => {
    const body = css.replace(/@media[^{]*\{/g, '');
    const selectors = Array.from(body.matchAll(/(?:^|[;}])\s*([^{};@]+)\{/g), (m) => m[1].trim()).filter(Boolean);
    expect(selectors.length).toBeGreaterThan(10);
    for (const sel of selectors) {
      for (const part of sel.split(',')) expect(part.trim()).toMatch(/^\.wb\b/);
    }
  });
});
