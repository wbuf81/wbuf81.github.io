#!/usr/bin/env node
/**
 * Builds data/snes/weeks.json from .snes-cache/pop/ (offline) and data/snes/pop-overrides.json, then prints the
 * coverage report. Exits 1, writing nothing, when a week lacks a chart entry or an override is orphaned.
 *
 *   npm run snes:pop:build [-- --json]
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR, POP_DIR, loadTs, popCachePath, readJson, writeJson } from './lib.mjs';

const { parseChart, parseNews } = loadTs('lib/snes/pop.ts');
const { weekStarts, assembleWeeks, artId, unknownArtOverrides } = loadTs('lib/snes/weeks.ts');

const rows = { hot: [], album: [], box: [], news: [] };
for (let y = 1991; y <= 1998; y++) {
  for (const kind of ['hot', 'album', 'box', 'news']) {
    const file = popCachePath(`${kind}-${y}.wiki`);
    if (!fs.existsSync(file)) { console.error(`Missing ${file} — run npm run snes:pop:fetch first.`); process.exit(1); }
    const text = fs.readFileSync(file, 'utf8');
    try { rows[kind].push(...(kind === 'news' ? parseNews(text, y) : parseChart(text, y))); }
    catch (err) { console.error(`${kind} ${y}: ${err.message}`); process.exit(1); }
  }
}
const games = readJson(path.join(DATA_DIR, 'games.json'), []);
const overrides = readJson(path.join(DATA_DIR, 'pop-overrides.json'), { weeks: {}, art: {} });
const lastGame = games.map((g) => g.releasedUS).sort().pop();
const missingArt = new Set();
const art = (article) => {
  if (!article) return null;
  const id = artId(article);
  if (id in (overrides.art ?? {})) return overrides.art[id];
  if (fs.existsSync(path.join(POP_DIR, `${id}.webp`))) return `/snes/pop/${id}.webp`;
  missingArt.add(article);
  return null;
};
const { weeks, errors } = assembleWeeks({ starts: weekStarts(lastGame), ...rows, art, overrides });
const articles = [...rows.hot, ...rows.album, ...rows.box].map((r) => r.article).filter(Boolean);
errors.push(...unknownArtOverrides(articles, overrides.art ?? {}));
if (errors.length) { console.error(`Build refused — nothing written:\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`); process.exit(1); }
writeJson(path.join(DATA_DIR, 'weeks.json'), weeks);

const report = {
  weeks: weeks.length, first: weeks[0].start, last: weeks[weeks.length - 1].start,
  newsInWeek: weeks.filter((w) => w.news.length).length, newsNear: weeks.filter((w) => !w.news.length && w.near).length,
  newsNone: weeks.filter((w) => !w.news.length && !w.near).length, missingArt: [...missingArt].sort(),
};
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else console.log(`SNES weeks — ${report.weeks} weeks (${report.first} → ${report.last})
  news in-week ${report.newsInWeek}   near-week ${report.newsNear}   none ${report.newsNone}
  artwork missing ${report.missingArt.length}${report.missingArt.length ? ` (${report.missingArt.slice(0, 8).join('; ')}${report.missingArt.length > 8 ? '; …' : ''})` : ''}`);
