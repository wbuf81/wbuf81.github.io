/**
 * Shared plumbing for the SNES dataset scripts: paths, the .snes-cache/ folder, a polite fetch with
 * retries, Wikipedia's parse API, and loading the tested TypeScript in lib/snes/ (the same ts-node route
 * add-health-week.mjs uses).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CACHE_DIR = path.join(repoRoot, '.snes-cache');
export const DATA_DIR = path.join(repoRoot, 'data/snes');
export const POP_DIR = path.join(repoRoot, 'public/snes/pop');
export const BOX_DIR = path.join(repoRoot, 'public/snes/box');
export const UA = 'wesleybard.com SNES dataset builder (https://wesleybard.com)';
export const refresh = process.argv.includes('--refresh');

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function cachePath(name) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  return path.join(CACHE_DIR, name);
}

export const popCachePath = (name) => {
  fs.mkdirSync(path.join(CACHE_DIR, 'pop'), { recursive: true });
  return path.join(CACHE_DIR, 'pop', name);
};

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

/** Retries network errors, 429 and 5xx with backoff (1s, 2s, 4s); any other non-OK status is final. */
export async function fetchWithRetry(url, init = {}, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': UA, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status} for ${url}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { final: true });
      return res;
    } catch (err) {
      if (err.final || attempt >= tries) throw err;
      console.warn(`  retrying (${err.message})`);
      await sleep(/HTTP 429/.test(err.message) ? 15000 * attempt : 1000 * 2 ** (attempt - 1));
    }
  }
}

export async function wikiParse(page) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&page=' +
    encodeURIComponent(page);
  const body = await (await fetchWithRetry(url)).json();
  if (body.error) throw new Error(`Wikipedia: ${body.error.info}`);
  return body.parse.wikitext;
}

/** Wikipedia page images (any licence) for up to 40 titles: { title → thumbnail URL | null }, following redirects. */
export async function wikiPageImages(titles, width = 240) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', titles: titles.join('|'), prop: 'pageimages', piprop: 'thumbnail', pithumbsize: String(width),
    pilicense: 'any', redirects: '1', format: 'json', formatversion: '2',
  });
  const body = await (await fetchWithRetry(url, {}, 6)).json();
  const rename = new Map();
  for (const n of [...(body.query.normalized ?? []), ...(body.query.redirects ?? [])]) rename.set(n.from, n.to);
  const resolve = (t) => { let x = t; for (let i = 0; i < 3 && rename.has(x); i++) x = rename.get(x); return x; };
  const pages = new Map(body.query.pages.map((p) => [p.title, p]));
  return Object.fromEntries(titles.map((t) => [t, pages.get(resolve(t))?.thumbnail?.source ?? null]));
}

const require = createRequire(import.meta.url);
let registered = false;
/** Loads a TypeScript module from the repo, e.g. loadTs('lib/snes/wikiList.ts'). */
export function loadTs(relPath) {
  if (!registered) {
    require('ts-node/register');
    registered = true;
  }
  return require(path.join(repoRoot, relPath));
}
