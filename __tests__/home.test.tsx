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

const ORDER = [
  'Photo Frame Dashboard', 'CON AIR', 'My Office in 3D', 'WINNIE', 'Tidemark', 'Mac Tesla Tracker', 'SNES History',
  'LUCY', 'WBDB', 'OmaFinance', 'Idle Screen Counter', 'BEASLEY', 'Knobdeck', 'Stream Deck Neo Takeover',
  'Personal AAC Device', 'M5 Spotify Deck', 'Daisy Status Bar', 'GBForge Tetris', 'Omarchy Workspace Labels',
  'MAISIE', 'SNOOP', 'RHINO', 'PABSTY', 'OSCAR', 'SMORES',
];
const HIGHLIGHTED = ['Photo Frame Dashboard', 'CON AIR', 'Tidemark'];

function home() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HomePage = require('@/app/page').default;
  return render(<HomePage />);
}

// Wes, 24 Nov 2026: the highlights, then the band, then one grid of every project, then the GitHub map.
test('the homepage in order: highlights, the band, one grid, the GitHub map', () => {
  const { container } = home();
  const hls = screen.getByRole('region', { name: 'Highlights' });
  const band = screen.getByRole('group', { name: 'Explore projects' });
  const list = screen.getByRole('region', { name: 'Projects' });
  const map = container.querySelector('.heat')!.closest('section')!;
  const after = (x: Node, y: Node) => !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
  expect(after(hls, band)).toBe(true);
  expect(after(band, list)).toBe(true);
  expect(after(list, map)).toBe(true);
  // The band spans the page: it is not inside the page's column.
  expect(band.closest('.wrap')).toBeNull();
  expect(band.parentElement).toBe(container.querySelector('main'));
  // #projects is the band's own place, just before it.
  expect(container.querySelector('#projects')?.nextElementSibling).toBe(band);
  expect(list.querySelectorAll('.tiles')).toHaveLength(1);
});

test('the server renders All: 22 tiles showing, the three highlights left out, no note, newest first', () => {
  const { container } = home();
  const tiles = [...container.querySelectorAll<HTMLElement>('.pf-list article.tile')];
  expect(tiles.map((t) => t.querySelector('h3')!.textContent)).toEqual(ORDER);
  const shown = tiles.filter((t) => !t.hidden).map((t) => t.querySelector('h3')!.textContent);
  expect(shown).toHaveLength(22);
  expect(shown).toEqual(ORDER.filter((n) => !HIGHLIGHTED.includes(n)));
  expect(container.querySelector('.pf-note')).toBeNull();
  expect(screen.getByRole('button', { name: /^All, 25 projects$/ })).toHaveAttribute('aria-pressed', 'true');
  // Each project shows once: the three highlights are in the row above.
  const list = screen.getByRole('region', { name: 'Projects' });
  for (const name of HIGHLIGHTED) {
    expect(within(list).queryByRole('heading', { level: 3, name })).toBeNull();
    expect(screen.getAllByRole('heading', { level: 3, name })).toHaveLength(1);
  }
});

test('no section headings for the categories, and every tile carries its category label', () => {
  const { container } = home();
  for (const name of ['Work', 'Gaming', 'Mac apps', 'Omarchy Linux', 'Electronics', 'Everything else', 'Personal']) {
    expect(screen.queryByRole('heading', { name })).toBeNull();
  }
  for (const id of ['work', 'games', 'mac', 'linux', 'electronics', 'more', 'builds']) expect(container.querySelector(`#${id}`)).toBeNull();
  const tiles = [...container.querySelectorAll<HTMLElement>('.pf-list article.tile')];
  const label = (name: string) => tiles.find((t) => t.querySelector('h3')!.textContent === name)!.querySelector('.tile-cat')!.textContent;
  for (const t of tiles) {
    const cat = t.querySelector('.tile-cat')!;
    expect(cat.tagName).toBe('BUTTON');
    // Over the name and badge row, not inside it.
    expect(cat.nextElementSibling).toBe(t.querySelector('.th'));
  }
  expect(label('WINNIE')).toBe('Work');
  expect(label('WBDB')).toBe('Work');
  expect(label('CON AIR')).toBe('Gaming');
  expect(label('SNES History')).toBe('Gaming');
  expect(label('Tidemark')).toBe('Mac apps');
  expect(label('OmaFinance')).toBe('Omarchy Linux');
  expect(label('Photo Frame Dashboard')).toBe('Electronics');
  expect(label('My Office in 3D')).toBe('Everything else');
});

test('the photo frame links to its write-up; CON AIR keeps its trailer; the strip counts fifteen at home', () => {
  const { container } = home();
  expect(screen.getByText('Ten builds at work, fifteen at home')).toBeInTheDocument();
  const list = container.querySelector<HTMLElement>('.pf-list')!;
  const tile = (name: string) => [...list.querySelectorAll<HTMLElement>('article.tile')].find((t) => t.querySelector('h3')!.textContent === name)!;
  const frame = tile('Photo Frame Dashboard');
  expect(within(frame).getByText('Private repo')).toBeInTheDocument();
  const link = within(frame).getByRole('link', { name: 'How I built it →', hidden: true });
  expect(link).toHaveAttribute('href', '/builds/photo-frame');
  expect(link).not.toHaveAttribute('target');
  const conair = tile('CON AIR');
  expect(within(conair).getByText('Private build')).toBeInTheDocument();
  expect(within(conair).getByRole('link', { name: 'About the game →', hidden: true })).toHaveAttribute('href', '/games/con-air');
  const video = conair.querySelector('.print video')!;
  expect(video).toBeTruthy();
  expect(video.closest('a')).toBeNull();
  // Work tiles have no footer; the rest do.
  expect(tile('WINNIE').querySelector('.tf')).toBeNull();
  expect(tile('Knobdeck').querySelector('.tf')).not.toBeNull();
});

test('the header carries the name and Connect and stays on screen here; the footer is where Connect lands', () => {
  const { container } = home();
  const header = container.querySelector<HTMLElement>('header.wb-head')!;
  expect(header).toHaveClass('is-sticky');
  expect(within(header).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['Wesley Bard', '/'],
    ['Connect', '#connect'],
  ]);
  expect(container.querySelector('footer#connect')).not.toBeNull();
  // One menu: no navigation landmark but the footer's.
  expect(screen.getAllByRole('navigation').map((n) => n.getAttribute('aria-label'))).toEqual(['Footer']);
});

test('the header and the band stick, one under the other, at the header\'s own height', () => {
  const css = fs.readFileSync('app/design-system.css', 'utf8');
  expect(css).toMatch(/\.wb \{ --head-h: 57px; \}/);
  expect(css).toMatch(/\.wb-head \{[^}]*box-sizing: border-box; height: var\(--head-h\);/);
  expect(css).toMatch(/\.wb\.wb-head\.is-sticky \{ position: sticky; top: 0; \}/);
  expect(css).toMatch(/\.wb \.pf-band \{ position: sticky; top: var\(--head-h\);/);
  expect(css).toMatch(/\.wb \.pf-band-in \{[^}]*overflow-x: auto;[^}]*scrollbar-width: none;/);
  expect(css).toMatch(/\.wb-foot \{ scroll-margin-top: var\(--head-h\); \}/);
  expect(css).toMatch(/\.wb \.pf-spot \{ scroll-margin-top: var\(--head-h\); \}/);
  expect(css).toMatch(/\.wb \.tile\[hidden\] \{ display: none; \}/);
  expect(css).not.toMatch(/home-nav|\.builds\b|\.grp\b/);
});
