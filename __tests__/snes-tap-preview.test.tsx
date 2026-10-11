import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { GameTile } from '@/app/snes/components/GameTile';
import { SoundProvider } from '@/app/snes/components/sound';
import type { IndexGame } from '@/lib/snes/library';

// A plain anchor stands in for next/link so a click's defaultPrevented shows whether the tile blocked navigation.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>{children}</a>
  ),
}));

const base: IndexGame = {
  slug: 'f-zero', title: 'F-Zero', search: 'f zero', releasedUS: '1991-08-23', datePrecision: 'day', publisher: 'nintendo',
  developers: ['nintendo-ead'], genres: [], players: null, chip: null, chipSlug: null, launchTitle: true, egmAvg: null, np10: 7.6,
  aggregate: null, boxArt: '/snes/box/f-zero.jpg', thumb: '/snes/thumb/f-zero.jpg', video: '/snes/video/f-zero.mp4',
  series: null, themes: [], perspectives: [], coop: false, versus: false, users: null,
};
const other: IndexGame = { ...base, slug: 'pilotwings', title: 'Pilotwings', video: '/snes/video/pilotwings.mp4' };

let hover = false;
let reduced = false;
let play: jest.Mock;
let navigated: boolean[] = [];
// Records whether each click would have navigated, then cancels it so jsdom does not try to.
const record = (e: Event) => {
  navigated.push(!e.defaultPrevented);
  e.preventDefault();
};
beforeEach(() => {
  hover = false;
  reduced = false;
  navigated = [];
  localStorage.clear();
  jest.useFakeTimers();
  window.matchMedia = ((q: string) => ({
    matches: q.includes('hover: hover') ? hover && !(reduced && q.includes('reduced-motion')) : q.includes('hover: none') ? !hover : false,
    media: q, addEventListener() {}, removeEventListener() {},
  })) as never;
  play = jest.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.play = play;
  window.HTMLMediaElement.prototype.pause = jest.fn();
  document.addEventListener('click', record);
});
afterEach(() => {
  document.removeEventListener('click', record);
  jest.useRealTimers();
});

const tapOn = (el: Element) => act(() => {
  fireEvent.pointerDown(el);
  fireEvent.click(el, { detail: 1 });
});
const link = (name: string) => screen.getByRole('link', { name: new RegExp(`^${name},`) });

test('the first tap plays the clip in the tile instead of navigating; the second tap navigates', () => {
  render(<GameTile game={base} publisherName="Nintendo" />);
  const a = link('F-Zero');
  tapOn(a);
  expect(navigated).toEqual([false]);
  expect(a).toHaveClass('is-playing');
  const v = a.querySelector('video') as HTMLVideoElement;
  expect(v).toHaveAttribute('src', '/snes/video/f-zero.mp4');
  expect(play.mock.contexts).toContain(v);
  expect(a).toHaveTextContent('Tap again to open');
  tapOn(a);
  expect(navigated).toEqual([false, true]);
});

test('play() runs inside the tap, with sound once the tap has unlocked it', () => {
  render(<SoundProvider><GameTile game={base} publisherName="Nintendo" /></SoundProvider>);
  const a = link('F-Zero');
  let during = 0;
  // React handles clicks at its root, so a document listener runs just after the tile's handler, still in the tap.
  const seen = () => { during = play.mock.calls.length; };
  document.addEventListener('click', seen);
  tapOn(a);
  document.removeEventListener('click', seen);
  expect(during).toBeGreaterThan(0);
  expect((a.querySelector('video') as HTMLVideoElement).muted).toBe(false);
});

test('an unmuted play the browser refuses retries muted', async () => {
  play.mockImplementation(function (this: HTMLVideoElement) {
    return this.muted ? Promise.resolve() : Promise.reject(new Error('NotAllowedError'));
  });
  render(<SoundProvider><GameTile game={base} publisherName="Nintendo" /></SoundProvider>);
  const a = link('F-Zero');
  tapOn(a);
  await act(async () => { await Promise.resolve(); });
  expect((a.querySelector('video') as HTMLVideoElement).muted).toBe(true);
});

test('tapping another tile stops the first', () => {
  render(<><GameTile game={base} publisherName="Nintendo" /><GameTile game={other} publisherName="Nintendo" /></>);
  tapOn(link('F-Zero'));
  tapOn(link('Pilotwings'));
  expect(navigated).toEqual([false, false]);
  expect(link('F-Zero')).not.toHaveClass('is-playing');
  expect(link('F-Zero').querySelector('video')).toBeNull();
  expect(link('Pilotwings').querySelector('video')).not.toBeNull();
  expect(document.querySelectorAll('video')).toHaveLength(1);
});

test('a tile without a clip, and keyboard activation, navigate straight away', () => {
  render(<><GameTile game={{ ...base, video: null }} publisherName="Nintendo" /><GameTile game={other} publisherName="Nintendo" /></>);
  tapOn(link('F-Zero'));
  act(() => { fireEvent.click(link('Pilotwings'), { detail: 0 }); });
  expect(navigated).toEqual([true, true]);
  expect(document.querySelector('video')).toBeNull();
});

test('tap preview still works with reduced motion, and stops when the window loses focus', () => {
  reduced = true;
  render(<GameTile game={base} publisherName="Nintendo" />);
  const a = link('F-Zero');
  tapOn(a);
  expect(a.querySelector('video')).not.toBeNull();
  act(() => { window.dispatchEvent(new Event('blur')); });
  expect(a.querySelector('video')).toBeNull();
  expect(a).not.toHaveTextContent('Tap again to open');
});

test('on desktop a click always navigates and hover still previews, without the tap hint', () => {
  hover = true;
  render(<GameTile game={base} publisherName="Nintendo" />);
  const a = link('F-Zero');
  tapOn(a);
  expect(navigated).toEqual([true]);
  fireEvent.mouseEnter(a);
  act(() => { jest.advanceTimersByTime(300); });
  expect(a.querySelector('video')).not.toBeNull();
  expect(a).not.toHaveTextContent('Tap again to open');
});
