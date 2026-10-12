import { centered, count, fitText, titleLines, titleOf, layout, SIZE, type Theme, fitFont, wrapLines } from '../render';

export const myspace: Theme = {
  id: 'myspace',
  displayName: 'MySpace Classic',
  families: (f) => ['bold 34px Verdana, Arial, sans-serif', '19px Verdana, Arial, sans-serif', 'bold 17px Verdana, Arial, sans-serif', 'bold 20px Verdana, Arial, sans-serif', `600 24px ${f.sans}`],
  empty: { fill: '#eef2f7', ink: '#8aa0bf' },
  bg({ ctx }) {
    const { TOP } = layout();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    // header bar with a lighter nav strip and orange rule, like the old profile chrome
    ctx.fillStyle = '#003399';
    ctx.fillRect(0, 0, SIZE, TOP - 8);
    ctx.fillStyle = '#336699';
    ctx.fillRect(0, TOP - 52, SIZE, 44);
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(0, TOP - 8, SIZE, 4);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 7; i++) ctx.fillRect(24 + i * 120, TOP - 40, 90, 20);
    ctx.globalAlpha = 1;
    // footer
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(0, SIZE - TOP + 8, SIZE, TOP);
    ctx.fillStyle = '#b9c4d6';
    ctx.fillRect(0, SIZE - TOP + 8, SIZE, 3);
    ctx.fillStyle = '#6699cc';
    for (let i = 0; i < 9; i++) ctx.fillRect(40 + i * 110, SIZE - TOP + 44, 70, 8);
    ctx.fillStyle = '#c9c9c9';
    for (let i = 0; i < 9; i++) ctx.fillRect(40 + i * 110, SIZE - TOP + 66, 50, 6);
  },
  title(d, x, y, w, h) {
    const { ctx, name } = d;
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#6699cc';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    const verd = 'Verdana, Arial, sans-serif';
    ctx.fillStyle = '#003399';
    ctx.font = `bold 34px ${verd}`;
    ctx.fillText('snesspace', x + 18, y + 50);
    ctx.fillStyle = '#ff6600';
    const [a, b] = titleLines(name);
    ctx.fillText(fitFont(ctx, a, w - 36, (px) => `bold ${px}px ${verd}`, 34, 16), x + 18, y + 120);
    ctx.font = `bold 34px ${verd}`;
    ctx.fillText(b, x + 18, y + 160);
    ctx.fillStyle = '#000';
    ctx.font = `19px ${verd}`;
    const friends = wrapLines(ctx, `${name || 'This person'} has ${count(d)} SNES ${count(d) === 1 ? 'friend' : 'friends'}.`, w - 36, 2);
    friends.forEach((l, i) => ctx.fillText(l, x + 18, y + h - 78 + (2 - friends.length) * 24 + i * 24));
    ctx.fillStyle = '#003399';
    ctx.font = `bold 17px ${verd}`;
    ctx.fillText('wesleybard.com/videogames', x + 18, y + h - 22);
  },
  frame({ ctx }, x, y, w, h) {
    ctx.fillStyle = '#dfe7f2';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  },
  label(d, x, y, w, _n, slug) {
    if (!slug) return;
    const { ctx } = d;
    const t = titleOf(d, slug);
    const font = 'bold 20px Verdana, Arial, sans-serif';
    centered(d, font, '#003399', t, x, y + 28, w);
    ctx.font = font;
    const tw = ctx.measureText(fitText(ctx, t, w - 24)).width;
    ctx.fillStyle = '#003399';
    ctx.fillRect(x + w / 2 - tw / 2, y + 31, tw, 2);
  },
};
