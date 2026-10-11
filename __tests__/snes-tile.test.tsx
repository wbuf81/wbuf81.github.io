import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { GameTile } from '@/app/snes/components/GameTile';
import { SoundButton, SoundProvider } from '@/app/snes/components/sound';
import type { IndexGame } from '@/lib/snes/library';

const base: IndexGame = {
  slug: 'f-zero', title: 'F-Zero', search: 'f zero', releasedUS: '1991-08-23', datePrecision: 'day', publisher: 'nintendo',
  developers: ['nintendo-ead'], genres: [], players: null, chip: null, chipSlug: null, launchTitle: true, egmAvg: null, np10: 7.6,
  aggregate: null, boxArt: '/snes/box/f-zero.jpg', thumb: '/snes/thumb/f-zero.jpg', video: '/snes/video/f-zero.mp4',
  series: null, themes: [], perspectives: [], coop: false, versus: false, users: null,
};
const other: IndexGame = { ...base, slug: 'pilotwings', title: 'Pilotwings', video: '/snes/video/pilotwings.mp4' };

let hover = true;
let reduced = false;
beforeEach(() => {
  hover = true;
  reduced = false;
  localStorage.clear();
  jest.useFakeTimers();
  window.matchMedia = ((q: string) => ({ matches: q.includes('hover') ? hover && !reduced : false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = jest.fn();
});
afterEach(() => jest.useRealTimers());

const enter = (el: Element) => {
  fireEvent.mouseEnter(el);
  act(() => { jest.advanceTimersByTime(300); });
};

test('shows the cover, title, publisher, chips and links to the game page', () => {
  render(<GameTile game={base} publisherName="Nintendo" genre="Racing" />);
  const link = screen.getByRole('link', { name: /F-Zero, August 23, 1991/ });
  expect(link).toHaveAttribute('href', '/snes/f-zero');
  expect(link.querySelector('img')).toHaveAttribute('src', '/snes/box/f-zero.jpg');
  expect(screen.getByText('Nintendo · Racing')).toBeInTheDocument();
  expect(screen.getByText('Day One')).toBeInTheDocument();
  expect(link).toHaveTextContent('NP 7.6');
});

test('a game with no box art shows its title in place of the cover', () => {
  render(<GameTile game={{ ...base, boxArt: null }} publisherName="Nintendo" />);
  expect(screen.getByRole('link').querySelector('img')).toBeNull();
  expect(screen.getAllByText('F-Zero')).toHaveLength(2);
});

test('hovering 300ms plays the clip; leaving stops it', () => {
  render(<GameTile game={base} publisherName="Nintendo" />);
  const link = screen.getByRole('link');
  fireEvent.mouseEnter(link);
  act(() => { jest.advanceTimersByTime(200); });
  expect(link.querySelector('video')).toBeNull();
  act(() => { jest.advanceTimersByTime(100); });
  expect(link.querySelector('video')).toHaveAttribute('src', '/snes/video/f-zero.mp4');
  expect(link).toHaveClass('is-playing');
  fireEvent.mouseLeave(link);
  expect(link.querySelector('video')).toBeNull();
});

test('only one clip plays at a time', () => {
  render(<><GameTile game={base} publisherName="Nintendo" /><GameTile game={other} publisherName="Nintendo" /></>);
  const [a, b] = screen.getAllByRole('link');
  enter(a);
  enter(b);
  expect(a.querySelector('video')).toBeNull();
  expect(b.querySelector('video')).not.toBeNull();
});

test('no hover playback on touch or reduced motion, or for a game without a clip', () => {
  hover = false;
  const { unmount } = render(<GameTile game={base} publisherName="Nintendo" />);
  enter(screen.getByRole('link'));
  expect(screen.getByRole('link').querySelector('video')).toBeNull();
  unmount();
  hover = true;
  reduced = true;
  const second = render(<GameTile game={base} publisherName="Nintendo" />);
  enter(screen.getByRole('link'));
  expect(screen.getByRole('link').querySelector('video')).toBeNull();
  second.unmount();
  reduced = false;
  render(<GameTile game={{ ...base, video: null }} publisherName="Nintendo" />);
  enter(screen.getByRole('link'));
  expect(screen.getByRole('link').querySelector('video')).toBeNull();
});

test('sound waits for the first interaction, then hover clips play unmuted', () => {
  render(<SoundProvider><SoundButton /><GameTile game={base} publisherName="Nintendo" /></SoundProvider>);
  expect(screen.getByRole('button', { name: /Click anywhere for sound/ })).toBeInTheDocument();
  const link = screen.getByRole('link');
  enter(link);
  expect((link.querySelector('video') as HTMLVideoElement).muted).toBe(true);
  fireEvent.mouseLeave(link);
  act(() => { fireEvent.pointerDown(document.body); });
  expect(screen.getByRole('button', { name: /Sound on/ })).toBeInTheDocument();
  enter(link);
  expect((link.querySelector('video') as HTMLVideoElement).muted).toBe(false);
});

test('the button mutes after sound is on, and a stored mute survives a reload', () => {
  const first = render(<SoundProvider><SoundButton /></SoundProvider>);
  act(() => { fireEvent.pointerDown(document.body); });
  fireEvent.click(screen.getByRole('button', { name: /Sound on/ }));
  expect(screen.getByRole('button', { name: /Muted/ })).toBeInTheDocument();
  expect(localStorage.getItem('snes-sound')).toBe('off');
  first.unmount();
  render(<SoundProvider><SoundButton /></SoundProvider>);
  expect(screen.getByRole('button', { name: /Muted/ })).toBeInTheDocument();
});
