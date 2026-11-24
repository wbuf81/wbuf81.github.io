import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import ProjectTile from '@/app/components/home/ProjectTile';
import FeaturedBuild from '@/app/components/home/FeaturedBuild';
import Highlights from '@/app/components/home/Highlights';
import ThenNowStill from '@/app/components/home/ThenNowStill';
import TetrisPrint from '@/app/components/home/TetrisPrint';
import GitHubMap from '@/app/components/home/GitHubMap';
import { place, PERSONAL, TOOLS, AGENTS, GAMES, personal } from '@/lib/projects';
import type { Contributions } from '@/lib/githubContributions';

const data: Contributions = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/github-contributions.json'), 'utf8'));

beforeAll(() => {
  // jsdom draws nothing: a canvas context whose every method is a no-op.
  HTMLCanvasElement.prototype.getContext = jest.fn(
    () => new Proxy({}, { get: (t: Record<string, unknown>, k: string) => (k in t ? t[k] : jest.fn()) }),
  ) as never;
});

test('a personal tile shows its badge, the board it runs on and its GitHub link', () => {
  const p = place(PERSONAL.filter((x) => x.key === 'knobdeck'), 0)[0];
  render(<ProjectTile project={p} footer />);
  expect(screen.getByRole('heading', { name: 'Knobdeck' })).toBeInTheDocument();
  expect(screen.getByText('Open source')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Waveshare/ })).toHaveAttribute('href', 'https://www.waveshare.com/esp32-s3-knob-touch-lcd-1.8.htm');
  expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/wbuf81/esp32-knobdeck');
  expect(screen.getByRole('img', { name: 'Screenshot of Knobdeck' })).toHaveAttribute('src', '/projects/knobdeck.jpg');
});

test('a private tile has no GitHub link', () => {
  render(<ProjectTile project={place(TOOLS, 0)[0]} />);
  expect(screen.queryByRole('link', { name: /GitHub/ })).toBeNull();
  expect(screen.getByText('Private repo')).toBeInTheDocument();
});

test('the print is tilted and taped by its position', () => {
  const p = place(PERSONAL.slice(0, 2), 0);
  const { container } = render(
    <>
      <ProjectTile project={p[0]} />
      <ProjectTile project={p[1]} />
    </>,
  );
  const prints = container.querySelectorAll<HTMLElement>('.print');
  expect(prints[0].style.transform).toBe('rotate(-2.6deg)');
  expect(prints[0].querySelectorAll('.tape')).toHaveLength(1);
  expect(prints[1].querySelectorAll('.tape')).toHaveLength(2);
});

