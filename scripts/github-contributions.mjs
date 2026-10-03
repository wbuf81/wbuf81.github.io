#!/usr/bin/env node
/**
 * Refreshes data/github-contributions.json, the GitHub map on the homepage, from GitHub's public
 * contributions calendar. Runs in the deploy workflow before the build (and daily on a schedule).
 *
 *   npm run github:contributions
 *
 * It never fails the deploy: if GitHub can't be reached or the page looks wrong, it prints a warning and
 * leaves the committed file in place, so the map is never blank.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(repoRoot, 'data/github-contributions.json');
const USER = 'wbuf81';
// Overridable so the tests can prove an unreachable GitHub never fails the deploy.
const SOURCE = process.env.GITHUB_CONTRIBUTIONS_URL || `https://github.com/users/${USER}/contributions`;

// The same parser the tests cover, compiled on the fly (as add-health-week.mjs does).
require('ts-node/register');
const { parseContributionsHtml } = require(path.join(repoRoot, 'lib/githubContributions.ts'));

try {
  const res = await fetch(SOURCE, {
    headers: { 'User-Agent': 'wesleybard.com build' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = parseContributionsHtml(await res.text());
  if (parsed.levels.length < 364) throw new Error(`only ${parsed.levels.length} days`);
  fs.writeFileSync(out, JSON.stringify({ user: USER, ...parsed }, null, 2) + '\n');
  console.log(`GitHub map refreshed: ${parsed.from} to ${parsed.to}`);
} catch (err) {
  console.warn(`warning: GitHub contributions not refreshed (${err.message}); using the committed file`);
}
