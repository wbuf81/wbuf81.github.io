import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import Top8, { moveSlot } from '@/app/snes/components/Top8';
import type { Top8Game } from '@/lib/snes/top8';
import * as render8 from '@/app/snes/top8/render';
import { resetTop8Memory } from '@/app/snes/top8/store';

jest.mock('next/navigation', () => ({ usePathname: () => '/videogames/snes-history/top-8' }));
// The real renderer, behind spies: tests can hold a theme's fonts back and see which theme each draw used.
jest.mock('@/app/snes/top8/render', () => {
  const actual = jest.requireActual('@/app/snes/top8/render');
  return { ...actual, drawTop8: jest.fn(actual.drawTop8), loadThemeFonts: jest.fn(actual.loadThemeFonts) };
});
const actualRender = jest.requireActual('@/app/snes/top8/render') as typeof render8;
const drawSpy = render8.drawTop8 as jest.MockedFunction<typeof render8.drawTop8>;
const fontsSpy = render8.loadThemeFonts as jest.MockedFunction<typeof render8.loadThemeFonts>;
const drawnThemes = () => drawSpy.mock.calls.map(([, theme]) => theme.id);

const g = (slug: string, title: string, extra: Partial<Top8Game> = {}): Top8Game => ({
  slug, title, year: '1993', released: '1993-06-01', genres: ['Platform'], series: null, similar: [], score: 7, ...extra,
});
const GAMES: Top8Game[] = [
  g('a', 'Alpha Quest', { similar: ['super-metroid', 'chrono-trigger'] }),
  g('b', 'Bravo Racer'), g('c', 'Charlie Golf'), g('d', 'Delta Force'),
  g('e', 'Echo Island'), g('f', 'Foxtrot Run'), g('h', 'Hotel Hopper'), g('i', 'India Jones'),
  g('super-metroid', 'Super Metroid', { year: '1994', score: 9.5 }),
  g('chrono-trigger', 'Chrono Trigger', { year: '1995', score: 9.6 }),
  g('the-legend-of-zelda-a-link-to-the-past', 'The Legend of Zelda: A Link to the Past', { year: '1992' }),
  g('super-mario-world', 'Super Mario World', { year: '1991' }),
  g('metroid-other', 'Metroidvania Tribute', { year: '1997', score: 5 }),
];
const FULL = 'a,b,c,d,e,f,h,i';

// A recording 2D context, so the preview draws without a real canvas.
const calls: { name: string; args: unknown[] }[] = [];
function recordingCtx() {
  const gradient = { addColorStop() {} };
  const own: Record<string, unknown> = {};
  return new Proxy(own, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      if (prop === 'measureText') return (s: string) => ({ width: s.length * 10 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'createPattern') return () => null;
      return (...args: unknown[]) => void calls.push({ name: prop, args });
    },
    set(t, prop: string, v) { t[prop] = v; return true; },
  });
}

// Lay the 8 slot wrappers out on a 4x2 grid so dnd-kit's keyboard coordinates have real rects to move between.
const realRect = HTMLElement.prototype.getBoundingClientRect;
function gridRects() {
  HTMLElement.prototype.getBoundingClientRect = function () {
    const i = this.getAttribute('data-t8-slot');
    if (i === null) return realRect.call(this);
    const n = Number(i), x = (n % 4) * 110, y = Math.floor(n / 4) * 110;
    return { x, y, left: x, top: y, width: 100, height: 100, right: x + 100, bottom: y + 100, toJSON() {} } as DOMRect;
  };
}

const realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;
const realClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const realShare = Object.getOwnPropertyDescriptor(navigator, 'share');

// jsdom never loads images; treat covers as already loaded unless a test swaps in its own Image.
Object.defineProperty(HTMLImageElement.prototype, 'complete', { get: () => true, configurable: true });
Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { get: () => 300, configurable: true });