test('the featured build shows what it runs on and its chips', () => {
  render(<FeaturedBuild project={PERSONAL.find((p) => p.key === 'neo')!} />);
  expect(screen.getByText('Featured build')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Stream Deck Neo Takeover' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Elgato Stream Deck Neo/ })).toBeInTheDocument();
  expect(screen.getByText('Machine vitals')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View on GitHub →' })).toHaveAttribute('href', 'https://github.com/wbuf81/streamdeckneoclaude');
  expect(screen.getByRole('link', { name: 'View on GitHub →' })).toHaveAttribute('target', '_blank');
});

test('the highlights row: Photo Frame (latest), CON AIR, Tidemark', () => {
  const { container } = render(<Highlights />);
  expect(screen.getByRole('region', { name: 'Highlights' })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Photo Frame Dashboard', 'CON AIR', 'Tidemark']);
  expect(screen.getAllByText('Highlight')).toHaveLength(2);
  expect(screen.getAllByText('Latest')).toHaveLength(1);

  const cards = container.querySelectorAll('article.hl');
  expect(cards).toHaveLength(3);
  expect(cards[0]).toHaveClass('is-latest');
  expect(cards[1]).not.toHaveClass('is-latest');
  expect(cards[2]).not.toHaveClass('is-latest');
  // The label-maker strip is on the latest card's print only.
  expect(container.querySelectorAll('.label-tape')).toHaveLength(1);
  expect(cards[0].querySelector('.print .label-tape')?.textContent).toBe('New');
  // CON AIR's card shows its still picture, not the trailer.
  expect(container.querySelectorAll('video')).toHaveLength(0);
  expect(cards[1].querySelector('.print img')).not.toBeNull();

  // A build on this site opens in the same tab; a repo opens GitHub in a new one.
  const frame = screen.getByRole('link', { name: 'How I built it →' });
  expect(frame).toHaveAttribute('href', '/builds/photo-frame');
  expect(frame).not.toHaveAttribute('target');
  const game = screen.getByRole('link', { name: 'About the game →' });
  expect(game).toHaveAttribute('href', '/games/con-air');
  expect(game).not.toHaveAttribute('target');
  const github = screen.getByRole('link', { name: 'View on GitHub →' });
  expect(github).toHaveAttribute('href', expect.stringMatching(/^https:\/\/github\.com\//));
  expect(github).toHaveAttribute('target', '_blank');
  expect(cards[2].contains(github)).toBe(true);
  expect(screen.getByRole('link', { name: 'Open Photo Frame Dashboard' })).toHaveAttribute('href', '/builds/photo-frame');
});

test('a build on this site opens in the same tab, featured or as a tile', () => {
  const { unmount } = render(<ProjectTile project={place([personal('snes')], 0)[0]} footer />);
  const tile = screen.getByRole('link', { name: 'Explore it →' });
  expect(tile).toHaveAttribute('href', '/videogames/snes-history');
  expect(tile).not.toHaveAttribute('target');
  expect(screen.queryByRole('link', { name: /GitHub/ })).toBeNull();
  unmount();

  render(<FeaturedBuild project={personal('snes')} />);
  expect(screen.getByRole('heading', { level: 2, name: 'SNES History' })).toBeInTheDocument();
  expect(screen.getByText('Live on this site')).toBeInTheDocument();
  const explore = screen.getByRole('link', { name: 'Explore it →' });
  expect(explore).toHaveAttribute('href', '/videogames/snes-history');
  expect(explore).not.toHaveAttribute('target');
  expect(explore).not.toHaveAttribute('rel');
  const print = screen.getByRole('link', { name: 'Open SNES History' });
  expect(print).toHaveAttribute('href', '/videogames/snes-history');
  expect(print).not.toHaveAttribute('target');
  expect(screen.getByText('Time Machine')).toBeInTheDocument();
});

test('then, now and still, with the counts in words', () => {
  render(<ThenNowStill counts={{ work: 9, home: 9 }} />);
  expect(screen.getByText('Lockheed Martin')).toBeInTheDocument();
  expect(screen.getByText('Nine builds at work, nine at home')).toBeInTheDocument();
});

test('Tetris works without matchMedia (old browsers)', () => {
  const saved = window.matchMedia;
  // @ts-expect-error simulate a browser without it
  delete window.matchMedia;
  expect(() => render(<TetrisPrint />)).not.toThrow();
  window.matchMedia = saved;
});

test('Play turns into Stop, and the arrows and space only stop scrolling while playing', () => {
  render(<TetrisPrint />);
  const before = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
  act(() => {
    window.dispatchEvent(before);
  });
  expect(before.defaultPrevented).toBe(false);

  fireEvent.click(screen.getByRole('button', { name: /Play/ }));
  expect(screen.getByRole('button', { name: /Stop/ })).toBeInTheDocument();
  const during = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
  act(() => {
    window.dispatchEvent(during);
  });
  expect(during.defaultPrevented).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: /Stop/ }));
  const after = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
  act(() => {
    window.dispatchEvent(after);
  });
  expect(after.defaultPrevented).toBe(false);
});

test('the GitHub map draws one cell per day and keeps the note', () => {
  const { container } = render(<GitHubMap data={data} />);
  expect(container.querySelectorAll('.heat i[data-date]').length).toBe(data.levels.length);
  expect(container.querySelectorAll('.heat i.l4').length).toBe((data.levels.match(/4/g) || []).length);
  expect(screen.getByText('Most projects are in private repositories.')).toBeInTheDocument();
});

test('while playing, space is held on keyup too, so a focused Play/Stop button never toggles the game', () => {
  render(<TetrisPrint />);
  const idle = new KeyboardEvent('keyup', { key: ' ', cancelable: true });
  act(() => {
    window.dispatchEvent(idle);
  });
  expect(idle.defaultPrevented).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: /Play/ }));
  const during = new KeyboardEvent('keyup', { key: ' ', cancelable: true });
  act(() => {
    window.dispatchEvent(during);
  });
  expect(during.defaultPrevented).toBe(true);
});

