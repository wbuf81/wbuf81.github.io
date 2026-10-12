import { fitText, titleLines, titleOf, count, layout, SIZE, type Theme, fitFont } from '../render';

export const grandprix: Theme = {
  id: 'grandprix',
  displayName: 'Grand Prix',
  families: (f) => [`600 24px ${f.sans}`, `italic 900 46px ${f.orbit}`, `700 17px ${f.orbit}`, `36px ${f.vt}`, `24px ${f.vt}`, `30px ${f.vt}`],
  empty: { fill: 'rgba(33,227,255,.08)', ink: '#21e3ff' },
  bg({ ctx }) {
    const { TOP } = layout();
    ctx.fillStyle = '#07061a';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55;
    // lower band: track receding to a horizon
    const hz = SIZE - TOP * 1.6;
    ctx.strokeStyle = '#ff2fd0';
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath();
      ctx.moveTo(SIZE / 2 + i * 26, hz);
      ctx.lineTo(SIZE / 2 + i * 150, SIZE);
      ctx.stroke();
    }
    ctx.strokeStyle = '#21e3ff';
    for (let k = 0; k < 8; k++) {
      const y = hz + Math.pow(k / 7, 2) * (SIZE - hz);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SIZE, y);
      ctx.stroke();
    }
    // upper band: the same track mirrored, running up into the sky
    const hy = TOP * 1.6;
    ctx.strokeStyle = '#ff2fd0';
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath();
      ctx.moveTo(SIZE / 2 + i * 26, hy);
      ctx.lineTo(SIZE / 2 + i * 150, 0);
      ctx.stroke();
    }
    ctx.strokeStyle = '#21e3ff';
    for (let k = 0; k < 8; k++) {
      const y = hy - Math.pow(k / 7, 2) * hy;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SIZE, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  title(d, x, y, w, h) {
    const { ctx, fonts, name } = d;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#ff2fd0' : '#21e3ff';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + i * 46, y);
      ctx.lineTo(x + i * 46 + 26, y);
      ctx.lineTo(x + i * 46 - 120, y + h);
      ctx.lineTo(x + i * 46 - 146, y + h);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) {
        ctx.fillStyle = (a + b) % 2 ? '#fff' : '#111';
        ctx.fillRect(x + w - 56 + a * 16, y + 8 + b * 16, 16, 16);
      }
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#21e3ff';
    ctx.shadowBlur = 18;
    const [a, b] = titleLines(name);
    ctx.fillText(fitFont(ctx, a.toUpperCase(), w - 36, (px) => `italic 900 ${px}px ${fonts.orbit}`, 46, 16), x + 18, y + 120);
    ctx.font = `italic 900 46px ${fonts.orbit}`;
    ctx.fillText(b.toUpperCase(), x + 18, y + 172);
    ctx.restore();
    ctx.font = `36px ${fonts.vt}`;
    ctx.fillStyle = '#ff5a3c';
    ctx.fillText(`LAP ${count(d)}/8  0'08"91`, x + 20, y + h - 48);
    ctx.font = `24px ${fonts.vt}`;
    ctx.fillStyle = '#21e3ff';
    ctx.fillText('WESLEYBARD.COM/VIDEOGAMES', x + 20, y + h - 18);
  },
  frame({ ctx }, x, y, w, h, n) {
    ctx.strokeStyle = n % 2 ? '#ff2fd0' : '#21e3ff';
    ctx.lineWidth = 5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 16;
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
  },
  label(d, x, y, w, n, slug) {
    const { ctx, fonts } = d;
    ctx.fillStyle = '#ff5a3c';
    ctx.font = `30px ${fonts.vt}`;
    ctx.fillText(`P${n}`, x, y + 30);
    if (slug) {
      ctx.font = `700 17px ${fonts.orbit}`;
      ctx.fillStyle = '#e6faff';
      ctx.fillText(fitText(ctx, titleOf(d, slug).toUpperCase(), w - 46), x + 40, y + 28);
    }
  },
};
