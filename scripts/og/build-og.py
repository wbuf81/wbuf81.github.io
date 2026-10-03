#!/usr/bin/env python3
"""Render the link-preview (OpenGraph) cards into public/.

    python3 scripts/og/build-og.py            # both cards
    python3 scripts/og/build-og.py health     # just the health card

Why a script and not `opengraph-image.tsx`: the health card is built from the
real numbers in data/health.json, so it has to be regenerated when a week is
imported. Re-run it after `npm run health:add` — see CLAUDE.md.

Why PNG and not the SVG this replaced: iMessage, Teams, Slack, LinkedIn and
WhatsApp all ignore SVG previews. That was the original bug.

Cards are laid out in HTML and rendered by headless Chrome at 2x, then
downsampled, which is what keeps the serif crisp at thumbnail size. Fonts are
inlined so the cards match the live pages exactly: the homepage card uses the
design system's Source Serif 4, IBM Plex Sans and IBM Plex Mono (app/design-system.css);
the health card keeps /health's own Playfair Display and Outfit.

Requires: Google Chrome, and Pillow (`pip install pillow`).
"""
import base64
import json
import pathlib
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).parent
REPO = HERE.parent.parent
PUBLIC = REPO / 'public'

W, H = 1200, 630
SCALE = 2

# Set CHROME_BIN to override. The candidates cover a local mac and the Linux
# runner that regenerates the health card on every deploy.
CHROME_CANDIDATES = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'google-chrome-stable',
    'google-chrome',
    'chromium-browser',
    'chromium',
]


def find_chrome():
    import os

    override = os.environ.get('CHROME_BIN')
    if override:
        if pathlib.Path(override).exists() or shutil.which(override):
            return override
        raise SystemExit(f'CHROME_BIN is set to "{override}" but that is not executable.')

    for candidate in CHROME_CANDIDATES:
        if pathlib.Path(candidate).exists():
            return candidate
        found = shutil.which(candidate)
        if found:
            return found

    raise SystemExit(
        'Could not find Chrome. Install it, or set CHROME_BIN to the binary.\n'
        f'Looked for: {", ".join(CHROME_CANDIDATES)}'
    )


def b64(path):
    return base64.b64encode(path.read_bytes()).decode()


PLAYFAIR = b64(HERE / 'playfair.woff2')
OUTFIT = b64(HERE / 'outfit.woff2')

# The live site's palette: warm paper, warm near-black ink, and the already
# contrast-validated series blue and positive green.
BASE = f"""
@font-face {{
  font-family: 'Playfair Display';
  src: url(data:font/woff2;base64,{PLAYFAIR}) format('woff2');
  font-weight: 400 900;
}}
@font-face {{
  font-family: 'Outfit';
  src: url(data:font/woff2;base64,{OUTFIT}) format('woff2');
  font-weight: 100 900;
}}
:root {{
  --ink: #14130f;
  --paper: #f6f4ef;
  --rule: #d9d5cc;
  --muted: #78756d;
  --blue: #2a78d6;
  --green: #146c4f;
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {W}px; height: {H}px; overflow: hidden; }}
body {{
  font-family: 'Outfit', sans-serif;
  -webkit-font-smoothing: antialiased;
  background: var(--paper);
  color: var(--ink);
}}
.card {{ position: relative; width: {W}px; height: {H}px; overflow: hidden; }}
.eyebrow {{
  font-size: 19px; font-weight: 600; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--muted);
}}
"""


SERIF = b64(HERE / 'source-serif-4-semibold.woff2')
SANS_400 = b64(HERE / 'plex-sans-400.woff2')
SANS_500 = b64(HERE / 'plex-sans-500.woff2')
MONO = b64(HERE / 'plex-mono-500.woff2')
HEADSHOT = b64(PUBLIC / 'headshot-thumb.jpg')