beforeEach(() => {
  calls.length = 0;
  drawSpy.mockClear().mockImplementation(actualRender.drawTop8);
  fontsSpy.mockClear().mockImplementation(actualRender.loadThemeFonts);
  window.history.replaceState(null, '', '/videogames/snes-history/top-8');
  localStorage.clear();
  resetTop8Memory(); // the shared store keeps a module-level fallback; each test starts clean
  HTMLCanvasElement.prototype.getContext = jest.fn(() => recordingCtx()) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = jest.fn(function (cb: BlobCallback) { cb(new Blob(['png'], { type: 'image/png' })); });
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  HTMLElement.prototype.getBoundingClientRect = realRect;
  Object.assign(URL, { createObjectURL: realCreate, revokeObjectURL: realRevoke });
  for (const [k, d] of [['clipboard', realClipboard], ['share', realShare]] as const) {
    if (d) Object.defineProperty(navigator, k, d);
    else delete (navigator as unknown as Record<string, unknown>)[k];
  }
});

// Waits long enough for a font promise to settle and the animation frame it schedules to fire.
const frames = async () => { for (let k = 0; k < 2; k++) await act(async () => { await new Promise((r) => setTimeout(r, 30)); }); };

// Mount, then let the theme fonts settle inside act (they resolve a tick later).
async function mount() {
  const r = render(<Top8 games={GAMES} />);
  await act(async () => {});
  return r;
}

const slot = (n: number) => screen.getByRole('button', { name: new RegExp(`^Slot ${n}:`) });
const search = () => screen.getByRole('combobox', { name: /Add a game/ });
const requests = () => screen.getByRole('region', { name: /friend request/i });

it('adds a game through search with the keyboard', async () => {
  await mount();
  fireEvent.change(search(), { target: { value: 'metroid' } });
  const list = screen.getByRole('listbox');
  expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual([expect.stringContaining('Super Metroid'), expect.stringContaining('Metroidvania')]);
  fireEvent.keyDown(search(), { key: 'Enter' });
  expect(slot(1)).toHaveAccessibleName(/Super Metroid/);
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(screen.getByText('1 of 8')).toBeInTheDocument();
});

