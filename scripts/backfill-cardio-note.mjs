#!/usr/bin/env node
/**
 * One-off migration: split each day's single `notes` string into the two
 * columns the sheet now keeps apart — `cardioNote` ("30 mins 12.5 / 3.0") and
 * `notes` (everything else, "Church", "Jags Game").
 *
 * Written for the Aug 2026 sheet change and kept as the record of it. Every
 * stored note was either a cardio note beginning "NN mins …" or a plain note,
 * and one row held both joined by an em dash; anything else refuses rather than
 * guessing. Re-running it is a no-op once cardioNote exists.
 *
 *   node scripts/backfill-cardio-note.mjs --dry-run
 *   node scripts/backfill-cardio-note.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataPath = path.join(repoRoot, 'data/health.json');
const dryRun = process.argv.includes('--dry-run');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

/** "45 mins 12.5 / 3.0 — Jags Game" -> the cardio half and the rest. */
function split(notes) {
  const trimmed = notes.trim();
  if (trimmed === '') return { cardioNote: '', notes: '' };
  if (!/^\d+\s*mins?\b/i.test(trimmed)) return { cardioNote: '', notes: trimmed };

  const [cardioNote, ...rest] = trimmed.split(/\s*[—·]\s*/);
  return { cardioNote: cardioNote.trim(), notes: rest.join(' · ').trim() };
}

const problems = [];
let changed = 0;

for (const day of data.days) {
  if (typeof day.cardioNote === 'string') continue;

  const parts = split(day.notes ?? '');
  if (parts.cardioNote !== '' && !day.cardio) {
    problems.push(`${day.date}: cardio note "${parts.cardioNote}" on a day with cardio false.`);
  }

  // Rebuild the day so cardioNote lands next to cardioMinutes, ahead of notes.
  const rebuilt = {};
  for (const [key, value] of Object.entries(day)) {
    if (key === 'notes') {
      rebuilt.cardioNote = parts.cardioNote;
      rebuilt.notes = parts.notes;
    } else {
      rebuilt[key] = value;
    }
  }
  Object.keys(day).forEach((key) => delete day[key]);
  Object.assign(day, rebuilt);

  changed++;
  console.log(
    `${day.date}  cardioNote=${JSON.stringify(day.cardioNote)}  notes=${JSON.stringify(day.notes)}`
  );
}

if (problems.length > 0) {
  console.error(`\nRefusing to write:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

console.log(`\n${changed} day(s) split, ${data.days.length - changed} already done.`);

if (dryRun) {
  console.log('--dry-run: nothing written.');
} else {
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${dataPath}`);
}
