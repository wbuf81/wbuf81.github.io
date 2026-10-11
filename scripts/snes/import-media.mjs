#!/usr/bin/env node
/**
 * Turns Wes's scraped media set into what the site serves:
 *   public/snes/video/<slug>.mp4   12s clip with sound (360px, H.264 CRF30 ≤260k, AAC 56k mono, faststart)
 *   public/snes/logo/<slug>.webp   title logo, native size
 *   public/snes/box3d/<slug>.webp  3D box render, native size (skipped for "(Japan" files: Japanese art)
 * The raw set lives outside the repo at SNES_MEDIA_DIR (.env.local), default ../snes-media. Never in out/:
 * every build wipes out/. Re-runs only redo what changed (a new clipStart, a new alias). Then run snes:build.
 *
 *   npm run snes:media [-- --refresh]
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { DATA_DIR, loadTs, readJson, refresh, repoRoot, writeJson } from './lib.mjs';

const envFile = path.join(repoRoot, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const MEDIA = path.resolve(repoRoot, process.env.SNES_MEDIA_DIR || '../snes-media');
if (!fs.existsSync(path.join(MEDIA, 'videos'))) {
  console.error(`No media set at ${MEDIA} (expected images/ and videos/). Set SNES_MEDIA_DIR in .env.local.`);
  process.exit(1);
}
const { indexMedia, mediaFor } = loadTs('lib/snes/media.ts');
const games = readJson(path.join(DATA_DIR, 'games.json'), []);
const aliases = readJson(path.join(DATA_DIR, 'aliases.json'), {});
const PUB = path.join(repoRoot, 'public/snes');
const DIRS = { video: path.join(PUB, 'video'), logo: path.join(PUB, 'logo'), box3d: path.join(PUB, 'box3d') };
for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });

const index = indexMedia([...fs.readdirSync(path.join(MEDIA, 'images')), ...fs.readdirSync(path.join(MEDIA, 'videos'))]);
const sourcesFile = path.join(PUB, 'media-sources.json');
const sources = readJson(sourcesFile, {});
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.trim().split('\n').pop()}`);
};
const WEBP = path.join(repoRoot, 'scripts/snes/webp.py');
const missing = [];
let clips = 0;

for (const game of games) {
  const entry = mediaFor(index, game.title, aliases.media?.[game.slug]);
  if (!entry) {
    missing.push(game.title);
    continue;
  }
  const clipStart = game.clipStart ?? 4;
  const was = sources[game.slug] ?? {};
  const changed = refresh || was.base !== entry.base;
  const video = path.join(DIRS.video, `${game.slug}.mp4`);
  if (entry.kinds.includes('video') && (changed || was.clipStart !== clipStart || !fs.existsSync(video))) {
    run('ffmpeg', ['-v', 'error', '-y', '-ss', String(clipStart), '-t', '12', '-i', path.join(MEDIA, 'videos', `${entry.base}-video.mp4`),
      '-vf', 'scale=360:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-maxrate', '260k', '-bufsize', '520k',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '56k', '-ac', '1', video]);
    clips++;
  }
  const logo = path.join(DIRS.logo, `${game.slug}.webp`);
  if (entry.kinds.includes('marquee') && (changed || !fs.existsSync(logo))) {
    run('python3', [WEBP, path.join(MEDIA, 'images', `${entry.base}-marquee.png`), logo, '82']);
  }
  const box3d = path.join(DIRS.box3d, `${game.slug}.webp`);
  if (entry.kinds.includes('image') && !entry.japan && (changed || !fs.existsSync(box3d))) {
    run('python3', [WEBP, path.join(MEDIA, 'images', `${entry.base}-image.png`), box3d, '82']);
  }
  sources[game.slug] = { base: entry.base, clipStart };
  if (clips && clips % 50 === 0) {
    writeJson(sourcesFile, sources);
    console.log(`  ${clips} clips`);
  }
}

// A slug that left games.json takes its media with it.
const slugs = new Set(games.map((g) => g.slug));
for (const slug of Object.keys(sources)) if (!slugs.has(slug)) delete sources[slug];
for (const [kind, dir] of Object.entries(DIRS)) {
  const ext = kind === 'video' ? 'mp4' : 'webp';
  for (const f of fs.readdirSync(dir)) if (!f.endsWith(`.${ext}`) || !slugs.has(f.slice(0, -ext.length - 1))) fs.rmSync(path.join(dir, f));
}
writeJson(sourcesFile, sources);
fs.writeFileSync(path.join(PUB, 'SOURCES.md'),
  '# SNES media\n\nGameplay clips (12 seconds, re-encoded), title logos and 3D box renders come from Wes\'s personal scraped media ' +
  'library, matched to each game by its No-Intro name (`media-sources.json` lists the file used for every game). They belong to ' +
  "each game's publisher and are shown small and credited in a non-commercial history of the console. Box art credits: `box/SOURCES.md`.\n");
const mb = (dir) => fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0) / 1e6;
console.log(`media: ${clips} clips encoded · video ${mb(DIRS.video).toFixed(0)} MB · logos ${mb(DIRS.logo).toFixed(0)} MB · 3D boxes ${mb(DIRS.box3d).toFixed(0)} MB`);
if (missing.length) console.log(`  no media (add aliases.json "media" entries): ${missing.join('; ')}`);
