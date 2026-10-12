import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import VideoGamesPage, { metadata } from '@/app/videogames/page';

jest.mock('next/navigation', () => ({ usePathname: () => '/videogames' }));

test('the hub links to the SNES history and stays out of search', () => {
  render(<VideoGamesPage />);
  expect(screen.getByRole('heading', { level: 1, name: 'Video games' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Super Nintendo history/ })).toHaveAttribute('href', '/videogames/snes-history');
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test('the hub shows the on-this-day strip above four cards, one of them not a link', () => {
  const { container } = render(<VideoGamesPage />);
  expect(screen.getByText('On this day in SNES history')).toBeInTheDocument();
  const cards = container.querySelectorAll('.s-hub > .s-hub-card');
  expect(cards).toHaveLength(4);
  expect(cards[3].tagName).toBe('DIV');
  expect(cards[3]).toHaveTextContent("Coming soon: Wes's Analogue Pocket run");
  expect(cards[3]).toHaveTextContent('Played, beaten, rated — my run through the library on an Analogue Pocket.');
  expect(screen.queryByRole('link', { name: /Analogue Pocket/ })).toBeNull();
  expect(container.querySelector('.s-otd')!.compareDocumentPosition(cards[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('the Time Machine card links in', () => {
  render(<VideoGamesPage />);
  expect(screen.getByRole('link', { name: /SNES Time Machine/ })).toHaveAttribute('href', '/videogames/snes-history/time-machine');
  expect(screen.getByText('Every week, 1991–1998: the #1 song, album and movie, the news, and the new games')).toBeInTheDocument();
});

test('the hub attaches the VT323 font variable for the on-this-day LED', () => {
  render(<VideoGamesPage />);
  // next/jest mocks next/font: the class names are stubbed, so check the hub's <main> carries the font's class.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { vt323 } = require('@/app/snes/fonts');
  expect(screen.getByRole('main').className).toContain(vt323.variable);
});

test('the Top 8 card links in, before Coming soon', () => {
  const { container } = render(<VideoGamesPage />);
  const link = screen.getByRole('link', { name: /My SNES Top 8/ });
  expect(link).toHaveAttribute('href', '/videogames/snes-history/top-8');
  expect(container.querySelectorAll('.s-hub > .s-hub-card')[2]).toBe(link);
  expect(link.querySelector('img')).toHaveAttribute('src', '/snes/top8-example.jpg');
});
