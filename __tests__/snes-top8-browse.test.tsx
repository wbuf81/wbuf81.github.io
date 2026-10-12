import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import Top8 from '@/app/snes/components/Top8';
import { resetTop8Memory } from '@/app/snes/top8/store';
import type { Top8Game } from '@/lib/snes/top8';

jest.mock('next/navigation', () => ({ usePathname: () => '/videogames/snes-history/top-8' }));

const g = (slug: string, title: string, extra: Partial<Top8Game> = {}): Top8Game => ({
  slug, title, year: '1993', genres: ['Platform'], series: null, similar: [], score: 7, ...extra,
});
// In release order, as the real index is.
const GAMES: Top8Game[] = [
  g('super-mario-world', 'Super Mario World', { year: '1991', score: 9 }),
  g('final-fight', 'Final Fight', { year: '1991', genres: ["Hack and slash/Beat 'em up"], score: 6 }),
  g('zelda', 'The Legend of Zelda: A Link to the Past', { year: '1992', genres: ['Adventure'], score: 9.5 }),
  g('street-fighter-ii', 'Street Fighter II', { year: '1992', genres: ['Fighting'], score: 8.5 }),
  g('a', 'Alpha Quest'), g('b', 'Bravo Racer', { genres: ['Racing'] }), g('c', 'Charlie Golf', { genres: ['Sport'] }),
  g('d', 'Delta Force', { genres: ['Shooter'] }), g('e', 'Echo Island'), g('f', 'Foxtrot Run'), g('h', 'Hotel Hopper'),
  g('super-metroid', 'Super Metroid', { year: '1994', score: null }),
  g('chrono-trigger', 'Chrono Trigger', { year: '1995', genres: ['Role-playing (RPG)'], score: 9.6 }),
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
const years = () => within(browse()).getByRole('group', { name: 'Year' });
const genres = () => within(browse()).getByRole('group', { name: 'Genre' });
const tile = (title: string) => tiles().find((t) => t.querySelector('.s-t8-tt')!.textContent === title)!;
const slot = (n: number) => screen.getByRole('button', { name: new RegExp(`^Slot ${n}:`) });
const search = () => screen.getByRole('combobox', { name: /Add a game/ });
const stored = () => JSON.parse(localStorage.getItem('snes-top8') || 'null');

describe('controls', () => {
  it('starts on All, Top rated, showing every game with the count and lazy 96x67 thumbs', async () => {
    await mount();
    expect(within(browse()).getByText(`Showing ${GAMES.length} of ${GAMES.length}`)).toBeInTheDocument();
    expect(within(years()).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    const img = tile('Chrono Trigger').querySelector('img')!;
    expect(img).toHaveAttribute('src', '/snes/thumb/chrono-trigger.jpg');
    expect(img).toHaveAttribute('width', '96');
    expect(img).toHaveAttribute('height', '67');
    expect(img).toHaveAttribute('loading', 'lazy');
    // Top rated: score desc, then title; unscored last.
    expect(tileNames().slice(0, 4)).toEqual(['Chrono Trigger', 'The Legend of Zelda: A Link to the Past', 'Super Mario World', 'Street Fighter II']);
    expect(tileNames().at(-1)).toBe('Super Metroid');
  });

  it('filters by year tab', async () => {
    await mount();
    fireEvent.click(within(years()).getByRole('button', { name: "'92" }));
    expect(within(years()).getByRole('button', { name: "'92" })).toHaveAttribute('aria-pressed', 'true');
    expect(tileNames().sort()).toEqual(['Street Fighter II', 'The Legend of Zelda: A Link to the Past']);
    expect(within(browse()).getByText(`Showing 2 of ${GAMES.length}`)).toBeInTheDocument();
  });

  it('filters by genre family, combined with the year', async () => {
    await mount();
    fireEvent.click(within(genres()).getByRole('button', { name: 'Sports/Racing' }));
    expect(tileNames().sort()).toEqual(['Bravo Racer', 'Charlie Golf']);
    fireEvent.click(within(genres()).getByRole('button', { name: 'RPG/Adventure' }));
    expect(tileNames().sort()).toEqual(['Chrono Trigger', 'The Legend of Zelda: A Link to the Past']);
    fireEvent.click(within(years()).getByRole('button', { name: "'95" }));
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
    expect(tileNames()).toEqual(GAMES.map((x) => x.title));
  });

  it('the search box also filters the grid, ignoring case and punctuation', async () => {
    await mount();
    fireEvent.change(search(), { target: { value: 'STREET-fighter' } });
    expect(tileNames()).toEqual(['Street Fighter II']);
    expect(within(browse()).getByText(`Showing 1 of ${GAMES.length}`)).toBeInTheDocument();
    fireEvent.change(search(), { target: { value: 'zzz' } });
    expect(tiles()).toHaveLength(0);
    expect(within(browse()).getByText('No games match.')).toBeInTheDocument();
    fireEvent.change(search(), { target: { value: '' } });
    expect(tiles()).toHaveLength(GAMES.length);
  });
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
    expect(within(browse()).getByText('Showing 150 of 150')).toBeInTheDocument();
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
