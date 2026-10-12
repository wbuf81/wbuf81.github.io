import { centered, fitText, rng, titleLines, titleOf, layout, SIZE, type Theme } from '../render';

export const glitter: Theme = {
  id: 'glitter',
  displayName: 'Glitter',
  families: (f) => [`900 54px ${f.sans}`, `italic 600 24px ${f.sans}`, `700 20px ${f.sans}`],
  empty: { fill: '#4a1450', ink: '#ffd6f5' },
  bg({ ctx }) {
    const { TOP } = layout();
    const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    g.addColorStop(0, '#2b0838');
    g.addColorStop(0.5, '#7a1a6e');
    g.addColorStop(1, '#1d0b3a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const r = rng(7);
    for (let i = 0; i < 520; i++) {
      const x = r() * SIZE, y = r() * SIZE, s = r() * 3 + 0.5;
      ctx.fillStyle = `rgba(255,${180 + r() * 75},${220 + r() * 35},${0.4 + r() * 0.6})`;
      ctx.fillRect(x, y, s, s);
      if (r() > 0.94) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 9, y);
        ctx.lineTo(x + 9, y);
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x, y + 9);
        ctx.stroke();
      }
    }
    // big four-point sparkles fill the bands above and below the grid
    const s2 = rng(99);
    for (let i = 0; i < 26; i++) {
      const x = 30 + s2() * (SIZE - 60);
      const y = i % 2 ? SIZE - 12 - s2() * (TOP - 24) : 12 + s2() * (TOP - 24);
      const s = 8 + s2() * 18;
      ctx.fillStyle = i % 3 ? '#ffd6f5' : '#ffffff';
      ctx.globalAlpha = 0.6 + s2() * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x, y, x + s, y);
      ctx.quadraticCurveTo(x, y, x, y + s);
      ctx.quadraticCurveTo(x, y, x - s, y);
      ctx.quadraticCurveTo(x, y, x, y - s);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  title(d, x, y, w, h) {
    const { ctx, fonts, name } = d;
    ctx.textAlign = 'center';
    const cx = x + w / 2;
    ctx.font = `900 54px ${fonts.sans}`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#fff';
    const tg = ctx.createLinearGradient(0, y + 60, 0, y + 160);
    tg.addColorStop(0, '#ff9ee6');
    tg.addColorStop(1, '#ff2fae');
    const [a, b] = titleLines(name);
    [`✧ ${a}`, `${b} ✧`].forEach((l, i) => {
      const t = fitText(ctx, l, w - 24);
      ctx.strokeText(t, cx, y + 92 + i * 60);
      ctx.fillStyle = tg;
      ctx.fillText(t, cx, y + 92 + i * 60);
    });
    ctx.font = `italic 600 24px ${fonts.sans}`;
    ctx.fillStyle = '#ffd6f5';
    ctx.fillText('~*~ SNES 4 LYFE ~*~', cx, y + h - 50);
    ctx.font = `600 16px ${fonts.sans}`;
    ctx.fillText('wesleybard.com/videogames', cx, y + h - 18);
    ctx.textAlign = 'left';
  },
  frame({ ctx }, x, y, w, h) {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#ff6ad5';
    ctx.shadowBlur = 22;
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  },
  label(d, x, y, w, _n, slug) {
    if (slug) centered(d, `700 20px ${d.fonts.sans}`, '#fff', titleOf(d, slug), x, y + 30, w);
  },
};
