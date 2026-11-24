// Screenshots the LOCAL demo copy of Glance at 1280x800 (device scale 1) with the page clock frozen
// at today's date and the times below. Headless Chrome through playwright-core; never a visible
// window, never the deployed dashboard.
//   node shoot.cjs <demo copy>/dashboard <out dir> [base=http://127.0.0.1:5287] [only-file.png ...]
// Reads the keys from the demo copy's own .dev.vars (made by setup-copy.sh) and never prints them.
const fs = require('fs');
const path = require('path');
const PW = process.env.PLAYWRIGHT_CORE || 'playwright-core';
const { chromium } = require(PW);

const [copy, outDir, baseArg, ...only] = process.argv.slice(2);
const BASE = baseArg || 'http://127.0.0.1:5287';
const vars = fs.readFileSync(path.join(copy, '.dev.vars'), 'utf8');
const KEY = vars.match(/^DASH_KEY=(.*)$/m)[1].trim();
const PUSH = vars.match(/^CLAUDE_PUSH_KEY=(.*)$/m)[1].trim();
const hide = s => String(s).split(KEY).join('<key>').split(PUSH).join('<push>');

const SHOTS = [
  ['home-tokyo-night.png', 'tokyo-night', '20:12', 'home'],
  ['home-daylight.png', 'daylight', '14:46', 'home'],
  ['home-paper.png', 'paper', '14:46', 'home'],
  ['home-daylight-morning.png', 'daylight', '09:05', 'home'],
  ['week-daylight.png', 'daylight', '14:46', 'week'],
  ['week-tokyo-night.png', 'tokyo-night', '20:12', 'week'],
  ['forecast-daylight.png', 'daylight', '14:46', 'weather'],
  ['forecast-tokyo-night.png', 'tokyo-night', '20:12', 'weather'],
  ['settings-tokyo-night.png', 'tokyo-night', '20:12', 'settings'],
  ['settings-paper.png', 'paper', '14:46', 'settings'],
];

const TZ = 'America/New_York';
// From the THANKS list in worker/routes/verse.js; short enough for two lines in the clock tile.
const VERSE = process.env.DEMO_VERSE || 'PHP 1:3';
// Today's date in New York at hh:mm New York time, as a Date.
function nyTime(hhmm) {
  const now = new Date();
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(x => [x.type, x.value]));
  const [h, m] = hhmm.split(':').map(Number);
  const guess = Date.UTC(+p.year, +p.month - 1, +p.day, h, m);
  // New York's offset from UTC at that moment.
  const q = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(guess)).map(x => [x.type, x.value]));
  const asNy = Date.UTC(+q.year, +q.month - 1, +q.day, +q.hour, +q.minute);
  return new Date(guess + (guess - asNy));
}

// Regular US session, Eastern time (holidays aside).
function marketOpen(t) {
  const q = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', weekday: 'short', hour: 'numeric', minute: 'numeric' }).formatToParts(t).map(x => [x.type, x.value]));
  const m = +q.hour * 60 + +q.minute;
  return !['Sat', 'Sun'].includes(q.weekday) && m >= 570 && m < 960;
}

async function post(urlPath, body) {
  const r = await fetch(BASE + urlPath + '?k=' + encodeURIComponent(KEY), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(urlPath + ' answered ' + r.status);
}

async function shoot(browser, [file, theme, hhmm, view]) {
  const { push } = await import(path.join(__dirname, 'push-readings.mjs'));
  const at = nyTime(hhmm);
  await push(BASE, PUSH, at.toISOString());
  await post('/api/settings', { theme });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, timezoneId: TZ, locale: 'en-US' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(hide(e)));
  await page.clock.setFixedTime(at);
  await page.addInitScript(t => { try { localStorage.setItem('glance-theme', t); } catch (e) {} }, theme);

  // The Worker's data carries the real time it was fetched; restate it as a minute or two before
  // the frozen clock, so the tiles don't say "updated 300 min ago". The weather request also
  // carries the frozen time (see patch-copy.py) so the forecast is the one for that hour.
  const fresh = new Date(at.getTime() - 2 * 60000).toISOString();
  // The clock tile's verse: one from the app's own list that fits in two lines (see patch-copy.py).
  await page.route(/\/api\/verse(\?|$)/, async route => {
    const headers = Object.assign({}, route.request().headers(), { 'x-demo-verse': VERSE });
    return route.continue({ headers });
  });
  await page.route(/\/api\/(calendar|weather|markets)(\?|$)/, async route => {
    const req = route.request();
    const headers = Object.assign({}, req.headers(), { 'x-demo-now': at.toISOString() });
    const res = await route.fetch({ headers });
    let j;
    try { j = await res.json(); } catch (e) { return route.fulfill({ response: res }); }
    if (j && j.updated) j.updated = fresh;
    if (/\/api\/markets/.test(req.url()) && j && Array.isArray(j.quotes)) j.open = marketOpen(at);
    return route.fulfill({ response: res, body: JSON.stringify(j) });
  });

  await page.goto(BASE + '/?k=' + encodeURIComponent(KEY), { waitUntil: 'load' });
  // Every home tile filled in, images loaded, fonts ready.
  await page.waitForFunction(theme => {
    const q = s => document.querySelector(s);
    const imgsDone = [...document.querySelectorAll('#view-home img')].every(i => i.complete && i.naturalWidth > 0);
    return q('#tile-cal .cal-grid .blk, #tile-cal .cal-rel') && q('#tile-wx .wx-now') && q('#tile-mkt .mk') &&
      q('#tile-games .gx-title') && q('#tile-claude .cu') && q('#tile-car .car-head') && q('#tile-clock .verse') && imgsDone &&
      (theme === 'paper') === (document.documentElement.className.indexOf('tn') < 0);
  }, theme, { timeout: 90000, polling: 500 });
  await page.waitForTimeout(1500);
  if (view === 'settings') await page.click('.gear');
  else if (view === 'week') await page.click('#tile-cal');
  else if (view === 'weather') await page.click('#tile-wx');
  if (view === 'settings') await page.waitForSelector('#settings .set-card');
  if (view === 'week') await page.waitForSelector('#wk-grid .blk');
  if (view === 'weather') await page.waitForSelector('#wxv-days .drow');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const check = await page.evaluate(v => {
    const sel = { home: '#view-home', week: '#view-week', weather: '#view-weather', settings: '#view-settings' }[v];
    const root = document.querySelector(sel);
    return { cls: document.documentElement.className, empties: [...root.querySelectorAll('.empty')].map(e => e.textContent), text: root.innerText };
  }, view);
  await page.screenshot({ path: path.join(outDir, file) });
  await ctx.close();
  return { file, theme, time: hhmm, view, cls: check.cls, empties: check.empties, errors, text: check.text };
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = [];
  try {
    for (const s of SHOTS.filter(s => !only.length || only.includes(s[0]))) {
      const r = await shoot(browser, s);
      report.push(r);
      console.log(hide(JSON.stringify({ file: r.file, cls: r.cls, empties: r.empties, errors: r.errors })));
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(outDir, '..', 'frame-shots-text.json'), hide(JSON.stringify(report, null, 1)));
})().catch(e => { console.error(hide(e && e.stack || e)); process.exit(1); });