test('a month that starts in the last week never spans past the grid', () => {
  // 4 Jan 2026 is a Sunday: four January weeks, then February starts the fifth and last column.
  const { container } = render(
    <GitHubMap data={{ user: 'x', from: '2026-01-04', to: '2026-02-01', levels: '0'.repeat(29) }} />,
  );
  const feb = Array.from(container.querySelectorAll<HTMLElement>('.heat-m span')).find((s) => s.textContent === 'Feb')!;
  expect(feb.style.gridColumn).toBe('5 / span 1');
});


test("the hero introduces Wes in his own words, right under his name", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HomePage = require('@/app/page').default;
  render(<HomePage />);
  const name = screen.getByRole('heading', { level: 1, name: 'Wesley Bard' });
  const intro = name.nextElementSibling as HTMLElement;
  expect(intro).toHaveTextContent(
    "Hey, I'm Wes. I work in compliance, and before that I spent 12 years as an engineer. These days I'm all in on building with AI agents, using loops and graphs to build AI tools and agents at scale. Here's some of what I've made at work, and what I'm tinkering with at home.",
  );
});

test('Work: one tiles grid of ten, newest first, no Domain intelligence group', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HomePage = require('@/app/page').default;
  const { container } = render(<HomePage />);
  const work = container.querySelector<HTMLElement>('#work')!;
  expect(work.querySelectorAll('.tiles')).toHaveLength(1);
  const names = [...work.querySelectorAll('.tiles article.tile h3')].map((h) => h.textContent);
  expect(names).toEqual(['WINNIE', 'LUCY', 'WBDB', 'BEASLEY', 'MAISIE', 'SNOOP', 'RHINO', 'PABSTY', 'OSCAR', 'SMORES']);
  expect([...work.querySelectorAll('.eyebrow')].map((e) => e.textContent)).toEqual(['Autonomous AI agents']);
});

