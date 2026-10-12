import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import TimeMachine from '@/app/snes/components/TimeMachine';
import type { Week } from '@/lib/snes/types';

const mk = (start: string, n: number): Week => ({
  start, song: { title: `Song ${n}`, by: `Artist ${n}`, article: null, art: null }, album: { title: `Album ${n}`, by: 'B', article: null, art: null },
  film: { title: `Film ${n}`, by: null, article: null, art: null, gross: '$1' }, news: n === 2 ? [] : [{ date: start, text: `Story ${n}` }], near: null,
});
const weeks = [mk('1991-08-23', 1), mk('1991-08-30', 2), mk('1991-09-06', 3)];
const games = [
  { slug: 'f-zero', title: 'F-Zero', releasedUS: '1991-08-23', datePrecision: 'day', boxArt: '/snes/box/f-zero.jpg' },
  { slug: 'sept', title: 'September Game', releasedUS: '1991-09', datePrecision: 'month', boxArt: null },
];
const LAUNCH = { item: 'Super NES Control Set', usd: 199.99, year: 1991, from: '1991-08', kind: 'launch' as const };
const CATALOG = { item: 'Super NES Control Set', usd: 99.99, year: 1993, from: '1993-10', kind: 'catalog' as const };
const props = { weeks, games, milestones: [{ slug: 'f-zero', text: 'F-Zero came out', date: '1991-08-23' }], prices: { consoles: [LAUNCH, CATALOG], games: {} } };

beforeEach(() => { window.history.replaceState(null, '', '/videogames/snes-history/time-machine'); localStorage.clear(); });

