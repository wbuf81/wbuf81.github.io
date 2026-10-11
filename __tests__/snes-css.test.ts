import fs from 'fs';
import path from 'path';

// /snes follows the design system's rules: colours by token, every selector under .wb. The one raw colour
// allowed is black at low alpha, for the CRT scanlines and spine shading.
const css = fs.readFileSync(path.join(process.cwd(), 'app/snes/snes.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('colours come from tokens: no hex, and the only raw colour is translucent black', () => {
  expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  for (const m of css.matchAll(/rgba?\(([^)]*)\)/g)) expect(m[1].replace(/\s/g, '')).toMatch(/^0,0,0,\.?\d/);
});

test('every selector is scoped under .wb', () => {
  const body = css.replace(/@media[^{]*\{/g, '');
  const selectors = Array.from(body.matchAll(/(?:^|[;}])\s*([^{};@]+)\{/g), (m) => m[1].trim()).filter(Boolean);
  expect(selectors.length).toBeGreaterThan(80);
  for (const sel of selectors) for (const part of sel.split(',')) expect(part.trim()).toMatch(/^\.wb\b/);
});

test('the hover scanlines are the light ones Wes chose, easing in', () => {
  expect(css).toContain('repeating-linear-gradient(0deg, rgba(0, 0, 0, .28) 0 1px, transparent 1px 3px)');
  expect(css).toMatch(/\.s-art::after[^}]*transition: opacity \.4s/);
});

test('the year-jump anchor spans the month grid instead of taking the rail column', () => {
  expect(css).toMatch(/\.wb \.s-anchor\s*\{[^}]*grid-column: 1 \/ -1/);
});

test('the filter bar is sticky on desktop only, and panel selects never overflow', () => {
  const outsideMedia = css.replace(/@media[^{]*\{[\s\S]*?\n\}/g, '');
  expect(outsideMedia).not.toMatch(/\.wb \.s-bar\s*\{[^}]*sticky/);
  expect(css).toMatch(/@media \(min-width: 761px\)\s*\{[^}]*\.wb \.s-bar\s*\{[^}]*position: sticky/);
  expect(css).toMatch(/\.wb \.s-select\s*\{[^}]*max-width: 100%|\.wb \.s-panel \.s-select[^{]*\{[^}]*max-width: 100%/);
});
