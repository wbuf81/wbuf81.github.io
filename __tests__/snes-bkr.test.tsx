// __tests__/snes-bkr.test.tsx
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import BeKindRewind from '@/app/snes/components/BeKindRewind';
import type { Week } from '@/lib/snes/types';

const week: Week = {
  start: '1991-08-23',
  song: { title: '(Everything I Do) I Do It for You', by: 'Bryan Adams', article: '(Everything I Do) I Do It for You', art: '/snes/pop/everything-i-do-i-do-it-for-you.webp' },
  album: { title: 'Unforgettable... with Love', by: 'Natalie Cole', article: 'Unforgettable... with Love', art: null },
  film: { title: 'Hot Shots!', by: null, article: 'Hot Shots!', art: '/snes/pop/hot-shots.webp', gross: '$4,676,467' },
  news: [{ date: '1991-08-23', text: 'The Super Nintendo Entertainment System is first released in the United States.' }], near: null,
};

it('shows the tape, the four coffee-table objects and links to Wikipedia', () => {
  render(<BeKindRewind week={week} weekNumber={1} label="week" monthName="August 1991" price={{ usd: 199.99, year: 1991, what: 'console' }} />);
  expect(screen.getByText('BE KIND, REWIND')).toBeInTheDocument();
  expect(screen.getByText('The week it came out')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Bryan Adams/ })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/(Everything_I_Do)_I_Do_It_for_You');
  expect(screen.getByText('Unforgettable... with Love')).toBeInTheDocument(); // no art → text-only card
  expect(screen.getByText(/\$4,676,467/)).toBeInTheDocument();
  expect(screen.getByText('The Omaha World-Pixel')).toBeInTheDocument();
});
it('labels month-only games by month and falls back to the console price', () => {
  render(<BeKindRewind week={week} weekNumber={1} label="month" monthName="March 1995" price={{ usd: 199.99, year: 1991, what: 'console' }} />);
  expect(screen.getByText('March 1995')).toBeInTheDocument();
  expect(screen.getByText(/Super NES was \$199\.99 at launch/)).toBeInTheDocument();
});
it('prints a researched game price in today’s money and links into the Time Machine', () => {
  render(<BeKindRewind week={week} weekNumber={1} label="week" monthName="August 1991" price={{ usd: 59.99, year: 1991, what: 'game' }} />);
  expect(screen.getByText(/\$59\.99 in a 1991 catalog · about \$\d+ today/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Open this week in the Time Machine/ })).toHaveAttribute('href', '/videogames/snes-history/time-machine?w=1991-08-23');
});
it('a year-only game says "Sometime in 1995" on the sticker', () => {
  render(<BeKindRewind week={week} weekNumber={1} label="month" monthName="1995" price={{ usd: 199.99, year: 1991, what: 'console' }} />);
  expect(screen.getByText('Sometime in 1995')).toBeInTheDocument();
  expect(screen.queryByText('1995')).toBeNull();
});
it('encodes Wikipedia links (? and +)', () => {
  const w: Week = { ...week, film: { title: 'Romeo + Juliet', by: null, article: 'Romeo + Juliet', art: null, gross: null } };
  render(<BeKindRewind week={w} weekNumber={1} label="week" monthName="November 1996" price={{ usd: 199.99, year: 1991, what: 'console' }} />);
  expect(screen.getByRole('link', { name: /Romeo \+ Juliet/ })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Romeo_%2B_Juliet');
});
