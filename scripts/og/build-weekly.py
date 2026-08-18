#!/usr/bin/env python3
"""Render the weekly share cards for X, from the real numbers in data/health.json.

These carry **no name, handle or URL** — deliberately. /health is unlinked and
noindex, so printing its address on a public post would advertise the page to
exactly the audience it is kept away from. Don't add attribution back.

    npm run weekly:cards                # both
    npm run weekly:cards -- status      # just one

Two cards, meant to be posted together:
  status    where the cut stands overall — start, now, goal, pace.
  activity  what the week actually contained, day by day.

Both are 1080x1350 so they pair as a 2-up on X and take the full height of a
phone timeline.

Numbers come from scripts/weekly-stats.mjs, which reads lib/health.ts — the card
must never disagree with the page, so nothing is recomputed here.

Output goes to .weekly/ (gitignored), not public/: these are posts, not assets
the site serves.

Requires: Google Chrome, Pillow, and Node (for the stats step).
"""
import importlib.util
import json
import os
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).parent
REPO = HERE.parent.parent
OUT_DIR = pathlib.Path(os.environ.get('WEEKLY_OUT', REPO / '.weekly'))

# Reuse the font embedding and Chrome discovery the OG cards already do.
_spec = importlib.util.spec_from_file_location('build_og', HERE / 'build-og.py')
_build_og = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_build_og)

OUTFIT = _build_og.OUTFIT
find_chrome = _build_og.find_chrome

W, H = 1080, 1350
SCALE = 2

# Near-black warm ink, as on the site's icons, with the two accents stepped up
# for a dark surface. Both pass the categorical checks against #14130f:
# lightness band, chroma floor, CVD separation and 3:1 contrast.
INK = '#14130f'
PAPER = '#f6f4ef'
BLUE = '#4a95e8'
ORANGE = '#e06a30'
GREEN = '#2f9e6e'
MUTED = '#a8a49a'
DIM = '#6b675f'
RULE = '#332f28'
HOLLOW = '#26231d'


def base_css():
    """One weight-heavy sans, tightly tracked. Deliberately no serif: the site's
    editorial cards already own that voice, and these have to read as a
    scoreboard at thumbnail size in a busy timeline."""
    return f"""
@font-face {{
  font-family: 'Outfit';
  src: url(data:font/woff2;base64,{OUTFIT}) format('woff2');
  font-weight: 100 900;
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: {W}px; height: {H}px; overflow: hidden; }}
body {{
  font-family: 'Outfit', sans-serif;
  -webkit-font-smoothing: antialiased;
  background: {INK};
  color: {PAPER};
  font-variant-numeric: tabular-nums;
}}
.card {{
  position: relative; width: {W}px; height: {H}px; overflow: hidden;
  display: flex; flex-direction: column; padding: 62px 68px 54px;
}}
.head {{
  display: flex; justify-content: space-between; align-items: baseline;
  padding-bottom: 20px; border-bottom: 2px solid {PAPER};
}}
.tag {{
  font-size: 21px; font-weight: 700; letter-spacing: 0.19em;
  text-transform: uppercase;
}}
.tag.is-dim {{ color: {MUTED}; font-weight: 600; }}
.foot {{
  margin-top: auto; padding-top: 24px; border-top: 1px solid {RULE};
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 18px; color: {DIM}; letter-spacing: 0.03em;
}}
.micro {{
  font-size: 15px; font-weight: 700; letter-spacing: 0.18em;
  text-transform: uppercase; color: {MUTED};
}}
"""


NOTHING_TO_DRAW = 3


def stats():
    raw = subprocess.run(
        ['npm', 'run', '--silent', 'weekly:stats'],
        cwd=REPO, capture_output=True, text=True,
    )
    # 3 is "no complete week yet" — a skip, not a failure. It keeps its own code
    # so the weekly import can tell the difference.
    if raw.returncode == NOTHING_TO_DRAW:
        print((raw.stderr or '').strip() or 'No complete week yet.')
        sys.exit(NOTHING_TO_DRAW)
    if raw.returncode != 0:
        raise SystemExit(f'weekly:stats failed:\n{raw.stderr or raw.stdout}')
    text = raw.stdout
    return json.loads(text[text.index('{'):text.rindex('}') + 1])


