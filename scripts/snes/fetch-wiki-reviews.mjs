#!/usr/bin/env node
/**
 * Saves each US game's {{Video game reviews}} box (raw wikitext, or null when the article has none) to
 * .snes-cache/reviews.json, 50 articles per request. The cache is written after every batch, so an
 * interrupted run resumes where it stopped. Needs .snes-cache/wiki-list.wiki (npm run snes:fetch:list).
 *
 *   npm run snes:fetch:reviews [-- --refresh]
 */
import fs from 'fs';
import { cachePath, fetchWithRetry, loadTs, readJson, refresh, sleep, writeJson } from './lib.mjs';

const listFile = cachePath('wiki-list.wiki');
if (!fs.existsSync(listFile)) {
  console.error('No .snes-cache/wiki-list.wiki yet — run npm run snes:fetch:list first.');
  process.exit(1);
}
const { parseSoftwareList } = loadTs('lib/snes/wikiList.ts');
const { contentForBatch, extractReviewBox } = loadTs('lib/snes/reviews.ts');

const out = cachePath('reviews.json');
const cache = refresh ? {} : readJson(out, {});
const articles = [...new Set(parseSoftwareList(fs.readFileSync(listFile, 'utf8')).rows.map((r) => r.article))]
  .filter(Boolean)
  .filter((a) => !(a in cache));
console.log(`${articles.length} articles to fetch (${Object.keys(cache).length} cached)`);

// A queue: when Wikipedia cuts a response short (it sets `continue`), unfilled articles go back on the end.
const queue = [...articles];
const requeued = new Map();
let done = 0;
while (queue.length) {
  const batch = queue.splice(0, 50);
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main' +
    '&format=json&formatversion=2&redirects=1&titles=' +
    encodeURIComponent(batch.join('|'));
  const body = await (await fetchWithRetry(url)).json();
  if (!body.query) throw new Error(`Wikipedia returned no query result: ${JSON.stringify(body).slice(0, 200)}`);
  for (const [asked, text] of Object.entries(contentForBatch(batch, body.query))) {
    if (text === null && body.continue && (requeued.get(asked) ?? 0) < 3) {
      requeued.set(asked, (requeued.get(asked) ?? 0) + 1); // truncated, not missing: ask again (3 tries)
      queue.push(asked);
    } else cache[asked] = text ? extractReviewBox(text) : null;
  }
  writeJson(out, cache);
  done = articles.length - queue.length;
  console.log(`  ${done} / ${articles.length}`);
  await sleep(500);
}

const withBox = Object.values(cache).filter(Boolean).length;
console.log(`review boxes: ${withBox} of ${Object.keys(cache).length} articles`);
