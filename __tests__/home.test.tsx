import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProjectTile from '@/app/components/home/ProjectTile';
import FeaturedBuild from '@/app/components/home/FeaturedBuild';
import ThenNowStill from '@/app/components/home/ThenNowStill';
import TetrisPrint from '@/app/components/home/TetrisPrint';
import GitHubMap from '@/app/components/home/GitHubMap';
import { place, PERSONAL, TOOLS, featured } from '@/lib/projects';
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
  render(<FeaturedBuild project={featured()} />);
  expect(screen.getByText('Featured build')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Stream Deck Neo Takeover' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Elgato Stream Deck Neo/ })).toBeInTheDocument();
  expect(screen.getByText('Machine vitals')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View on GitHub →' })).toHaveAttribute('href', 'https://github.com/wbuf81/streamdeckneoclaude');
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