def n(value, digits=0):
    """A formatted number, with a real minus sign to match the site."""
    if value is None:
        return '—'
    return f'{value:,.{digits}f}'.replace('-', '−')


def delta(value, digits=1):
    if value is None:
        return '—'
    sign = '+' if value > 0 else '−' if value < 0 else '±'
    return f'{sign}{abs(value):,.{digits}f}'


# --------------------------------------------------------------------------- #
# status — where the cut stands                                               #
# --------------------------------------------------------------------------- #

def trend_svg(series, width, height):
    """The phase's weighed days as a line.

    Scaled to the data, not to the goal: the ladder beside it already carries the
    distance to 190, so stretching this to reach it would flatten the very
    week-to-week movement it exists to show.
    """
    weights = [p['weight'] for p in series]
    lo, hi = min(weights), max(weights)
    pad = max((hi - lo) * 0.16, 0.4)
    lo, hi = lo - pad, hi + pad

    x = lambda i: (i / max(len(series) - 1, 1)) * width
    y = lambda w: height - ((w - lo) / (hi - lo)) * height
    points = ' '.join(f'{x(i):.1f},{y(w):.1f}' for i, w in enumerate(weights))
    last_x, last_y = x(len(weights) - 1), y(weights[-1])

    return f'''
<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" fill="none">
  <polyline points="{points}" stroke="{BLUE}" stroke-width="3"
            stroke-linejoin="round" stroke-linecap="round" />
  <circle cx="{last_x:.1f}" cy="{last_y:.1f}" r="6.5" fill="{BLUE}"
          stroke="{INK}" stroke-width="3" />
</svg>
'''


