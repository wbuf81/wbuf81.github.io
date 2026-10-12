import fs from 'fs';
import path from 'path';
import { metadata as library } from '../app/videogames/snes-history/page';
import { metadata as hub } from '../app/videogames/page';
import { metadata as top8 } from '../app/videogames/snes-history/top-8/page';
import { metadata as timeMachine } from '../app/videogames/snes-history/time-machine/page';

const PUBLIC = path.join(__dirname, '..', 'public');

/** Width and height from the JPEG's SOF0/SOF2 marker. */
function jpegSize(file: string) {
  const b = fs.readFileSync(path.join(PUBLIC, file));
  expect(b.subarray(0, 2).toString('hex')).toBe('ffd8');
  let i = 2;
  while (i < b.length) {
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker === 0xc0 || marker === 0xc2) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  throw new Error('no SOF marker');
}

describe('share card images', () => {
  it.each(['og-snes.jpg', 'og-videogames.jpg', 'og-top8.jpg'])('%s is a 1200x630 JPEG within the 300 KB WhatsApp limit', (file) => {
    expect(jpegSize(file)).toEqual({ w: 1200, h: 630 });
    expect(fs.statSync(path.join(PUBLIC, file)).size).toBeLessThanOrEqual(300 * 1024);
  });

  it('the featured homepage image is a 2:1 JPEG under 300 KB', () => {
    expect(jpegSize('projects/snes-history.jpg')).toEqual({ w: 1200, h: 600 });
    expect(fs.statSync(path.join(PUBLIC, 'projects', 'snes-history.jpg')).size).toBeLessThanOrEqual(300 * 1024);
  });
});

it('the hub example picture is a 600px-wide JPEG within 80 KB', () => {
  const { w, h } = jpegSize('snes/top8-example.jpg');
  expect(w).toBe(600);
  expect(h).toBe(600);
  expect(fs.statSync(path.join(PUBLIC, 'snes', 'top8-example.jpg')).size).toBeLessThanOrEqual(80 * 1024);
});

describe('robots.txt', () => {
  const robots = fs.readFileSync(path.join(PUBLIC, 'robots.txt'), 'utf8');
  it('lets crawlers fetch /videogames so link previews work (noindex does the keeping out)', () => {
    expect(robots).not.toMatch(/^Disallow:\s*\/videogames/m);
  });
  it('still disallows /health', () => {
    expect(robots).toMatch(/^Disallow:\s*\/health\s*$/m);
  });
});

describe.each([
  ['the library', library, '/og-snes.jpg'],
  ['the Time Machine', timeMachine, '/og-snes.jpg'],
  ['the hub', hub, '/og-videogames.jpg'],
  ['the Top 8', top8, '/og-top8.jpg'],
])('%s metadata', (_name, meta, image) => {
  it('has a large-image card and stays noindex', () => {
    const images = (meta.openGraph as { images: { url: string; width: number; height: number }[] }).images;
    expect(images[0]).toMatchObject({ url: image, width: 1200, height: 630 });
    expect((meta.twitter as { card: string }).card).toBe('summary_large_image');
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

describe.each([
  ['a game page', '@/app/videogames/snes-history/[slug]/page', 'f-zero', '/videogames/snes-history/f-zero', /F-Zero/],
  ['a company page', '@/app/videogames/snes-history/company/[slug]/page', 'nintendo', '/videogames/snes-history/company/nintendo', /Nintendo/],
])('%s metadata', (_name, mod, slug, url, title) => {
  it('has its own share card (not the homepage one) and stays noindex', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { generateMetadata } = require(mod);
    const meta = await generateMetadata({ params: Promise.resolve({ slug }) });
    const og = meta.openGraph as { title: string; description: string; url: string; images: { url: string; width: number; height: number; alt: string }[] };
    expect(og.title).toMatch(title);
    expect(og.description.length).toBeGreaterThan(10);
    expect(og.url).toBe(url);
    expect(og.images[0]).toMatchObject({ url: '/og-snes.jpg', width: 1200, height: 630 });
    expect(og.images[0].alt.length).toBeGreaterThan(5);
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', title: og.title, images: ['/og-snes.jpg'] });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

test('the Top 8 metadata carries its own url', () => {
  expect((top8.openGraph as { url: string }).url).toBe('/videogames/snes-history/top-8');
});
