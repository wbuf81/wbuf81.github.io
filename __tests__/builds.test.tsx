import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import PhotoFramePage, { metadata } from '@/app/builds/photo-frame/page';

jest.mock('next/navigation', () => ({ usePathname: () => '/builds/photo-frame' }));

const inPublic = (p: string) => fs.existsSync(path.join(process.cwd(), 'public', p.split('?')[0]));

// Every outside address on the page, each checked by hand on 24 Nov 2026 (spec:
// docs/superpowers/specs/2026-11-24-photo-frame-build-page-design.md). A new link has to be added here on purpose.
const U = 'https://github.com/wesbos/photo-frame-dashboard/blob/main';
const ALLOWED = new Set([
  'https://github.com/omacom/omarchy',
  'https://github.com/wesbos/photo-frame-dashboard',
  'https://youtu.be/ZLycoUMltNI',
  `${U}/README.md`,
  `${U}/docs/devices.md`,
  `${U}/docs/pf1007l-start-here.md`,
  `${U}/docs/allwinner-a33-pf1007l.md`,
  `${U}/dashboard/kiosk/README.md`,
  `${U}/docs/building-for-the-frame.md`,
  'https://developers.cloudflare.com/workers/',
  'https://developers.cloudflare.com/workers/platform/limits/',
  'https://developers.cloudflare.com/kv/',
  `${U}/docs/pf1007l-boot-fixes.md`,
  `${U}/docs/allwinner-a33-boot-screens.md`,
  'https://open-meteo.com/en/docs',
  'https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service',
  'https://en.wikipedia.org/api/rest_v1/',
  'https://bible.helloao.org/docs/',
  'https://github.com/kewisch/ical.js',
  'https://github.com/mourner/suncalc',
]);

const page = () => render(<PhotoFramePage />).container.querySelector('main')!;

test('one h1, the build’s name', () => {
  render(<PhotoFramePage />);
  const h1s = screen.getAllByRole('heading', { level: 1 });
  expect(h1s).toHaveLength(1);
  expect(h1s[0]).toHaveTextContent('Photo Frame Dashboard');
});

test('its own title and card, out of search and out of the sitemap', () => {
  expect(metadata.title).toBe('Photo Frame Dashboard · Wesley Bard');
  expect(metadata.robots).toEqual({ index: false, follow: false });
  const og = metadata.openGraph as { url: string; images: { url: string; width: number; height: number; alt: string }[] };
  expect(og.url).toBe('/builds/photo-frame');
  expect(og.images[0]).toEqual({ url: '/og-photo-frame.jpg', width: 1200, height: 630, alt: 'The photo frame dashboard at night' });
  expect(inPublic(og.images[0].url)).toBe(true);
  expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: ['/og-photo-frame.jpg'] });
  const sitemap = fs.readFileSync(path.join(process.cwd(), 'public/sitemap.xml'), 'utf8');
  expect(sitemap).not.toMatch(/\/builds/);
});

test('every screenshot is 1280x800 with alt text, inside a same-tab link to its own full-size file', () => {
  const main = page();
  const imgs = Array.from(main.querySelectorAll('img'));
  expect(imgs).toHaveLength(7);
  imgs.forEach((img, i) => {
    expect(img).toHaveAttribute('width', '1280');
    expect(img).toHaveAttribute('height', '800');
    expect(img).toHaveAttribute('loading', i === 0 ? 'eager' : 'lazy');
    expect(img.getAttribute('alt')).toBeTruthy();
    const src = img.getAttribute('src')!;
    expect(src).toMatch(/^\/builds\/photo-frame\/[a-z-]+\.jpg$/);
    const a = img.closest('a')!;
    expect(a).toHaveAttribute('href', src);
    expect(a).not.toHaveAttribute('target');
    expect(a.getAttribute('aria-label')).toMatch(/^Open the full-size picture: /);
  });
  // The hero print is untilted.
  expect((imgs[0].closest('a') as HTMLElement).style.transform).toBe('rotate(0deg)');
});

test('every picture, sprite and screenshot link it names exists', () => {
  const main = page();
  const local = Array.from(main.querySelectorAll('[src], [href]'))
    .map((el) => el.getAttribute('src') ?? el.getAttribute('href')!)
    .filter((u) => u.startsWith('/builds/'));
  expect(local.length).toBeGreaterThanOrEqual(14);
  for (const u of local) expect(inPublic(u)).toBe(true);
  const sprite = screen.getByRole('img', { name: 'Jeffrey, a pixel-art figure, walking' });
  expect(sprite).toHaveClass('bd-jeffrey');
  expect(sprite.style.backgroundImage).toContain('/builds/photo-frame/jeffrey-walk.png');
  expect(inPublic('/builds/photo-frame/jeffrey-walk.png')).toBe(true);
});

