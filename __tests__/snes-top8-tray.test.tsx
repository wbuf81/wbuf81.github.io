/** @jest-environment jsdom */
import React, { isValidElement, type ReactElement, type ReactNode } from 'react';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { EMPTY_STATE, titleList, titlesBySlug } from '@/lib/snes/top8';
import { getGames } from '@/lib/snes/data';
import { gamePath, TOP8 } from '@/lib/snes/routes';
import { resetTop8Memory, writeTop8 } from '../app/snes/top8/store';
import { Top8Scope, Top8Tray, TRAY_KEY } from '../app/snes/components/Top8Tray';
import { Top8Star } from '../app/snes/components/Top8Star';

const TITLES = ['Super Metroid', 'F-Zero', 'Chrono Trigger'];
const pick = (...slots: string[]) => act(() => writeTop8({ ...EMPTY_STATE, slots: [...slots, ...Array(8 - slots.length).fill(null)] }));
const tray = () => document.querySelector('.s-tray');

beforeEach(() => {
  localStorage.clear();
  resetTop8Memory();
  document.body.className = '';
});

test('is not rendered with no picks, nor on the server', () => {
  const view = render(<Top8Tray titles={TITLES} />);
  expect(tray()).toBeNull();
  expect(document.body).not.toHaveClass('t8-tray-open');
  view.unmount();
  const { renderToString } = require('react-dom/server');
  writeTop8({ ...EMPTY_STATE, slots: ['f-zero', ...Array(7).fill(null)] });
  expect(renderToString(<Top8Tray titles={TITLES} />)).toBe('');
});

test('appears after the first pick: 8 mini slots, the count and a link to the Top 8 page', () => {
  render(<Top8Tray titles={TITLES} />);
  pick('super-metroid', 'f-zero');
  const t = screen.getByRole('region', { name: 'Your Top 8' });
  expect(t).toHaveTextContent('2/8');
  const links = within(t).getAllByRole('link');
  const minis = links.filter((a) => a.querySelector('img'));
  expect(minis.map((a) => a.getAttribute('aria-label'))).toEqual(['Super Metroid', 'F-Zero']);
  expect(minis[0]).toHaveAttribute('href', gamePath('super-metroid'));
  const img = minis[0].querySelector('img')!;
  expect(img).toHaveAttribute('src', '/snes/thumb/super-metroid.jpg');
  expect(img).toHaveAttribute('width', '48');
  expect(t.querySelectorAll('.s-tray-slot')).toHaveLength(8);
  expect(within(t).getByRole('link', { name: 'Open Top 8 →' })).toHaveAttribute('href', TOP8);
});

test('a star click on the page shows the tray at once (same store)', () => {
  render(<Top8Scope titles={TITLES}><Top8Star slug="chrono-trigger" title="Chrono Trigger" variant="tile" /></Top8Scope>);
  expect(tray()).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Add Chrono Trigger to your Top 8' }));
  expect(screen.getByRole('link', { name: 'Chrono Trigger' })).toHaveAttribute('href', gamePath('chrono-trigger'));
  expect(tray()).toHaveTextContent('1/8');
});

test('collapses to a ★ n/8 pill, and the choice is remembered', () => {
  const first = render(<Top8Tray titles={TITLES} />);
  pick('f-zero');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse your Top 8' }));
  expect(localStorage.getItem(TRAY_KEY)).toBe('collapsed');
  const pill = screen.getByRole('button', { name: 'Show your Top 8 (1/8)' });
  expect(pill).toHaveTextContent('★ 1/8');
  expect(pill).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('link', { name: 'F-Zero' })).toBeNull();
  first.unmount();
  render(<Top8Tray titles={TITLES} />);
  expect(screen.getByRole('button', { name: 'Show your Top 8 (1/8)' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show your Top 8 (1/8)' }));
  expect(localStorage.getItem(TRAY_KEY)).toBeNull();
  expect(screen.getByRole('button', { name: 'Collapse your Top 8' })).toHaveAttribute('aria-expanded', 'true');
});

test('still works when storage is blocked', () => {
  const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<Top8Tray titles={TITLES} />);
  pick('f-zero');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse your Top 8' }));
  expect(screen.getByRole('button', { name: 'Show your Top 8 (1/8)' })).toBeInTheDocument();
  get.mockRestore(); set.mockRestore();
});

test('reserves its height: the body class is on while it shows and off when it goes', () => {
  const view = render(<Top8Tray titles={TITLES} />);
  expect(document.body).not.toHaveClass('t8-tray-open');
  pick('f-zero');
  expect(document.body).toHaveClass('t8-tray-open');
  pick();
  expect(document.body).not.toHaveClass('t8-tray-open');
  pick('f-zero');
  expect(document.body).toHaveClass('t8-tray-open');
  view.unmount();
  expect(document.body).not.toHaveClass('t8-tray-open');
});

test('labels fall back to the slug when a title is missing', () => {
  render(<Top8Tray titles={[]} />);
  pick('super-metroid');
  expect(screen.getByRole('link', { name: 'Super Metroid' })).toBeInTheDocument();
});

test('collapsing and expanding keep the body class in place (no remove and re-add)', () => {
  render(<Top8Tray titles={TITLES} />);
  pick('f-zero');
  const remove = jest.spyOn(DOMTokenList.prototype, 'remove');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse your Top 8' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show your Top 8 (1/8)' }));
  expect(remove.mock.calls.filter(([c]) => c === 't8-tray-open')).toHaveLength(0);
  expect(document.body).toHaveClass('t8-tray-open');
  remove.mockRestore();
});