# The design system's light tokens (app/design-system.css). Repeated here because the card is rendered
# outside the site; keep them in step if the tokens change.
SITE = f"""
@font-face {{ font-family: 'Source Serif 4'; src: url(data:font/woff2;base64,{SERIF}) format('woff2'); font-weight: 600; }}
@font-face {{ font-family: 'IBM Plex Sans'; src: url(data:font/woff2;base64,{SANS_400}) format('woff2'); font-weight: 400; }}
@font-face {{ font-family: 'IBM Plex Sans'; src: url(data:font/woff2;base64,{SANS_500}) format('woff2'); font-weight: 500; }}
@font-face {{ font-family: 'IBM Plex Mono'; src: url(data:font/woff2;base64,{MONO}) format('woff2'); font-weight: 500; }}
:root {{
  --bg: #f4f6f8; --paper: #ffffff; --ink: #1b2430; --ink-2: #566371; --ink-3: #64707c; --rule: #cfd6dd;
  --accent: #0f4c5c; --on-accent: #ffffff; --tape: rgba(255, 226, 150, .72); --screen: #121a22;
  --serif: 'Source Serif 4', Georgia, serif; --sans: 'IBM Plex Sans', Arial, sans-serif; --mono: 'IBM Plex Mono', Menlo, monospace;
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {W}px; height: {H}px; overflow: hidden; }}
body {{ font-family: var(--sans); -webkit-font-smoothing: antialiased; background: var(--bg); color: var(--ink); }}
.card {{ position: relative; width: {W}px; height: {H}px; overflow: hidden; }}
"""

# A Tetris stack mid-game, in the board's playing colours (app/components/home/TetrisBoard.tsx).
VIVID = ['#06b6d4', '#eab308', '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#f97316']  # I O T S Z J L
STACK = ['..........'] * 6 + [
    '..........', '....T.....', '...TTT....', '..........', '..........', '..........', '..........',
    '........I.', 'OO......I.', 'OOJ..T..IZ', 'LJJJTTTS.Z', 'LSS.OOZZSI', 'SS.IOOJZZI', 'LLLJ.ZZSSI',
]


def board_cells():
    cells = []
    for row in STACK:
        for ch in row:
            colour = 'rgba(255,255,255,.05)' if ch == '.' else VIVID['IOTSZJL'.index(ch)]
            cells.append(f'<i style="background:{colour}"></i>')
    return ''.join(cells)


