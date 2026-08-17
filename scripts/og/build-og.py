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
the site's own Playfair Display and Outfit, inlined so the cards match the live
pages exactly.

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


def main_card():
    """Ruled masthead. The two rules carry the structure; the name needs no
    other support, so there is no title, tagline, or portrait on it.

    The weight contrast between the rules — 4px ink above, 1px blue below — is
    the one deliberate detail. Keep it if you restyle this.
    """
    return f"""
<style>
{BASE}
.card {{
  display: flex; flex-direction: column; justify-content: center;
  padding: 26px 96px 0; text-align: center;
}}
.top-rule {{ height: 4px; background: var(--ink); }}
.bot-rule {{ height: 1px; background: var(--blue); }}
.name {{
  font-family: 'Playfair Display', serif; font-size: 148px; font-weight: 700;
  line-height: 1; letter-spacing: -0.04em; margin: 46px 0 42px;
}}
.foot {{
  margin-top: 22px; font-size: 20px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--muted); font-weight: 600;
}}
</style>
<div class="card">
  <div class="top-rule"></div>
  <p class="name">Wesley Bard</p>
  <div class="bot-rule"></div>
  <p class="foot">wesleybard.com</p>
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