def status_card(d):
    """The whole cut as a ladder of pounds.

    One block per pound between the starting weight and the goal, filling from
    the top as weight comes off. The unit is the subject's own, so what is done
    and what is left are both countable, and it descends, which is the direction
    of the work. A percentage bar would say the same thing in a shape that could
    belong to any project at all.
    """
    phase = d['phase']
    week = d['week']
    start, goal, now = phase['startWeight'], phase['goalWeight'], phase['currentWeight']

    span = start - goal
    lost = start - now
    total_blocks = round(span)
    full = int(lost)
    frac = lost - full

    blocks = ''
    for i in range(total_blocks):
        if i < full:
            style = f'background: {BLUE};'
        elif i == full and frac > 0.02:
            # The pound in progress. A proportional sliver of a 150px block reads
            # as a rendering fault at a tenth of a pound, so it is the whole block
            # at half strength instead: in progress, not done.
            style = f'background: {BLUE}; opacity: 0.42;'
        else:
            style = f'background: {HOLLOW};'
        blocks += f'<li style="{style}"></li>'


    facts = [
        ('To go', f"{n(phase['goalRemaining'], 1)} lb", f"{n(phase['goalPercent'])}% of the way"),
        ('Per week', f"{delta(phase['weightChangePerWeek'])} lb", 'average rate'),
        ('On pace for', phase['projectedGoalLabel'] or '—', 'if the rate holds'),
        ('Tracked', f"{phase['dayCount']} days", f"{phase['weekCount']} weeks, no gaps"),
    ]
    facts_html = ''.join(
        f'<li><p class="micro">{label}</p><p class="fv">{value}</p><p class="fs">{sub}</p></li>'
        for label, value, sub in facts
    )

    return f"""
<style>
{base_css()}
.hero {{ margin-top: 42px; }}
.hero .big {{
  font-size: 196px; font-weight: 800; line-height: 0.82; letter-spacing: -0.055em;
}}
.hero .big span {{ font-size: 64px; font-weight: 600; color: {MUTED}; letter-spacing: -0.01em; }}
.hero .arc {{
  margin-top: 22px; font-size: 29px; font-weight: 500; color: {MUTED};
}}
.hero .arc b {{ color: {PAPER}; font-weight: 700; }}
.body {{ display: flex; gap: 46px; margin-top: 46px; flex: 1; }}
.ladder {{ width: 150px; flex: none; }}
.ladder ul {{ list-style: none; display: grid; gap: 5px; }}
.ladder li {{ height: 26px; border-radius: 3px; }}
.cap {{
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 16px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: {MUTED};
}}
.cap.is-top {{ margin-bottom: 11px; }}
.cap.is-bot {{ margin-top: 11px; }}
.cap b {{ color: {PAPER}; }}
.mid {{ flex: 1; display: flex; flex-direction: column; }}
.count {{ display: flex; align-items: baseline; gap: 14px; }}
.count .nn {{ font-size: 74px; font-weight: 800; line-height: 1; letter-spacing: -0.04em; }}
.count .of {{ font-size: 26px; font-weight: 600; color: {MUTED}; }}
.count-note {{ font-size: 19px; color: {DIM}; margin-top: 10px; line-height: 1.5; }}
.count-note b {{ color: {BLUE}; font-weight: 700; }}
.trend {{ margin-top: 40px; }}
.trend svg {{ margin-top: 14px; display: block; }}
.facts {{
  list-style: none; margin-top: auto;
  display: grid; grid-template-columns: 1fr 1fr; gap: 40px 30px;
}}
.fv {{
  font-size: 50px; font-weight: 800; line-height: 1; margin-top: 6px;
  letter-spacing: -0.035em;
}}
.fs {{ font-size: 17px; color: {DIM}; margin-top: 6px; }}
</style>
<div class="card">
  <div class="head">
    <p class="tag">{phase['label']} · week {week['number']}</p>
    <p class="tag is-dim">since {phase['startLabel']}</p>
  </div>

  <div class="hero">
    <p class="big">{delta(phase['weightChange'])}<span> lb</span></p>
    <p class="arc"><b>{n(start, 1)}</b> → <b>{n(now, 1)}</b> lb · goal <b>{n(goal)}</b></p>
  </div>

  <div class="body">
    <div class="ladder">
      <div class="cap is-top"><span>start</span><b>{n(start, 1)}</b></div>
      <ul>{blocks}</ul>
      <div class="cap is-bot"><span>goal</span><b>{n(goal)}</b></div>
    </div>

    <div class="mid">
      <div>
        <div class="count">
          <p class="nn">{n(lost, 1)}</p>
          <p class="of">of {n(span, 1)} lb</p>
        </div>
        <p class="count-note">
          {n(phase['goalRemaining'], 1)} lb still to come off.
        </p>
      </div>

      <div class="trend">
        <p class="micro">Every weigh-in since {phase['startLabel']}</p>
        {trend_svg(d['series'], 452, 132)}
      </div>

      <ul class="facts">{facts_html}</ul>
    </div>
  </div>

  <div class="foot">
    <p>Now {n(now, 1)} lb · goal {n(goal)} lb</p>
    <p>One block, one pound</p>
  </div>
</div>
"""


# --------------------------------------------------------------------------- #
# activity — what the week contained                                          #
# --------------------------------------------------------------------------- #

DAY_NAMES = {'Mon': 'MON', 'Tue': 'TUE', 'Wed': 'WED', 'Thu': 'THU',
             'Fri': 'FRI', 'Sat': 'SAT', 'Sun': 'SUN'}


