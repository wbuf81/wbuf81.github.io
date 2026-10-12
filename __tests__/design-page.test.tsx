import { render, screen, within } from '@testing-library/react';
import DesignPage from '@/app/design/page';
import { TOKENS } from '@/app/design/tokens';

jest.mock('next/navigation', () => ({ usePathname: () => '/design' }));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(
    () => new Proxy({}, { get: (t: Record<string, unknown>, k: string) => (k in t ? t[k] : jest.fn()) }),
  ) as never;
});

test('the design page shows every token, the type, the blocks and the rules', () => {
  const { container } = render(<DesignPage />);
  expect(screen.getByRole('heading', { level: 1, name: 'How wesleybard.com is built.' })).toBeInTheDocument();
  for (const name of ['Colour', 'Type', 'The header', 'Building blocks', 'Writing', 'Using it on a page']) {
    expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
  }
  const swatches = Array.from(container.querySelectorAll('.sw code'), (c) => c.textContent);
  expect(swatches.sort()).toEqual(TOKENS.map((t) => t.name).sort());
  expect(screen.getByText('#0f4c5c · #7ec4d4')).toBeInTheDocument();
  expect(screen.getAllByRole('group', { name: 'Colour theme' }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: /Play/ })).toBeInTheDocument();
});

test('the SNES kit shows every SNES piece, after the building blocks and before the writing rules', () => {
  const { container } = render(<DesignPage />);
  const section = container.querySelector('section#ds-snes') as HTMLElement;
  expect(section).not.toBeNull();
  expect(within(section).getByRole('heading', { level: 2, name: 'The SNES kit' })).toBeInTheDocument();
  const order = Array.from(container.querySelectorAll('.ds > section'), (s) => s.getAttribute('aria-labelledby'));
  expect(order.slice(order.indexOf('ds-blocks'), order.indexOf('ds-blocks') + 3)).toEqual(['ds-blocks', 'ds-snes-h', 'ds-writing']);
  const pieces = [
    'The SNES menu', 'Game tiles', 'Covers and the no-art placeholder', 'The ★ Top 8 button', 'The toast', 'The Top 8 tray',
    'Filter chips and toggles', 'Heatmap cells', 'Instruction booklet bits', 'The Omaha World-Pixel', 'Be Kind, Rewind',
    'Time Machine cards', 'MySpace boxes', 'Hub cards and On this day', 'The credit line',
  ];
  for (const name of pieces) expect(within(section).getByRole('heading', { level: 3, name })).toBeInTheDocument();
  expect(within(section).getByRole('navigation', { name: 'SNES' })).toBeInTheDocument();
  // Live pieces: real tiles and the credit; the paper keeps the outline (h4 under the piece's h3), never the real name.
  expect(within(section).getAllByText('The Omaha World-Pixel').length).toBeGreaterThanOrEqual(2);
  expect(section.textContent).not.toMatch(/World-Herald/);
  expect(section.querySelectorAll('.s-tile').length).toBe(3);
  expect(section.querySelector('.s-credit')).not.toBeNull();
  expect(Array.from(section.querySelectorAll('.s-t8-chip'), (c) => c.textContent)).toEqual([
    'MySpace Classic', 'Glitter', 'Console', 'Grand Prix', 'Crystal Menu', 'Polygon Space',
  ]);
});

test('the design page keeps its outline (one h1, no skipped levels) and every SNES kit image has alt, width and height', () => {
  const { container } = render(<DesignPage />);
  const levels = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'), (h) => Number(h.tagName[1]));
  expect(levels.filter((l) => l === 1)).toHaveLength(1);
  for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  for (const img of Array.from(container.querySelectorAll('#ds-snes img'))) {
    expect(img.hasAttribute('alt')).toBe(true);
    expect(img.getAttribute('width')).toBeTruthy();
    expect(img.getAttribute('height')).toBeTruthy();
  }
});
