import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import Heatmap from '@/app/snes/components/views/Heatmap';
import CoverWall from '@/app/snes/components/views/CoverWall';
import type { IndexGame } from '@/lib/snes/library';

export const g = (slug: string, releasedUS: string, over: Partial<IndexGame> = {}): IndexGame => ({
  slug, title: slug.toUpperCase(), search: slug, releasedUS, datePrecision: releasedUS.length === 10 ? 'day' : 'month', publisher: 'nintendo',
  developers: [], genres: [], players: null, chip: null, chipSlug: null, launchTitle: false, egmAvg: null, np10: null, aggregate: null,
  boxArt: `/snes/box/${slug}.jpg`, thumb: `/snes/thumb/${slug}.jpg`, video: null,
  series: null, themes: [], perspectives: [], coop: false, versus: false, users: null, ...over,
});
const GAMES = [g('a', '1991-08-23'), g('b', '1991-08'), g('c', '1994-11'), g('d', '1995-02', { thumb: null, boxArt: null })];

describe('Heatmap', () => {
  test('a cell per month with its count; clicking a month picks it', () => {
    const onPick = jest.fn();
    render(<Heatmap games={GAMES} onPick={onPick} />);
    const aug = screen.getByRole('button', { name: 'August 1991: 2 games' });
    expect(aug).toHaveClass('l4');
    fireEvent.click(aug);
    expect(onPick).toHaveBeenCalledWith('1991-08');
    expect(screen.getByRole('button', { name: 'July 1991: before launch' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'March 1992: 0 games' })).toBeDisabled();
  });
  test('with no matches every month is zero and nothing is clickable', () => {
    render(<Heatmap games={[]} onPick={jest.fn()} />);
    expect(screen.getAllByRole('button').every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByText(/No games match/)).toBeInTheDocument();
  });
});

describe('CoverWall', () => {
  test('every cover in order, non-matches dimmed, year markers for jumping', () => {
    const { container } = render(<CoverWall games={GAMES} matched={new Set(['a', 'c'])} />);
    const items = screen.getAllByRole('link');
    expect(items.map((a) => a.getAttribute('href'))).toEqual([
      '/videogames/snes-history/a', '/videogames/snes-history/b', '/videogames/snes-history/c', '/videogames/snes-history/d',
    ]);
    expect(items[1]).toHaveClass('is-dim');
    expect(items[0]).not.toHaveClass('is-dim');
    expect(items[0].querySelector('img')).toHaveAttribute('src', '/snes/thumb/a.jpg');
    expect(items[3].querySelector('img')).toBeNull();
    expect(Array.from(container.querySelectorAll('.s-wall-year'), (e) => e.id)).toEqual(['y-1991', 'y-1994', 'y-1995']);
  });
});
