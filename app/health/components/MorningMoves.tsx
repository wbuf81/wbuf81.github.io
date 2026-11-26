import type { HealthDay } from '@/types/health';
import { BIN, JUMP, type Morning, type MorningMoves as MorningMovesModel, morningMoves } from '@/lib/healthPatterns';
import { formatDelta, formatNumber, shortDate } from './format';
import { VARIANTS, type Variant, dotPath, pct } from './svg';

interface Props {
  days: HealthDay[];
  weightUnit: string;
}

/**
 * The frames, in viewBox units (the mockup's idea 3). `render` is the narrowest each is drawn at, in CSS pixels, so
 * the newest morning's label can be kept clear of the columns beside it without measuring.
 */
interface MFrame {
  w: number;
  side: number;
  t: number;
  b: number;
  rMax: number;
  space: number;
  render: number;
}
const FRAMES: Record<Variant, MFrame> = {
  wide: { w: 760, side: 16, t: 40, b: 26, rMax: 4.8, space: 1.6, render: 520 },
  compact: { w: 360, side: 10, t: 44, b: 26, rMax: 4.2, space: 0.8, render: 310 },
};
const f1 = (n: number) => n.toFixed(1);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINALS = ['', '', 'second', 'third', 'fourth', 'fifth'];

function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "Sep 10 and Sep 27" */
function and(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "the third biggest rise recorded, after Sep 10 and Sep 27 at +3.1", or how the morning moved from the one before. */
function rankWords(mm: MorningMovesModel, unit: string): string {
  const { rank, newest } = mm;
  if (!rank) return `from ${f1(newest.prev)} to ${f1(newest.weight)} ${unit}`;
  const what = `${rank.tied ? 'joint ' : ''}${rank.n === 1 ? '' : `${ORDINALS[rank.n]} `}biggest ${rank.dir} recorded`;
  if (rank.n === 1) return `the ${what}`;
  const same = rank.bigger.every((m) => m.change === rank.bigger[0].change);
  const after = same
    ? `${and(rank.bigger.map((m) => shortDate(m.date)))} at ${formatDelta(rank.bigger[0].change)}`
    : and(rank.bigger.map((m) => `${shortDate(m.date)} at ${formatDelta(m.change)}`));
  return `the ${what}, after ${after}`;
}

/**
 * Every pair of consecutive weighed mornings as one dot, stacked in columns by how far the scale moved overnight, the
 * span holding nine mornings in ten shaded, the newest morning in the accent. Ported from the mockup's idea 3.
 */
export default function MorningMoves({ days, weightUnit }: Props) {
  const mm = morningMoves(days);
  if (!mm) return null;
  const { newest, jumps } = mm;
  const left = jumps ? jumps.avgLeft : 0;

  return (
    <section className="h-card">
      <div className="h-card-h">
        <h2>How far one morning moves</h2>
        <div className="h-legend">
          <span>
            <i className="h-sw is-dot is-mark" />A morning
          </span>
          <span>
            <i className="h-sw is-dot is-accent" />
            {shortDate(newest.date)}
          </span>
          <span>
            <i className="h-sw is-nband" />
            Nine in ten
          </span>
        </div>
      </div>
      <p className="h-note">Each dot is one morning, placed by how far the scale moved from the morning before.</p>
      {VARIANTS.map((v) => (
        <Chart key={v} v={v} mm={mm} weightUnit={weightUnit} />
      ))}
      <div className="h-facts">
        <div>
          <div className="h-k">A usual morning</div>
          <div className="h-n">
            {f1(mm.median)} {weightUnit}
          </div>
          <div className="h-l">up or down, the middle of {formatNumber(mm.mornings.length)}</div>
        </div>
        <div>
          <div className="h-k">Nine in ten</div>
          <div className="h-n">
            within {f1(mm.within)} {weightUnit}
          </div>
          <div className="h-l">
            {formatNumber(mm.withinCount)} of {formatNumber(mm.mornings.length)} mornings
          </div>
        </div>
        <div>
          <div className="h-k">
            {weekday(newest.date)}, {shortDate(newest.date)}
          </div>
          <div className="h-n">
            {formatDelta(newest.change)} {weightUnit}
          </div>
          <div className="h-l">{rankWords(mm, weightUnit)}</div>
        </div>
        {jumps && (
          <div>
            <div className="h-k">Two mornings after a jump</div>
            <div className="h-n">
              {left >= 0 ? `about ${f1(left)} ${weightUnit} left` : `about ${f1(-left)} ${weightUnit} under`}
            </div>
            <div className="h-l">
              average of the {jumps.n} earlier jumps of {f1(JUMP)} {weightUnit} or more, which averaged {f1(jumps.avgJump)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Chart({ v, mm, weightUnit }: { v: Variant; mm: MorningMovesModel; weightUnit: string }) {
  const F = FRAMES[v];
  const reachBin = Math.max(1, ...mm.bins.map((b) => Math.abs(b.bin)));
  const lim = Math.round(reachBin / BIN) * BIN;
  const nb = Math.round((lim * 2) / BIN) + 1;
  const cw = (F.w - 2 * F.side) / nb;
  const rr = Math.min(cw * 0.42, F.rMax);
  const gap = rr * 2 + F.space;
  const plot = mm.maxBin * gap + 8;
  const H = F.t + plot + F.b;
  const base = F.t + plot;
  const x = (c: number) => F.side + ((c + lim) / BIN) * cw + cw / 2;

  const a = x(-mm.within);
  const b = x(mm.within);
  const band = `M${f1(a)} ${F.t - 12}H${f1(b)}V${f1(base)}H${f1(a)}Z`;
  const bracket = `M${f1(a)} ${F.t - 6}V${F.t - 12}H${f1(b)}V${F.t - 6}`;
  const ticks: number[] = [];
  for (let t = Math.ceil(-lim); t <= Math.floor(lim); t++) ticks.push(t);
  const tickPath = ticks.map((t) => `M${f1(x(t))} ${f1(base)}v5`).join('');

  let dots = '';
  let nx = 0;
  let ny = 0;
  for (const { bin, mornings } of mm.bins) {
    // The newest morning on top of its column, so it is never hidden in the middle of a stack.
    const ordered = [...mornings].sort((p: Morning, q: Morning) => Number(p === mm.newest) - Number(q === mm.newest) || p.date.localeCompare(q.date));
    ordered.forEach((m, k) => {
      const cy = base - rr - 3 - k * gap;
      if (m === mm.newest) {
        nx = x(bin);
        ny = cy;
      } else dots += dotPath(x(bin), cy, rr);
    });
  }
  const now = dotPath(nx, ny, rr + 0.6);

  // The newest morning's label runs left from its column; it is lifted over every column it would cross.
  const text = `${shortDate(mm.newest.date)} · ${formatDelta(mm.newest.change)} ${weightUnit}`;
  const reach = ((text.length * 7 + 6) * F.w) / F.render;
  const nv = mm.newest.bin;
  const under = Math.max(0, ...mm.bins.filter((c) => c.bin !== nv && x(c.bin) >= x(nv) - reach && x(c.bin) <= x(nv) + rr).map((c) => c.mornings.length));
  const ly = Math.min(ny - rr - 6, base - under * gap - 12);
  const stem = ly < ny - rr - 8 ? `M${f1(nx)} ${f1(ny - rr - 2)}V${f1(ly)}` : '';

  return (
    <div className={`h-panel h-v is-${v} h-moves`}>
      <svg viewBox={`0 0 ${F.w} ${H}`} role="img" aria-label="Every morning as a dot, stacked by how far the scale moved from the morning before">
        <path className="g-band" d={band} />
        <path className="g-brk" d={bracket} />
        <path className="g-zero" d={`M${f1(x(0))} ${F.t - 12}V${f1(base)}`} />
        <path className="g-base" d={`M${F.side} ${f1(base)}H${F.w - F.side}`} />
        <path className="g-block" d={tickPath + stem} />
        <path className="g-day" d={dots} />
        <path className="g-now" d={now} />
      </svg>
      <span className="h-ax is-cap" style={{ left: pct((a + b) / 2, F.w), top: pct(F.t - 22, H), transform: 'translate(-50%, -50%)' }}>
        {v === 'wide' ? `Nine mornings in ten, within ${f1(mm.within)} ${weightUnit}` : `Nine in ten · ±${f1(mm.within)} ${weightUnit}`}
      </span>
      {ticks.map((t) => (
        <span key={t} className="h-ax" style={{ left: pct(x(t), F.w), top: pct(base + 15, H), transform: 'translate(-50%, -50%)' }}>
          {t ? `${formatDelta(t, 0)} ${weightUnit}` : '0'}
        </span>
      ))}
      <span className="h-ax is-now" style={{ left: pct(nx + rr, F.w), top: pct(ly - 2, H), transform: 'translate(-100%, -100%)' }}>
        {text}
      </span>
    </div>
  );
}
