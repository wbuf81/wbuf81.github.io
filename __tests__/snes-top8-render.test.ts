import fs from 'fs';
import path from 'path';
import { drawTop8, fitText, layout, titleLines, type DrawCtx, type Fonts } from '@/app/snes/top8/render';
import { THEMES } from '@/app/snes/top8/themes';
import { THEME_IDS } from '@/lib/snes/top8';

type Call = { name: string; args: unknown[] };
function mockCtx() {
  const calls: Call[] = [];
  const sets: Record<string, unknown[]> = {};
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, prop: string) {
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 10 });
      if (prop === 'createLinearGradient') return () => gradient;
      return (...args: unknown[]) => void calls.push({ name: prop, args });
    },
    set(_t, prop: string, v) {
      (sets[prop] ||= []).push(v);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, sets };
}

const fonts: Fonts = { sans: 'Sans', mono: 'Mono', vt: 'VT', pixel: 'Pixel', orbit: 'Orbit' };
const SLUGS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
function make(slots: (string | null)[], name = 'Wes') {
  const m = mockCtx();
  const images: Record<string, CanvasImageSource | undefined> = {};
  slots.forEach((s) => s && (images[s] = {} as CanvasImageSource));
  const titles = Object.fromEntries(SLUGS.map((s) => [s, `Game ${s}`]));
  const d: DrawCtx = { ctx: m.ctx, slots, titles, name, images, fonts };
  return { ...m, d };
}

describe('layout', () => {
  const L = layout();
  it('matches the spec numbers', () => {
    expect(L.CW).toBe(336);
    expect(L.CH).toBe(234);
    expect(L.cellXY(0)).toEqual([22, L.TOP]);
    const [x, y] = L.cellXY(8);
    expect(x + L.CW).toBeLessThanOrEqual(1080);
    expect(y + L.CELL).toBeLessThanOrEqual(1080);
    expect(Math.abs(L.TOP * 2 + 3 * L.CELL + 2 * L.G - 1080)).toBeLessThanOrEqual(1);
  });
});

describe('text helpers', () => {
  it('titleLines', () => {
    expect(titleLines('')).toEqual(['My', 'Top 8']);
    expect(titleLines('Wes')).toEqual(["Wes's", 'Top 8']);
  });
  it('fitText truncates with an ellipsis and leaves short text alone', () => {
    const { ctx } = mockCtx();
    expect(fitText(ctx, 'short', 100)).toBe('short');
    const t = fitText(ctx, 'x'.repeat(40), 100);
    expect(t.endsWith('…')).toBe(true);
    expect(t.length * 10).toBeLessThanOrEqual(100);
  });
});

describe('themes', () => {
  it('has the exact labels, in order', () => {
    expect(THEME_IDS.map((id) => THEMES[id].displayName)).toEqual(['MySpace Classic', 'Glitter', 'Console', 'Grand Prix', 'Crystal Menu', 'Polygon Space']);
  });
  it('declares its own id', () => {
    THEME_IDS.forEach((id) => expect(THEMES[id].id).toBe(id));
  });

  describe.each(THEME_IDS)('%s', (id) => {
    const theme = THEMES[id];
    it('draws 8 full slots, an image per slot, 8 labels', () => {
      const { d, calls } = make(SLUGS);
      const label = jest.spyOn(theme, 'label');
      expect(() => drawTop8(d, theme)).not.toThrow();
      expect(calls.filter((c) => c.name === 'drawImage')).toHaveLength(8);
      expect(label).toHaveBeenCalledTimes(8);
      label.mockRestore();
    });
    it('draws all-empty slots with the empty fill and no images', () => {
      const { d, calls, sets } = make(Array(8).fill(null));
      drawTop8(d, theme);
      expect(calls.filter((c) => c.name === 'drawImage')).toHaveLength(0);
      expect(sets.fillStyle).toContain(theme.empty.fill);
    });
    it('draws a slot with no loaded image as empty fill', () => {
      const { d, calls, sets } = make(['a', ...Array(7).fill(null)]);
      d.images = {};
      drawTop8(d, theme);
      expect(calls.filter((c) => c.name === 'drawImage')).toHaveLength(0);
      expect(sets.fillStyle).toContain(theme.empty.fill);
    });
    it('survives a 60-character name', () => {
      const { d } = make(SLUGS, 'W'.repeat(60));
      expect(() => drawTop8(d, theme)).not.toThrow();
    });
    it('falls back when roundRect is missing', () => {
      const { d } = make(SLUGS);
      (d.ctx as unknown as { roundRect?: unknown }).roundRect = undefined;
      expect(() => drawTop8(d, theme)).not.toThrow();
    });
  });

  it('keeps the Crystal cursor on the canvas', () => {
    const { d, calls } = make(SLUGS);
    drawTop8(d, THEMES.crystal);
    const xs = calls.filter((c) => c.name === 'moveTo' || c.name === 'lineTo').map((c) => c.args[0] as number);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(4);
  });

  it('draws no trademarked game names to the canvas', () => {
    const dir = path.join(process.cwd(), 'app/snes/top8/themes');
    const banned = /F-Zero|Final Fantasy|Star Fox|Nintendo/i;
    for (const f of fs.readdirSync(dir)) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of src.matchAll(/fillText\(([^;]*)\)/g)) {
        expect(m[1]).not.toMatch(banned);
      }
    }
  });
});
