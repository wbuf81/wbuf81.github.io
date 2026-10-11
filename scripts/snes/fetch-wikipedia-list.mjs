#!/usr/bin/env node
/**
 * Saves the raw wikitext of Wikipedia's SNES games list and enhancement-chip list to .snes-cache/,
 * then parses them as a sanity check. Skips pages already cached unless --refresh.
 *
 *   npm run snes:fetch:list [-- --refresh]
 */
import fs from 'fs';
import { cachePath, loadTs, refresh, wikiParse } from './lib.mjs';

const PAGES = {
  'wiki-list.wiki': 'List of Super Nintendo Entertainment System games',
  'wiki-chips.wiki': 'List of Super NES enhancement chips',
};

for (const [file, page] of Object.entries(PAGES)) {
  const out = cachePath(file);
  if (fs.existsSync(out) && !refresh) {
    console.log(`cached  ${page}`);
    continue;
  }
  fs.writeFileSync(out, await wikiParse(page));
  console.log(`fetched ${page}`);
}

const { parseSoftwareList, parseChipList } = loadTs('lib/snes/wikiList.ts');
const { rows, skipped } = parseSoftwareList(fs.readFileSync(cachePath('wiki-list.wiki'), 'utf8'));
const chips = parseChipList(fs.readFileSync(cachePath('wiki-chips.wiki'), 'utf8'));
console.log(`${rows.length} North American releases (${skipped} unreadable rows — the build refuses until the parser reads them), ${chips.length} chip games`);
