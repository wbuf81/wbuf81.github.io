import React from 'react';
import fs from 'fs';
import path from 'path';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Library from '@/app/snes/components/Library';
import { buildIndex, facets } from '@/lib/snes/library';
import type { Game } from '@/lib/snes/types';

const game = (slug: string, title: string, releasedUS: string, over: Partial<Game> = {}): Game => ({
  slug, title, releasedUS, datePrecision: releasedUS.length === 10 ? 'day' : 'month', developers: ['nintendo-ead'], publisher: 'nintendo',
  genres: [], players: null, chip: null, launchTitle: releasedUS === '1991-08-23', esrb: null, summary: null,
  series: null, similar: [], themes: [], perspectives: [], multiplayer: { coop: false, versus: false },
  scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: null, usersCount: 0, egm: null, nintendoPower: null, other: {} },
  boxArt: `/snes/box/${slug}.jpg`,
  media: { video: false, logo: false, box3d: false }, sources: { wikipedia: null, igdb: null }, ...over,
});
const INDEX = buildIndex([
  game('f-zero', 'F-Zero', '1991-08-23'),
  game('gradius-iii', 'Gradius III', '1991-08-23', { publisher: 'konami', developers: ['konami'] }),
  game('super-metroid', 'Super Metroid', '1994-04-18', {
    scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: null, usersCount: 0, egm: [9, 9, 9, 9], nintendoPower: null, other: {} },
  }),
]);
const NAMES = { nintendo: 'Nintendo', konami: 'Konami', 'nintendo-ead': 'Nintendo EAD' };
const setup = (search = '') => {
  window.history.replaceState(null, '', `/snes${search}`);
  return render(<Library games={INDEX} names={NAMES} facets={facets(INDEX, NAMES)} />);
};

beforeEach(() => {
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollIntoView = jest.fn();
});

test('renders the timeline by month with every game', () => {
  setup();
  expect(screen.getByText('Launch day · Aug 23')).toBeInTheDocument();
  expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/videogames/snes-history/f-zero', '/videogames/snes-history/gradius-iii', '/videogames/snes-history/super-metroid']);
  expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true');
});

test('reads filters from the URL', () => {
  setup('?publisher=konami');
  expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/videogames/snes-history/gradius-iii']);
  expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
});

test('typing a search filters and writes the URL', () => {
  setup();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search games' }), { target: { value: 'metroid' } });
  expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/videogames/snes-history/super-metroid']);
  expect(window.location.search).toBe('?q=metroid');
});

test('the timeline with no matches says so, and Clear filters brings everything back', () => {
  setup('?q=zzzz');
  expect(screen.getByText('No carts match those filters')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
  expect(screen.getAllByRole('link')).toHaveLength(3);
  expect(window.location.search).toBe('');
});

test('year tabs disable years with no matches', () => {
  setup();
  expect(screen.getByRole('button', { name: '1991' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '1992' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '1994' }));
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
});

test('switching views updates the URL and the tab', async () => {
  setup();
  fireEvent.click(screen.getByRole('tab', { name: 'Heatmap' }));
  expect(screen.getByRole('tab', { name: 'Heatmap' })).toHaveAttribute('aria-selected', 'true');
  expect(window.location.search).toBe('?view=heatmap');
  await act(async () => {});
});

test('the sort control appears only on the wall and shelf', () => {
  setup();
  expect(screen.queryByRole('combobox', { name: 'Sort' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Wall' }));
  expect(screen.getByRole('combobox', { name: 'Sort' })).toBeInTheDocument();
});

test('genre, players and the IGDB-backed controls stay hidden until the data has them', () => {
  setup();
  for (const name of ['Genre', 'Players', 'Series', 'Theme', 'Camera', 'Multiplayer']) {
    expect(screen.queryByRole('combobox', { name })).toBeNull();
  }
});

test('series, theme, camera and multiplayer controls appear when the data has them', () => {
  const rich = buildIndex([
    game('a', 'Alpha', '1992-01-01', { series: 'Alpha Saga', themes: ['Fantasy'], perspectives: ['Side view'], multiplayer: { coop: true, versus: false } }),
    game('b', 'Beta', '1993-01-01', { series: 'Alpha Saga', themes: ['Science fiction'], perspectives: ['Isometric'], multiplayer: { coop: false, versus: true } }),
  ]);
  window.history.replaceState(null, '', '/snes');
  render(<Library games={rich} names={NAMES} facets={facets(rich, NAMES)} />);
  for (const name of ['Series', 'Theme', 'Camera', 'Multiplayer']) {
    expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
  }
  fireEvent.change(screen.getByRole('combobox', { name: 'Multiplayer' }), { target: { value: 'versus' } });
  expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/videogames/snes-history/b']);
  expect(window.location.search).toBe('?mp=versus');
  fireEvent.click(screen.getByRole('tab', { name: 'Wall' }));
  expect(screen.getByRole('option', { name: 'Player score' })).toBeInTheDocument();
});

test('/snes is kept out of search engines', () => {
  expect(fs.readFileSync(path.join(process.cwd(), 'public/robots.txt'), 'utf8')).toMatch(/^Disallow: \/videogames$/m);
  expect(fs.readFileSync(path.join(process.cwd(), 'public/sitemap.xml'), 'utf8')).not.toMatch(/\/videogames/);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { metadata } = require('@/app/videogames/snes-history/page');
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
