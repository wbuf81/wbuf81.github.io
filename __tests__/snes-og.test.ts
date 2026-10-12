import fs from 'fs';
import path from 'path';
import { metadata as library } from '../app/videogames/snes-history/page';
import { metadata as hub } from '../app/videogames/page';
import { metadata as timeMachine } from '../app/videogames/snes-history/time-machine/page';

const PUBLIC = path.join(__dirname, '..', 'public');

function pngSize(file: string) {
  const b = fs.readFileSync(path.join(PUBLIC, file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe('share card images', () => {
  it.each(['og-snes.png', 'og-videogames.png'])('%s is a 1200x630 PNG', (file) => {
    expect(pngSize(file)).toEqual({ w: 1200, h: 630 });
  });

  it('the featured homepage image is a JPEG under 300 KB', () => {
    const file = path.join(PUBLIC, 'projects', 'snes-history.jpg');
    expect(fs.statSync(file).size).toBeLessThan(300 * 1024);
    expect(fs.readFileSync(file).subarray(0, 2).toString('hex')).toBe('ffd8');
  });
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
  ['the library', library, '/og-snes.png'],
  ['the Time Machine', timeMachine, '/og-snes.png'],
  ['the hub', hub, '/og-videogames.png'],
])('%s metadata', (_name, meta, image) => {
  it('has a large-image card and stays noindex', () => {
    const images = (meta.openGraph as { images: { url: string; width: number; height: number }[] }).images;
    expect(images[0]).toMatchObject({ url: image, width: 1200, height: 630 });
    expect((meta.twitter as { card: string }).card).toBe('summary_large_image');
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