describe('styles', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'app/snes/snes.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (sel: string) => css.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  test('fixed to the bottom, clear of the home indicator, never animated', () => {
    const r = rule('.wb .s-tray');
    expect(r).toMatch(/position: fixed/);
    expect(r).toMatch(/bottom: 0/);
    expect(r).toMatch(/padding-bottom: env\(safe-area-inset-bottom/);
    expect(css.match(/\.s-tray[^{]*\{[^}]*\}/g)!.join('')).not.toMatch(/transition|animation/);
  });
  test('touch screens get no ★ on the cover wall or the shelf (cells and spines are too small for 44px targets)', () => {
    const touch = [...css.matchAll(/@media \(hover: none\)\s*\{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');
    expect(touch).toMatch(/\.wb \.s-wall-cell > \.s-star-tile[^{]*\{[^}]*display: none/);
    expect(touch).toMatch(/\.wb \.s-spine-w > \.s-star-tile[^{]*\{[^}]*display: none/);
  });
  test('the body class reserves the tray height at the end of the page', () => {
    expect(css).toMatch(/body\.t8-tray-open[^{]*\{[^}]*padding-bottom: var\(--t8-tray-h/);
  });
});

describe('where it is mounted', () => {
  const src = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
  test('library, game and company pages; not the Top 8 or Time Machine pages', () => {
    expect(src('app/snes/components/Library.tsx')).toMatch(/<Top8Scope/);
    expect(src('app/videogames/snes-history/[slug]/page.tsx')).toMatch(/<Top8Scope/);
    expect(src('app/videogames/snes-history/company/[slug]/page.tsx')).toMatch(/<Top8Scope/);
    for (const p of ['app/videogames/snes-history/top-8/page.tsx', 'app/snes/components/Top8.tsx', 'app/videogames/snes-history/time-machine/page.tsx', 'app/snes/components/TimeMachine.tsx']) {
      expect(src(p)).not.toMatch(/Top8Tray|Top8Scope/);
    }
  });

  const find = (node: ReactNode, type: unknown): ReactElement<{ titles: string[] }> | null => {
    if (Array.isArray(node)) {
      for (const n of node) { const hit = find(n, type); if (hit) return hit; }
      return null;
    }
    if (!isValidElement(node)) return null;
    if (node.type === type) return node as ReactElement<{ titles: string[] }>;
    return find((node.props as { children?: ReactNode }).children, type);
  };
  test('game and company pages hand the tray every title', async () => {
    const all = titleList(getGames());
    const { default: GamePage } = require('@/app/videogames/snes-history/[slug]/page');
    const game = find(await GamePage({ params: Promise.resolve({ slug: 'super-metroid' }) }), Top8Scope);
    expect(game?.props.titles).toEqual(all);
    const { default: CompanyPage } = require('@/app/videogames/snes-history/company/[slug]/page');
    const company = find(await CompanyPage({ params: Promise.resolve({ slug: 'nintendo' }) }), Top8Scope);
    expect(company?.props.titles).toEqual(all);
  });
});

test('the titles a game or company page ships stay within 12 KB gzipped, and rebuild every slug', () => {
  const games = getGames();
  const list = titleList(games);
  expect(titlesBySlug(list)).toEqual(Object.fromEntries(games.map((g) => [g.slug, g.title])));
  expect(zlib.gzipSync(JSON.stringify(list), { level: 9 }).length).toBeLessThanOrEqual(12 * 1024);
});

test('ignores stored slugs that are not games: not counted, no mini cover', () => {
  render(<Top8Tray titles={TITLES} />);
  pick('super-metroid', 'not-a-game');
  const t = screen.getByRole('region', { name: 'Your Top 8' });
  expect(t).toHaveTextContent('1/8');
  expect(t.querySelectorAll('img')).toHaveLength(1);
  // Storage is left alone.
  expect(JSON.parse(localStorage.getItem('snes-top8')!).slots[1]).toBe('not-a-game');
});

test('a mini cover that fails to load becomes a placeholder', () => {
  render(<Top8Tray titles={TITLES} />);
  pick('super-metroid');
  const img = screen.getByRole('region', { name: 'Your Top 8' }).querySelector('img')!;
  fireEvent.error(img);
  const t = screen.getByRole('region', { name: 'Your Top 8' });
  expect(t.querySelector('img')).toBeNull();
  expect(t.querySelector('.s-cover-none')).toHaveTextContent('SM');
});
