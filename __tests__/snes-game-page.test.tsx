import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import GameView from '@/app/snes/components/GameView';
import { act } from '@testing-library/react';
import { buildIndex } from '@/lib/snes/library';
import type { Game } from '@/lib/snes/types';

const full: Game = {
  slug: 'f-zero', title: 'F-Zero', releasedUS: '1991-08-23', datePrecision: 'day', developers: ['nintendo-ead'], publisher: 'nintendo',
  genres: ['Racing'], players: 1, chip: null, launchTitle: true, esrb: null, summary: 'Race at 400 km/h above the cities of 2560.',
  series: 'F-Zero', similar: ['gradius-iii'], themes: ['Science fiction'], perspectives: ['Third person'], multiplayer: { coop: false, versus: false },
  scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: 79, usersCount: 192, egm: [8, 9, 8, 7], nintendoPower: { score: 4, scale: 5 }, other: { GR: '83%', Fam: '7/10, 8/10, 8/10, 9/10', award1: 'x' } },
  boxArt: '/snes/box/f-zero.jpg', media: { video: true, logo: true, box3d: true }, sources: { wikipedia: 'F-Zero (video game)', igdb: null },
};
const bare: Game = {
  ...full, slug: 'bare', title: 'Bare Cart', releasedUS: '1995-03', datePrecision: 'month', genres: [], players: null, launchTitle: false,
  summary: null, series: null, similar: [], themes: [], perspectives: [], multiplayer: { coop: false, versus: false },
  scores: { aggregate: null, aggregateCount: 0, critic: null, criticCount: 0, users: null, usersCount: 0, egm: null, nintendoPower: null, other: {} }, boxArt: null,
  media: { video: false, logo: false, box3d: false },
};
const NAMES = { nintendo: 'Nintendo', 'nintendo-ead': 'Nintendo EAD' };
const [gradius] = buildIndex([{ ...full, slug: 'gradius-iii', title: 'Gradius III', media: { video: false, logo: false, box3d: false } }]);