test('Gaming: its own section after Work and before Mac apps, two groups', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HomePage = require('@/app/page').default;
  render(<HomePage />);
  const games = screen.getByRole('region', { name: 'Gaming' });
  expect(games).toHaveAttribute('id', 'games');
  expect(games).toHaveTextContent(
    'Private builds for friends, so there is nothing to download. Each one has a page on how it plays and how it was built.',
  );
  expect(document.querySelector('article.feat')).toBeNull();
  expect(within(games).getByRole('heading', { level: 2, name: 'Gaming' })).toBeInTheDocument();
  const groups = games.querySelectorAll<HTMLElement>('.grp');
  expect(groups).toHaveLength(2);
  expect(groups[0].querySelector('.eyebrow')).toHaveTextContent("Games I've made");
  expect(groups[1].querySelector('.eyebrow')).toHaveTextContent('Other game projects');
  expect(games.querySelectorAll('.eyebrow')).toHaveLength(2);
  const tiles = groups[0].querySelectorAll<HTMLElement>('article.tile');
  expect(tiles).toHaveLength(1);
  const others = [...groups[1].querySelectorAll<HTMLElement>('article.tile h3')].map((h) => h.textContent);
  expect(others).toEqual(['SNES History', 'GBForge Tetris']);
  const tile = tiles[0];
  expect(within(tile).getByRole('heading', { level: 3, name: 'CON AIR' })).toBeInTheDocument();
  expect(within(tile).getByText('Private build')).toBeInTheDocument();
  const about = within(tile).getByRole('link', { name: 'About the game →' });
  expect(about).toHaveAttribute('href', '/games/con-air');
  expect(about).not.toHaveAttribute('target');
  const video = tile.querySelector('.print video')!;
  expect(video).toBeTruthy();
  expect(video.closest('a')).toBeNull();

  const work = screen.getByRole('heading', { level: 2, name: 'Work' });
  const mac = screen.getByRole('heading', { level: 2, name: 'Mac apps' });
  expect(work.compareDocumentPosition(games) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(games.compareDocumentPosition(mac) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('a tile with a cta uses it for its page on this site; one without still says Explore it', () => {
  const base = place([personal('snes')], 0)[0];
  const { rerender } = render(<ProjectTile project={{ ...base, cta: 'Read more →' }} footer />);
  expect(screen.getByRole('link', { name: 'Read more →' })).toHaveAttribute('href', '/videogames/snes-history');
  rerender(<ProjectTile project={base} footer />);
  expect(screen.getByRole('link', { name: 'Explore it →' })).toHaveAttribute('href', '/videogames/snes-history');
});

test('the /videogames hub keeps its featured block as it was', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const VideoGamesPage = require('@/app/videogames/page').default;
  render(<VideoGamesPage />);
  const feat = screen.getByRole('article', { name: 'Featured build' });
  expect(within(feat).getByText('Featured build')).toBeInTheDocument();
  expect(within(feat).getByRole('link', { name: 'Explore it →' })).toHaveAttribute('href', '/videogames/snes-history');
});

test('the photo frame sits in Electronics and links to its write-up; the strip counts fifteen at home', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HomePage = require('@/app/page').default;
  render(<HomePage />);
  expect(screen.getByText('Ten builds at work, fifteen at home')).toBeInTheDocument();
  const group = screen.getByRole('region', { name: 'Electronics' });
  expect(group).toHaveAttribute('id', 'electronics');
  expect([...group.querySelectorAll('article.tile h3')].map((h) => h.textContent)).toEqual([
    'Photo Frame Dashboard', 'Knobdeck', 'Stream Deck Neo Takeover', 'Personal AAC Device', 'M5 Spotify Deck',
  ]);
  const tile = within(group).getByRole('heading', { level: 3, name: 'Photo Frame Dashboard' }).closest('article')!;
  expect(within(tile).getByText('Private repo')).toBeInTheDocument();
  const link = within(tile).getByRole('link', { name: 'How I built it →' });
  expect(link).toHaveAttribute('href', '/builds/photo-frame');
  expect(link).not.toHaveAttribute('target');
  expect(within(tile).queryByRole('link', { name: /GitHub/ })).toBeNull();
});

// Wes, 24 Nov 2026: Personal's groups became sections of their own, each newest first, under one band.
test('six build sections in order, inside #builds, every tile once, no Personal section', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HomePage = require('@/app/page').default;
  const { container } = render(<HomePage />);
  const builds = container.querySelector<HTMLElement>('#builds')!;
  expect(builds).not.toBeNull();
  const sections = [...builds.children].filter((e) => e.tagName === 'SECTION') as HTMLElement[];
  expect(sections.map((s) => [s.id, s.querySelector('h2')?.textContent])).toEqual([
    ['work', 'Work'], ['games', 'Gaming'], ['mac', 'Mac apps'], ['linux', 'Omarchy Linux'], ['electronics', 'Electronics'], ['more', 'Everything else'],
  ]);
  expect(builds.firstElementChild).toBe(sections[0]);
  for (const s of sections) expect(screen.getByRole('region', { name: s.querySelector('h2')!.textContent! })).toBe(s);
  expect(screen.queryByRole('heading', { name: 'Personal' })).toBeNull();
  expect(container.querySelector('#projects')).toBeNull();

  // A promoted group's name is its heading, shown once: no eyebrow repeating it.
  for (const id of ['mac', 'linux', 'electronics', 'more']) {
    const s = container.querySelector<HTMLElement>(`#${id}`)!;
    expect(s.querySelectorAll('.eyebrow')).toHaveLength(0);
  }

  const order = (id: string) => [...container.querySelectorAll<HTMLElement>(`#${id} article.tile h3`)].map((h) => h.textContent);
  expect(order('mac')).toEqual(['Tidemark', 'Mac Tesla Tracker', 'Daisy Status Bar']);
  expect(order('linux')).toEqual(['OmaFinance', 'Idle Screen Counter', 'Omarchy Workspace Labels']);
  expect(order('more')).toEqual(['My Office in 3D']);
  expect(order('games')).toEqual(['CON AIR', 'SNES History', 'GBForge Tetris']);

  // Every project is a tile exactly once among the sections; the highlights row repeats three of them above.
  const all = [...AGENTS, ...TOOLS, ...PERSONAL, ...GAMES].map((p) => p.name).sort();
  expect([...builds.querySelectorAll('article.tile h3')].map((h) => h.textContent).sort()).toEqual(all);
  for (const name of ['Photo Frame Dashboard', 'CON AIR', 'Tidemark']) {
    expect(within(builds).getAllByRole('heading', { level: 3, name })).toHaveLength(1);
  }
});

test('the band is the first thing in main, and the header has no menu of its own', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HomePage = require('@/app/page').default;
  const { container } = render(<HomePage />);
  const main = container.querySelector('main')!;
  expect(main.firstElementChild).toBe(screen.getByRole('navigation', { name: 'Builds on this page' }));
  const header = container.querySelector<HTMLElement>('header.wb-head')!;
  expect(within(header).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/']);
  expect(screen.getAllByRole('navigation').map((n) => n.getAttribute('aria-label'))).toEqual(['Builds on this page', 'Footer']);
});