it('opens on launch week with the LED date, cards, paper and shelf', () => {
  render(<TimeMachine {...props} />);
  expect(screen.getByText('AUG·23·1991')).toBeInTheDocument();
  expect(screen.getByText('Song 1')).toBeInTheDocument();
  expect(screen.getByText('The Omaha World-Pixel')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /F-Zero/ })).toHaveAttribute('href', '/videogames/snes-history/f-zero');
});
it('steps, scrubs (without re-mounting the slider) and keys through weeks', () => {
  render(<TimeMachine {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  expect(screen.getByText('Song 2')).toBeInTheDocument();
  expect(screen.getByText('A quiet week in the news')).toBeInTheDocument();
  const slider = screen.getByRole('slider', { name: /Scrub/ });
  fireEvent.change(slider, { target: { value: '2' } });
  expect(screen.getByText('Song 3')).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /Scrub/ })).toBe(slider);
  expect(screen.getByText(/Also out in September/)).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'ArrowLeft' });
  expect(screen.getByText('Song 2')).toBeInTheDocument();
  expect(window.location.search).toBe('?w=1991-08-30');
});
it('opens the week from ?w= and falls back on nonsense', () => {
  window.history.replaceState(null, '', '/x?w=1991-09-08');
  const { unmount } = render(<TimeMachine {...props} />);
  expect(screen.getByText('Song 3')).toBeInTheDocument();
  unmount();
  window.history.replaceState(null, '', '/x?w=banana');
  render(<TimeMachine {...props} />);
  expect(screen.getByText('Song 1')).toBeInTheDocument();
});
it('tells Your SNES years, remembers the year, and survives blocked storage', () => {
  render(<TimeMachine {...props} />);
  expect(screen.getByText(/You were 10 when the Super Nintendo launched/)).toBeInTheDocument();
  expect(screen.getByText(/ShopKo in Omaha, Nebraska/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Born in/), { target: { value: '1985' } });
  expect(screen.getByText(/You were 6 when/)).toBeInTheDocument();
  expect(screen.queryByText(/ShopKo/)).toBeNull();
  expect(localStorage.getItem('snes-birth-year')).toBe('1985');
});
it('survives localStorage throwing', () => {
  const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<TimeMachine {...props} />);
  fireEvent.change(screen.getByLabelText(/Born in/), { target: { value: '1990' } });
  expect(screen.getByText(/You were 1 when/)).toBeInTheDocument();
  get.mockRestore(); set.mockRestore();
});
it('jumps to a milestone week', () => {
  render(<TimeMachine {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  fireEvent.click(screen.getByRole('button', { name: /F-Zero came out/ }));
  expect(screen.getByText('Song 1')).toBeInTheDocument();
});
it('prices the console and a researched game from this week in a catalog, never "then"', () => {
  render(<TimeMachine {...props} prices={{ consoles: [LAUNCH, CATALOG], games: { 'f-zero': { usd: 49.99, year: 1993 } } }} />);
  expect(screen.getByText(/A Super NES: \$199\.99 at launch in 1991 · about \$\d+ today/)).toBeInTheDocument();
  expect(screen.getByText(/F-Zero: \$49\.99 in a 1993 catalog · about \$\d+ today/)).toBeInTheDocument();
  expect(screen.queryByText(/then/)).toBeNull();
});
it('ignores arrow keys while typing in a field or with a modifier', () => {
  render(<TimeMachine {...props} />);
  fireEvent.keyDown(screen.getByLabelText(/Born in/), { key: 'ArrowRight' });
  fireEvent.keyDown(document, { key: 'ArrowRight', metaKey: true });
  expect(screen.getByText('Song 1')).toBeInTheDocument();
  expect(window.location.search).toBe('');
  fireEvent.keyDown(document, { key: 'ArrowRight' });
  expect(screen.getByText('Song 2')).toBeInTheDocument();
});
it('lets the year be typed digit by digit and tidies an invalid entry on blur', () => {
  render(<TimeMachine {...props} />);
  const input = screen.getByLabelText(/Born in/) as HTMLInputElement;
  fireEvent.change(input, { target: { value: '19' } });
  expect(input.value).toBe('19');
  expect(screen.getByText(/You were 10 when/)).toBeInTheDocument();
  fireEvent.change(input, { target: { value: '1987' } });
  expect(screen.getByText(/You were 4 when/)).toBeInTheDocument();
  fireEvent.change(input, { target: { value: '3000' } });
  fireEvent.blur(input);
  expect(input.value).toBe('1987');
});
it('the price card shows the console price always, and a same-year catalog price on weeks with no priced game', () => {
  const g2 = [...games, { slug: 'late', title: 'Late Game', releasedUS: '1991-12-01', datePrecision: 'day', boxArt: null }];
  render(<TimeMachine {...props} games={g2} prices={{ consoles: [LAUNCH, CATALOG], games: { late: { usd: 59.99, year: 1992 } } }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  expect(screen.getByText(/A Super NES: \$199\.99/)).toBeInTheDocument();
  expect(screen.getByText(/Also in 1991: Late Game: \$59\.99 in a 1992 catalog · about \$\d+ today/)).toBeInTheDocument();
  expect(screen.queryByText(/then/)).toBeNull();
});
it('with no priced game in the year, the price card explains where cart prices show up', () => {
  render(<TimeMachine {...props} />);
  expect(screen.getByText(/Cart prices from period catalogs appear on weeks with a priced game/)).toBeInTheDocument();
});
it('milestone chips use "about to start" in summer, like the story', () => {
  render(<TimeMachine {...props} />);
  expect(screen.getByRole('button', { name: /you were 10, about to start 5th grade/ })).toBeInTheDocument();
});
it('a 1995 week prices the console from the latest catalog before it, with its year, never "then"', () => {
  render(<TimeMachine {...props} weeks={[mk('1995-03-03', 1)]} />);
  expect(screen.getByText(/A Super NES Control Set: \$99\.99 in a 1993 catalog · about \$\d+ today/)).toBeInTheDocument();
  expect(screen.queryByText(/\$199\.99/)).toBeNull();
  expect(screen.queryByText(/then/)).toBeNull();
});
it('arrow keys still step after clicking a deck button', () => {
  render(<TimeMachine {...props} />);
  const next = screen.getByRole('button', { name: 'Next week' });
  fireEvent.click(next);
  expect(screen.getByText('Song 2')).toBeInTheDocument();
  fireEvent.keyDown(next, { key: 'ArrowRight' });
  expect(screen.getByText('Song 3')).toBeInTheDocument();
  fireEvent.keyDown(next, { key: 'ArrowLeft' });
  expect(screen.getByText('Song 2')).toBeInTheDocument();
});
it('milestone jumps scroll smoothly, or instantly with reduced motion', () => {
  const scroll = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = scroll;
  const mm = (reduce: boolean) => { window.matchMedia = ((q: string) => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as never; };
  mm(false);
  const { unmount } = render(<TimeMachine {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /F-Zero came out/ }));
  expect(scroll).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' });
  unmount();
  mm(true);
  render(<TimeMachine {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /F-Zero came out/ }));
  expect(scroll).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'start' });
  // @ts-expect-error tidy up jsdom globals
  delete window.matchMedia; delete window.HTMLElement.prototype.scrollIntoView;
});
it('links pop cards to Wikipedia with encoded titles', () => {
  const w = mk('1991-08-23', 1);
  w.song = { title: 'Have You Ever Really Loved a Woman?', by: 'Bryan Adams', article: 'Have You Ever Really Loved a Woman?', art: null };
  render(<TimeMachine {...props} weeks={[w]} />);
  expect(screen.getByRole('link', { name: /Have You Ever Really Loved a Woman\?/ })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Have_You_Ever_Really_Loved_a_Woman%3F');
});
