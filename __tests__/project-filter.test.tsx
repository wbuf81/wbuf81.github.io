import { render, screen, fireEvent, act, within } from '@testing-library/react';
import ProjectFilter, { filterFromHash } from '@/app/components/home/ProjectFilter';
import { homeProjects, HIGHLIGHTS } from '@/lib/projects';

// Wes, 24 Nov 2026: "defaulting to all, but then the click tabs". The band filters one grid of every project.

const PROJECTS = homeProjects();
let scrollTo: jest.Mock;

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  scrollTo = jest.fn();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
});

const band = () => screen.getByRole('group', { name: 'Explore projects' });
const buttons = () => within(band()).getAllByRole('button');
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
  expect(band()).toHaveTextContent('Explore projects ▸');
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
  expect(c.querySelector('.pf-note .eyebrow')).toHaveTextContent('Autonomous AI agents');
  expect(note(c)).toMatch(/Each one named after a coworker.s pet/);
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

test('arrow keys, Home and End move between the buttons', () => {
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

describe('scrolling', () => {
  // Lay out the band's place and the list: the band sticks at 57px (the header's height), and is 44px tall.
  function layout(c: HTMLElement, spotTop: number, listTop: number) {
    const spot = c.querySelector<HTMLElement>('#projects')!;
    const list = c.querySelector<HTMLElement>('.pf-list')!;
    const b = c.querySelector<HTMLElement>('.pf-band')!;
    b.style.top = '57px';
    Object.defineProperty(b, 'offsetHeight', { configurable: true, value: 44 });
    spot.getBoundingClientRect = () => ({ top: spotTop } as DOMRect);
    list.getBoundingClientRect = () => ({ top: listTop } as DOMRect);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 3000 });
  }
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  test('with the band still in its own place, a press leaves the page where it is', () => {
    const c = show();
    layout(c, 400, 478);
    press('Work');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  test('with the band stuck, a press brings the start of the list up under it', () => {
    const c = show();
    layout(c, -2000, -1900);
    press('Work');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    // 3000 + (-1900) - 57 - 44 - 16
    expect(scrollTo).toHaveBeenCalledWith({ top: 983, behavior: 'smooth' });
  });

  test('under reduced motion the press jumps rather than glides', () => {
    const saved = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce') })) as unknown as typeof window.matchMedia;
    const c = show();
    layout(c, -2000, -1900);
    press('Gaming');
    expect(scrollTo).toHaveBeenCalledWith({ top: 983, behavior: 'auto' });
    window.matchMedia = saved;
  });

  test('a hash change to a category puts the band just under the header', () => {
    const c = show();
    layout(c, 900, 978);
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
