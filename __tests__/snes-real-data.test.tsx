import React from 'react';
import fs from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import GameView from '@/app/snes/components/GameView';
import Library from '@/app/snes/components/Library';
import { getCompanyNames, getGames } from '@/lib/snes/data';
import { buildIndex, facets, neighbours } from '@/lib/snes/library';
import { gamePath } from '@/lib/snes/routes';

// Every real game renders without gaps, and every image or clip it points at exists.
const games = getGames();
const index = buildIndex(games);
const names = getCompanyNames();
const bySlug = new Map(index.map((g) => [g.slug, g]));
const pub = (p: string) => path.join(process.cwd(), 'public', p);

test('every game page renders with no undefined, NaN or missing files', () => {
  for (const game of games) {
    const { prev, next } = neighbours(index, game.slug);
    const seriesGames = game.series ? index.filter((g) => g.slug !== game.slug && g.series === game.series).slice(0, 8) : [];
    const similarGames = game.similar.map((s) => bySlug.get(s)).filter((g): g is NonNullable<typeof g> => Boolean(g));
    const html = renderToStaticMarkup(
      <GameView game={game} names={names} prev={prev} next={next} sameMonth={[]} seriesGames={seriesGames} similarGames={similarGames} />,
    );
    expect(html).not.toMatch(/undefined|NaN|>null</);
    for (const m of html.matchAll(/(?:src|poster)="(\/snes\/[^"]+)"/g)) expect([game.slug, m[1], fs.existsSync(pub(m[1]))]).toEqual([game.slug, m[1], true]);
  }
});

test('the server-rendered library stays inside the page budget', () => {
  const html = renderToStaticMarkup(<Library games={index} names={names} facets={facets(index, names)} />);
  expect(html.length).toBeLessThan(450_000);
  expect(html).toContain(`href="${gamePath(index[0].slug)}"`);
});
