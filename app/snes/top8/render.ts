/* Draws the 1080x1080 Top 8 picture. Layout is shared; each theme supplies its own look (bg, title tile, frame, label). */
import type { ThemeId } from '@/lib/snes/top8';

export const SIZE = 1080;
const M = 22, G = 14, LBL = 40;

export function layout() {
  const CW = (SIZE - M * 2 - G * 2) / 3;
  const CH = Math.round((CW * 209) / 300);
  const CELL = CH + LBL;
  const TOP = Math.round((SIZE - (CELL * 3 + G * 2)) / 2);
  const cellXY = (i: number): [number, number] => [M + (i % 3) * (CW + G), TOP + Math.floor(i / 3) * (CELL + G)];
  return { M, G, LBL, CW, CH, CELL, TOP, cellXY };
}

export type Fonts = { sans: string; mono: string; vt: string; pixel: string; orbit: string };
export type DrawCtx = {
  ctx: CanvasRenderingContext2D;
  slots: (string | null)[];
  titles: Record<string, string>;
  name: string;
  images: Record<string, CanvasImageSource | undefined>;
  fonts: Fonts;
};
export type Theme = {
  id: ThemeId;
  displayName: string;
  families: (f: Fonts) => string[];
  empty: { fill: string; ink: string };
  bg(d: DrawCtx): void;
  title(d: DrawCtx, x: number, y: number, w: number, h: number): void;
  frame(d: DrawCtx, x: number, y: number, w: number, h: number, n: number): void;
  label(d: DrawCtx, x: number, y: number, w: number, n: number, slug: string | null): void;
  over?(d: DrawCtx): void;
};

export function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

/** Sets ctx.font to the largest size in [minPx, maxPx] at which the text fits maxW and returns it; only below minPx does it fall back to an ellipsis. */
export function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, makeFont: (px: number) => string, maxPx: number, minPx: number): string {
  for (let px = maxPx; px >= minPx; px--) {
    ctx.font = makeFont(px);
    if (ctx.measureText(text).width <= maxW) return text;
  }
  ctx.font = makeFont(minPx);
  return fitText(ctx, text, maxW);
}

export function titleLines(name: string): [string, string] {
  return [name ? `${name}'s` : 'My', 'Top 8'];
}

/** Small seeded generator so decorations are the same on every draw. */
export function rng(seed: number): () => number {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

export const count = (d: DrawCtx) => d.slots.filter(Boolean).length;
export const titleOf = (d: DrawCtx, slug: string) => d.titles[slug] ?? slug;

/** Rounded rectangle path; falls back to a plain rect where roundRect is missing (older Safari). */
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function centered(d: DrawCtx, font: string, color: string, text: string, x: number, y: number, w: number): void {
  const { ctx } = d;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(fitText(ctx, text, w - 12), x + w / 2, y);
  ctx.textAlign = 'left';
}

function usable(img: CanvasImageSource | undefined): img is CanvasImageSource {
  if (!img) return false;
  if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) return img.complete && img.naturalWidth > 0;
  return true;
}

/** Word-wraps to at most n lines; the last line is truncated with an ellipsis if text remains. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, n: number): string[] {
  const out: string[] = [];
  let line = '';
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    const t = line ? `${line} ${words[i]}` : words[i];
    if (line && ctx.measureText(t).width > maxW) {
      if (out.length === n - 1) return [...out, fitText(ctx, [line, ...words.slice(i)].join(' '), maxW)];
      out.push(line);
      line = words[i];
    } else line = t;
  }
  out.push(line);
  return out.map((l) => fitText(ctx, l, maxW));
}

export function drawTop8(d: DrawCtx, theme: Theme): void {
  const { ctx } = d;
  const { CW, CH, CELL, cellXY } = layout();
  ctx.save();
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.textBaseline = 'alphabetic';
  theme.bg(d);
  const [tx, ty] = cellXY(0);
  ctx.save();
  theme.title(d, tx, ty, CW, CELL);
  ctx.restore();
  d.slots.forEach((slug, k) => {
    const [x, y] = cellXY(k + 1);
    ctx.save();
    theme.frame(d, x, y, CW, CH, k + 1);
    ctx.restore();
    const img = slug ? d.images[slug] : undefined;
    ctx.save();
    let drawn = false;
    if (slug && usable(img)) {
      try {
        ctx.drawImage(img, x, y, CW, CH);
        drawn = true;
      } catch {
        /* one bad cover must not abort the picture */
      }
    }
    if (!drawn) {
      ctx.fillStyle = theme.empty.fill;
      ctx.fillRect(x, y, CW, CH);
      ctx.fillStyle = theme.empty.ink;
      ctx.font = `600 24px ${d.fonts.sans}`;
      ctx.textAlign = 'center';
      if (!slug) ctx.fillText('Add a friend', x + CW / 2, y + CH / 2 + 8);
      else {
        const ls = wrapLines(ctx, d.titles[slug] ?? slug, CW - 40, 2);
        ls.forEach((l, i) => ctx.fillText(l, x + CW / 2, y + CH / 2 + 8 + (i - (ls.length - 1) / 2) * 30));
      }
    }
    ctx.restore();
    ctx.save();
    theme.label(d, x, y + CH, CW, k + 1, slug);
    ctx.restore();
  });
  if (theme.over) {
    ctx.save();
    theme.over(d);
    ctx.restore();
  }
  ctx.restore();
}

export async function loadThemeFonts(theme: Theme, fonts: Fonts): Promise<void> {
  try {
    await Promise.all(theme.families(fonts).map((f) => document.fonts.load(f)));
  } catch {
    /* fonts are best effort: the fallbacks draw fine */
  }
}
