#!/usr/bin/env node
/**
 * Append a week of health-tracker rows to data/health.json.
 *
 * Usage:
 *   pbpaste | node scripts/add-health-week.mjs
 *   node scripts/add-health-week.mjs --year 2026 < week.tsv
 *   node scripts/add-health-week.mjs --dry-run < week.tsv
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
  const args = { year: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--year') args.year = Number(argv[++i]);
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
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
  });
}

main();