def activity_card(d):
    """The week as a log: one row per day, what was trained, how far walked.

    Rows rather than columns because every row carries words — a day name and
    what the day held — and words in columns get shortened until they stop
    saying anything.
    """
    week = d['week']
    goal_steps = d['streaks']['goal']
    peak = max(day['steps'] or 0 for day in week['days'])
    total_steps = sum(day['steps'] or 0 for day in week['days'])

    rows = ''
    for day in week['days']:
        steps = day['steps'] or 0
        width = steps / peak * 100
        chips = ''
        if day['lifted']:
            chips += f'<span class="chip" style="border-color:{BLUE};color:{BLUE}">lift</span>'
        cardio_mark = next((m for m in day['marks'] if m['replaces'] == 'cardio'), None)
        if day['cardio']:
            text = cardio_mark['label'] if cardio_mark else 'cardio'
            chips += f'<span class="chip" style="border-color:{ORANGE};color:{ORANGE}">{text}</span>'
        for mark in day['marks']:
            if mark['replaces'] != 'cardio':
                chips += f'<span class="chip is-quiet">{mark["label"]}</span>'
        if not chips:
            chips = '<span class="chip is-rest">rest</span>'

        rows += f"""
<li>
  <p class="dn">{DAY_NAMES.get(day['weekday'], day['weekday'].upper())}</p>
  <div class="track"><div class="fill" style="width: {width:.1f}%"></div></div>
  <p class="sv">{n(steps / 1000, 1)}k</p>
  <div class="chips">{chips}</div>
</li>
"""

    totals = [
        ('Lifts', str(week['lifts'])),
        ('Cardio', str(week['cardioSessions'])),
        ('Cardio min', n(week['cardioMinutes'])),
        ('Steps', n(total_steps)),
    ]
    totals_html = ''.join(
        f'<li><p class="micro">{label}</p><p class="tv">{value}</p></li>'
        for label, value in totals
    )

    # The rule must land inside the bar column and span every row, so it is
    # measured in px against the row grid: day name, gap, then the track.
    DAY_COL, GAP, STEP_COL = 78, 16, 70
    track_w = W - 2 * 68 - DAY_COL - STEP_COL - 2 * GAP
    goal_rule = ''
    if goal_steps:
        left = DAY_COL + GAP + goal_steps / peak * track_w
        goal_rule = (
            f'<div class="goal-mark" style="left: {left:.0f}px">'
            f'<span>{n(goal_steps / 1000, 1)}k goal</span></div>'
        )

    return f"""
<style>
{base_css()}
.sub {{ margin-top: 28px; display: flex; align-items: baseline; gap: 20px; }}
.sub .cal {{ font-size: 84px; font-weight: 800; line-height: 0.9; letter-spacing: -0.045em; }}
.sub .cal span {{ font-size: 29px; font-weight: 600; color: {MUTED}; letter-spacing: -0.01em; }}
.sub .vs {{ font-size: 20px; color: {MUTED}; line-height: 1.35; }}
.sub .vs b {{ display: block; color: {PAPER}; font-weight: 700; font-size: 24px; }}
.days {{
  list-style: none; margin-top: 40px; position: relative; flex: 1;
  display: flex; flex-direction: column; justify-content: space-between;
}}
.days li {{
  display: grid; grid-template-columns: 78px 1fr 70px;
  align-items: center; column-gap: 16px;
  padding: 12px 0; border-bottom: 1px solid {RULE};
}}
.days li:first-child {{ border-top: 1px solid {RULE}; }}
.dn {{ font-size: 18px; font-weight: 800; letter-spacing: 0.1em; }}
.bars {{ position: relative; }}
.track {{ height: 21px; background: {HOLLOW}; border-radius: 3px; }}
.fill {{ height: 21px; background: {BLUE}; border-radius: 3px; }}
.sv {{ font-size: 20px; font-weight: 700; text-align: right; color: {MUTED}; }}
.chips {{ grid-column: 2 / 4; display: flex; gap: 8px; margin-top: 8px; }}
.chip {{
  font-size: 14px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  border: 1.5px solid; border-radius: 4px; padding: 3px 9px;
}}
.chip.is-quiet {{ border-color: {RULE}; color: {MUTED}; }}
.chip.is-rest {{ border-color: transparent; color: {DIM}; padding-left: 0; }}
.goal-mark {{
  position: absolute; top: 0; bottom: 0; width: 2px; background: {PAPER};
  opacity: 0.34; z-index: 2;
}}
.goal-mark span {{
  position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
  font-size: 14px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: {MUTED}; white-space: nowrap;
}}
.totals {{
  display: flex; margin-top: 36px; padding-top: 22px; border-top: 2px solid {PAPER};
  list-style: none;
}}
.totals li {{ flex: 1; }}
.tv {{ font-size: 44px; font-weight: 800; line-height: 1; margin-top: 7px; letter-spacing: -0.035em; }}
</style>
<div class="card">
  <div class="head">
    <p class="tag">The week · {week['rangeLabel']}</p>
    <p class="tag is-dim">week {week['number']} of the cut</p>
  </div>

  <div class="sub">
    <p class="cal">{n(week['avgCals'])}<span> kcal/day</span></p>
    <p class="vs"><b>{delta(week['calsVsGoal'], 0)}</b> against target</p>
  </div>

  <ul class="days">
    {goal_rule}
    {rows}
  </ul>

  <ul class="totals">{totals_html}</ul>

  <div class="foot">
    <p>{week['weighIns']} of 7 days weighed · {d['goalStreak']} weeks hitting every goal</p>
    <p>Bar length = steps</p>
  </div>
</div>
"""


