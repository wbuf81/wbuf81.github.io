# Edits the demo copy of the dashboard (never the original):
#  1. the home location becomes Cape Canaveral 32920 (shared/place.js, the forecast's title in
#     glance.html, the weather tile's "<zip> · tap for more")
#  2. worker/routes/weather.js reads an optional X-Demo-Now header (sent only by the screenshot
#     script) and treats Open-Meteo's forecast for that hour as "current", so the weather matches
#     the page's frozen clock.
#  3. worker/routes/verse.js reads an optional X-Demo-Verse header (a reference from the app's own
#     THANKS list, e.g. "PHP 1:3") and serves that verse, fetched from the Bible API as usual,
#     instead of the day's. A reference not in the list is ignored. Without the header nothing changes.
# Usage: python3 patch-copy.py <copy>/dashboard
import sys, os

d = sys.argv[1]
import re

def edit(path, pairs):
    p = os.path.join(d, path)
    s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            raise SystemExit('patch-copy: expected text not found in ' + path)
        s = s.replace(old, new)
    open(p, 'w', encoding='utf-8').write(s)

def edit_place():
    p = os.path.join(d, 'shared/place.js')
    s = open(p, encoding='utf-8').read()
    start = s.index('export var PLACE')
    end = s.index(';', start) + 1
    s = s[:start] + "export var PLACE = { name: 'Cape Canaveral · 32920', lat: 28.3922, lon: -80.6077, tz: 'America/New_York' };" + s[end:]
    open(p, 'w', encoding='utf-8').write(s)

edit_place()
# The home town and ZIP are found by their shape ("Town · 12345", "'12345 · tap for more'"), never by value,
# so nothing about the real location is written in these tools.
def edit_shape(path, pattern, new):
    p = os.path.join(d, path)
    s = open(p, encoding='utf-8').read()
    s, n = re.subn(pattern, new, s)
    if n != 1:
        raise SystemExit('patch-copy: expected exactly one match in ' + path + ', found ' + str(n))
    open(p, 'w', encoding='utf-8').write(s)

edit_shape('glance.html', r"[A-Z][A-Za-z. ]+ · \d{5}(?=<)", 'Cape Canaveral · 32920')
edit_shape('glance/main.js', r"'\d{5} · tap for more'", "'32920 · tap for more'")

HOOK = """// DEMO COPY ONLY (not in the real app): the screenshot script sends X-Demo-Now (an ISO time) so the
// forecast reads as it would at the page's frozen clock: "current" becomes Open-Meteo's own
// forecast for that hour. Without the header nothing changes.
function demoAt(raw, iso) {
  var t = new Date(iso);
  if (!iso || isNaN(t)) return raw;
  var p = {};
  new Intl.DateTimeFormat('en-CA', { timeZone: PLACE.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(t).forEach(function (x) { p[x.type] = x.value; });
  var hour = p.year + '-' + p.month + '-' + p.day + 'T' + p.hour;
  var h = raw.hourly;
  var i = h.time.findIndex(function (x) { return x.slice(0, 13) === hour; });
  if (i < 0) return raw;
  var out = JSON.parse(JSON.stringify(raw));
  out.current = { time: hour + ':' + p.minute, temperature_2m: h.temperature_2m[i], apparent_temperature: h.apparent_temperature[i], weather_code: h.weather_code[i], is_day: h.is_day[i] };
  return out;
}

export async function weather(request, env) {"""
edit('worker/routes/weather.js', [
    ('export async function weather(request, env) {', HOOK),
    ('var data = shaped(await loadWeather(), walk);', "var data = shaped(demoAt(await loadWeather(), request.headers.get('X-Demo-Now')), walk);"),
])
edit('worker/routes/verse.js', [
    ('async function thanksVerse(now) {\n  var ref = verseRef(now);',
     'async function thanksVerse(now, pick) {\n  var ref = pick || verseRef(now);'),
    ('''export async function verse(request, env) {
  var now = new Date();''', '''export async function verse(request, env) {
  var now = new Date();
  // DEMO COPY ONLY (not in the real app): X-Demo-Verse picks a verse from THANKS for screenshots.
  var pick = request.headers.get('X-Demo-Verse');
  if (pick && THANKS.indexOf(pick) >= 0) {
    try {
      return json(await thanksVerse(now, pick));
    } catch (err) {
      return json({ error: err.message }, 502);
    }
  }'''),
])
print('patched', d)
