import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Scatter from '@/app/snes/components/views/Scatter';
import { SoundProvider } from '@/app/snes/components/sound';
import type { IndexGame } from '@/lib/snes/library';
import { gamePath } from '@/lib/snes/routes';

// A plain anchor stands in for next/link so a click's defaultPrevented shows whether the scatter blocked navigation.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>{children}</a>
  ),
}));

const g = (slug: string, releasedUS: string, over: Partial<IndexGame> = {}): IndexGame => ({
  slug, title: slug.toUpperCase(), search: slug, releasedUS, datePrecision: releasedUS.length === 10 ? 'day' : 'month', publisher: 'nintendo',
  developers: [], genres: [], players: null, chip: null, chipSlug: null, launchTitle: false, egmAvg: null, np10: null, aggregate: null, users: null,
  series: null, themes: [], perspectives: [], coop: false, versus: false,
  boxArt: `/snes/box/${slug}.jpg`, thumb: `/snes/thumb/${slug}.jpg`, video: null, ...over,
});
const GAMES = [
  g('smw', '1991-08-23', { title: 'Super Mario World', egmAvg: 9.5, genres: ['Platform'], video: '/snes/video/smw.mp4' }),
  g('sf2', '1992-07', { title: 'Street Fighter II', egmAvg: 9, genres: ['Fighting'] }),
  g('dud', '1993-06', { title: 'Dud', egmAvg: 4, genres: ['Sport'], video: '/snes/video/dud.mp4' }),
  g('mid', '1995-01', { title: 'Middling', egmAvg: 7, genres: ['Platform'] }),
];
const NAMES = { nintendo: 'Nintendo' };