it('matches ignoring case and punctuation, moves with arrows, and closes on Esc and outside clicks', async () => {
  await mount();
  fireEvent.change(search(), { target: { value: 'ZELDA link' } });
  expect(screen.getByRole('option', { name: /A Link to the Past/ })).toBeInTheDocument();
  fireEvent.keyDown(search(), { key: 'Escape' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  fireEvent.change(search(), { target: { value: 'metroid' } });
  fireEvent.keyDown(search(), { key: 'ArrowDown' });
  expect(search()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  // The listbox stays in the DOM (hidden), so aria-controls always points at something.
  expect(document.getElementById(search().getAttribute('aria-controls')!)).toHaveAttribute('hidden');
});

it('removes a game', async () => {
  window.history.replaceState(null, '', '?g=super-metroid');
  await mount();
  expect(slot(1)).toHaveAccessibleName(/Super Metroid/);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Super Metroid' }));
  expect(slot(1)).toHaveAccessibleName(/empty/);
  expect(screen.getByText('0 of 8')).toBeInTheDocument();
});

it('Accept puts a request in the first empty slot', async () => {
  window.history.replaceState(null, '', '?g=a,_,b');
  await mount();
  expect(screen.getByText(/You have \d new friend requests?!/)).toBeInTheDocument();
  fireEvent.click(within(requests()).getByRole('button', { name: 'Accept Super Metroid' }));
  expect(slot(2)).toHaveAccessibleName(/Super Metroid/);
});

it('with all 8 full, Accept enters replace mode; a slot click replaces and Esc cancels', async () => {
  window.history.replaceState(null, '', `?g=${FULL}`);
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Accept Super Metroid' }));
  expect(screen.getByText('Tap a slot to put Super Metroid there. Esc to cancel.')).toBeInTheDocument();
  fireEvent.click(slot(3));
  expect(slot(3)).toHaveAccessibleName(/Super Metroid/);
  expect(screen.queryByText(/Tap a slot/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Accept Chrono Trigger' }));
  expect(screen.getByText(/Tap a slot to put Chrono Trigger there/)).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByText(/Tap a slot/)).not.toBeInTheDocument();
  fireEvent.click(slot(4));
  expect(slot(4)).toHaveAccessibleName(/Delta Force/);
});

it('replace mode works from the keyboard: Enter or Space on a slot replaces it', async () => {
  window.history.replaceState(null, '', `?g=${FULL}`);
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Accept Super Metroid' }));
  fireEvent.keyDown(slot(2), { key: 'Enter', code: 'Enter' });
  expect(slot(2)).toHaveAccessibleName(/Super Metroid/);
  fireEvent.click(screen.getByRole('button', { name: 'Accept Chrono Trigger' }));
  fireEvent.keyDown(slot(5), { key: ' ', code: 'Space' });
  expect(slot(5)).toHaveAccessibleName(/Chrono Trigger/);
  expect(screen.queryByText(/Tap a slot/)).not.toBeInTheDocument();
});

it('denying the game waiting in replace mode cancels replace mode', async () => {
  window.history.replaceState(null, '', `?g=${FULL}`);
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Accept Super Metroid' }));
  expect(screen.getByText(/Tap a slot to put Super Metroid there/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Deny Super Metroid' }));
  expect(screen.queryByText(/Tap a slot/)).not.toBeInTheDocument();
  fireEvent.click(slot(1));
  expect(slot(1)).toHaveAccessibleName(/Alpha Quest/);
});

it('Deny hides the game and remembers it', async () => {
  window.history.replaceState(null, '', '?g=a');
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Deny Super Metroid' }));
  expect(within(requests()).queryByText('Super Metroid')).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('snes-top8')!).denied).toEqual(['super-metroid']);
});

it('reorders with the keyboard through dnd-kit, announcing in plain English', async () => {
  gridRects();
  window.history.replaceState(null, '', '?g=super-metroid,b,c');
  await mount();
  const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  slot(1).focus();
  fireEvent.keyDown(slot(1), { code: 'Space', key: ' ' });
  await tick();
  expect(screen.getAllByText('Picked up Super Metroid, slot 1.').length).toBeGreaterThan(0);
  fireEvent.keyDown(document.activeElement!, { code: 'ArrowRight', key: 'ArrowRight' });
  await tick();
  fireEvent.keyDown(document.activeElement!, { code: 'ArrowRight', key: 'ArrowRight' });
  await tick();
  fireEvent.keyDown(document.activeElement!, { code: 'Space', key: ' ' });
  await tick();
  expect(slot(3)).toHaveAccessibleName(/Super Metroid/);
  expect(slot(1)).toHaveAccessibleName(/Bravo Racer/);
  expect(slot(2)).toHaveAccessibleName(/Charlie Golf/);
  expect(screen.getAllByText('Dropped Super Metroid in slot 3.').length).toBeGreaterThan(0);
  expect(window.location.search).toContain('g=b,c,super-metroid');
});

it('moveSlot shifts the others, empties included', async () => {
  expect(moveSlot(['a', 'b', null, 'c', null, null, null, null], 0, 3)).toEqual(['b', null, 'c', 'a', null, null, null, null]);
});

it('a ?g= link beats storage, and a plain visit leaves the stored list alone until an edit', async () => {
  localStorage.setItem('snes-top8', JSON.stringify({ slots: ['b', null, null, null, null, null, null, null], theme: 'glitter', name: 'Stored', denied: ['d'] }));
  window.history.replaceState(null, '', '?g=chrono-trigger&skin=crystal&n=Wes');
  await mount();
  expect(slot(1)).toHaveAccessibleName(/Chrono Trigger/);
  expect(screen.getByRole('button', { name: 'Crystal Menu' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText("Wes's Friend Space")).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('snes-top8')!)).toMatchObject({ slots: ['b', null, null, null, null, null, null, null], name: 'Stored' });
  fireEvent.click(screen.getByRole('button', { name: 'Remove Chrono Trigger' }));
  // The edit saves the list being edited, with the visitor's own denials carried over.
  expect(JSON.parse(localStorage.getItem('snes-top8')!)).toEqual({ slots: Array(8).fill(null), theme: 'crystal', name: 'Wes', denied: ['d'] });
});

it('edits keep other query params and the hash in the URL', async () => {
  window.history.replaceState(null, '', '/videogames/snes-history/top-8?utm_source=x#top');
  await mount();
  fireEvent.change(search(), { target: { value: 'chrono' } });
  fireEvent.keyDown(search(), { key: 'Enter' });
  expect(window.location.search).toBe('?g=chrono-trigger,_,_,_,_,_,_,_&skin=myspace&utm_source=x');
  expect(window.location.hash).toBe('#top');
});

it('restores from storage when there is no link, and only rewrites the URL after an edit', async () => {
  localStorage.setItem('snes-top8', JSON.stringify({ slots: ['b', null, null, null, null, null, null, null], theme: 'glitter', name: 'Stored', denied: [] }));
  await mount();
  expect(slot(1)).toHaveAccessibleName(/Bravo Racer/);
  expect(screen.getByRole('button', { name: 'Glitter' })).toHaveAttribute('aria-pressed', 'true');
  expect(window.location.search).toBe('');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Console' })); });
  expect(window.location.search).toBe('?g=b,_,_,_,_,_,_,_&skin=console&n=Stored');
});

it('still works when storage throws', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  await mount();
  fireEvent.change(search(), { target: { value: 'chrono' } });
  fireEvent.keyDown(search(), { key: 'Enter' });
  expect(slot(1)).toHaveAccessibleName(/Chrono Trigger/);
});

it('cleans the display name on every keystroke and titles the Friend Space', async () => {
  await mount();
  const name = screen.getByLabelText(/Display name/);
  fireEvent.change(name, { target: { value: 'W<e>s ' } });
  expect(screen.getByText("Wes's Friend Space")).toBeInTheDocument();
  expect(name).toHaveValue('W<e>s ');
});

it('Copy link falls back to a selected read-only field when the clipboard refuses', async () => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: jest.fn(() => Promise.reject(new Error('no'))) }, configurable: true });
  window.history.replaceState(null, '', '?g=a');
  await mount();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy link' })); });
  const field = screen.getByRole('textbox', { name: /Link to your Top 8/ });
  expect(field).toHaveAttribute('readonly');
  expect((field as HTMLInputElement).value).toMatch(/^http:\/\/localhost\/videogames\/snes-history\/top-8\?g=a,_/);
});

