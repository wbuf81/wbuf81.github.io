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
  const own: Record<string, unknown> = {};
  const ctx = new Proxy(own, {
    get(t, prop: string) {
      if (Object.prototype.hasOwnProperty.call(t, prop)) return t[prop]; // honours overrides like `ctx.roundRect = undefined`
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 10 });
      if (prop === 'createLinearGradient') return () => gradient;
      return (...args: unknown[]) => void calls.push({ name: prop, args });
    },
    set(_t, prop: string, v) {
      (sets[prop] ||= []).push(v);
      _t[prop] = v;
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
    it('survives a 60-character name and keeps the title inside the tile', () => {
      const { d, calls } = make(SLUGS, 'W'.repeat(60));
      expect(() => drawTop8(d, theme)).not.toThrow();
      const { CW } = layout();
      const wide = calls.filter((c) => c.name === 'fillText' && String(c.args[0]).includes('WWW'));
      expect(wide.length).toBeGreaterThan(0);
      wide.forEach((c) => expect(String(c.args[0]).length * 10).toBeLessThanOrEqual(CW));
    });
    it('falls back when roundRect is missing', () => {
      const { d, calls } = make(SLUGS);
      (d.ctx as unknown as { roundRect?: unknown }).roundRect = undefined;
      expect(() => drawTop8(d, theme)).not.toThrow();
      expect(calls.some((c) => c.name === 'roundRect')).toBe(false);
      if (['console', 'crystal'].includes(id)) expect(calls.some((c) => c.name === 'rect')).toBe(true);
    });
    it('survives a throwing drawImage and a broken image, drawing the title instead', () => {
      const { d, calls } = make(SLUGS);
      const orig = d.ctx.drawImage;
      void orig;
      (d.ctx as unknown as { drawImage: unknown }).drawImage = () => {
        throw new Error('bad');
      };
      expect(() => drawTop8(d, theme)).not.toThrow();
      expect(calls.some((c) => c.name === 'fillText' && String(c.args[0]).startsWith('Game '))).toBe(true);
    });
    it('draws the game title in a slot with no usable image', () => {
      const { d, calls } = make(['a', ...Array(7).fill(null)]);
      const broken = document.createElement('img');
      d.images = { a: broken };
      drawTop8(d, theme);
      expect(calls.filter((c) => c.name === 'drawImage')).toHaveLength(0);
      expect(calls.some((c) => c.name === 'fillText' && c.args[0] === 'Game a')).toBe(true);
    });
    it('declares every font it draws in families()', () => {
      const { d, sets } = make(SLUGS);
      drawTop8(d, theme);
      const norm = (f: string) => {
        const m = /^(?:italic\s+)?(?:(\d+|bold)\s+)?[\d.]+px\s+(.*)$/.exec(f.trim());
        return m ? `${m[1] === 'bold' ? '700' : m[1] ?? '400'}|${m[2]}` : f;
      };
      const declared = new Set(theme.families(fonts).map(norm));
      const used = [...new Set((sets.font ?? []).map((f) => String(f)))];
      used.forEach((f) => expect([f, declared.has(norm(f))]).toEqual([f, true]));
    });
  });

  it('keeps the Crystal cursor on the canvas', () => {
    const { d, calls } = make(SLUGS);
    drawTop8(d, THEMES.crystal);
    const xs = calls.filter((c) => c.name === 'moveTo' || c.name === 'lineTo').map((c) => c.args[0] as number);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(4);
    const cursorXs = calls.slice(-8).filter((c) => c.name === 'moveTo' || c.name === 'lineTo').map((c) => c.args[0] as number);
    expect(Math.max(...cursorXs)).toBeLessThan(layout().cellXY(1)[0]);
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
