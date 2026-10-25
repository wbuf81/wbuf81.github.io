import fs from 'fs';
import path from 'path';

// The fonts live in app/fonts/ (scripts/fonts/fetch-fonts.py) and next/font/local serves them. The build used
// to fetch them from Google Fonts, and on 25 Oct 2026 an answer from Google that Next.js could not read failed
// the daily deploy. A build must never depend on Google again.
const root = process.cwd();
const LOADERS = ['app/layout.tsx', 'app/snes/fonts.ts'];

function sources(dir: string): string[] {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(e.name) ? [p] : [];
  });
}

const named = LOADERS.flatMap((f) =>
  [...fs.readFileSync(path.join(root, f), 'utf8').matchAll(/['"]([^'"]+\.woff2)['"]/g)].map((m) =>
    path.normalize(path.join(path.dirname(f), m[1])),
  ),
);

test('no code loads a font from Google Fonts', () => {
  const offenders = [...sources('app'), ...sources('lib')].filter((f) =>
    /from ['"]next\/font\/google['"]/.test(fs.readFileSync(path.join(root, f), 'utf8')),
  );
  expect(offenders).toEqual([]);
});

test('every font file the loaders name is in the repo', () => {
  expect(named.length).toBeGreaterThan(0);
  for (const f of named) expect(fs.existsSync(path.join(root, f))).toBe(true);
});

test('no font is named after a generic family', () => {
  // Turbopack names each family after its variable, and a family called serif is the generic serif unquoted.
  const names = LOADERS.flatMap((f) =>
    [...fs.readFileSync(path.join(root, f), 'utf8').matchAll(/const (\w+) = localFont/g)].map((m) => m[1]),
  );
  expect(names.length).toBe(9);
  expect(names.filter((n) => /^(serif|sans|sansSerif|mono|monospace|cursive|fantasy|math|emoji|fangsong)$/i.test(n))).toEqual([]);
});

test('every file in app/fonts is loaded', () => {
  const files = fs.readdirSync(path.join(root, 'app/fonts')).filter((f) => f.endsWith('.woff2'));
  expect(files.map((f) => path.join('app/fonts', f)).sort()).toEqual([...new Set(named)].sort());
});
