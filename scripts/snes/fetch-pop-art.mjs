#!/usr/bin/env node
/**
 * Downloads album covers, single covers and film posters for every Time Machine article (Wikipedia page images,
 * any licence — non-free covers are used small, with credit, as on the box art) and writes WebP ≤240 px to
 * public/snes/pop/, plus SOURCES.md. Skips files that already exist unless --refresh.
 *
 *   npm run snes:pop:art [-- --refresh]
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { POP_DIR, fetchWithRetry, loadTs, popCachePath, refresh, repoRoot, sleep, wikiPageImages } from './lib.mjs';

// Wikimedia rate-limits upload.wikimedia.org too (429 at ~0.6 s), so image downloads keep the same 2.5 s spacing.
const POLITE_MS = 2500;
const { parseChart } = loadTs('lib/snes/pop.ts');
const { artId } = loadTs('lib/snes/weeks.ts');
const { wikiUrl } = loadTs('lib/snes/routes.ts');
const articles = new Set();
for (let y = 1991; y <= 1998; y++) for (const kind of ['hot', 'album', 'box']) {
  for (const r of parseChart(fs.readFileSync(popCachePath(`${kind}-${y}.wiki`), 'utf8'), y)) if (r.date >= '1991-08-10' && r.article) articles.add(r.article);
}
fs.mkdirSync(POP_DIR, { recursive: true });
const want = [...articles].sort().filter((a) => refresh || !fs.existsSync(path.join(POP_DIR, `${artId(a)}.webp`)));
console.log(`${articles.size} articles, ${want.length} to fetch`);
const urls = {};
for (let i = 0; i < want.length; i += 40) {
  Object.assign(urls, await wikiPageImages(want.slice(i, i + 40)));
  await sleep(POLITE_MS);
}
for (const [article, url] of Object.entries(urls)) {
  if (!url) { console.warn(`  – no image: ${article}`); continue; }
  const id = artId(article);
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  const raw = popCachePath(`art-${id}.${ext}`);
  try {
    if (!fs.existsSync(raw)) {
      fs.writeFileSync(raw, Buffer.from(await (await fetchWithRetry(url, {}, 6)).arrayBuffer()));
      await sleep(POLITE_MS);
    }
    execFileSync('python3', [path.join(repoRoot, 'scripts/snes/webp.py'), raw, path.join(POP_DIR, `${id}.webp`), '75', 'w', '240'], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (err) {
    console.warn(`  – skipped ${article}: ${String(err.stderr ?? err.message).trim()}`);
  }
}
const lines = [...articles].sort().filter((a) => fs.existsSync(path.join(POP_DIR, `${artId(a)}.webp`)))
  .map((a) => `- ${artId(a)}.webp — [${a}](${wikiUrl(a)}) (Wikipedia page image)`);
fs.writeFileSync(path.join(POP_DIR, 'SOURCES.md'), `# Time Machine artwork\n\nAlbum covers, single covers and film posters, shown small (≤240 px) for commentary in a non-commercial history. Each comes from its Wikipedia article's page image.\n\n${lines.join('\n')}\n`);
console.log(`Wrote ${lines.length} images`);
