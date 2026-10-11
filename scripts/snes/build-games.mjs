#!/usr/bin/env node
/**
 * Builds data/snes/games.json and data/snes/companies.json from .snes-cache/ (offline) plus the hand-edited
 * data/snes/aliases.json and data/snes/overrides.json, then prints the coverage report. Exits 1, writing
 * nothing, if the data breaks a rule (unknown override or alias, slug collision, missing publisher, count
 * outside 700–740).
 *
 *   npm run snes:build [-- --json]
 */
import fs from 'fs';
import path from 'path';
import { BOX_DIR, DATA_DIR, cachePath, loadTs, readJson, writeJson } from './lib.mjs';

const listFile = cachePath('wiki-list.wiki');
if (!fs.existsSync(listFile)) {
  console.error('No .snes-cache/wiki-list.wiki yet — run npm run snes:fetch first.');
  process.exit(1);
}
const { parseSoftwareList, parseChipList } = loadTs('lib/snes/wikiList.ts');
const { buildDataset, formatReport } = loadTs('lib/snes/build.ts');

const chipsFile = cachePath('wiki-chips.wiki');
const parsed = parseSoftwareList(fs.readFileSync(listFile, 'utf8'));
const { games, companies, report, errors } = buildDataset({
  list: parsed.rows,
  unreadableRows: parsed.skipped,
  chips: fs.existsSync(chipsFile) ? parseChipList(fs.readFileSync(chipsFile, 'utf8')) : [],
  reviewBoxes: readJson(cachePath('reviews.json'), {}),
  igdb: readJson(cachePath('igdb.json'), null),
  aliases: readJson(path.join(DATA_DIR, 'aliases.json'), { igdb: {}, boxart: {}, companies: {}, slugs: {} }),
  overrides: readJson(path.join(DATA_DIR, 'overrides.json'), {}),
  previous: readJson(path.join(DATA_DIR, 'games.json'), []),
  hasBoxArt: (slug) => fs.existsSync(path.join(BOX_DIR, `${slug}.jpg`)),
  hasMedia: (slug, kind) =>
    fs.existsSync(path.join(BOX_DIR, '..', kind, `${slug}.${kind === 'video' ? 'mp4' : 'png'}`)),
});

if (errors.length) {
  console.error(`Build refused — nothing written:\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`);
  process.exit(1);
}
writeJson(path.join(DATA_DIR, 'games.json'), games);
writeJson(path.join(DATA_DIR, 'companies.json'), companies);
console.log(process.argv.includes('--json') ? JSON.stringify(report, null, 2) : formatReport(report));
