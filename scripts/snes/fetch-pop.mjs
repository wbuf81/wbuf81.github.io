#!/usr/bin/env node
/**
 * Saves the raw wikitext behind the Time Machine to .snes-cache/pop/: Billboard Hot 100 and Billboard 200 number
 * ones, weekend box office number ones, and "YEAR in the United States", for 1991–1998. One request at a time,
 * 2.5 s apart; anything already cached is skipped unless --refresh.
 *
 *   npm run snes:pop:fetch [-- --refresh]
 */
import fs from 'fs';
import { popCachePath, refresh, sleep, wikiParse } from './lib.mjs';

const PAGES = (y) => ({
  [`hot-${y}`]: `List of Billboard Hot 100 number ones of ${y}`,
  [`album-${y}`]: `List of Billboard 200 number-one albums of ${y}`,
  [`box-${y}`]: `List of ${y} box office number-one films in the United States`,
  [`news-${y}`]: `${y} in the United States`,
});

for (let y = 1991; y <= 1998; y++) {
  for (const [key, title] of Object.entries(PAGES(y))) {
    const file = popCachePath(`${key}.wiki`);
    if (fs.existsSync(file) && !refresh) continue;
    try {
      fs.writeFileSync(file, await wikiParse(title));
      console.log(`  ✓ ${title}`);
    } catch (err) {
      console.error(`  ✗ ${title}: ${err.message}`);
      process.exit(1);
    }
    await sleep(2500);
  }
}
console.log('Pop pages cached in .snes-cache/pop/');
