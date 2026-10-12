import { count, fitText, layout, rr, titleLines, titleOf, SIZE, type DrawCtx, type Theme } from '../render';

function win(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#2a3fd0');
  g.addColorStop(1, '#060c58');
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#9aa6d8';
  rr(ctx, x + 6, y + 6, w - 12, h - 12, 8);
  ctx.stroke();
}

export const crystal: Theme = {
  id: 'crystal',
  displayName: 'Crystal Menu',
  families: (f) => [`600 24px ${f.sans}`, `30px ${f.pixel}`, `15px ${f.pixel}`, `11px ${f.pixel}`, `13px ${f.pixel}`],
  empty: { fill: 'rgba(255,255,255,.08)', ink: 'rgba(255,255,255,.7)' },
  bg({ ctx }) {
    const { TOP } = layout();
    ctx.fillStyle = '#000014';
    ctx.fillRect(0, 0, SIZE, SIZE);
    // thin menu strips above and below the grid
    for (const y of [(TOP - 56) / 2, SIZE - TOP + (TOP - 56) / 2]) {
      win(ctx, 22, y, SIZE - 44, 56);
      ctx.fillStyle = '#ffe680';
      for (let i = 0; i < 6; i++) ctx.fillRect(48 + i * 36, y + 22, 18, 12);
      ctx.fillStyle = '#d7dcff';
      for (let i = 0; i < 14; i++) ctx.fillRect(SIZE - 70 - i * 22, y + 24, 10, 8);
    }
  },
  title(d, x, y, w, h) {
    const { ctx, fonts, name } = d;
    win(ctx, x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = `30px ${fonts.pixel}`;
    titleLines(name).forEach((l, i) => ctx.fillText(fitText(ctx, l, w - 44), x + 22, y + 70 + i * 44));
    ctx.font = `15px ${fonts.pixel}`;
    ctx.fillStyle = '#ffe680';
    ctx.fillText(`PARTY  ${count(d)}/8`, x + 22, y + h - 56);
    ctx.fillStyle = '#d7dcff';
    ctx.font = `11px ${fonts.pixel}`;
    ctx.fillText('wesleybard.com/videogames', x + 22, y + h - 24);
  },
  frame({ ctx }, x, y, w, h) {
    win(ctx, x - 8, y - 8, w + 16, h + layout().LBL + 6);
  },
  label(d, x, y, w, n, slug) {
    const { ctx, fonts } = d;
    ctx.fillStyle = '#ffe680';
    ctx.font = `13px ${fonts.pixel}`;
    ctx.fillText(`Lv${n}`, x + 2, y + 26);
    if (slug) {
      ctx.fillStyle = '#fff';
      ctx.fillText(fitText(ctx, titleOf(d, slug), w - 58), x + 54, y + 26);
    }
  },
  over(d: DrawCtx) {
    // pointing cursor inside the title tile, aimed at the first pick, kept fully on the canvas
    const { ctx } = d;
    const { CH, cellXY } = layout();
    const [x0, y] = cellXY(1);
    const x = Math.max(x0 - 46, 4);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x, y + CH / 2 - 14);
    ctx.lineTo(x + 28, y + CH / 2);
    ctx.lineTo(x, y + CH / 2 + 14);
    ctx.fill();
    ctx.strokeStyle = '#060c58';
    ctx.lineWidth = 2;
    ctx.stroke();
  },
};
