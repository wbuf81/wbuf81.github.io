/** @jest-environment jsdom */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, render, screen } from '@testing-library/react';
import { EMPTY_STATE } from '@/lib/snes/top8';
import { SNES_BASE, TIME_MACHINE, TOP8 } from '@/lib/snes/routes';
import { resetTop8Memory, writeTop8 } from '../app/snes/top8/store';
import SnesNav from '../app/snes/components/SnesNav';

const pick = (...slots: string[]) => act(() => writeTop8({ ...EMPTY_STATE, slots: [...slots, ...Array(8 - slots.length).fill(null)] }));

beforeEach(() => {
  localStorage.clear();
  resetTop8Memory();
});

test('three tabs to the three SNES places, labelled as the SNES menu', () => {
  render(<SnesNav current="games" />);
  const nav = screen.getByRole('navigation', { name: 'SNES' });
  const links = Array.from(nav.querySelectorAll('a'));
  expect(links.map((a) => a.getAttribute('href'))).toEqual([SNES_BASE, TIME_MACHINE, TOP8]);
  expect(links.map((a) => a.querySelector('.s-nav-l')?.textContent)).toEqual(['All games', 'Time Machine', 'My Top 8']);
  // phones swap to the short label (CSS), so all three fit one row
  expect(links.map((a) => a.querySelector('.s-nav-s')?.textContent)).toEqual(['Games', 'Time Machine', 'Top 8']);
});

test.each([
  ['games', 'All games'],
  ['time', 'Time Machine'],
  ['top8', 'My Top 8'],
] as const)('marks %s as the current page', (current, label) => {
  render(<SnesNav current={current} />);
  const on = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page');
  expect(on).toHaveLength(1);
  expect(on[0]).toHaveTextContent(label);
});

test('shows the Top 8 count only once something is picked, and follows the store live', () => {
  render(<SnesNav current="games" />);
  expect(document.querySelector('.s-nav-n')).toBeNull();
  pick('super-metroid', 'f-zero', 'chrono-trigger');
  expect(screen.getByRole('link', { name: /My Top 8/ })).toHaveTextContent('3/8');
  expect(screen.getByLabelText('3 of 8 picked')).toBeInTheDocument();
  pick();
  expect(document.querySelector('.s-nav-n')).toBeNull();
});

test('renders no count on the server, even with picks stored', () => {
  writeTop8({ ...EMPTY_STATE, slots: ['f-zero', ...Array(7).fill(null)] });
  const { renderToString } = require('react-dom/server');
  const html: string = renderToString(<SnesNav current="top8" />);
  expect(html).toContain('My Top 8');
  expect(html).not.toContain('/8');
});

test('every SNES page mounts the menu with the right section', () => {
  const root = path.join(__dirname, '..', 'app', 'videogames', 'snes-history');
  const pages: [string, string][] = [
    ['page.tsx', 'games'],
    ['[slug]/page.tsx', 'games'],
    ['company/[slug]/page.tsx', 'games'],
    ['time-machine/page.tsx', 'time'],
    ['top-8/page.tsx', 'top8'],
  ];
  for (const [file, section] of pages) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    expect(src).toContain(`<SnesNav current="${section}" />`);
  }
});
