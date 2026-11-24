import { render, screen, fireEvent, act, within } from '@testing-library/react';
import ProjectTile from '@/app/components/home/ProjectTile';
import FeaturedBuild from '@/app/components/home/FeaturedBuild';
import { GAMES, personal, place } from '@/lib/projects';

// jsdom plays nothing: play() and pause() flip a fake `paused` and fire the events a browser would.
const paused = new WeakMap<HTMLMediaElement, boolean>();
let observer: { cb: IntersectionObserverCallback; el?: Element; disconnected: boolean } | undefined;
let reduce = false;

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

beforeEach(() => {
  observer = undefined;
  reduce = false;
  (HTMLMediaElement.prototype.play as jest.Mock).mockClear();
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      observer = { cb, disconnected: false };
    }
    observe(el: Element) {
      observer!.el = el;
    }
    disconnect() {
      observer!.disconnected = true;
    }
    unobserve() {}
    takeRecords() {
      return [];
    }
  };
  window.matchMedia = jest.fn((q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    onchange: null,
    dispatchEvent: jest.fn(),
  })) as never;
});

async function view(inView: boolean) {
  await act(async () => {
    observer!.cb([{ isIntersecting: inView, intersectionRatio: inView ? 1 : 0, target: observer!.el } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
}

function renderGame() {
  const { container } = render(<ProjectTile project={place(GAMES, 0)[0]} footer />);
  const feat = container.querySelector<HTMLElement>('article.tile')!;
  const video = feat.querySelector('video')!;
  return { feat, video };
}

test('a game tile plays its trailer in the print: muted, no autoplay, no controls, and the print is not a link', () => {
  const { feat, video } = renderGame();
  expect(video).toBeTruthy();
  expect(video).toHaveAttribute('src', '/games/con-air/trailer.mp4');
  expect(video).toHaveAttribute('poster', '/games/con-air/title.png');
  expect(video).toHaveAttribute('preload', 'none');
  expect(video).toHaveAttribute('aria-label', 'CON AIR trailer');
  expect(video).not.toHaveAttribute('autoplay');
  expect(video).not.toHaveAttribute('controls');
  expect(video.muted).toBe(true);
  expect(video.closest('a')).toBeNull();
  expect(within(feat).queryByRole('link', { name: /Open CON AIR/ })).toBeNull();
  expect(within(feat).getByRole('link', { name: 'About the game →' })).toHaveAttribute('href', '/games/con-air');
  expect(within(feat).getByRole('button', { name: 'Turn sound on' })).toBeInTheDocument();
  expect(within(feat).getByRole('button', { name: 'Play' })).toBeInTheDocument();
});

test('coming into view plays it muted; going out of view pauses and mutes it again', async () => {
  const { feat, video } = renderGame();
  await view(true);
  expect(video.paused).toBe(false);
  expect(video.muted).toBe(true);
  expect(within(feat).getByRole('button', { name: 'Pause' })).toBeInTheDocument();

  fireEvent.click(within(feat).getByRole('button', { name: 'Turn sound on' }));
  expect(video.muted).toBe(false);
  await view(false);
  expect(video.paused).toBe(true);
  expect(video.muted).toBe(true);
  expect(within(feat).getByRole('button', { name: 'Play' })).toBeInTheDocument();
  expect(within(feat).getByRole('button', { name: 'Turn sound on' })).toBeInTheDocument();
});

test('Turn sound on unmutes, and so does a click on the picture', async () => {
  const { feat, video } = renderGame();
  await view(true);
  fireEvent.click(within(feat).getByRole('button', { name: 'Turn sound on' }));
  expect(video.muted).toBe(false);
  fireEvent.click(within(feat).getByRole('button', { name: 'Turn sound off' }));
  expect(video.muted).toBe(true);

  fireEvent.click(video);
  expect(video.muted).toBe(false);
  expect(within(feat).getByRole('button', { name: 'Turn sound off' })).toBeInTheDocument();
});

test('a click on the paused picture plays it with sound', async () => {
  const { video } = renderGame();
  expect(video.paused).toBe(true);
  await act(async () => {
    fireEvent.click(video);
  });
  expect(video.paused).toBe(false);
  expect(video.muted).toBe(false);
});

test('Pause holds: coming back into view does not restart it', async () => {
  const { feat, video } = renderGame();
  await view(true);
  fireEvent.click(within(feat).getByRole('button', { name: 'Pause' }));
  expect(video.paused).toBe(true);
  await view(false);
  await view(true);
  expect(video.paused).toBe(true);

  await act(async () => {
    fireEvent.click(within(feat).getByRole('button', { name: 'Play' }));
  });
  expect(video.paused).toBe(false);
});

test('with reduced motion, coming into view leaves the poster', async () => {
  reduce = true;
  const { video } = renderGame();
  await view(true);
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  expect(video.paused).toBe(true);
});

test('the observer is disconnected on unmount', () => {
  const { unmount } = render(<ProjectTile project={place(GAMES, 0)[0]} footer />);
  unmount();
  expect(observer!.disconnected).toBe(true);
});

test('a featured build with no trailer keeps its linked print and picture', () => {
  render(<FeaturedBuild project={personal('snes')} />);
  const feat = screen.getByRole('article', { name: 'Featured build' });
  const print = within(feat).getByRole('link', { name: 'Open SNES History' });
  expect(print).toHaveAttribute('href', '/videogames/snes-history');
  expect(print.querySelector('img')).toBeTruthy();
  expect(feat.querySelector('video')).toBeNull();
});
