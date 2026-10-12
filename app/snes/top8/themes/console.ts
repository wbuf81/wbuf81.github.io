import { centered, rr, titleLines, titleOf, layout, SIZE, type Theme, fitFont } from '../render';

export const consoleTheme: Theme = {
  id: 'console',
  displayName: 'Console',
  families: (f) => [`600 24px ${f.sans}`, `900 44px ${f.sans}`, `700 15px ${f.sans}`, `600 14px ${f.sans}`, `800 20px ${f.sans}`],
  empty: { fill: '#a9a5b3', ink: '#5d5966' },
  bg({ ctx }) {
    const { TOP } = layout();
    const g = ctx.createLinearGradient(0, 0, 0, SIZE);
    g.addColorStop(0, '#dcd9e1');
    g.addColorStop(1, '#bdb9c4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
    // purple stripes and vent slots in both bands
    for (const base of [0, SIZE - TOP]) {
      ctx.fillStyle = '#4f3d8f';
      ctx.fillRect(0, base + TOP / 2 - 4, SIZE, 8);
      ctx.fillStyle = '#a9a1d6';
      ctx.fillRect(0, base + TOP / 2 - 18, SIZE, 5);
      ctx.fillRect(0, base + TOP / 2 + 13, SIZE, 5);
      ctx.fillStyle = '#9a96a1';
      for (let i = 0; i < 18; i++) rr(ctx, 22 + i * 56, base + 14, 38, 8, 4), ctx.fill();
      for (let i = 0; i < 18; i++) rr(ctx, 22 + i * 56, base + TOP - 34, 38, 8, 4), ctx.fill();
    }
  },
  title(d, x, y, w, h) {
    const { ctx, fonts, name } = d;
    ctx.fillStyle = '#8f8b8e';
    rr(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.fillStyle = '#c9c6cf';
    rr(ctx, x + 14, y + 14, w - 28, h - 28, 10);
    ctx.fill();
    ctx.fillStyle = '#4b4752';
    const [a, b] = titleLines(name);
    ctx.fillText(fitFont(ctx, a, w - 60, (px) => `900 ${px}px ${fonts.sans}`, 44, 18), x + 30, y + 78);
    ctx.font = `900 44px ${fonts.sans}`;
    ctx.fillText(b, x + 30, y + 126);
    ctx.fillStyle = '#6b6773';
    ctx.font = `700 15px ${fonts.sans}`;
    ctx.fillText('16-BIT', x + 32, y + h - 74);
    ctx.fillText('ENTERTAINMENT SYSTEM', x + 32, y + h - 54);
    ctx.font = `600 14px ${fonts.sans}`;
    ctx.fillText('wesleybard.com/videogames', x + 32, y + h - 28);
    ([['#a9a1d6', 0, 0], ['#a9a1d6', 1, 0], ['#4f3d8f', 0, 1], ['#4f3d8f', 1, 1]] as const).forEach(([c, a, b]) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + w - 66 + a * 30, y + h - 74 + b * 30, 13, 0, 7);
      ctx.fill();
    });
  },
  frame({ ctx }, x, y, w, h) {
    ctx.fillStyle = '#8f8b8e';
    rr(ctx, x - 8, y - 16, w + 16, h + 22, 10);
    ctx.fill();
    ctx.fillStyle = '#7c787b';
    for (let k = 0; k < 9; k++) ctx.fillRect(x + 4 + k * (w / 9), y - 11, w / 13, 6);
  },
  label(d, x, y, w, _n, slug) {
    if (slug) centered(d, `800 20px ${d.fonts.sans}`, '#3b3842', titleOf(d, slug), x, y + 30, w);
  },
};