test('every outside link opens in a new tab and is on the checked list', () => {
  const main = page();
  const outside = Array.from(main.querySelectorAll('a[href^="http"]'));
  expect(outside.length).toBeGreaterThanOrEqual(ALLOWED.size);
  for (const a of outside) {
    expect(ALLOWED.has(a.getAttribute('href')!)).toBe(true);
    expect(a).toHaveAttribute('target', '_blank');
    expect(a.getAttribute('rel')).toMatch(/\bnoopener\b/);
  }
  // Every address on the list is used.
  expect(new Set(outside.map((a) => a.getAttribute('href')))).toEqual(ALLOWED);
  // The rest are on this site.
  for (const a of Array.from(main.querySelectorAll('a[href]'))) expect(a.getAttribute('href')).toMatch(/^(https:\/\/|\/)/);
});

// By shape only: this test must never name a real private value in order to ban it.
test('nothing private, by shape', () => {
  const main = page();
  const urls = Array.from(main.querySelectorAll('[href], [src]')).map((el) => el.getAttribute('href') ?? el.getAttribute('src')!);
  const text = main.textContent ?? '';
  for (const u of urls) {
    expect(u).not.toMatch(/github\.com\/wbuf81\b/i);
    expect(u).not.toMatch(/\.workers\.dev\b/i);
    expect(u).not.toMatch(/^mailto:/i);
    expect(u).not.toMatch(/^\/health\b/);
    expect(u).not.toMatch(/^\/(conair|arcade|marbles|walletroyale|welldone|fivepointtwo)(\/|$|-)/);
  }
  for (const s of [...urls, text]) {
    expect(s).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/); // an IP address
    expect(s).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/); // an email address
    expect(s).not.toMatch(/[\w-]+\.[\w-]+\.workers\.dev/i); // a Worker's own address
  }
});

test('the seven tiles, the five warnings and the nine steps are all there', () => {
  const main = page();
  const onIt = main.querySelector('section[aria-labelledby="on-it-h"]')!;
  expect(Array.from(onIt.querySelectorAll('dt')).map((d) => d.textContent)).toEqual([
    'Clock', 'Calendar', 'Weather', 'Markets', 'Car', 'On this day in gaming', 'Claude usage',
  ]);
  expect(main.querySelectorAll('.bd-warn li')).toHaveLength(5);
  const steps = main.querySelectorAll('ol.bd-steps > li');
  expect(steps).toHaveLength(9);
  for (const li of Array.from(steps)) expect(li.querySelector('strong')?.textContent).toBeTruthy();
  expect(main.querySelectorAll('.bd-sources li')).toHaveLength(6);
});

