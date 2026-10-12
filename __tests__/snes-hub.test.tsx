import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import VideoGamesPage, { metadata } from '@/app/videogames/page';

jest.mock('next/navigation', () => ({ usePathname: () => '/videogames' }));

test('the hub links to the SNES history and stays out of search', () => {
  render(<VideoGamesPage />);
  expect(screen.getByRole('heading', { level: 1, name: 'Video games' })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /SNES History|Explore it/ })[0]).toHaveAttribute('href', '/videogames/snes-history');
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test('SNES History is the featured build, with the hub\'s own picture, above the on-this-day strip', () => {
  const { container } = render(<VideoGamesPage />);
  const feat = screen.getByRole('article', { name: 'Featured build' });
  expect(feat).toHaveTextContent('SNES History');
  expect(feat.querySelector('img')).toHaveAttribute('src', '/videogames/snes-history-windows.jpg');
  expect(screen.getByText('On this day in SNES history')).toBeInTheDocument();
  expect(feat.compareDocumentPosition(container.querySelector('.s-otd')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('three tiles under More SNES, each with a 2:1 print; the Pocket run is not a link', () => {
  const { container } = render(<VideoGamesPage />);
  const more = screen.getByRole('region', { name: 'More SNES' });
  const tiles = more.querySelectorAll('.tiles > .tile');
  expect(tiles).toHaveLength(3);
  expect(Array.from(tiles).map((t) => t.querySelector('h3')!.textContent)).toEqual(['SNES Time Machine', 'My SNES Top 8', "Wes's Pocket run"]);
  tiles.forEach((t) => expect(t.querySelector('.print .ph')).not.toBeNull());
  expect(tiles[2]).toHaveTextContent('Coming soon');
  expect(tiles[2].querySelector('a')).toBeNull();
  expect(container.querySelector('.s-hub-card')).toBeNull();
});

test('the Time Machine tile links in', () => {
  render(<VideoGamesPage />);
  expect(screen.getByRole('link', { name: 'Open SNES Time Machine' })).toHaveAttribute('href', '/videogames/snes-history/time-machine');
  expect(screen.getByRole('link', { name: 'Open SNES Time Machine' }).querySelector('img')).toHaveAttribute('src', '/videogames/time-machine.jpg');
});

test('the hub attaches the VT323 font variable for the on-this-day LED', () => {
  render(<VideoGamesPage />);
  // next/jest mocks next/font: the class names are stubbed, so check the hub's <main> carries the font's class.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { vt323 } = require('@/app/snes/fonts');
  expect(screen.getByRole('main').className).toContain(vt323.variable);
});

test('the Top 8 tile links in, before the Pocket run', () => {
  render(<VideoGamesPage />);
  const link = screen.getByRole('link', { name: 'Open My SNES Top 8' });
  expect(link).toHaveAttribute('href', '/videogames/snes-history/top-8');
  expect(link.querySelector('img')).toHaveAttribute('src', '/videogames/top-8.jpg');
});
