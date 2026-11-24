import { render, screen, fireEvent, act, within } from '@testing-library/react';
import ProjectFilter, { filterFromHash } from '@/app/components/home/ProjectFilter';
import { homeProjects, HIGHLIGHTS } from '@/lib/projects';

// Wes, 24 Nov 2026: "defaulting to all, but then the click tabs". The chips under "Explore projects" filter one grid
// of every project; once they have gone up under the header a slim bar carries a copy of them ("option 1").

const PROJECTS = homeProjects();
let scrollTo: jest.Mock;

let raf: typeof window.requestAnimationFrame;
beforeEach(() => {
  window.history.replaceState(null, '', '/');
  scrollTo = jest.fn();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  raf = window.requestAnimationFrame;
  // Run the throttled scroll handler at once.
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof window.requestAnimationFrame;
});
afterEach(() => {
  window.requestAnimationFrame = raf;
});

// The resting chips, under the heading (the slim bar's copy is `.pf-bar .pf-chips`).
const band = () => document.querySelector<HTMLElement>('.pf-rest .pf-chips')!;
const slim = () => document.querySelector<HTMLElement>('.pf-bar .pf-chips')!;
const bar = () => document.querySelector<HTMLElement>('.pf-bar')!;
const buttons = (row = band()) => within(row).getAllByRole('button');
const pressed = () => buttons().filter((b) => b.getAttribute('aria-pressed') === 'true');
const shown = (c: HTMLElement) =>
  [...c.querySelectorAll<HTMLElement>('article.tile')].filter((t) => !t.hidden).map((t) => t.querySelector('h3')!.textContent);
const note = (c: HTMLElement) => c.querySelector('.pf-note')?.textContent ?? null;
const press = (label: string) => fireEvent.click(buttons().find((b) => b.querySelector('.pf-l')!.textContent === label)!);

function show() {
  return render(<ProjectFilter projects={PROJECTS} highlights={HIGHLIGHTS} />).container;
}

test('a labelled group, not a nav: All and the six categories, each with its count from the data', () => {
  show();
  expect(screen.queryByRole('navigation')).toBeNull();
  expect(screen.getByRole('heading', { level: 2, name: 'Explore projects' }).nextElementSibling).toBe(band());
  // Only the resting copy is reachable while the slim bar isn't showing.
  expect(screen.getAllByRole('group', { name: 'Explore projects' })).toEqual([band()]);
  expect(band()).not.toHaveTextContent('▸');
  expect(buttons().map((b) => b.querySelector('.pf-l')!.textContent)).toEqual(['All', 'Work', 'Gaming', 'Mac apps', 'Linux', 'Electronics', 'Web']);
  expect(buttons().map((b) => b.querySelector('.pf-i')?.textContent ?? null)).toEqual([null, '🤖', '🎮', '💻', '🐧', '🔌', '🌐']);
  expect(buttons().map((b) => b.querySelector('.pf-n')!.textContent)).toEqual(['25', '10', '3', '3', '3', '5', '1']);
  expect(buttons().map((b) => b.getAttribute('aria-label'))).toEqual([
    'All, 25 projects', 'Work, 10 projects', 'Gaming, 3 projects', 'Mac apps, 3 projects', 'Omarchy Linux, 3 projects',
    'Electronics, 5 projects', 'Web, 1 project',
  ]);
  expect(pressed().map((b) => b.querySelector('.pf-l')!.textContent)).toEqual(['All']);
});

test('a press shows only that category, newest first, with its note; All leaves out the highlights again', () => {
  const c = show();
  expect(shown(c)).toHaveLength(22);

  press('Work');
  expect(shown(c)).toEqual(['WINNIE', 'LUCY', 'WBDB', 'BEASLEY', 'MAISIE', 'SNOOP', 'RHINO', 'PABSTY', 'OSCAR', 'SMORES']);
  expect(c.querySelector('.pf-note .eyebrow')).toHaveTextContent('The pals');
  expect(note(c)).toMatch(/Each one named after a coworker.s pet/);
  // The note links to the pals' write-up, in the same tab.
  const more = within(c.querySelector<HTMLElement>('.pf-note')!).getByRole('link', { name: 'How the pals work →' });
  expect(more).toHaveAttribute('href', '/work');
  expect(more).not.toHaveAttribute('target');
  // Every Work tile links to it too.
  for (const t of [...c.querySelectorAll<HTMLElement>('article.tile')].filter((t) => !t.hidden)) {
    const a = within(t).getByRole('link', { name: 'How they work →' });
    expect(a).toHaveAttribute('href', '/work');
    expect(a).not.toHaveAttribute('target');
  }
  expect(pressed()).toHaveLength(1);

  press('Gaming');
  expect(shown(c)).toEqual(['CON AIR', 'SNES History', 'GBForge Tetris']);
  expect(note(c)).toBe(
    'Private builds for friends, so there is nothing to download. Each one has a page on how it plays and how it was built.',
  );
  expect(c.querySelector('.pf-note .eyebrow')).toBeNull();

  press('Electronics');
  expect(shown(c)).toEqual(['Photo Frame Dashboard', 'Knobdeck', 'Stream Deck Neo Takeover', 'Personal AAC Device', 'M5 Spotify Deck']);
  expect(note(c)).toBeNull();

  press('Mac apps');
  expect(shown(c)).toEqual(['Tidemark', 'Mac Tesla Tracker', 'Daisy Status Bar']);
  press('Linux');
  expect(shown(c)).toEqual(['OmaFinance', 'Idle Screen Counter', 'Omarchy Workspace Labels']);
  press('Web');
  expect(shown(c)).toEqual(['My Office in 3D']);

  press('All');
  expect(shown(c)).toHaveLength(22);
  expect(shown(c)).not.toContain('Tidemark');
  expect(note(c)).toBeNull();
  expect(pressed().map((b) => b.querySelector('.pf-l')!.textContent)).toEqual(['All']);
});