it('Copy link shows a toast when the clipboard works', async () => {
  const writeText = jest.fn(() => Promise.resolve());
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  await mount();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy link' })); });
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/videogames/snes-history/top-8?g='));
  expect(screen.getByText('Link copied').closest('[aria-live="polite"]')).toBeInTheDocument();
});

it('Save picture makes a PNG and clicks a download link', async () => {
  const createObjectURL = jest.fn(() => 'blob:top8');
  const revokeObjectURL = jest.fn();
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  let anchor: HTMLAnchorElement | null = null;
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { anchor = this; });
  await mount();
  jest.useFakeTimers();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save picture' })); });
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
  expect(anchor!.download).toBe('my-snes-top-8.png');
  expect(anchor!.href).toBe('blob:top8');
  act(() => { jest.advanceTimersByTime(1000); });
  expect(revokeObjectURL).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(4000); });
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:top8');
});

it('Save waits for the theme fonts before drawing and encoding', async () => {
  Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:x'), revokeObjectURL: jest.fn() });
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  let release!: () => void;
  fontsSpy.mockImplementation(() => new Promise<void>((r) => { release = r; }));
  await mount();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save picture' })); });
  expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
  expect(drawSpy).not.toHaveBeenCalled();
  await act(async () => { release(); });
  expect(drawnThemes()).toContain('myspace');
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
});

