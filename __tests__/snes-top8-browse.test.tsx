import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import Top8 from '@/app/snes/components/Top8';
import { resetTop8Memory } from '@/app/snes/top8/store';
import type { Top8Game } from '@/lib/snes/top8';

jest.mock('next/navigation', () => ({ usePathname: () => '/videogames/snes-history/top-8' }));

const g = (slug: string, title: string, extra: Partial<Top8Game> = {}): Top8Game => ({
  slug, title, year: extra.released?.slice(0, 4) ?? '1993', released: '1993-06-01', genres: ['Platform'], series: null, similar: [], score: 7, ...extra,
});
// Deliberately not in release order: the Release date sort must sort, not trust the index order.
const GAMES: Top8Game[] = [
  g('super-mario-world', 'Super Mario World', { released: '1991-08-23', score: 9 }),
  g('final-fight', 'Final Fight', { released: '1991-11-10', genres: ["Hack and slash/Beat 'em up"], score: 6 }),
  g('zelda', 'The Legend of Zelda: A Link to the Past', { released: '1992-04-13', genres: ['Adventure'], score: 9.5 }),
  g('street-fighter-ii', 'Street Fighter II', { released: '1992-07-15', genres: ['Fighting'], score: 8.5 }),
  g('a', 'Alpha Quest'), g('b', 'Bravo Racer', { genres: ['Racing'] }), g('c', 'Charlie Golf', { genres: ['Sport'] }),
  g('d', 'Delta Force', { genres: ['Shooter'] }), g('e', 'Echo Island'), g('f', 'Foxtrot Run'), g('h', 'Hotel Hopper'),
  g('super-metroid', 'Super Metroid', { released: '1994-03-15', score: null }),
  g('chrono-trigger', 'Chrono Trigger', { released: '1995-08-22', genres: ['Role-playing (RPG)'], score: 9.6 }),
  g('soccer-kid', 'Soccer Kid', { released: '1994-03', genres: ['Sport'], score: null, noArt: true }),
];
const FULL = 'a,b,c,d,e,f,h,street-fighter-ii';

beforeEach(() => {
  window.history.replaceState(null, '', '/videogames/snes-history/top-8');
  localStorage.clear();
  resetTop8Memory();
  HTMLCanvasElement.prototype.getContext = jest.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
});
afterEach(() => {
  jest.restoreAllMocks();
  delete (window as unknown as Record<string, unknown>).IntersectionObserver;
});

async function mount(games = GAMES) {
  const r = render(<Top8 games={games} />);
  await act(async () => {});
  return r;
}

const browse = () => screen.getByRole('region', { name: 'Browse all games' });
const tiles = () => within(browse()).getAllByRole('button').filter((b) => b.classList.contains('s-t8-tile'));
const tileNames = () => tiles().map((t) => t.querySelector('.s-t8-tt')!.textContent);
const header = () => browse().querySelector<HTMLElement>('.s-t8-bh')!;
const years = () => within(browse()).getByRole('group', { name: 'Year' });
const genres = () => within(browse()).getByRole('group', { name: 'Genre' });
const tile = (title: string) => tiles().find((t) => t.querySelector('.s-t8-tt')!.textContent === title)!;
const slot = (n: number) => screen.getByRole('button', { name: new RegExp(`^Slot ${n}:`) });
const search = () => screen.getByRole('combobox', { name: /Add a game/ });
const stored = () => JSON.parse(localStorage.getItem('snes-top8') || 'null');

