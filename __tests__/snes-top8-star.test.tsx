/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EMPTY_STATE } from '@/lib/snes/top8';
import { readTop8, resetTop8Memory, writeTop8 } from '../app/snes/top8/store';
import { Top8Star } from '../app/snes/components/Top8Star';

const full = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const titles = Object.fromEntries([...full, 'new-game'].map((s) => [s, `Game ${s.toUpperCase()}`]));

beforeEach(() => { localStorage.clear(); resetTop8Memory(); });

it('toggles with exact labels and aria-pressed', () => {
  render(<Top8Star slug="new-game" title="New Game" variant="tile" />);
  const add = screen.getByRole('button', { name: 'Add New Game to your Top 8' });
  expect(add).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(add);
  expect(readTop8().slots).toContain('new-game');
  const rm = screen.getByRole('button', { name: 'Remove New Game from your Top 8' });
  expect(rm).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(rm);
  expect(readTop8().slots).not.toContain('new-game');
});

it('page variant shows its text', () => {
  render(<Top8Star slug="x" title="X" variant="page" />);
  expect(screen.getByRole('button')).toHaveTextContent('☆ Add to my Top 8');
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toHaveTextContent('★ In your Top 8');
});

it('announces through a toast', () => {
  const onToast = jest.fn();
  render(<Top8Star slug="x" title="X" variant="tile" onToast={onToast} />);
  fireEvent.click(screen.getByRole('button'));
  expect(onToast).toHaveBeenCalledWith(expect.stringContaining('X'));
});

describe('when full', () => {
  beforeEach(() => writeTop8({ ...EMPTY_STATE, slots: full }));

  it('opens the popover and replaces the chosen pick', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add New Game to your Top 8' }));
    const dlg = screen.getByRole('dialog', { name: 'Your Top 8 is full. Replace which?' });
    expect(dlg.querySelectorAll('button')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Replace Game C' }));
    expect(readTop8().slots[2]).toBe('new-game');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Esc closes and returns focus to the star', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />);
    const star = screen.getByRole('button', { name: 'Add New Game to your Top 8' });
    fireEvent.click(star);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(star).toHaveFocus();
    expect(readTop8().slots).toEqual(full);
  });

  it('an outside click closes it', () => {
    render(<><p>outside</p><Top8Star slug="new-game" title="New Game" variant="tile" /></>);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('falls back to a title-cased slug without titles', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Replace A' })).toBeInTheDocument();
  });
});

it('puts no button inside a link when beside one in a tile wrapper', () => {
  const { container } = render(<div style={{ position: 'relative' }}><a href="/g">Game</a><Top8Star slug="x" title="X" variant="tile" /></div>);
  expect(container.querySelector('a button')).toBeNull();
  expect(container.querySelector('a')!.parentElement!.contains(screen.getByRole('button'))).toBe(true);
});

it('works with storage blocked', () => {
  const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<Top8Star slug="x" title="X" variant="tile" />);
  fireEvent.click(screen.getByRole('button', { name: 'Add X to your Top 8' }));
  expect(screen.getByRole('button', { name: 'Remove X from your Top 8' })).toBeInTheDocument();
  spy.mockRestore(); set.mockRestore();
});

it('renders nothing before mount (server)', () => {
  const { renderToString } = require('react-dom/server');
  expect(renderToString(<Top8Star slug="x" title="X" variant="tile" />)).toBe('');
});