MACROS = [
    ('protein', 'Protein', BLUE, 4),
    ('carbs', 'Carbs', ORANGE, 4),
    ('fat', 'Fat', GREEN, 9),
]


def fuel_card(d):
    """Calories and the macro split, day by day.

    Bar length is the day's recorded calories; the segments inside it are that
    day's macro split. The two are measured separately — grams x 4/4/9 rarely
    lands exactly on a logged calorie total — so length carries the number that
    was actually recorded and the segments carry proportion. The footer says so
    rather than letting the reader assume the segments sum to the bar.
    """
    week = d['week']
    days = week['days']
    target = week['avgCals'] - week['calsVsGoal'] if week['calsVsGoal'] is not None else None

    peak = max(day['cals'] or 0 for day in days)
    avg = {key: sum(d2[key] or 0 for d2 in days) / len(days) for key, _, _, _ in MACROS}

    rows = ''
    for day in days:
        cals = day['cals'] or 0
        width = cals / peak * 100
        # Segment widths are shares of the day's macro calories, so they fill the
        # bar exactly whatever the rounding in the logged total.
        parts = [(key, (day[key] or 0) * per_g) for key, _, _, per_g in MACROS]
        total = sum(value for _, value in parts) or 1
        segs = ''
        for (key, value), (_, _, color, _) in zip(parts, MACROS):
            segs += (
                f'<span style="width: {value / total * 100:.2f}%; background: {color}"></span>'
            )

        rows += f"""
<li>
  <p class="dn">{DAY_NAMES.get(day['weekday'], day['weekday'].upper())}</p>
  <div class="bar" style="width: {width:.1f}%">{segs}</div>
  <p class="cv">{n(cals)}</p>
  <p class="gm">{n(day['protein'] or 0)}p · {n(day['carbs'] or 0)}c · {n(day['fat'] or 0)}f</p>
</li>
"""

    target_rule = ''
    if target:
        DAY_COL, GAP, CAL_COL = 78, 16, 84
        track_w = W - 2 * 68 - DAY_COL - CAL_COL - 2 * GAP
        left = DAY_COL + GAP + target / peak * track_w
        target_rule = (
            f'<div class="target" style="left: {left:.0f}px">'
            f'<span>{n(target)} target</span></div>'
        )

    legend = ''.join(
        f'<li><span style="background: {color}"></span>{label}'
        f'<em>{n(avg[key])} g avg</em></li>'
        for key, label, color, _ in MACROS
    )

    return f"""
<style>
{base_css()}
.sub {{ margin-top: 28px; display: flex; align-items: baseline; gap: 20px; }}
.sub .cal {{ font-size: 84px; font-weight: 800; line-height: 0.9; letter-spacing: -0.045em; }}
.sub .cal span {{ font-size: 29px; font-weight: 600; color: {MUTED}; letter-spacing: -0.01em; }}
.sub .vs {{ font-size: 20px; color: {MUTED}; line-height: 1.35; }}
.sub .vs b {{ display: block; color: {PAPER}; font-weight: 700; font-size: 24px; }}
.legend {{ list-style: none; display: flex; gap: 30px; margin-top: 32px; }}
.legend li {{
  display: flex; align-items: center; gap: 9px; font-size: 18px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
}}
.legend span {{ width: 15px; height: 15px; border-radius: 3px; display: block; }}
.legend em {{
  font-style: normal; font-size: 16px; font-weight: 500; color: {MUTED};
  letter-spacing: 0.02em; text-transform: none;
}}
.days {{
  list-style: none; margin-top: 36px; position: relative; flex: 1;
  display: flex; flex-direction: column; justify-content: space-between;
}}
.days li {{
  display: grid; grid-template-columns: 78px 1fr 84px; align-items: center;
  column-gap: 16px; padding: 12px 0; border-bottom: 1px solid {RULE};
}}
.days li:first-child {{ border-top: 1px solid {RULE}; }}
.dn {{ font-size: 18px; font-weight: 800; letter-spacing: 0.1em; }}
/* A 2px ink gap between segments, so touching fills stay legible. */
.bar {{ display: flex; gap: 2px; height: 24px; }}
.bar span:first-child {{ border-radius: 3px 0 0 3px; }}
.bar span:last-child {{ border-radius: 0 3px 3px 0; }}
.cv {{ font-size: 21px; font-weight: 700; text-align: right; }}
.gm {{
  grid-column: 2 / 4; font-size: 16px; color: {MUTED}; margin-top: 7px;
  letter-spacing: 0.04em;
}}
.target {{
  position: absolute; top: 0; bottom: 0; width: 2px; background: {PAPER};
  opacity: 0.34; z-index: 2;
}}
.target span {{
  position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
  font-size: 14px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: {MUTED}; white-space: nowrap;
}}
</style>
<div class="card">
  <div class="head">
    <p class="tag">Fuel · {week['rangeLabel']}</p>
    <p class="tag is-dim">week {week['number']} of the cut</p>
  </div>

  <div class="sub">
    <p class="cal">{n(week['avgCals'])}<span> kcal/day</span></p>
    <p class="vs"><b>{delta(week['calsVsGoal'], 0)}</b> against target</p>
  </div>

  <ul class="legend">{legend}</ul>

  <ul class="days">
    {target_rule}
    {rows}
  </ul>

  <div class="foot">
    <p>Bar length = calories · segments = macro split</p>
    <p>{n(avg['protein'])} g protein a day</p>
  </div>
</div>
"""


CARDS = {
    'status': status_card,
    'activity': activity_card,
    'fuel': fuel_card,
}


def render(name, data):
    html = CARDS[name](data)
    src = HERE / f'.weekly-{name}.html'
    src.write_text(f'<!doctype html><meta charset="utf-8">{html}')
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f'week-{data["week"]["start"]}-{name}.png'
    try:
        subprocess.run(
            [find_chrome(), '--headless', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
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
    wanted = [a for a in sys.argv[1:] if not a.startswith('-')] or list(CARDS)
    unknown = [w for w in wanted if w not in CARDS]
    if unknown:
        raise SystemExit(f'Unknown card(s): {", ".join(unknown)}. Choose from: {", ".join(CARDS)}')

    data = stats()
    for name in wanted:
        path = render(name, data)
        print(f'{name:9} -> {path}  {path.stat().st_size // 1024} KB')
