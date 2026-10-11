import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CompanyView from '@/app/snes/components/CompanyView';
import { buildIndex } from '@/lib/snes/library';
import type { Game } from '@/lib/snes/types';

const game = (slug: string, publisher: string, developers: string[], releasedUS: string): Game => ({
  slug, title: slug, releasedUS, datePrecision: 'month', developers, publisher, genres: [], players: null, chip: null, launchTitle: false,
  esrb: null, summary: null, series: null, similar: [], themes: [], perspectives: [], multiplayer: { coop: false, versus: false },
  scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: null, usersCount: 0, egm: null, nintendoPower: null, other: {} },
  boxArt: null, media: { video: false, logo: false, box3d: false }, sources: { wikipedia: null, igdb: null },
});

test('a company page counts its games as developer and publisher and lays them on a timeline', () => {
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
  const games = buildIndex([game('a', 'konami', ['konami'], '1992-03'), game('b', 'nintendo', ['konami'], '1993-05'), game('c', 'konami', ['other'], '1993-06')]);
  render(<CompanyView company={{ slug: 'konami', name: 'Konami', aliases: ['Ultra Games'], country: null }} games={games} names={{ konami: 'Konami', nintendo: 'Nintendo', other: 'Other' }} />);
  expect(screen.getByRole('heading', { level: 1, name: 'Konami' })).toBeInTheDocument();
  expect(screen.getByText('Developed 2 games · published 2 games · also credited as Ultra Games')).toBeInTheDocument();
  expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
    '/videogames/snes-history', '/videogames/snes-history/a', '/videogames/snes-history/b', '/videogames/snes-history/c',
  ]);
});