let hover = false;
let play: jest.Mock;
let navigated: boolean[] = [];
const record = (e: Event) => {
  navigated.push(!e.defaultPrevented);
  e.preventDefault();
};
beforeEach(() => {
  hover = false;
  navigated = [];
  localStorage.clear();
  jest.useFakeTimers();
  window.matchMedia = ((q: string) => ({
    matches: q.includes('hover: hover') ? hover : q.includes('hover: none') ? !hover : false,
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

const view = () => render(<SoundProvider><Scatter games={GAMES} axis="egm" onAxis={jest.fn()} names={NAMES} /></SoundProvider>);
const dot = (title: string) => screen.getByRole('link', { name: new RegExp(`^${title},`) });
const card = () => document.querySelector('.s-card');
const tapOn = (el: Element) => act(() => {
  fireEvent.pointerDown(el);
  fireEvent.click(el, { detail: 1 });
});

test('the y axis spans the scores shown, so dots fill the chart', () => {
  view();
  // lowest score 4 → domain 3.5–10
  expect(dot('Super Mario World').style.bottom).toBe(`${((9.5 - 3.5) / 6.5) * 100}%`);
  expect(dot('Dud').style.bottom).toBe(`${(0.5 / 6.5) * 100}%`);
  expect(Array.from(document.querySelectorAll('.s-tick-y'), (t) => t.textContent)).toEqual(['4', '6', '8', '10']);
});

test('Hall of Fame and Bargain Bin bands count their games, and a band outside the domain is hidden', () => {
  view();
  expect(screen.getByText('Hall of Fame · 2')).toBeInTheDocument();
  expect(screen.getByText('Bargain Bin · 1')).toBeInTheDocument();
  render(<Scatter games={GAMES.filter((x) => x.slug !== 'dud')} axis="egm" onAxis={jest.fn()} />);
  expect(screen.getAllByText(/^Bargain Bin/)).toHaveLength(1);
});

test('dots take their genre family colour; the key spotlights a family and fades the rest', () => {
  view();
  expect(dot('Super Mario World')).toHaveClass('f-action');
  expect(dot('Street Fighter II')).toHaveClass('f-fighting');
  const action = screen.getByRole('button', { name: /Action\/Platform · 2/ });
  expect(screen.getByRole('button', { name: /Fighting · 1/ })).toBeInTheDocument();
  expect(action).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(action);
  expect(action).toHaveAttribute('aria-pressed', 'true');
  expect(dot('Street Fighter II')).toHaveClass('is-faded');
  expect(dot('Super Mario World')).not.toHaveClass('is-faded');
  expect(dot('Street Fighter II').querySelector('.s-dot-label')).toBeNull();
  fireEvent.click(action);
  expect(dot('Street Fighter II')).not.toHaveClass('is-faded');
});

test('the hidden table gains the genre family', () => {
  view();
  expect(screen.getByRole('columnheader', { name: 'Genre' })).toBeInTheDocument();
  expect(screen.getByRole('row', { name: /Street Fighter II 9 Fighting/ })).toBeInTheDocument();
});

test('hovering a dot on desktop shows its card after a moment, with the clip; leaving hides it', () => {
  hover = true;
  view();
  fireEvent.mouseEnter(dot('Super Mario World'));
  expect(card()).toBeNull();
  act(() => { jest.advanceTimersByTime(300); });
  expect(card()).toHaveTextContent('Super Mario World');
  expect(card()).toHaveTextContent('Nintendo');
  expect(card()).toHaveTextContent('EGM average 9.5');
  expect(card()!.querySelector('video')).toHaveAttribute('src', '/snes/video/smw.mp4');
  expect(play).toHaveBeenCalled();
  fireEvent.mouseLeave(dot('Super Mario World'));
  expect(card()).toBeNull();
});

test('a game without a clip shows box art only; a desktop click navigates', () => {
  hover = true;
  view();
  fireEvent.mouseEnter(dot('Street Fighter II'));
  act(() => { jest.advanceTimersByTime(300); });
  expect(card()!.querySelector('video')).toBeNull();
  expect(card()!.querySelector('img')).toHaveAttribute('src', '/snes/box/sf2.jpg');
  tapOn(dot('Street Fighter II'));
  expect(navigated).toEqual([true]);
});

test('keyboard focus shows the card at once, with the clip muted', () => {
  hover = true;
  view();
  act(() => { dot('Super Mario World').focus(); });
  expect(card()).toHaveTextContent('Super Mario World');
  expect((card()!.querySelector('video') as HTMLVideoElement).muted).toBe(true);
  act(() => { dot('Super Mario World').blur(); });
  expect(card()).toBeNull();
});

test('on a phone the first tap opens the card and plays; tapping again or the card navigates', () => {
  view();
  tapOn(dot('Dud'));
  expect(navigated).toEqual([false]);
  expect(card()).toHaveTextContent('Dud');
  expect(play.mock.contexts).toContain(card()!.querySelector('video'));
  tapOn(dot('Dud'));
  expect(navigated).toEqual([false, true]);
  tapOn(card()!);
  expect(navigated).toEqual([false, true, true]);
  expect(card()).toHaveAttribute('href', gamePath('dud'));
  expect(card()).toHaveAttribute('data-prefetch', 'false');
});

test('only one card at a time: another dot switches, tapping elsewhere closes', () => {
  view();
  tapOn(dot('Dud'));
  tapOn(dot('Street Fighter II'));
  expect(navigated).toEqual([false, false]);
  expect(document.querySelectorAll('.s-card')).toHaveLength(1);
  expect(card()).toHaveTextContent('Street Fighter II');
  act(() => { fireEvent.pointerDown(document.body); });
  expect(card()).toBeNull();
});

describe('the card ★', () => {
  const star = () => screen.getByRole('button', { name: /your Top 8$/ });
  test('a tapped card carries a ★ beside its link; tapping it adds the game and keeps the card open', () => {
    view();
    tapOn(dot('Dud'));
    expect(star().closest('a')).toBeNull();
    expect(star().closest('.s-card-w')).toContainElement(card() as HTMLElement);
    navigated = [];
    tapOn(star());
    expect(card()).toHaveTextContent('Dud');
    expect(screen.getByRole('button', { name: 'Remove Dud from your Top 8' })).toBeInTheDocument();
    expect(document.querySelector('.s-card-w a button')).toBeNull();
  });
  test('on desktop the pointer can move from the dot onto the hover card and its ★ without the card closing', () => {
    hover = true;
    view();
    fireEvent.mouseEnter(dot('Super Mario World'));
    act(() => { jest.advanceTimersByTime(300); });
    const wrap = document.querySelector('.s-card-w')!;
    fireEvent.mouseLeave(dot('Super Mario World'), { relatedTarget: wrap });
    expect(card()).toHaveTextContent('Super Mario World');
    fireEvent.click(star());
    expect(screen.getByRole('button', { name: 'Remove Super Mario World from your Top 8' })).toBeInTheDocument();
    fireEvent.mouseLeave(wrap, { relatedTarget: document.body });
    expect(card()).toBeNull();
  });
});