test('a tile keeps its tilt and tape whatever is pressed', () => {
  const c = show();
  const look = () => Object.fromEntries([...c.querySelectorAll<HTMLElement>('article.tile')].map((t) => [t.querySelector('h3')!.textContent, t.querySelector<HTMLElement>('.print')!.style.transform]));
  const before = look();
  press('Linux');
  expect(look()).toEqual(before);
});

test('arrow keys, Home and End move between the chips', () => {
  show();
  const [all, work, , , , , more] = buttons();
  all.focus();
  fireEvent.keyDown(all, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(work);
  fireEvent.keyDown(work, { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(all);
  fireEvent.keyDown(all, { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(more);
  fireEvent.keyDown(more, { key: 'Home' });
  expect(document.activeElement).toBe(all);
  fireEvent.keyDown(all, { key: 'End' });
  expect(document.activeElement).toBe(more);
  // Moving is not pressing.
  expect(pressed().map((b) => b.querySelector('.pf-l')!.textContent)).toEqual(['All']);
});

test("a tile's category label presses its filter", () => {
  const c = show();
  const knobdeck = [...c.querySelectorAll<HTMLElement>('article.tile')].find((t) => t.querySelector('h3')!.textContent === 'Knobdeck')!;
  const label = within(knobdeck).getByRole('button', { name: 'Show only Electronics' });
  expect(label).toHaveTextContent('Electronics');
  fireEvent.click(label);
  expect(pressed().map((b) => b.querySelector('.pf-l')!.textContent)).toEqual(['Electronics']);
  expect(shown(c)).toHaveLength(5);
  expect(window.location.hash).toBe('#electronics');
});

test('the address: a press writes it in place, All clears it', () => {
  show();
  const length = window.history.length;
  press('Gaming');
  expect(window.location.hash).toBe('#games');
  press('Linux');
  expect(window.location.hash).toBe('#linux');
  expect(window.history.length).toBe(length);
  press('All');
  expect(window.location.hash).toBe('');
  expect(window.location.pathname).toBe('/');
});

test.each([
  ['#work', 'Work', 10],
  ['#games', 'Gaming', 3],
  ['#mac', 'Mac apps', 3],
  ['#linux', 'Linux', 3],
  ['#electronics', 'Electronics', 5],
  ['#web', 'Web', 1],
  ['#projects', 'All', 22],
  ['#connect', 'All', 22],
  ['', 'All', 22],
])('arriving at %s presses %s', (hash, label, count) => {
  window.history.replaceState(null, '', `/${hash}`);
  const c = show();
  expect(pressed().map((b) => b.querySelector('.pf-l')!.textContent)).toEqual([label]);
  expect(shown(c)).toHaveLength(count);
});

test('a hash change applies the filter again; another hash leaves it as it is', () => {
  const c = show();
  const go = (hash: string) =>
    act(() => {
      window.history.replaceState(null, '', `/${hash}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  go('#mac');
  expect(shown(c)).toEqual(['Tidemark', 'Mac Tesla Tracker', 'Daisy Status Bar']);
  go('#connect');
  expect(shown(c)).toEqual(['Tidemark', 'Mac Tesla Tracker', 'Daisy Status Bar']);
  go('#projects');
  expect(shown(c)).toHaveLength(22);
});

test('the filters read from the address', () => {
  expect(filterFromHash('#games')).toBe('games');
  expect(filterFromHash('projects')).toBe('all');
  expect(filterFromHash('#connect')).toBeNull();
  expect(filterFromHash('')).toBeNull();
});

// Lay the page out: the header (and so the bar's top) is 57px, the bar 48px tall. `restTop` is the heading's place,
// its chips 44px under it; the list runs from `startTop` for 3,000px. Then scroll, so the bar decides.
function layout(c: HTMLElement, restTop: number, startTop: number) {
  const rest = c.querySelector<HTMLElement>('#projects')!;
  const start = c.querySelector<HTMLElement>('.pf-items')!;
  bar().style.top = '57px';
  Object.defineProperty(bar(), 'offsetHeight', { configurable: true, value: 48 });
  rest.getBoundingClientRect = () => ({ top: restTop } as DOMRect);
  band().getBoundingClientRect = () => ({ top: restTop + 44 } as DOMRect);
  start.getBoundingClientRect = () => ({ top: startTop, bottom: startTop + 3000 } as DOMRect);
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 3000 });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('the slim bar', () => {
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  test('stays hidden while the chips are on screen, shows once they have gone up under the header, and goes past the list', () => {
    const c = show();
    expect(bar()).toHaveAttribute('hidden');
    layout(c, 300, 400);
    expect(bar()).toHaveAttribute('hidden');
    // The chips' top passes under the header (57px).
    layout(c, 0, 100);
    expect(bar()).not.toHaveAttribute('hidden');
    expect(slim()).toHaveClass('is-slim');
    // Past the end of the list: the GitHub map and the footer are on screen.
    layout(c, -4000, -3000);
    expect(bar()).toHaveAttribute('hidden');
    // Back up above the chips.
    layout(c, 300, 400);
    expect(bar()).toHaveAttribute('hidden');
  });

  test('only one copy of the chips is reachable at a time', () => {
    const c = show();
    // At rest: the bar is hidden (no box, out of the tab order and the accessibility tree), its copy inert too.
    expect(bar()).toHaveAttribute('hidden');
    expect(slim()).toHaveAttribute('inert');
    expect(band()).not.toHaveAttribute('inert');
    layout(c, 0, 100);
    // Stuck: the bar's copy is the one; the resting chips, up under the header, are inert.
    expect(slim()).not.toHaveAttribute('inert');
    expect(band()).toHaveAttribute('inert');
    expect(screen.getAllByRole('group', { name: 'Explore projects' }).filter((g) => !g.closest('[inert]'))).toEqual([slim()]);
    // Both copies say the same thing.
    press('Mac apps');
    for (const row of [band(), slim()]) {
      expect(buttons(row).filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.id)).toEqual(['mac']);
    }
  });

  test('a keyboard user in the copy that goes is moved to the same chip in the other', () => {
    const c = show();
    const work = buttons().find((b) => b.dataset.id === 'work')!;
    work.focus();
    layout(c, 0, 100);
    expect(document.activeElement).toBe(buttons(slim()).find((b) => b.dataset.id === 'work'));
    layout(c, 300, 400);
    expect(document.activeElement).toBe(work);
  });

  test('a press in the slim bar filters the grid and stays focused there', () => {
    const c = show();
    layout(c, 0, 100);
    const games = buttons(slim()).find((b) => b.dataset.id === 'games')!;
    games.focus();
    fireEvent.click(games);
    expect(shown(c)).toEqual(['CON AIR', 'SNES History', 'GBForge Tetris']);
    expect(document.activeElement).toBe(games);
    expect(window.location.hash).toBe('#games');
  });
});

describe('scrolling', () => {
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  test('with the chips still in their own place, a press leaves the page where it is', () => {
    const c = show();
    layout(c, 400, 478);
    press('Work');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  test('with the slim bar showing, a press brings the start of the list up under it', () => {
    const c = show();
    layout(c, -2000, -1900);
    press('Work');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    // 3000 + (-1900) - 57 - 48 - 16
    expect(scrollTo).toHaveBeenCalledWith({ top: 979, behavior: 'smooth' });
  });

  test('under reduced motion the press jumps rather than glides', () => {
    const saved = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce') })) as unknown as typeof window.matchMedia;
    const c = show();
    layout(c, -2000, -1900);
    press('Gaming');
    expect(scrollTo).toHaveBeenCalledWith({ top: 979, behavior: 'auto' });
    window.matchMedia = saved;
  });

  test('a hash change to a category puts the heading just under the header', () => {
    const c = show();
    layout(c, 900, 1000);
    act(() => {
      window.history.replaceState(null, '', '/#games');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    // 3000 + 900 - 57
    expect(scrollTo).toHaveBeenCalledWith({ top: 3843, behavior: 'auto' });
  });
});

describe('the trailer in the grid', () => {
  const paused = new WeakMap<HTMLMediaElement, boolean>();
  beforeAll(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get(this: HTMLMediaElement) {
        return paused.get(this) ?? true;
      },
    });
    HTMLMediaElement.prototype.play = jest.fn(function (this: HTMLMediaElement) {
      paused.set(this, false);
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    HTMLMediaElement.prototype.pause = jest.fn(function (this: HTMLMediaElement) {
      paused.set(this, true);
      this.dispatchEvent(new Event('pause'));
    });
  });

  test('stops, muted, when its tile is filtered out', () => {
    const c = show();
    const video = c.querySelector<HTMLVideoElement>('article.tile video')!;
    // Under All, CON AIR is in the highlights row above, so its tile is out of the grid.
    expect(video.closest('article')!.hidden).toBe(true);
    press('Gaming');
    expect(video.closest('article')!.hidden).toBe(false);
    act(() => {
      video.play();
    });
    expect(video.paused).toBe(false);
    press('Mac apps');
    expect(video.paused).toBe(true);
    expect(video.muted).toBe(true);
  });
});