it('a theme switch draws nothing until that theme’s fonts load, and rapid switches end on the latest theme', async () => {
  window.history.replaceState(null, '', '?g=a');
  await mount();
  await frames();
  expect(drawnThemes()).toEqual(['myspace']);
  const pending: Record<string, () => void> = {};
  fontsSpy.mockImplementation((theme) => new Promise<void>((r) => { pending[theme.id] = r; }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Glitter' })); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Console' })); });
  await frames();
  expect(drawnThemes()).toEqual(['myspace']);
  await act(async () => { pending.glitter(); });
  await frames();
  expect(drawnThemes()).toEqual(['myspace']);
  await act(async () => { pending.console(); });
  await frames();
  expect(drawnThemes().slice(1)).toEqual(['console']);
});

it('hides Share without canShare and shows it where files can be shared', async () => {
  const { unmount } = await mount();
  expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  unmount();
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
  await mount();
  expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
});

describe('Share', () => {
  const sharing = (share: jest.Mock) => {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  };

  it('uses the PNG made after the last draw, calling navigator.share synchronously from the click', async () => {
    const share = jest.fn(() => Promise.resolve());
    sharing(share);
    window.history.replaceState(null, '', '?g=a');
    await mount();
    await frames();
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });
    const encoded = (HTMLCanvasElement.prototype.toBlob as jest.Mock).mock.calls.length;
    expect(encoded).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledTimes(1); // no await between the click and the call
    const arg = (share.mock.calls[0] as unknown as [ShareData])[0];
    expect(arg.files![0].name).toBe('my-snes-top-8.png');
    expect(arg.title).toBe('My SNES Top 8');
    expect(arg.url).toMatch(/\/videogames\/snes-history\/top-8\?g=a,_/);
    expect((HTMLCanvasElement.prototype.toBlob as jest.Mock).mock.calls.length).toBe(encoded);
  });

  it('drops the cached PNG on an edit, so an early Share encodes the new picture instead of the old one', async () => {
    const share = jest.fn(() => Promise.resolve());
    sharing(share);
    window.history.replaceState(null, '', '?g=a,b');
    await mount();
    await frames();
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });
    const toBlob = HTMLCanvasElement.prototype.toBlob as jest.Mock;
    const before = toBlob.mock.calls.length;
    expect(before).toBeGreaterThan(0); // a picture is ready
    fireEvent.click(screen.getAllByRole('button', { name: /^Remove / })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).not.toHaveBeenCalled(); // the stale file is not handed out synchronously
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(share).toHaveBeenCalledTimes(1);
    expect(toBlob.mock.calls.length).toBeGreaterThan(before); // it was encoded fresh
  });

  it('encodes on the spot when no PNG is ready yet, and toasts a real failure', async () => {
    const share = jest.fn(() => Promise.reject(Object.assign(new Error('nope'), { name: 'NotAllowedError' })));
    sharing(share);
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share' })); });
    expect(share).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Couldn’t open the share sheet — try Save instead')).toBeInTheDocument();
  });

  it('stays quiet when the visitor cancels the share sheet', async () => {
    const share = jest.fn(() => Promise.reject(Object.assign(new Error('cancel'), { name: 'AbortError' })));
    sharing(share);
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share' })); });
    expect(share).toHaveBeenCalled();
    expect(screen.queryByText(/share sheet/)).not.toBeInTheDocument();
  });
});

it('Start over asks first, then clears the list but keeps the theme', async () => {
  window.history.replaceState(null, '', '?g=a,b&skin=polygon');
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
  fireEvent.click(screen.getByRole('button', { name: 'Yes, start over' }));
  expect(screen.getByText('0 of 8')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Polygon Space' })).toHaveAttribute('aria-pressed', 'true');
});

it('draws the preview on the canvas', async () => {
  window.history.replaceState(null, '', '?g=a');
  await mount();
  await frames();
  expect(calls.some((c) => c.name === 'fillText')).toBe(true);
});

it('the page is noindex, titled, and renders the maker with the credit', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/app/videogames/snes-history/top-8/page');
  expect(mod.metadata.title).toBe('My SNES Top 8');
  expect(mod.metadata.robots).toEqual({ index: false, follow: false });
  render(<mod.default />);
  await act(async () => {});
  expect(screen.getByRole('heading', { level: 1, name: 'My SNES Top 8' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Super Nintendo in America/ })).toHaveAttribute('href', '/videogames/snes-history');
  expect(screen.getByText(/Data: IGDB/)).toBeInTheDocument();
});

