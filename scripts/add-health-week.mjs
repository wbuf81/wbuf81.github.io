#!/usr/bin/env node
/**
 * Append a week of health-tracker rows to data/health.json.
 *
 * Usage:
 *   pbpaste | node scripts/add-health-week.mjs
 *   node scripts/add-health-week.mjs --year 2026 < week.tsv
 *   node scripts/add-health-week.mjs --dry-run < week.tsv
 *   node scripts/add-health-week.mjs --no-cards < week.tsv
 *
 * A successful import also draws the week's share cards into .weekly/. That step
 * can fail (it needs Chrome) without the import being in doubt, so it only ever
 * warns — see buildCards.
 *
 * Input is tab-separated rows copied straight from the sheet, columns Date
 * through Notes. A pasted header row is ignored.
 *
 * Hard errors refuse the whole import. Warnings are printed and the import
 * proceeds, because gaps and outliers are usually real.
 *
 * The parser itself lives in lib/health.ts and is unit-tested; this script is
 * only the file I/O around it.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dataPath = path.join(repoRoot, 'data/health.json');

// Compile the TypeScript parser on the fly so the script and the tested code
// can't drift apart.
require('ts-node/register');

function loadParser() {
  try {
    return require(path.join(repoRoot, 'lib/health.ts'));
  } catch {
    console.error(
      'Could not load lib/health.ts. Run this through the npm script:\n' +
        '  npm run health:add\n'
    );
    process.exit(1);
  }
}

function parseArgs(argv) {
  const args = { year: null, dryRun: false, cards: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--year') args.year = Number(argv[++i]);
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--no-cards') args.cards = false;
  }
  return args;
}

/** Exit code build-weekly.py uses for "no complete week yet". */
const NOTHING_TO_DRAW = 3;

/**
 * Draw the share cards for the week just imported.
 *
 * The data is already on disk by the time this runs, so a card problem is
 * reported and shrugged off rather than failing the import — Chrome or Pillow
 * missing on this machine says nothing about whether the week imported. Cards
 * are regenerable any time with `npm run weekly:cards`.
 */
function buildCards() {
  console.log('Drawing the share cards…\n');

  const result = spawnSync('python3', [path.join(repoRoot, 'scripts/og/build-weekly.py')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status === 0) return;

  if (result.status === NOTHING_TO_DRAW) {
    console.log('\nNo cards: that week is not finished yet. Run `npm run weekly:cards` once it is.\n');
    return;
  }

  console.warn(
    '\n! The week imported fine, but the cards did not draw' +
      (result.error ? ` (${result.error.message})` : '') +
      '.\n  Retry with `npm run weekly:cards`. Needs python3, Chrome and Pillow.\n'
  );
}

async function readStdin() {
  if (process.stdin.isTTY) {
    console.error(
      'No input. Copy the week\'s rows from the sheet, then:\n' +
        '  pbpaste | node scripts/add-health-week.mjs\n'
    );
    process.exit(1);
  }

  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function readData() {
  if (!fs.existsSync(dataPath)) {
    return { lastUpdated: '', units: { weight: 'lb' }, days: [] };
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function main() {
  readStdin().then((tsv) => {
    const args = parseArgs(process.argv.slice(2));
    const { parseHealthTsv } = loadParser();

    const data = readData();
    const existing = data.days ?? [];

    // Default the year from the last recorded day, so a January paste after a
    // December week rolls over on its own.
    const fallbackYear =
      args.year ??
      (existing.length ? Number(existing[existing.length - 1].date.slice(0, 4)) : new Date().getUTCFullYear());

    const result = parseHealthTsv(tsv, { year: fallbackYear, existing });

    if (result.errors.length > 0) {
      console.error(`\nImport refused — ${result.errors.length} error(s):\n`);
      for (const error of result.errors) console.error(`  ✗ ${error}`);
      console.error('\nNothing was written.\n');
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.warn(`\n${result.warnings.length} warning(s) — imported anyway:\n`);
      for (const warning of result.warnings) console.warn(`  ! ${warning}`);
    }

    console.log(`\nParsed ${result.days.length} day(s):\n`);
    for (const day of result.days) {
      const marks = [
        day.workout || 'rest',
        day.cardio ? `cardio ${day.cardioMinutes}m` : null,
      ]
        .filter(Boolean)
        .join(' + ');
      console.log(
        `  ${day.date} ${day.day}  ` +
          `${String(day.cals ?? '—').padStart(5)} kcal  ` +
          `${String(day.protein ?? '—').padStart(4)}p  ` +
          `${String(day.weight ?? '—').padStart(6)} lb  ` +
          `${String(day.steps ?? '—').padStart(6)} steps  ${marks}`
      );
    }

    if (args.dryRun) {
      console.log('\n--dry-run: nothing written.\n');
      return;
    }

    const merged = [...existing, ...result.days].sort((a, b) => a.date.localeCompare(b.date));
    const updated = {
      ...data,
      lastUpdated: new Date().toISOString().slice(0, 10),
      units: data.units ?? { weight: 'lb' },
      days: merged,
    };

    fs.writeFileSync(dataPath, `${JSON.stringify(updated, null, 2)}\n`);
    console.log(`\nWrote ${merged.length} total day(s) to data/health.json\n`);

    if (args.cards) buildCards();
  });
}

main();
