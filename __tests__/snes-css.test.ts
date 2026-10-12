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

test('on touch the scatter dots never lift into a stacking context, so enlarged hit pads stay beneath every dot', () => {
  const touch = css.slice(css.indexOf('@media (max-width: 760px), (pointer: coarse)'));
  expect(touch).toMatch(/\.s-dot:hover[^{]*\{[^}]*transform: none[^}]*z-index: auto|\.s-dot:hover[^{]*\{[^}]*z-index: auto[^}]*transform: none/);
  expect(touch).toMatch(/\.s-dot \{[^}]*opacity: 1/);
  expect(touch).toMatch(/\.s-dot::before \{[^}]*z-index: -1/);
});
test('the coming-soon hub card has no link glow', () => {
  expect(css).toMatch(/\.s-hub-soon:hover[^{]*\{[^}]*box-shadow: none/);
});

test('the data credit is readable: at least 11px, in a body-text token that passes 4.5:1 in both themes', () => {
  const rule = css.match(/\.wb \.s-credit\s*\{([^}]*)\}/);
  expect(rule).not.toBeNull();
  const size = Number(rule![1].match(/(\d+(?:\.\d+)?)px/)![1]);
  expect(size).toBeGreaterThanOrEqual(11);
  expect(rule![1]).toMatch(/color: var\(--ink-2\)/);
  expect(css).not.toMatch(/\.s-tm-credit/);
});

test('hub card images keep the card shape: height follows the 300 / 209 aspect ratio, not the img height attribute', () => {
  const rule = css.match(/\.wb \.s-hub-card img\s*\{([^}]*)\}/);
  expect(rule).not.toBeNull();
  expect(rule![1]).toMatch(/height: auto/);
  expect(rule![1]).toMatch(/aspect-ratio: 300 \/ 209/);
});
