import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { IndexGame } from '@/lib/snes/library';
import Shelf from '@/app/snes/components/views/Shelf';
import Scatter from '@/app/snes/components/views/Scatter';
import { gamePath } from '@/lib/snes/routes';

const g = (slug: string, releasedUS: string, over: Partial<IndexGame> = {}): IndexGame => ({
  slug, title: slug.toUpperCase(), search: slug, releasedUS, datePrecision: releasedUS.length === 10 ? 'day' : 'month', publisher: 'nintendo',
  developers: [], genres: [], players: null, chip: null, chipSlug: null, launchTitle: false, egmAvg: null, np10: null, aggregate: null, users: null,
  series: null, themes: [], perspectives: [], coop: false, versus: false,
  boxArt: `/snes/box/${slug}.jpg`, thumb: `/snes/thumb/${slug}.jpg`, video: null, ...over,
});
const GAMES = [g('a', '1991-08-23'), g('b', '1991-08'), g('c', '1994-11'), g('d', '1995-02', { thumb: null, boxArt: null })];

describe('Shelf', () => {
  test('a shelf per year of spines, each a slice of its own cover, linking to the game', () => {
    const { container } = render(<Shelf games={GAMES} byYear />);
    expect(Array.from(container.querySelectorAll('.s-shelf-year'), (e) => e.id)).toEqual(['y-1991', 'y-1994', 'y-1995']);
    const spine = screen.getByRole('link', { name: /^A,/ });
    expect(spine).toHaveAttribute('href', gamePath('a'));
    expect(spine.getAttribute('style')).toContain('url(/snes/thumb/a.jpg)');
    expect(spine).toHaveTextContent('SUPER NINTENDO');
  });
  test('year headings are h2, so the page goes h1 then h2', () => {
    render(<Shelf games={GAMES} byYear />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['1991', '1994', '1995']);
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });
  test('sorted any other way it is one shelf with no year jumps', () => {
    const { container } = render(<Shelf games={GAMES} byYear={false} />);
    expect(container.querySelectorAll('.s-shelf-year')).toHaveLength(1);
    expect(container.querySelector('.s-shelf-year')!.id).toBe('');
  });
});

describe('Shelf ★', () => {
  beforeEach(() => localStorage.clear());
  test('each spine has a ★ beside its link (never inside), sharing a wrapper with it', () => {
    const { container } = render(<Shelf games={GAMES} byYear />);
    expect(container.querySelector('a button')).toBeNull();
    const star = screen.getByRole('button', { name: 'Add C to your Top 8' });
    const wrap = star.closest('.s-star-tile')!.parentElement!;
    expect(wrap).toHaveClass('s-spine-w');
    expect(wrap.querySelector('a.s-spine')).toHaveAttribute('href', gamePath('c'));
    expect(screen.getAllByRole('button', { name: /to your Top 8$/ })).toHaveLength(4);
  });
});

describe('Scatter', () => {
  const scored = [g('a', '1991-08-23', { egmAvg: 9.5 }), g('b', '1993-06', { egmAvg: 6 }), g('c', '1995-01', { np10: 8 })];
  test('a dot per game with the chosen score, the best labelled, and a table for screen readers', () => {
    render(<Scatter games={scored} axis="egm" onAxis={jest.fn()} />);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([gamePath('a'), gamePath('b')]);
    expect(screen.getByRole('table', { name: /EGM average/ })).toBeInTheDocument();
    expect(screen.getByText('A', { selector: '.s-dot-label' })).toBeInTheDocument();
  });
  test('switching the axis asks the library', () => {
    const onAxis = jest.fn();
    render(<Scatter games={scored} axis="egm" onAxis={onAxis} />);
    expect(within(screen.getByRole('group', { name: 'Score' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['EGM', 'Nintendo Power', 'Aggregate', 'Player score']);
    fireEvent.click(screen.getByRole('button', { name: 'Nintendo Power' }));
    expect(onAxis).toHaveBeenCalledWith('np');
    expect(screen.getByRole('button', { name: 'Aggregate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Player score' })).toBeDisabled();
  });
  test('Player score plots IGDB users on a 0-10 scale', () => {
    render(<Scatter games={[g('a', '1991-08-23', { users: 85 })]} axis="users" onAxis={jest.fn()} />);
    expect(screen.getByRole('table', { name: /Player score/ })).toBeInTheDocument();
    expect(screen.getByText('8.5')).toBeInTheDocument();
  });
  test('with no matches it says there is nothing to plot', () => {
    render(<Scatter games={[]} axis="egm" onAxis={jest.fn()} />);
    expect(screen.getByText('No games with EGM scores match those filters.')).toBeInTheDocument();
  });
  test('the empty state says "player scores" for the users axis', () => {
    render(<Scatter games={[]} axis="users" onAxis={jest.fn()} />);
    expect(screen.getByText('No games with player scores match those filters.')).toBeInTheDocument();
  });
});