def main_card():
    """The homepage in miniature: the eyebrow, the name and the Then / Now / Still strip on the left;
    the taped Tetris print and the headshot print on the right, as in the hero. No tagline (Wes rejects
    anything that reads as one); every word here is on the live page."""
    return f"""
<style>
{SITE}
.left {{ position: absolute; left: 72px; top: 150px; width: 640px; }}
.eyebrow {{ font: 500 16px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); }}
.name {{ font: 600 98px/1 var(--serif); letter-spacing: -.02em; white-space: nowrap; margin: 20px 0 40px; }}
.stats {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--rule); border: 1px solid var(--rule); }}
.stats > div {{ background: var(--paper); padding: 15px 14px 16px; }}
.k {{ font: 500 12px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 8px; }}
.n {{ font: 600 22px/1.1 var(--serif); color: var(--accent); white-space: nowrap; }}
.l {{ font: 400 14px/1.3 var(--sans); color: var(--ink-2); margin-top: 6px; }}
.url {{ position: absolute; left: 72px; bottom: 54px; font: 500 15px var(--mono); letter-spacing: .06em; color: var(--ink-3); }}
.print {{ position: absolute; background: var(--paper); border: 1px solid var(--rule); box-shadow: 0 18px 32px -20px rgba(0,0,0,.38); }}
.tape {{ position: absolute; height: 20px; background: var(--tape); }}
.cap {{ position: absolute; left: 12px; right: 11px; bottom: 9px; display: flex; justify-content: space-between; align-items: center;
  font: 500 12px var(--mono); letter-spacing: .02em; color: var(--ink-2); }}
.arcade {{ left: 742px; top: 84px; padding: 10px 10px 48px; transform: rotate(-2.2deg); z-index: 2; }}
.screen {{ background: var(--screen); padding: 14px; display: flex; gap: 14px; }}
.board {{ display: grid; grid-template-columns: repeat(10, 14px); grid-auto-rows: 14px; gap: 1px; }}
.board i {{ display: block; border-radius: 2px; }}
.hud {{ width: 56px; font: 500 10px var(--mono); letter-spacing: .08em; text-transform: uppercase; color: #8d9aa7; }}
.hud b {{ display: block; margin: 4px 0 14px; font: 600 22px/1 var(--serif); letter-spacing: 0; color: #e6ebf0; }}
.play {{ display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 12px; border-radius: 4px; background: var(--accent);
  color: var(--on-accent); font: 500 13px var(--sans); }}
.play::before {{ content: ''; border-left: 8px solid currentColor; border-top: 5px solid transparent; border-bottom: 5px solid transparent; }}
.hs {{ left: 962px; top: 228px; width: 212px; padding: 9px 9px 34px; transform: rotate(2.8deg); z-index: 1; }}
.hs img {{ display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; object-position: 50% 30%; }}
.hs .cap {{ justify-content: flex-end; }}
</style>
<div class="card">
  <div class="left">
    <p class="eyebrow">Governance, Risk &amp; Compliance · Newfold Digital</p>
    <p class="name">Wesley Bard</p>
    <div class="stats">
      <div><p class="k">Then</p><p class="n">Lockheed Martin</p><p class="l">Engineer</p></div>
      <div><p class="k">Now</p><p class="n">Newfold Digital</p><p class="l">Governance, Risk &amp; Compliance</p></div>
      <div><p class="k">Still</p><p class="n">Building stuff</p></div>
    </div>
  </div>
  <p class="url">wesleybard.com</p>
  <div class="print arcade">
    <span class="tape" style="left: 36%; top: -10px; width: 88px; transform: rotate(-5deg)"></span>
    <div class="screen">
      <div class="board">{board_cells()}</div>
      <div class="hud">Score<b>—</b>Lines<b>—</b></div>
    </div>
    <div class="cap"><span>Tetris</span><span class="play">Play</span></div>
  </div>
  <div class="print hs">
    <span class="tape" style="left: calc(100% - 42px); top: -7px; width: 58px; transform: rotate(38deg)"></span>
    <img src="data:image/jpeg;base64,{HEADSHOT}" alt="">
    <div class="cap"><span>Wesley Bard</span></div>
  </div>
</div>
"""


def sparkline(points, w, h, pad=6):
    """Polyline points for the weight series, scaled into a w x h box."""
    ws = [p['weight'] for p in points]
    lo, hi = min(ws), max(ws)
    span = (hi - lo) or 1
    n = len(ws) - 1 or 1
    out = []
    for i, v in enumerate(ws):
        x = pad + (w - 2 * pad) * i / n
        y = pad + (h - 2 * pad) * (1 - (v - lo) / span)
        out.append(f'{x:.1f},{y:.1f}')
    return ' '.join(out)


