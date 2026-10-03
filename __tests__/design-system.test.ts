import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(process.cwd(), 'app/design-system.css'), 'utf8');

// The body of the first rule whose selector text starts at `selector`.
function block(selector: string): string {
  const i = css.indexOf(selector);
  if (i < 0) throw new Error(`missing ${selector}`);
  const open = css.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === '{') depth++;
    if (css[j] === '}' && --depth === 0) return css.slice(open + 1, j);
  }
  throw new Error('unbalanced braces');
}
const names = (s: string) => Array.from(s.matchAll(/(--[a-z0-9-]+)\s*:/g), (m) => m[1]);
const FONT_ONLY = ['--serif', '--sans', '--mono'];

test('every colour token has a dark twin in both dark blocks', () => {
  const light = names(block(':root {')).filter((n) => !FONT_ONLY.includes(n));
  const media = names(block(':root:not([data-theme="light"]) {'));
  const forced = names(block(':root[data-theme="dark"] {'));
  expect(light.length).toBeGreaterThan(15);
  for (const n of light) {
    expect(media).toContain(n);
    expect(forced).toContain(n);
  }
});

test('the two dark blocks agree', () => {
  expect(block(':root:not([data-theme="light"]) {').replace(/\s+/g, '')).toBe(
    block(':root[data-theme="dark"] {').replace(/\s+/g, ''),
  );
});

test('blocks are scoped under .wb so other pages are untouched', () => {
  const body = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
    .replace(/@media[^{]*\{/g, '');
  const selectors = Array.from(body.matchAll(/(?:^|[;}])\s*([^{};@]+)\{/g), (m) => m[1].trim()).filter(Boolean);
  expect(selectors.length).toBeGreaterThan(40);
  // Split a selector list on its top-level commas only, not the ones inside :is(…) or :not(…).
  const parts = (sel: string) => {
    const out: string[] = [];
    let depth = 0;
    let cur = '';
    for (const ch of sel) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    return [...out, cur];
  };
  for (const sel of selectors) {
    for (const part of parts(sel)) {
      const p = part.trim();
      if (p.startsWith(':root')) continue;
      expect(p).toMatch(/^\.wb\b/);
    }
  }
});

test('no grayscale filters', () => {
  expect(css).not.toMatch(/grayscale/);
});
