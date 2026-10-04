import fs from 'fs';
import path from 'path';

// /health's own sheet follows the design system's rules: colours by token, never a hex, so dark mode
// reaches every mark; and every selector under .wb, so nothing here can reach another page once loaded.
const css = fs.readFileSync(path.join(process.cwd(), 'app/health/health.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('colours come from tokens, never a hex', () => {
  expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
});

test('every selector is scoped under .wb', () => {
  const body = css.replace(/@media[^{]*\{/g, '');
  const selectors = Array.from(body.matchAll(/(?:^|[;}])\s*([^{};@]+)\{/g), (m) => m[1].trim()).filter(Boolean);
  expect(selectors.length).toBeGreaterThan(50);
  for (const sel of selectors) {
    for (const part of sel.split(',')) expect(part.trim()).toMatch(/^\.wb\b/);
  }
});