describe('controls', () => {
  it('starts on All, Top rated, showing every game with the count and lazy 96x67 thumbs', async () => {
    await mount();
    expect(within(header()).getByText(`Showing ${GAMES.length} of ${GAMES.length}`)).toBeInTheDocument();
    expect(within(years()).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    const img = tile('Chrono Trigger').querySelector('img')!;
    expect(img).toHaveAttribute('src', '/snes/thumb/chrono-trigger.jpg');
    expect(img).toHaveAttribute('width', '96');
    expect(img).toHaveAttribute('height', '67');
    expect(img).toHaveAttribute('loading', 'lazy');
    // Top rated: score desc, then title; unscored last.
    expect(tileNames().slice(0, 4)).toEqual(['Chrono Trigger', 'The Legend of Zelda: A Link to the Past', 'Super Mario World', 'Street Fighter II']);
    expect(tileNames().slice(-2)).toEqual(['Soccer Kid', 'Super Metroid']);
  });

  it('filters by year tab', async () => {
    await mount();
    fireEvent.click(within(years()).getByRole('button', { name: "1992" }));
    expect(within(years()).getByRole('button', { name: "1992" })).toHaveAttribute('aria-pressed', 'true');
    expect(tileNames().sort()).toEqual(['Street Fighter II', 'The Legend of Zelda: A Link to the Past']);
    expect(within(header()).getByText(`Showing 2 of ${GAMES.length}`)).toBeInTheDocument();
  });

  it('filters by genre family, combined with the year', async () => {
    await mount();
    fireEvent.click(within(genres()).getByRole('button', { name: 'Sports/Racing' }));
    expect(tileNames().sort()).toEqual(['Bravo Racer', 'Charlie Golf', 'Soccer Kid']);
    fireEvent.click(within(genres()).getByRole('button', { name: 'RPG/Adventure' }));
    expect(tileNames().sort()).toEqual(['Chrono Trigger', 'The Legend of Zelda: A Link to the Past']);
    fireEvent.click(within(years()).getByRole('button', { name: "1995" }));
    expect(tileNames()).toEqual(['Chrono Trigger']);
    fireEvent.click(within(genres()).getByRole('button', { name: 'All' }));
    fireEvent.click(within(years()).getByRole('button', { name: 'All' }));
    expect(tiles()).toHaveLength(GAMES.length);
  });

  it('sorts A–Z and by release date', async () => {
    await mount();
    const sort = within(browse()).getByRole('combobox', { name: 'Sort' });
    fireEvent.change(sort, { target: { value: 'az' } });
    expect(tileNames().slice(0, 3)).toEqual(['Alpha Quest', 'Bravo Racer', 'Charlie Golf']);
    fireEvent.change(sort, { target: { value: 'date' } });
    // By date; a month-only date after that month's dated games; ties keep index order.
    expect(tileNames()).toEqual([
      'Super Mario World', 'Final Fight', 'The Legend of Zelda: A Link to the Past', 'Street Fighter II',
      'Alpha Quest', 'Bravo Racer', 'Charlie Golf', 'Delta Force', 'Echo Island', 'Foxtrot Run', 'Hotel Hopper',
      'Super Metroid', 'Soccer Kid', 'Chrono Trigger',
    ]);
  });

  it('the search box also filters the grid, ignoring case and punctuation', async () => {
    await mount();
    fireEvent.change(search(), { target: { value: 'STREET-fighter' } });
    expect(tileNames()).toEqual(['Street Fighter II']);
    expect(within(header()).getByText(`Showing 1 of ${GAMES.length}`)).toBeInTheDocument();
    fireEvent.change(search(), { target: { value: 'zzz' } });
    expect(tiles()).toHaveLength(0);
    expect(within(browse()).getByText('No games match.')).toBeInTheDocument();
    fireEvent.change(search(), { target: { value: '' } });
    expect(tiles()).toHaveLength(GAMES.length);
  });
});

it('year tabs read the full year', async () => {
  await mount();
  expect(within(years()).getByRole('button', { name: '1991' })).toHaveTextContent("'91");
});

it('the visible count is instant; its polite announcement waits until typing stops for 600ms', async () => {
  await mount();
  jest.useFakeTimers();
  try {
    const live = browse().querySelector('[aria-live="polite"]')!;
    expect(live).toHaveClass('vh');
    expect(within(header()).getByText(`Showing ${GAMES.length} of ${GAMES.length}`)).not.toHaveAttribute('aria-live');
    fireEvent.change(search(), { target: { value: 'st' } });
    fireEvent.change(search(), { target: { value: 'street' } });
    expect(within(header()).getByText(`Showing 1 of ${GAMES.length}`)).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(500); });
    expect(live.textContent).not.toBe(`Showing 1 of ${GAMES.length}`);
    act(() => { jest.advanceTimersByTime(100); });
    expect(live.textContent).toBe(`Showing 1 of ${GAMES.length}`);
  } finally {
    jest.useRealTimers();
  }
});

