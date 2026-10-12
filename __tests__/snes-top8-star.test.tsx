/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EMPTY_STATE } from '@/lib/snes/top8';
import { readTop8, resetTop8Memory, writeTop8 } from '../app/snes/top8/store';
import { Top8Star, Top8Titles } from '../app/snes/components/Top8Star';

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

it('has no popup hint while the list has room', () => {
  render(<Top8Star slug="x" title="X" variant="tile" />);
  expect(screen.getByRole('button')).not.toHaveAttribute('aria-haspopup');
});

it('keeps one live region on body, present before the first toast, and only its text changes', () => {
  render(<Top8Star slug="x" title="X" variant="tile" />);
  const regions = document.body.querySelectorAll('[role="status"]');
  expect(regions).toHaveLength(1);
  const region = regions[0];
  expect(region.parentElement).toBe(document.body);
  expect(region).toHaveAttribute('aria-live', 'polite');
  region.firstElementChild!.textContent = ''; // earlier tests' toasts are still on their timer
  expect(region.textContent).toBe('');
  fireEvent.click(screen.getByRole('button'));
  expect(document.body.querySelectorAll('[role="status"]')).toHaveLength(1);
  expect(document.body.querySelector('[role="status"]')).toBe(region);
  expect(region.textContent).toContain('X');
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

  it('portals the dialog to body and moves focus into it', () => {
    const { container } = render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add New Game to your Top 8' }));
    const dlg = screen.getByRole('dialog');
    expect(dlg.parentElement).toBe(document.body);
    expect(container.contains(dlg)).toBe(false);
    expect(dlg).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole('button', { name: 'Add New Game to your Top 8' })).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('closes on scroll and resize', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.scroll(window);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    fireEvent(window, new Event('resize'));
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

describe('popover containment', () => {
  beforeEach(() => writeTop8({ ...EMPTY_STATE, slots: full }));

  it('stays open when the list itself scrolls (short screens), still closing on a page scroll', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add New Game to your Top 8' }));
    const dlg = screen.getByRole('dialog');
    fireEvent.scroll(dlg);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.scroll(document);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it("stops clicks and keys at the popover, so a tile's own handlers never see them", () => {
    const onClick = jest.fn();
    const onKeyDown = jest.fn();
    render(
      <div onClick={onClick} onKeyDown={onKeyDown}>
        <Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add New Game to your Top 8' }));
    onClick.mockClear();
    const pick = screen.getByRole('button', { name: 'Replace Game B' });
    fireEvent.keyDown(pick, { key: 'ArrowRight' });
    expect(onKeyDown).not.toHaveBeenCalled();
    fireEvent.click(pick);
    expect(onClick).not.toHaveBeenCalled();
    expect(readTop8().slots[1]).toBe('new-game');
  });

  it('Esc from inside the popover still closes it and returns focus', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />);
    const star = screen.getByRole('button', { name: 'Add New Game to your Top 8' });
    fireEvent.click(star);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Replace Game A' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(star).toHaveFocus();
  });

  it('labels the covers from the shared titles context when no titles prop is passed', () => {
    render(<Top8Titles titles={titles}><Top8Star slug="new-game" title="New Game" variant="tile" /></Top8Titles>);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Replace Game H' })).toBeInTheDocument();
  });
});
