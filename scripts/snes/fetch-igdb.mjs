#!/usr/bin/env node
/**
 * Saves every IGDB game on the SNES (platform 19) to .snes-cache/igdb.json, 500 per request.
 * Needs IGDB_CLIENT_ID and IGDB_CLIENT_SECRET in .env.local (a free Twitch developer app:
 * https://dev.twitch.tv/console). Without them it explains and exits 0, so the rest of the pipeline runs.
 *
 *   npm run snes:fetch:igdb [-- --refresh]
 */
import fs from 'fs';
import path from 'path';
import { cachePath, fetchWithRetry, refresh, repoRoot, sleep, writeJson } from './lib.mjs';

const envFile = path.join(repoRoot, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const { IGDB_CLIENT_ID: id, IGDB_CLIENT_SECRET: secret } = process.env;
const out = cachePath('igdb.json');

if (!id || !secret) {
  console.log('IGDB skipped: add IGDB_CLIENT_ID and IGDB_CLIENT_SECRET to .env.local (see .env.example). ' +
    'The build still runs, with genres, players, ESRB, summaries and aggregate scores left empty.');
  process.exit(0);
}
if (fs.existsSync(out) && !refresh) {
  console.log('cached  IGDB (pass --refresh to fetch again)');
  process.exit(0);
}

const tokenUrl =
  `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(id)}` +
  `&client_secret=${encodeURIComponent(secret)}&grant_type=client_credentials`;
const { access_token: token } = await (await fetchWithRetry(tokenUrl, { method: 'POST' })).json();

const FIELDS = [
  'name', 'alternative_names.name', 'genres.name', 'game_modes.name',
  'multiplayer_modes.platform', 'multiplayer_modes.offlinemax', 'multiplayer_modes.offlinecoopmax',
  'multiplayer_modes.offlinecoop', 'franchises.name', 'collections.name', 'similar_games', 'themes.name', 'player_perspectives.name',
  'aggregated_rating', 'aggregated_rating_count', 'rating', 'rating_count',
  'total_rating', 'total_rating_count', 'summary',
  'age_ratings.organization.name', 'age_ratings.rating_category.rating',
].join(',');

const games = [];
for (let offset = 0; ; offset += 500) {
  const res = await fetchWithRetry('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: { 'Client-ID': id, Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: `fields ${FIELDS}; where platforms = (19); sort id asc; limit 500; offset ${offset};`,
  });
  const page = await res.json();
  games.push(...page);
  console.log(`  ${games.length} games`);
  if (page.length < 500) break;
  await sleep(300); // IGDB allows 4 requests a second
}
writeJson(out, games);
console.log(`IGDB: ${games.length} SNES games cached`);