it('a game with no box art shows a placeholder, never an image', async () => {
  await mount();
  const t = tile('Soccer Kid');
  expect(t.querySelector('img')).toBeNull();
  expect(t.querySelector('.s-cover-none')).toHaveTextContent('SK');
});

it('the Top 8 slot and the search result for a no-art game show the placeholder too', async () => {
  window.history.replaceState(null, '', '?g=soccer-kid');
  await mount();
  expect(slot(1).querySelector('img')).toBeNull();
  expect(slot(1).querySelector('.s-cover-none')).not.toBeNull();
  fireEvent.change(search(), { target: { value: 'soccer' } });
  const opt = screen.getByRole('option', { name: /Soccer Kid/ });
  expect(opt.querySelector('img')).toBeNull();
  expect(opt.querySelector('.s-cover-none')).not.toBeNull();
});

describe('toggling', () => {
  it('tapping a cover adds it, shows it picked, and tapping again removes it', async () => {
    await mount();
    fireEvent.click(tile('Chrono Trigger'));
    expect(slot(1)).toHaveAccessibleName(/Chrono Trigger/);
    expect(tile('Chrono Trigger')).toHaveAttribute('aria-pressed', 'true');
    expect(tile('Chrono Trigger')).toHaveClass('is-picked');
    expect(tile('Chrono Trigger').querySelector('.s-t8-badge')).not.toBeNull();
    expect(stored().slots[0]).toBe('chrono-trigger');
    fireEvent.click(tile('Chrono Trigger'));
    expect(slot(1)).toHaveAccessibleName(/empty/);
    expect(tile('Chrono Trigger')).toHaveAttribute('aria-pressed', 'false');
    expect(tile('Chrono Trigger').querySelector('.s-t8-badge')).toBeNull();
  });

  it('when full, tapping a new cover enters replace mode; a slot click puts it there', async () => {
    window.history.replaceState(null, '', `?g=${FULL}`);
    await mount();
    fireEvent.click(tile('Chrono Trigger'));
    expect(screen.getByText('Tap a slot to put Chrono Trigger there. Esc to cancel.')).toBeInTheDocument();
    fireEvent.click(slot(2));
    expect(slot(2)).toHaveAccessibleName(/Chrono Trigger/);
    expect(tile('Chrono Trigger')).toHaveAttribute('aria-pressed', 'true');
    expect(tile('Bravo Racer')).toHaveAttribute('aria-pressed', 'false');
  });

  it('when full, a browse tap scrolls to the slots, focuses the first, marks the tile pending; a second tap cancels', async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    window.history.replaceState(null, '', `?g=${FULL}`);
    await mount();
    fireEvent.click(tile('Chrono Trigger'));
    const slotsBox = screen.getByRole('region', { name: /Friend Space/ });
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(slotsBox);
    expect(scroll.mock.calls[0][0]).toMatchObject({ behavior: 'smooth' });
    expect(slot(1)).toHaveFocus();
    expect(tile('Chrono Trigger')).toHaveClass('is-pending');
    expect(screen.getByText(/Tap a slot to put Chrono Trigger there/)).toBeInTheDocument();
    fireEvent.click(tile('Chrono Trigger'));
    expect(tile('Chrono Trigger')).not.toHaveClass('is-pending');
    expect(screen.queryByText(/Tap a slot/)).not.toBeInTheDocument();
    expect(slot(1)).toHaveAccessibleName(/Alpha Quest/);
  });

  it('under reduced motion the scroll to the slots is instant', async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    window.matchMedia = jest.fn((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    window.history.replaceState(null, '', `?g=${FULL}`);
    await mount();
    fireEvent.click(tile('Chrono Trigger'));
    expect(scroll.mock.calls[0][0]).toMatchObject({ behavior: 'auto' });
    delete (window as unknown as Record<string, unknown>).matchMedia;
  });

  it('opened from a link, a browse tap counts as an edit and saves', async () => {
    localStorage.setItem('snes-top8', JSON.stringify({ slots: ['e', null, null, null, null, null, null, null], theme: 'glitter', name: '', denied: ['d'] }));
    window.history.replaceState(null, '', '?g=a');
    await mount();
    expect(stored().slots[0]).toBe('e');
    fireEvent.click(tile('Bravo Racer'));
    expect(stored()).toEqual({ slots: ['a', 'b', null, null, null, null, null, null], theme: 'myspace', name: '', denied: ['d'] });
    expect(window.location.search).toContain('g=a,b');
  });
});

