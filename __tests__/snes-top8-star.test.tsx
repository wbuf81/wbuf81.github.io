/** @jest-environment jsdom */
import { Profiler } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EMPTY_STATE } from '@/lib/snes/top8';
import { TOP8_EVENT, readTop8, resetTop8Memory, writeTop8 } from '../app/snes/top8/store';
import { Top8Scope } from '../app/snes/components/Top8Tray';
import { Top8Star, Top8Titles } from '../app/snes/components/Top8Star';

const full = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const titles = Object.fromEntries([...full, 'new-game'].map((s) => [s, `Game ${s.toUpperCase()}`]));

beforeEach(() => { localStorage.clear(); resetTop8Memory(); });

// Pretends the star now sits at (left, top) on screen, so a scroll or resize sees it move.
function moveTo(el: HTMLElement, left: number, top: number) {
  el.getBoundingClientRect = () => ({ x: left, y: top, left, top, width: 44, height: 44, right: left + 44, bottom: top + 44, toJSON() {} }) as DOMRect;
}

it('ignores stored slugs it has no title for: they count as empty, and an add fills their slot', () => {
  writeTop8({ ...EMPTY_STATE, slots: ['a', 'b', 'c', 'gone', 'e', 'f', 'g', 'h'] });
  const onToast = jest.fn();
  render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} onToast={onToast} />);
  const star = screen.getByRole('button', { name: 'Add New Game to your Top 8' });
  expect(star).not.toHaveAttribute('aria-haspopup');
  fireEvent.click(star);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(readTop8().slots).toEqual(['a', 'b', 'c', 'new-game', 'e', 'f', 'g', 'h']);
  expect(onToast).toHaveBeenLastCalledWith('Added to your Top 8 · 8/8');
});

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
  expect(screen.getByRole('button', { name: 'Add to your Top 8' })).toHaveTextContent('☆ Add to your Top 8');
  expect(screen.getByRole('button').querySelector('[aria-hidden="true"]')).toHaveTextContent('☆');
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button', { name: 'Remove from your Top 8' })).toHaveTextContent('★ Remove from your Top 8');
  expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
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
  expect(region.textContent).toBe('Added to your Top 8 · 1/8');
});

