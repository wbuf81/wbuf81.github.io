import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SnesCredit from '@/app/snes/components/SnesCredit';
import { NOW_YEAR } from '@/lib/snes/money';

jest.mock('next/navigation', () => ({ usePathname: () => '/videogames' }));

const DATA = 'Data: IGDB · Wikipedia · libretro-thumbnails';
const POP = 'Charts: Billboard · Box office: Box Office Mojo via Wikipedia';
const CPI = `Today’s money uses US CPI-U, ${NOW_YEAR} dollars`;
const credit = () => document.querySelectorAll('.s-credit');

beforeEach(() => {
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
});

it('always credits the data, and adds charts and the CPI note only when asked', () => {
  const { rerender } = render(<SnesCredit />);
  expect(credit()[0]).toHaveTextContent(DATA);
  expect(credit()[0]).not.toHaveTextContent('Billboard');
  expect(credit()[0]).not.toHaveTextContent('CPI');
  rerender(<SnesCredit pop cpi />);
  expect(credit()[0]).toHaveTextContent(DATA);
  expect(credit()[0]).toHaveTextContent(POP);
  expect(credit()[0]).toHaveTextContent(CPI);
});

it('the library page ends with the data credit', async () => {
  const { default: Page } = await import('@/app/videogames/snes-history/page');
  render(<Page />);
  expect(credit()).toHaveLength(1);
  expect(credit()[0]).toHaveTextContent(DATA);
});

it('a game page credits data, charts (Be Kind, Rewind) and the CPI', async () => {
  const { default: Page } = await import('@/app/videogames/snes-history/[slug]/page');
  render(await Page({ params: Promise.resolve({ slug: 'f-zero' }) }));
  expect(credit()).toHaveLength(1);
  expect(credit()[0]).toHaveTextContent(DATA);
  expect(credit()[0]).toHaveTextContent(POP);
  expect(credit()[0]).toHaveTextContent(CPI);
});

it('a company page ends with the data credit', async () => {
  const { default: Page } = await import('@/app/videogames/snes-history/company/[slug]/page');
  render(await Page({ params: Promise.resolve({ slug: 'nintendo' }) }));
  expect(credit()).toHaveLength(1);
  expect(credit()[0]).toHaveTextContent(DATA);
});

it('the Time Machine has one credit (no duplicate), with charts and the CPI', async () => {
  const { default: Page } = await import('@/app/videogames/snes-history/time-machine/page');
  render(<Page />);
  expect(credit()).toHaveLength(1);
  expect(document.querySelector('.s-tm-credit')).toBeNull();
  expect(credit()[0]).toHaveTextContent(DATA);
  expect(credit()[0]).toHaveTextContent(POP);
  expect(credit()[0]).toHaveTextContent(CPI);
});

it('the hub credits data and charts (On this day)', async () => {
  const { default: Page } = await import('@/app/videogames/page');
  render(<Page />);
  expect(credit()).toHaveLength(1);
  expect(credit()[0]).toHaveTextContent(DATA);
  expect(credit()[0]).toHaveTextContent(POP);
  expect(screen.getByRole('main')).toHaveClass('wb');
});
