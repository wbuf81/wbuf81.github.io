import { centered, count, layout, rng, titleLines, titleOf, SIZE, type Theme, fitFont } from '../render';

export const polygon: Theme = {
  id: 'polygon',
  displayName: 'Polygon Space',
  families: (f) => [`600 24px ${f.sans}`, `64px ${f.vt}`, `28px ${f.vt}`, `22px ${f.vt}`, `30px ${f.vt}`],
  empty: { fill: 'rgba(43,255,106,.06)', ink: '#2bff6a' },
  bg({ ctx }) {
    const { TOP } = layout();
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const r = rng(42);
    for (let i = 0; i < 320; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.9})`;
      ctx.fillRect(r() * SIZE, r() * SIZE, 2, 2);
    }
    // low-poly shapes drifting through the bands above and below the grid
    for (let i = 0; i < 34; i++) {
      const cx = r() * SIZE;
      const cy = i % 2 ? SIZE - r() * TOP : r() * TOP;
      const s = 22 + r() * 40;
      ctx.fillStyle = ['#3a4a8a', '#5b6bb0', '#8c96c8', '#26305e'][i % 4];
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.8, cy + s * 0.4);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#c8d0ff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy + s * 0.6);
      ctx.lineTo(cx + s * 0.1, cy + s * 0.1);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  title(d, x, y, w, h) {
    const { ctx, fonts, name } = d;
    ctx.fillStyle = '#0b1a10';
    ctx.strokeStyle = '#2bff6a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - 30);
    ctx.lineTo(x + w - 30, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#2bff6a';
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + (i * h) / 6);
      ctx.lineTo(x + w, y + (i * h) / 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#2bff6a';
    const [a, b] = titleLines(name);
    ctx.fillText(fitFont(ctx, a.toUpperCase(), w - 36, (px) => `${px}px ${fonts.vt}`, 64, 22), x + 18, y + 76);
    ctx.font = `64px ${fonts.vt}`;
    ctx.fillText(b.toUpperCase(), x + 18, y + 132);
    ctx.font = `28px ${fonts.vt}`;
    ctx.fillText(`WINGMEN ${count(d)}/8`, x + 18, y + h - 52);
    ctx.font = `22px ${fonts.vt}`;
    ctx.fillText('WESLEYBARD.COM/VIDEOGAMES', x + 18, y + h - 20);
  },
  frame({ ctx }, x, y, w, h) {
    ctx.strokeStyle = '#2bff6a';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
    ctx.fillStyle = '#2bff6a';
    for (const [a, b] of [[x - 7, y - 7], [x + w - 5, y - 7], [x - 7, y + h - 5], [x + w - 5, y + h - 5]]) ctx.fillRect(a, b, 12, 12);
  },
  label(d, x, y, w, _n, slug) {
    if (slug) centered(d, `30px ${d.fonts.vt}`, '#c8ffd8', titleOf(d, slug).toUpperCase(), x, y + 30, w);
  },
};
