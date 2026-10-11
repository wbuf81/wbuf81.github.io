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
const { extractReviewBox } = loadTs('lib/snes/reviews.ts');

const out = cachePath('reviews.json');
const cache = refresh ? {} : readJson(out, {});
const articles = [...new Set(parseSoftwareList(fs.readFileSync(listFile, 'utf8')).rows.map((r) => r.article))]
  .filter(Boolean)
  .filter((a) => !(a in cache));
console.log(`${articles.length} articles to fetch (${Object.keys(cache).length} cached)`);

for (let i = 0; i < articles.length; i += 50) {
  const batch = articles.slice(i, i + 50);
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main' +
    '&format=json&formatversion=2&redirects=1&titles=' +
    encodeURIComponent(batch.join('|'));
  const body = await (await fetchWithRetry(url)).json();
  // Map the API's normalized and redirected titles back to the article names we asked for.
  const back = new Map(batch.map((a) => [a, a]));
  for (const { from, to } of [...(body.query.normalized ?? []), ...(body.query.redirects ?? [])]) {
    for (const [asked, current] of back) if (current === from) back.set(asked, to);
  }
  const content = new Map(
    (body.query.pages ?? []).map((p) => [p.title, p.revisions?.[0]?.slots?.main?.content ?? null]),
  );
  for (const asked of batch) {
    const text = content.get(back.get(asked));
    cache[asked] = text ? extractReviewBox(text) : null;
  }
  writeJson(out, cache);
  console.log(`  ${Math.min(i + 50, articles.length)} / ${articles.length}`);
  await sleep(500);
}

const withBox = Object.values(cache).filter(Boolean).length;
console.log(`review boxes: ${withBox} of ${Object.keys(cache).length} articles`);