it('announces adds with the new count, and removals, in the exact words', () => {
  writeTop8({ ...EMPTY_STATE, slots: ['a', 'b', null, null, null, null, null, null] });
  const onToast = jest.fn();
  render(<Top8Star slug="x" title="X" variant="tile" onToast={onToast} />);
  fireEvent.click(screen.getByRole('button'));
  expect(onToast).toHaveBeenLastCalledWith('Added to your Top 8 · 3/8');
  fireEvent.click(screen.getByRole('button'));
  expect(onToast).toHaveBeenLastCalledWith('Removed from your Top 8');
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

  it('closes on scroll and resize only once the star has actually moved', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" />);
    const star = screen.getByRole('button');
    fireEvent.click(star);
    fireEvent.scroll(window);
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    moveTo(star, 3, 3); // a jiggle under 4px is not a move
    fireEvent.scroll(window);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    moveTo(star, 0, 40);
    fireEvent.scroll(window);
    expect(screen.queryByRole('dialog')).toBeNull();
    moveTo(star, 0, 0);
    fireEvent.click(star);
    moveTo(star, 30, 0);
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('focuses its first cover without scrolling, and is fixed from its first paint', () => {
    const focus = jest.spyOn(HTMLElement.prototype, 'focus');
    render(<Top8Star slug="new-game" title="New Game" variant="page" titles={titles} />);
    fireEvent.click(screen.getByRole('button'));
    const first = screen.getByRole('button', { name: 'Replace Game A' });
    expect(first).toHaveFocus();
    expect(focus.mock.contexts.indexOf(first)).toBeGreaterThanOrEqual(0);
    expect(focus.mock.calls[focus.mock.contexts.indexOf(first)][0]).toEqual({ preventScroll: true });
    expect(screen.getByRole('dialog').style.position).toBe('fixed');
    focus.mockRestore();
  });

  it('shows a placeholder, not a broken image, for a cover that fails to load', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />);
    fireEvent.click(screen.getByRole('button'));
    const pickC = screen.getByRole('button', { name: 'Replace Game C' });
    fireEvent.error(pickC.querySelector('img')!);
    expect(pickC.querySelector('img')).toBeNull();
    expect(pickC.querySelector('.s-cover-none')).toHaveTextContent('GC');
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
    moveTo(screen.getByRole('button', { name: 'Add New Game to your Top 8' }), 0, -200);
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

describe('one store subscription per page', () => {
  const slugs = Array.from({ length: 20 }, (_, i) => `game-${i}`);
  it('stars under a Top8Scope share one subscription, and a pick re-renders only the star that changed', () => {
    const add = jest.spyOn(window, 'addEventListener');
    const renders: Record<string, number> = {};
    const onRender = (id: string) => { renders[id] = (renders[id] ?? 0) + 1; };
    render(
      <Top8Scope titles={{}}>
        {slugs.map((s) => (
          <Profiler key={s} id={s} onRender={onRender}><Top8Star slug={s} title={s} variant="tile" /></Profiler>
        ))}
      </Top8Scope>,
    );
    expect(add.mock.calls.filter(([type]) => type === TOP8_EVENT)).toHaveLength(1);
    add.mockRestore();
    for (const k of Object.keys(renders)) delete renders[k];
    fireEvent.click(screen.getByRole('button', { name: 'Add game-3 to your Top 8' }));
    expect(Object.keys(renders)).toEqual(['game-3']);
  });
  it('filling the last slot re-renders every star (they all become "full")', () => {
    writeTop8({ ...EMPTY_STATE, slots: ['a', 'b', 'c', 'd', 'e', 'f', 'g', null] });
    const renders = new Set<string>();
    render(
      <Top8Scope titles={{}}>
        {slugs.slice(0, 3).map((s) => (
          <Profiler key={s} id={s} onRender={(id) => renders.add(id)}><Top8Star slug={s} title={s} variant="tile" /></Profiler>
        ))}
      </Top8Scope>,
    );
    renders.clear();
    fireEvent.click(screen.getByRole('button', { name: 'Add game-0 to your Top 8' }));
    expect([...renders].sort()).toEqual(['game-0', 'game-1', 'game-2']);
    expect(screen.getByRole('button', { name: 'Add game-1 to your Top 8' })).toHaveAttribute('aria-haspopup', 'dialog');
  });
});

describe('focus when the popover closes', () => {
  beforeEach(() => writeTop8({ ...EMPTY_STATE, slots: full }));
  const moveStar = (el: HTMLElement, top: number) => {
    el.getBoundingClientRect = () => ({ x: 0, y: top, left: 0, top, width: 44, height: 44, right: 44, bottom: top + 44, toJSON() {} }) as DOMRect;
  };

  it('a scroll that moves the star closes it and puts focus back on the star', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />);
    const star = screen.getByRole('button', { name: 'Add New Game to your Top 8' });
    fireEvent.click(star);
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    moveStar(star, 120);
    fireEvent.scroll(window);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(star).toHaveFocus();
  });

  it('an outside pointerdown on another control does not pull focus to the star', () => {
    render(<><button type="button">Other</button><Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} /></>);
    const star = screen.getByRole('button', { name: 'Add New Game to your Top 8' });
    fireEvent.click(star);
    const other = screen.getByRole('button', { name: 'Other' });
    const focus = jest.spyOn(star, 'focus');
    fireEvent.pointerDown(other);
    other.focus(); // what the browser does next
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(focus).not.toHaveBeenCalled();
    expect(other).toHaveFocus();
  });

  it('an outside pointerdown on plain page returns focus to the star', () => {
    render(<><p>outside</p><Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} /></>);
    const star = screen.getByRole('button', { name: 'Add New Game to your Top 8' });
    fireEvent.click(star);
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(star).toHaveFocus();
  });

  it('Tab past the last cover, or Shift+Tab before the first, closes it and refocuses the star', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />);
    const star = screen.getByRole('button', { name: 'Add New Game to your Top 8' });
    fireEvent.click(star);
    const last = screen.getByRole('button', { name: 'Replace Game H' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(star).toHaveFocus();
    fireEvent.click(star);
    const first = screen.getByRole('button', { name: 'Replace Game A' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(star).toHaveFocus();
  });

  it('Tab between covers inside the popover leaves it open', () => {
    render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add New Game to your Top 8' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Replace Game A' }), { key: 'Tab' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

it('decides "full" from the fresh state: a list filled elsewhere since render opens the popover, with no Added toast', () => {
  writeTop8({ ...EMPTY_STATE, slots: ['a', 'b', 'c', 'd', 'e', 'f', 'g', null] });
  const onToast = jest.fn();
  render(<Top8Star slug="new-game" title="New Game" variant="tile" titles={titles} onToast={onToast} />);
  // Another tab fills the last slot; this star hasn't heard yet (no event).
  localStorage.setItem('snes-top8', JSON.stringify({ ...EMPTY_STATE, slots: full }));
  fireEvent.click(screen.getByRole('button', { name: 'Add New Game to your Top 8' }));
  expect(onToast).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(readTop8().slots).toEqual(full);
});