beforeEach(() => {
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

test('a full game page: logo title, chips, story, specifications, magazines, neighbours and the month strip', () => {
  render(<GameView game={full} names={NAMES} prev={null} next={gradius} sameMonth={[gradius]} seriesGames={[gradius]} similarGames={[gradius]} />);
  expect(screen.getByRole('heading', { level: 1, name: 'F-Zero' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'F-Zero' })).toHaveAttribute('src', '/snes/logo/f-zero.webp');
  for (const chip of ['Racing', '1 player', 'Day One', 'Pre-ESRB']) expect(screen.getAllByText(chip).length).toBeGreaterThan(0);
  expect(screen.getByText('Race at 400 km/h above the cities of 2560.')).toBeInTheDocument();
  const spec = screen.getByRole('region', { name: 'Specifications' });
  expect(within(spec).getByRole('link', { name: 'Nintendo EAD' })).toHaveAttribute('href', '/videogames/snes-history/company/nintendo-ead');
  expect(within(spec).getByText('August 23, 1991 — launch day')).toBeInTheDocument();
  const mags = screen.getByRole('region', { name: 'What the magazines said' });
  expect(within(mags).getByText('EGM · four reviewers')).toBeInTheDocument();
  expect(within(mags).getByText('Famitsu · four reviewers')).toBeInTheDocument();
  expect(within(mags).getByText('4/5')).toBeInTheDocument();
  expect(within(mags).getByText('GameRankings')).toBeInTheDocument();
  expect(within(mags).queryByText('award1')).toBeNull();
  expect(screen.getAllByText('Start of the timeline')).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: /Gradius III/ })[0]).toHaveAttribute('href', '/videogames/snes-history/gradius-iii');
  expect(screen.getByText(/Also out in August 1991/)).toBeInTheDocument();
  expect(screen.getByText(/Wes's take/)).toBeInTheDocument();
  expect(within(mags).getByText('Players')).toBeInTheDocument();
  expect(within(mags).getByText('79/100 (192 ratings)')).toBeInTheDocument();
  expect(within(mags).queryByText('Critics')).toBeNull();
  expect(within(spec).getByText('Series')).toBeInTheDocument();
  expect(within(spec).getByText('Science fiction')).toBeInTheDocument();
  expect(within(spec).getByText('Third person')).toBeInTheDocument();
  expect(within(spec).queryByText('Multiplayer')).toBeNull();
  expect(screen.getByRole('region', { name: 'If you like F-Zero, try…' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'More in the F-Zero series' })).toBeInTheDocument();
});

test('the media switch flips between cover, 3D box and gameplay; play starts the clip with sound', () => {
  const { container } = render(<GameView game={full} names={NAMES} prev={null} next={null} sameMonth={[]} seriesGames={[]} similarGames={[]} />);
  const frame = container.querySelector('.s-frame')!;
  expect(frame).toHaveClass('is-crt');
  fireEvent.click(screen.getByRole('button', { name: '3D box' }));
  expect(frame.querySelector('img.s-box3d')).toHaveAttribute('src', '/snes/box3d/f-zero.webp');
  expect(frame).not.toHaveClass('is-crt');
  fireEvent.click(screen.getByRole('button', { name: 'Cover' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play gameplay with sound' }));
  const video = frame.querySelector('video') as HTMLVideoElement;
  expect(video).toHaveAttribute('src', '/snes/video/f-zero.mp4');
  expect(video.muted).toBe(false);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
});

test('a bare game page renders every absent state without gaps', () => {
  const { container } = render(<GameView game={bare} names={NAMES} prev={gradius} next={null} sameMonth={[]} seriesGames={[]} similarGames={[]} />);
  expect(screen.getByRole('heading', { level: 1, name: 'Bare Cart' })).toHaveClass('s-title');
  expect(screen.getByText('No summary yet.')).toBeInTheDocument();
  expect(screen.getByText('No magazine scores on record yet.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '3D box' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Play/ })).toBeNull();
  expect(screen.getAllByText('End of the timeline')).toHaveLength(2);
  expect(screen.queryByRole('region', { name: /If you like/ })).toBeNull();
  expect(screen.queryByRole('region', { name: /More in the/ })).toBeNull();
  expect(container.textContent).not.toMatch(/undefined|NaN|null/);
});
test('strip tiles play with sound after the visitor has clicked somewhere', () => {
  jest.useFakeTimers();
  localStorage.clear();
  window.matchMedia = ((q: string) => ({ matches: q.includes('hover'), media: q, addEventListener() {}, removeEventListener() {} })) as never;
  const [clip] = buildIndex([{ ...full, slug: 'gradius-iii', title: 'Gradius III', media: { video: true, logo: false, box3d: false } }]);
  const { container } = render(<GameView game={bare} names={NAMES} prev={null} next={null} sameMonth={[clip]} seriesGames={[]} similarGames={[]} />);
  const tile = container.querySelector('.s-also a.s-tile')!;
  fireEvent.mouseEnter(tile);
  act(() => { jest.advanceTimersByTime(300); });
  expect((tile.querySelector('video') as HTMLVideoElement).muted).toBe(true);
  fireEvent.mouseLeave(tile);
  act(() => { fireEvent.pointerDown(window); });
  fireEvent.mouseEnter(tile);
  act(() => { jest.advanceTimersByTime(300); });
  expect((tile.querySelector('video') as HTMLVideoElement).muted).toBe(false);
  jest.useRealTimers();
});

test('a booklet labels the player and critic scores out of 100', () => {
  render(<GameView game={{ ...full, scores: { ...full.scores, critic: 81, criticCount: 1 } }} names={NAMES} prev={null} next={null} sameMonth={[]} seriesGames={[]} similarGames={[]} />);
  const mags = screen.getByRole('region', { name: 'What the magazines said' });
  expect(within(mags).getByText('81/100 (1 review)')).toBeInTheDocument();
});

test('multiplayer reads Co-op and 2+ players', () => {
  const mp = (coop: boolean, versus: boolean) => render(<GameView game={{ ...full, multiplayer: { coop, versus } }} names={NAMES} prev={null} next={null} sameMonth={[]} seriesGames={[]} similarGames={[]} />);
  let r = mp(true, false);
  expect(screen.getByText('Co-op')).toBeInTheDocument();
  r.unmount();
  r = mp(false, true);
  expect(screen.getByText('2+ players')).toBeInTheDocument();
  r.unmount();
  mp(true, true);
  expect(screen.getByText('Co-op · 2+ players')).toBeInTheDocument();
});

test('a game page is kept out of search engines', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { generateMetadata } = require('@/app/videogames/snes-history/[slug]/page');
  const meta = await generateMetadata({ params: Promise.resolve({ slug: 'f-zero' }) });
  expect(meta.robots).toEqual({ index: false, follow: false });
});

test('the logo reserves its space: width and height come from the file, so nothing shifts when it loads', () => {
  render(<GameView game={full} names={NAMES} prev={null} next={null} sameMonth={[]} seriesGames={[]} similarGames={[]} logoSize={[400, 175]} />);
  const img = screen.getByRole('img', { name: 'F-Zero' });
  expect(img).toHaveAttribute('width', '400');
  expect(img).toHaveAttribute('height', '175');
});

describe('Top 8 on a game page', () => {
  beforeEach(() => localStorage.clear());
  test('a labelled ★ button sits beside the title, and every strip tile has its own ★', () => {
    const { container } = render(<GameView game={bare} names={NAMES} prev={null} next={null} sameMonth={[gradius]} seriesGames={[]} similarGames={[gradius]} />);
    const title = screen.getByRole('heading', { level: 1, name: 'Bare Cart' });
    const add = screen.getByRole('button', { name: 'Add to your Top 8' });
    expect(add).toHaveTextContent('☆ Add to your Top 8');
    expect(add).toHaveAttribute('aria-pressed', 'false');
    expect(title.parentElement).toContainElement(add);
    fireEvent.click(add);
    expect(screen.getByRole('button', { name: 'Remove from your Top 8' })).toHaveTextContent('★ Remove from your Top 8');
    expect(screen.getByRole('button', { name: 'Remove from your Top 8' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Add Gradius III to your Top 8' })).toHaveLength(2);
    expect(container.querySelector('a button')).toBeNull();
  });
  test('with a logo for a title the button follows the logo', () => {
    render(<GameView game={full} names={NAMES} prev={null} next={null} sameMonth={[]} seriesGames={[]} similarGames={[]} />);
    const add = screen.getByRole('button', { name: 'Add to your Top 8' });
    expect(screen.getByRole('img', { name: 'F-Zero' }).compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