def health_card():
    """The dashboard in miniature, built from the real current numbers.

    Everything on it is derived from data/health.json, so this card goes stale
    unless it is rebuilt when a week is imported.
    """
    data = json.loads((REPO / 'data/health.json').read_text())
    pts = [d for d in data['days'] if d['weight'] is not None]
    if not pts:
        raise SystemExit('No weighed days in data/health.json; nothing to draw.')

    latest = pts[-1]['weight']
    delta = latest - pts[0]['weight']
    # A real minus sign, matching the page's own formatting.
    delta_txt = f'{delta:+.1f}'.replace('-', '−')
    phase = (data.get('phases') or [{}])[-1]
    weeks = max(1, round(len(data['days']) / 7))
    week = data['days'][-7:]

    # `targets` is a list of dated revisions, each patching the one before it.
    # The card shows the newest week, so resolve the goals in force on its last
    # recorded day — the same rule buildWeeklyGoals uses.
    t = {}
    for revision in sorted(data.get('targets') or [], key=lambda r: r['from']):
        if revision['from'] <= week[-1]['date']:
            t.update({k: v for k, v in revision.items() if k not in ('from', 'note')})

    goals = [
        ('Measure', sum(1 for d in week if d['weight'] is not None), t.get('weighInsPerWeek', 7)),
        ('Lifts', sum(1 for d in week if d['workout'].strip()), t.get('liftsPerWeek', 5)),
        ('Cardio', sum(1 for d in week if d['cardio']), t.get('cardioPerWeek', 3)),
    ]
    pips = ''.join(
        f'<li><span class="g-n">{a}<span class="g-d">/{b}</span></span>'
        f'<span class="g-l">{name}</span></li>'
        for name, a, b in goals
    )

    return f"""
<style>
{BASE}
.card {{ padding: 66px 74px; display: flex; flex-direction: column; }}
.top {{ display: flex; align-items: baseline; gap: 18px; }}
.chip {{
  font-size: 17px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
  background: #e7eef9; color: #1d5fae; padding: 6px 13px; border-radius: 5px;
}}
.hero {{ display: flex; align-items: flex-end; gap: 30px; margin-top: 26px; }}
.lb {{
  font-family: 'Playfair Display', serif; font-size: 138px; font-weight: 700;
  line-height: 0.9; letter-spacing: -0.03em;
}}
.lb i {{
  font-size: 52px; font-style: normal; color: var(--muted);
  font-family: 'Outfit', sans-serif; font-weight: 400;
}}
.delta {{ font-size: 42px; font-weight: 600; color: var(--green); padding-bottom: 12px; }}
.spark {{ margin-top: 22px; }}
.goals {{ list-style: none; display: flex; gap: 62px; margin-top: auto; }}
.goals li {{ display: flex; flex-direction: column; gap: 4px; }}
.g-n {{ font-family: 'Playfair Display', serif; font-size: 46px; font-weight: 700; }}
.g-d {{
  font-size: 25px; color: var(--muted); font-family: 'Outfit', sans-serif; font-weight: 400;
}}
.g-l {{
  font-size: 18px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted); font-weight: 600;
}}
.url {{ position: absolute; right: 74px; bottom: 66px; font-size: 21px; color: var(--muted); }}
</style>
<div class="card">
  <div class="top">
    <span class="chip">{phase.get('label', 'Cut')}</span>
    <span class="eyebrow">Week {weeks} &middot; {len(data['days'])} days tracked</span>
  </div>

  <div class="hero">
    <span class="lb">{latest:.1f}<i> lb</i></span>
    <span class="delta">{delta_txt} lb</span>
  </div>

  <svg class="spark" width="1052" height="172" viewBox="0 0 1052 172">
    <polyline points="{sparkline(pts, 1052, 172)}" fill="none" stroke="#2a78d6"
      stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>

  <ul class="goals">{pips}</ul>
  <span class="url">wesleybard.com/health</span>
</div>
"""


CARDS = {
    'main': ('og-image.png', main_card),
    'health': ('og-health.png', health_card),
}


def render(name):
    filename, builder = CARDS[name]
    src = HERE / f'.{name}.html'
    src.write_text(f'<!doctype html><meta charset="utf-8">{builder()}')
    out = PUBLIC / filename
    try:
        subprocess.run(
            [find_chrome(), '--headless', '--disable-gpu', '--hide-scrollbars',
             '--no-sandbox',  # required when the runner executes as root
             f'--force-device-scale-factor={SCALE}', f'--window-size={W},{H}',
             f'--screenshot={out}', f'file://{src}'],
            capture_output=True, check=True,
        )
    finally:
        src.unlink(missing_ok=True)

    from PIL import Image
    im = Image.open(out)
    if im.size != (W, H):
        im = im.resize((W, H), Image.LANCZOS)
    im.convert('RGB').save(out, optimize=True)
    return out


if __name__ == '__main__':
    wanted = sys.argv[1:] or list(CARDS)
    unknown = [w for w in wanted if w not in CARDS]
    if unknown:
        raise SystemExit(f'Unknown card(s): {", ".join(unknown)}. Choose from: {", ".join(CARDS)}')
    for name in wanted:
        path = render(name)
        print(f'{name:7} -> {path.relative_to(REPO)}  {path.stat().st_size // 1024} KB')