describe('rendering in pages of 60', () => {
  const MANY = Array.from({ length: 150 }, (_, i) => g(`game-${i}`, `Game ${String(i).padStart(3, '0')}`, { score: 10 - i / 100 }));

  it('renders 60, then 60 more with Show more, until all are shown', async () => {
    await mount(MANY);
    expect(tiles()).toHaveLength(60);
    expect(within(header()).getByText('Showing 150 of 150')).toBeInTheDocument();
    fireEvent.click(within(browse()).getByRole('button', { name: 'Show more' }));
    expect(tiles()).toHaveLength(120);
    fireEvent.click(within(browse()).getByRole('button', { name: 'Show more' }));
    expect(tiles()).toHaveLength(150);
    expect(within(browse()).queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('loads more when the sentinel scrolls into view', async () => {
    let fire: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
    const observe = jest.fn();
    (window as unknown as Record<string, unknown>).IntersectionObserver = class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) { fire = cb; }
      observe = observe;
      disconnect() {}
      unobserve() {}
    };
    await mount(MANY);
    expect(observe).toHaveBeenCalled();
    expect(tiles()).toHaveLength(60);
    act(() => fire!([{ isIntersecting: true }]));
    expect(tiles()).toHaveLength(120);
  });

  it('a filter change starts again from the first 60', async () => {
    await mount(MANY);
    fireEvent.click(within(browse()).getByRole('button', { name: 'Show more' }));
    expect(tiles()).toHaveLength(120);
    fireEvent.change(within(browse()).getByRole('combobox', { name: 'Sort' }), { target: { value: 'az' } });
    expect(tiles()).toHaveLength(60);
  });
});

describe('cross-tab', () => {
  const otherTab = (slots: (string | null)[]) => {
    localStorage.setItem('snes-top8', JSON.stringify({ slots: [...slots, ...Array(8 - slots.length).fill(null)], theme: 'myspace', name: '', denied: [] }));
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'snes-top8' })); });
  };

  it('a ★ in another tab updates the slots and the grid live', async () => {
    await mount();
    otherTab(['super-metroid']);
    expect(slot(1)).toHaveAccessibleName(/Super Metroid/);
    expect(tile('Super Metroid')).toHaveAttribute('aria-pressed', 'true');
    expect(window.location.search).toBe('');
  });

  it('opened from a link and not edited, the link’s list stays on screen and storage is not overwritten', async () => {
    window.history.replaceState(null, '', '?g=a');
    await mount();
    otherTab(['super-metroid']);
    expect(slot(1)).toHaveAccessibleName(/Alpha Quest/);
    expect(stored().slots[0]).toBe('super-metroid');
  });

  it('after an edit on a link-opened page, another tab’s change shows here too', async () => {
    window.history.replaceState(null, '', '?g=a');
    await mount();
    fireEvent.click(tile('Bravo Racer'));
    otherTab(['chrono-trigger']);
    expect(slot(1)).toHaveAccessibleName(/Chrono Trigger/);
    expect(slot(2)).toHaveAccessibleName(/empty/);
  });
});
