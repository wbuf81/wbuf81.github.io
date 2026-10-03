import fs from 'fs';
import path from 'path';

// The tab icon, and the PWA icons, are one letterform: the W from Source Serif 4, the masthead's face,
// drawn by scripts/og/build-favicon.py. They must never drift apart.
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const ICONS = ['app/icon.svg', 'public/icon-192.svg', 'public/icon-512.svg'];
const glyph = (svg: string) => svg.match(/<path d="([^"]+)"/)?.[1];

test('all three icons draw the same W from Source Serif 4', () => {
  const svgs = ICONS.map(read);
  for (const s of svgs) {
    expect(s).toMatch(/Source Serif 4/);
    expect(s).toMatch(/fill="#14130f"/);
  }
  const paths = svgs.map(glyph);
  expect(paths[0]).toBeTruthy();
  expect(new Set(paths).size).toBe(1);
});

test('the glyph is an outline, never text (a favicon has no webfont)', () => {
  for (const p of ICONS) expect(read(p).replace(/<!--[\s\S]*?-->/g, '')).not.toMatch(/<text/);
});
