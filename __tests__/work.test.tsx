import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import WorkPage, { metadata } from '@/app/work/page';
import { AGENTS, TOOLS } from '@/lib/projects';

jest.mock('next/navigation', () => ({ usePathname: () => '/work' }));

// The pals (/work): Wes's day-job work as a write-up, approved 24 Nov 2026 and linked from every Work tile.

const inPublic = (p: string) => fs.existsSync(path.join(process.cwd(), 'public', p.split('?')[0]));
const page = () => render(<WorkPage />).container.querySelector('main')!;

// The names public copy may never carry, read from __tests__/projects.test.ts so there is one list.
function bannedNames(): RegExp {
  const src = fs.readFileSync(path.join(process.cwd(), '__tests__/projects.test.ts'), 'utf8');
  const m = src.match(/not\.toMatch\(\/(\\b\([^)]*\)\\b)\/\)/);
  if (!m) throw new Error('The banned-names pattern moved out of __tests__/projects.test.ts');
  return new RegExp(m[1]);
}

test('one h1, The pals', () => {
  render(<WorkPage />);
  const h1s = screen.getAllByRole('heading', { level: 1 });
  expect(h1s).toHaveLength(1);
  expect(h1s[0]).toHaveTextContent('The pals');
});

test('the sections, in order', () => {
  const main = page();
  expect(Array.from(main.querySelectorAll('h2')).map((h) => h.textContent)).toEqual([
    'How a pal works',
    'Who decides',
    'Where the AI is',
    'How a change gets made',
    'One fleet',
    'Running it like a product',
    'The roster',
    'And one tool',
    'How they were built',
    "What isn't here",
  ]);
});

test("its title and the site's own card, out of search and out of the sitemap", () => {
  expect(metadata.title).toBe('The pals · Wesley Bard');
  expect(metadata.robots).toEqual({ index: false, follow: false });
  const og = metadata.openGraph as { url: string; images: { url: string }[] };
  expect(og.url).toBe('/work');
  // The card is the homepage's, the one app/layout.tsx names, and it exists.
  const layout = fs.readFileSync(path.join(process.cwd(), 'app/layout.tsx'), 'utf8');
  const site = layout.match(/const OG_IMAGE = '([^']+)'/)![1];
  expect(og.images[0].url).toBe(site);
  expect(inPublic(site)).toBe(true);
  expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: [site] });
  const sitemap = fs.readFileSync(path.join(process.cwd(), 'public/sitemap.xml'), 'utf8');
  expect(sitemap).not.toMatch(/\/work\b/);
});

test('the roster is the nine homepage tiles in AGENTS order, with no link in them, then WBDB', () => {
  const main = page();
  const roster = main.querySelector('section[aria-labelledby="roster-h"]')!;
  const tiles = Array.from(roster.querySelectorAll('article.tile'));
  expect(tiles.map((t) => t.querySelector('h3')!.textContent)).toEqual(AGENTS.map((a) => a.name));
  for (const t of tiles) {
    expect(t.querySelector('a')).toBeNull();
    expect(t.querySelector('.tf')).toBeNull();
  }
  const tool = main.querySelector('section[aria-labelledby="tool-h"]')!;
  expect(tool).toHaveTextContent(TOOLS[0].name);
  expect(tool).toHaveTextContent(TOOLS[0].description);
});

test('the seven steps and the three ways of deciding', () => {
  const main = page();
  const steps = Array.from(main.querySelectorAll('ol.bd-steps > li strong')).map((s) => s.textContent);
  expect(steps).toEqual([
    'Ask in plain words.',
    'Write it down first.',
    'Pick from mockups.',
    "Cut what doesn't earn its place.",
    'Tests before it ships.',
    'Sweep the fleet.',
    'Watch it run.',
  ]);
  const who = main.querySelector('section[aria-labelledby="who-h"]')!;
  expect(Array.from(who.querySelectorAll('dt')).map((d) => d.textContent)).toEqual([
    'A person decides, every time',
    'Reads and reports, on its own',
    'Acts on its own when it is sure',
  ]);
});

test('running it like a product: the eight ways it stays up, secure and on record', () => {
  const main = page();
  const sec = main.querySelector('section[aria-labelledby="product-h"]')!;
  expect(sec.querySelector('.gnote')).toHaveTextContent(
    'A tool people rely on has to stay up, stay secure and leave a trail. The company provided the server and its security tools. Everything on top of that I set up myself.',
  );
  expect(Array.from(sec.querySelectorAll('.gm-dl dt')).map((d) => d.textContent)).toEqual([
    'Watched every few minutes',
    'A status page',
    'One company sign-in',
    'Checked for known flaws',
    "The company's security tools",
    'Deploys that roll themselves back',
    'A trail an auditor would like',
    'A playbook',
  ]);
  for (const dd of Array.from(sec.querySelectorAll('.gm-dl dd'))) expect(dd.textContent).toBeTruthy();
});

test('nothing on it reads as a draft', () => {
  const main = page();
  expect(main.querySelector('.wk-draft, .wk-ask')).toBeNull();
  expect(main.textContent).not.toMatch(/For Wes|Draft/);
});

test('every picture exists, and every link stays on this site', () => {
  const main = page();
  const srcs = Array.from(main.querySelectorAll('[src]')).map((el) => el.getAttribute('src')!);
  expect(srcs.length).toBeGreaterThanOrEqual(11);
  for (const s of srcs) expect(inPublic(s)).toBe(true);
  for (const a of Array.from(main.querySelectorAll('a[href]'))) expect(a.getAttribute('href')).toMatch(/^\/(?!\/)/);
});

// By shape only: this test must never name a real private value in order to ban it.
test('nothing private, by shape, and none of the names public copy bans', () => {
  const main = page();
  const urls = Array.from(main.querySelectorAll('[href], [src]')).map((el) => el.getAttribute('href') ?? el.getAttribute('src')!);
  const text = main.textContent ?? '';
  for (const u of urls) {
    expect(u).not.toMatch(/\.workers\.dev\b/i);
    expect(u).not.toMatch(/^mailto:/i);
  }
  for (const s of [...urls, text]) {
    expect(s).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/); // an IP address
    expect(s).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/); // an email address
    expect(s).not.toMatch(/[\w-]+\.[\w-]+\.workers\.dev/i); // a Worker's own address
  }
  // OFAC is MAISIE's long-standing approved copy (see projects.test.ts); the list is checked on everything here.
  expect(text).not.toMatch(bannedNames());
});

describe('work.css', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'app/work/work.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  test('colours come from tokens, never a hex or an rgb()', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgba?|hsla?)\(/);
  });

  test('every selector is scoped under .wb, and new blocks are named wk-…', () => {
    expect(css).not.toMatch(/@keyframes/);
    const body = css.replace(/@media[^{]*\{/g, '');
    const selectors = Array.from(body.matchAll(/(?:^|[;}])\s*([^{};@]+)\{/g), (m) => m[1].trim()).filter(Boolean);
    expect(selectors.length).toBeGreaterThan(5);
    for (const sel of selectors) {
      for (const part of sel.split(',')) expect(part.trim()).toMatch(/^\.wb\b/);
    }
    for (const cls of Array.from(css.matchAll(/\.([a-z][\w-]*)/g), (m) => m[1])) {
      if (!/^(wb|gm|bd|wk|print|ph|shot|tiles|gnote|bd-flow-[a-z]+)$/.test(cls)) expect(cls).toMatch(/^wk-/);
    }
  });
});
