import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { GameTile } from '@/app/snes/components/GameTile';
import { SoundProvider } from '@/app/snes/components/sound';
import { pickCentre } from '@/app/snes/components/useCenterPlay';
import type { IndexGame } from '@/lib/snes/library';

const base: IndexGame = {
  slug: 'f-zero', title: 'F-Zero', search: 'f zero', releasedUS: '1991-08-23', datePrecision: 'day', publisher: 'nintendo',
  developers: ['nintendo-ead'], genres: [], players: null, chip: null, chipSlug: null, launchTitle: true, egmAvg: null, np10: 7.6,
  aggregate: null, boxArt: '/snes/box/f-zero.jpg', thumb: '/snes/thumb/f-zero.jpg', video: '/snes/video/f-zero.mp4',
  series: null, themes: [], perspectives: [], coop: false, versus: false, users: null,
};
const games = [
  base,
  { ...base, slug: 'pilotwings', title: 'Pilotwings', video: '/snes/video/pilotwings.mp4' },
  { ...base, slug: 'actraiser', title: 'ActRaiser', video: '/snes/video/actraiser.mp4' },
];

// Tile centres by title; the viewport is 800 tall, so its centre is 400 and the middle 40% runs 240 to 560.
let centres: Record<string, number> = {};
let hover = false;
let reduced = false;
let play: jest.Mock;
beforeEach(() => {
  hover = false;
  reduced = false;
  centres = { 'F-Zero': 100, Pilotwings: 350, ActRaiser: 600 };
  localStorage.clear();
  jest.useFakeTimers();
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
  window.matchMedia = ((q: string) => ({
    matches: q.includes('hover: hover') ? hover && !reduced : q.includes('hover: none') ? !hover && !reduced : false,
    media: q, addEventListener() {}, removeEventListener() {},
  })) as never;
  play = jest.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.play = play;
  window.HTMLMediaElement.prototype.pause = jest.fn();
  window.HTMLMediaElement.prototype.load = jest.fn();
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const c = centres[this.getAttribute('aria-label')?.split(',')[0] ?? ''] ?? -1000;
    return { top: c - 100, bottom: c + 100, height: 200, left: 0, right: 200, width: 200, x: 0, y: c - 100, toJSON() {} } as DOMRect;
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const renderAll = () => render(<>{games.map((g) => <GameTile key={g.slug} game={g} publisherName="Nintendo" />)}</>);
const tile = (name: string) => screen.getByRole('link', { name: new RegExp(`^${name},`) });
const wait = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });
const scroll = () => act(() => { window.dispatchEvent(new Event('scroll')); });

test('pickCentre picks the rect nearest the viewport centre, inside the middle band only', () => {
  const r = (c: number) => ({ top: c - 50, bottom: c + 50 });
  expect(pickCentre([r(100), r(380), r(450)], 800)).toBe(1);
  expect(pickCentre([r(100), r(700)], 800)).toBe(-1);
  expect(pickCentre([r(250), r(560)], 800)).toBe(0);
  expect(pickCentre([], 800)).toBe(-1);
});

test('after 500ms of stillness the tile nearest the centre plays its clip', () => {
  renderAll();
  wait(499);
  expect(document.querySelector('video')).toBeNull();
  wait(1);
  const chosen = tile('Pilotwings');
  expect(chosen).toHaveClass('is-playing');
  expect(chosen.querySelector('.s-art video')).toHaveAttribute('src', '/snes/video/pilotwings.mp4');
  expect(tile('F-Zero')).not.toHaveClass('is-playing');
  expect(document.querySelectorAll('video')).toHaveLength(1);
  expect(play).toHaveBeenCalled();
});

test('scrolling stops the clip at once; the new centre tile plays only after the scroll settles', () => {
  renderAll();
  wait(500);
  expect(tile('Pilotwings')).toHaveClass('is-playing');
  centres = { 'F-Zero': -200, Pilotwings: 150, ActRaiser: 420 };
  scroll();
  expect(tile('Pilotwings')).not.toHaveClass('is-playing');
  expect(document.querySelector('video')).toBeNull();
  wait(300);
  scroll();
  wait(300);
  expect(document.querySelector('video')).toBeNull();
  wait(200);
  expect(tile('ActRaiser')).toHaveClass('is-playing');
  expect(tile('ActRaiser').querySelector('video')).toHaveAttribute('src', '/snes/video/actraiser.mp4');
  expect(document.querySelectorAll('.is-playing')).toHaveLength(1);
  expect(document.querySelectorAll('video')).toHaveLength(1);
});

test('nothing plays when no tile is near the centre, or the nearest has no clip', () => {
  centres = { 'F-Zero': 100, Pilotwings: 700, ActRaiser: 760 };
  const first = renderAll();
  wait(1000);
  expect(document.querySelector('video')).toBeNull();
  first.unmount();
  centres = { 'F-Zero': 400, Pilotwings: 100, ActRaiser: 700 };
  render(<><GameTile game={{ ...base, video: null }} publisherName="Nintendo" /><GameTile game={games[1]} publisherName="Nintendo" /></>);
  wait(1000);
  expect(document.querySelector('video')).toBeNull();
});

test('nothing plays on desktop, with reduced motion, or with data saver on', () => {
  hover = true;
  const desk = renderAll();
  wait(1000);
  expect(document.querySelector('video')).toBeNull();
  desk.unmount();
  hover = false;
  reduced = true;
  const calm = renderAll();
  wait(1000);
  expect(document.querySelector('video')).toBeNull();
  calm.unmount();
  reduced = false;
  Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
  renderAll();
  wait(1000);
  expect(document.querySelector('video')).toBeNull();
});

test('a centre clip stops when the window loses focus', () => {
  renderAll();
  wait(500);
  expect(tile('Pilotwings')).toHaveClass('is-playing');
  act(() => { window.dispatchEvent(new Event('blur')); });
  expect(tile('Pilotwings')).not.toHaveClass('is-playing');
  expect(document.querySelector('video')).toBeNull();
});

test('the first tap primes one shared video, which then plays unmuted and moves between tiles', () => {
  render(<SoundProvider>{games.map((g) => <GameTile key={g.slug} game={g} publisherName="Nintendo" />)}</SoundProvider>);
  act(() => { fireEvent.touchStart(window); });
  const primed = play.mock.contexts[0] as HTMLVideoElement;
  expect(primed).toBeInstanceOf(HTMLVideoElement);
  expect(primed.muted).toBe(false);
  wait(500);
  const v = tile('Pilotwings').querySelector('video') as HTMLVideoElement;
  expect(v).toBe(primed);
  expect(v.muted).toBe(false);

  // Scroll to the next tile: the same element moves there with a new source.
  centres = { 'F-Zero': -200, Pilotwings: 150, ActRaiser: 420 };
  scroll();
  wait(500);
  expect(tile('ActRaiser').querySelector('video')).toBe(primed);
  expect(primed).toHaveAttribute('src', '/snes/video/actraiser.mp4');
});

test('an unmuted play the browser refuses retries muted', async () => {
  play.mockImplementation(function (this: HTMLVideoElement) {
    return this.muted ? Promise.resolve() : Promise.reject(new Error('NotAllowedError'));
  });
  render(<SoundProvider>{games.map((g) => <GameTile key={g.slug} game={g} publisherName="Nintendo" />)}</SoundProvider>);
  act(() => { fireEvent.pointerDown(document.body); });
  wait(500);
  const v = tile('Pilotwings').querySelector('video') as HTMLVideoElement;
  await act(async () => { await Promise.resolve(); });
  expect(v.muted).toBe(true);
});