describe('How everything gets to the frame', () => {
  const flowSection = () => page().querySelector('section[aria-labelledby="flow-h"]') as HTMLElement;

  test('its heading sits between What\'s on it and Three looks', () => {
    const main = page();
    const h2s = Array.from(main.querySelectorAll('section.sec h2')).map((h) => h.textContent);
    const at = h2s.indexOf('How everything gets to the frame');
    expect(at).toBeGreaterThan(0);
    expect(h2s[at - 1]).toBe("What's on it");
    expect(h2s[at + 1]).toBe('Three looks, and one that follows the sun');
  });

  test('the figure is labelled and its three stages are an ordered list, in order', () => {
    const sec = flowSection();
    const fig = sec.querySelector('figure')!;
    expect(fig).toHaveAttribute('aria-label', 'How data reaches the photo frame, in three stages');
    const stages = Array.from(fig.querySelectorAll(':scope > ol > li'));
    expect(stages.map((li) => li.querySelector('.bd-flow-label')!.textContent)).toEqual([
      '1 · Where it comes from',
      '2 · In the cloud',
      '3 · On the wall',
    ]);
    // Every arrow is decoration; its label is the text.
    const arrows = fig.querySelectorAll('.bd-flow-arrow');
    expect(arrows).toHaveLength(3);
    arrows.forEach((a) => expect(a).toHaveAttribute('aria-hidden', 'true'));
  });

  test('every box, row, point, arrow label and the update strip are there as text', () => {
    const sec = flowSection();
    expect(sec.querySelector('.gnote')).toHaveTextContent(
      'The frame itself does very little. It opens one web page and asks for fresh numbers every minute or two. A small program in the cloud does the fetching, and my Mac adds the two things only it knows.',
    );
    const rows = Array.from(sec.querySelectorAll('.bd-flow-rows > div')).map((d) => [
      d.querySelector('dt')!.textContent,
      d.querySelector('dd')!.textContent,
    ]);
    expect(rows).toEqual([
      ['The weather', 'Open-Meteo'],
      ['The markets', 'Yahoo Finance'],
      ['Game history', 'Wikidata and Wikipedia'],
      ['The daily verse', 'a free Bible API'],
      ['My calendar', 'a private link only the Worker knows'],
      ['Where my car is', 'Mac Tesla Tracker'],
      ['My Claude usage', 'a small usage app'],
    ]);
    expect(Array.from(sec.querySelectorAll('.bd-flow-box h3')).map((h) => h.textContent)).toEqual([
      'Out on the internet', 'On my Mac', 'A Cloudflare Worker', 'The photo frame',
    ]);
    const hub = sec.querySelector('.bd-flow-hub')!;
    expect(hub.querySelector('.bd-flow-lead')).toHaveTextContent('One small program that is always on.');
    expect(Array.from(hub.querySelectorAll('li')).map((l) => l.textContent)).toEqual([
      'Checks for the key. No key, no dashboard.',
      'Trims my calendar down to the days that matter.',
      'Answers from its copies, so the frame never waits on a slow source.',
    ]);
    expect(Array.from(sec.querySelectorAll('.bd-flow-wall li')).map((l) => l.textContent)).toEqual([
      'A kiosk app opens the one page when it boots.',
      'The page draws the seven tiles and works out my repeating meetings.',
      'A light sensor and a small script turn the screen off when the room goes dark.',
    ]);
    expect(Array.from(sec.querySelectorAll('.bd-flow-says')).map((p) => p.textContent)).toEqual([
      'The Worker fetches these and keeps a copy',
      'My Mac sends these, checking once a minute',
      'The frame asks again every minute or two',
    ]);
    const loop = sec.querySelector('.bd-flow-loop')!;
    expect(loop).toHaveTextContent('When I change something');
    expect(loop).toHaveTextContent(
      'I publish a new version, the Worker starts serving it, and within five minutes the frame notices and reloads itself. Nobody touches the frame.',
    );
    // The update strip comes after the stages, inside the figure.
    expect(loop.parentElement!.tagName).toBe('FIGURE');
    expect(loop.previousElementSibling!.tagName).toBe('OL');
  });

  test('the section adds no links', () => {
    expect(flowSection().querySelectorAll('a')).toHaveLength(0);
  });
});

test('the closing card credits the upstream work and goes home', () => {
  render(<PhotoFramePage />);
  expect(screen.getByRole('heading', { level: 2, name: "Credit where it's due" })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to the homepage' })).toHaveAttribute('href', '/');
  for (const c of ['JavaScript', 'Vite', 'Cloudflare Workers', 'Workers KV', 'ical.js', 'Android 6']) {
    expect(document.querySelector('.bd-credit')).toHaveTextContent(c);
  }
});

// The page's own sheet follows the design system's rules: colours by token, never a hex or an rgb(), so dark
// mode reaches every block; and every selector under .wb, so nothing here can reach another page once loaded.
describe('builds.css', () => {
  const css = fs
    .readFileSync(path.join(process.cwd(), 'app/builds/builds.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  test('colours come from tokens, never a hex or an rgb()', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgba?|hsla?)\(/);
  });

  test('every selector is scoped under .wb, and new blocks are named bd-…', () => {
    // Keyframe steps (from, to) are not selectors; the animation's own name is checked instead.
    const names = Array.from(css.matchAll(/@keyframes\s+([\w-]+)/g), (m) => m[1]);
    for (const n of names) expect(n).toMatch(/^bd-/);
    const body = css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').replace(/@media[^{]*\{/g, '');
    const selectors = Array.from(body.matchAll(/(?:^|[;}])\s*([^{};@]+)\{/g), (m) => m[1].trim()).filter(Boolean);
    expect(selectors.length).toBeGreaterThan(10);
    for (const sel of selectors) {
      for (const part of sel.split(',')) expect(part.trim()).toMatch(/^\.wb\b/);
    }
    for (const cls of Array.from(css.matchAll(/\.([a-z][\w-]*)/g), (m) => m[1])) {
      if (!/^(wb|gm|bd|print|ph|tape|stats|n|card|gm-grid|gnote|chips|shot)$/.test(cls)) expect(cls).toMatch(/^bd-/);
    }
  });
});