describe('final fixes', () => {
  it('shows the deny hint only after something was denied, else a neutral message', async () => {
    window.history.replaceState(null, '', '?g=a');
    const { unmount } = render(<Top8 games={[g('a', 'Alpha Quest')]} />);
    await act(async () => {});
    expect(screen.queryByText('Deny fewer games and more will show up.')).not.toBeInTheDocument();
    expect(screen.getByText('No more suggestions right now.')).toBeInTheDocument();
    unmount();
    render(<Top8 games={[g('a', 'Alpha Quest'), g('b', 'Bravo Racer', { score: 9 })]} />);
    await act(async () => {});
    expect(screen.queryByText('No more suggestions right now.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deny Bravo Racer' }));
    expect(screen.getByText('Deny fewer games and more will show up.')).toBeInTheDocument();
  });

  it('an in-flight encode that resolves after an edit does not repopulate the share cache', async () => {
    const share = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const pending: BlobCallback[] = [];
    HTMLCanvasElement.prototype.toBlob = jest.fn(function (cb: BlobCallback) { pending.push(cb); });
    window.history.replaceState(null, '', '?g=a,b');
    await mount();
    await frames();
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });
    expect(pending.length).toBeGreaterThan(0); // an encode is in flight
    fireEvent.click(screen.getAllByRole('button', { name: /^Remove / })[0]); // edit: cache cleared
    await act(async () => { pending.forEach((cb) => cb(new Blob(['old'], { type: 'image/png' }))); });
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).not.toHaveBeenCalled(); // the stale file was not written back
  });

  it('Save waits (up to a cap) for slot covers that load late', async () => {
    const realImage = window.Image;
    const made: (EventTarget & { complete: boolean; naturalWidth: number; onload: (() => void) | null; onerror: (() => void) | null })[] = [];
    class LateImage extends EventTarget {
      complete = false; naturalWidth = 0; onload: (() => void) | null = null; onerror: (() => void) | null = null; src = '';
      constructor() { super(); made.push(this); }
    }
    (window as unknown as { Image: unknown }).Image = LateImage;
    try {
      Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:x'), revokeObjectURL: jest.fn() });
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      window.history.replaceState(null, '', '?g=a');
      await mount();
      await frames();
      const toBlob = HTMLCanvasElement.prototype.toBlob as jest.Mock;
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save picture' })); });
      expect(toBlob).not.toHaveBeenCalled(); // still waiting on the cover
      await act(async () => {
        made.forEach((i) => { i.complete = true; i.naturalWidth = 300; i.dispatchEvent(new Event('load')); });
      });
      expect(toBlob).toHaveBeenCalled();
    } finally {
      (window as unknown as { Image: unknown }).Image = realImage;
    }
  });

  it('Save gives up waiting on covers after about 3 seconds', async () => {
    const realImage = window.Image;
    class NeverImage extends EventTarget { complete = false; naturalWidth = 0; onload = null; onerror = null; src = ''; }
    (window as unknown as { Image: unknown }).Image = NeverImage;
    try {
      Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:x'), revokeObjectURL: jest.fn() });
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      window.history.replaceState(null, '', '?g=a');
      await mount();
      await frames();
      jest.useFakeTimers();
      const toBlob = HTMLCanvasElement.prototype.toBlob as jest.Mock;
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save picture' })); });
      expect(toBlob).not.toHaveBeenCalled();
      await act(async () => { jest.advanceTimersByTime(3100); });
      expect(toBlob).toHaveBeenCalled();
    } finally {
      (window as unknown as { Image: unknown }).Image = realImage;
    }
  });
});
