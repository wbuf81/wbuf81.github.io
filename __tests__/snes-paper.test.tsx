import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Paper from '@/app/snes/components/Paper';
import type { Week } from '@/lib/snes/types';

const base: Week = {
  start: '1991-08-23',
  song: { title: 'S', by: 'A', article: null, art: null }, album: { title: 'Al', by: 'B', article: null, art: null },
  film: { title: 'F', by: null, article: null, art: null, gross: null },
  news: [{ date: '1991-08-23', text: 'The Super Nintendo Entertainment System is first released in the United States.' }, { date: '1991-08-26', text: 'SummerSlam at Madison Square Garden.' }],
  near: null,
};

it('prints the masthead, edition line, lead story and side column', () => {
  render(<Paper week={base} weekNumber={1} />);
  expect(screen.getByText('The Omaha World-Pixel')).toBeInTheDocument();
  expect(screen.getByText(/Vol\. 1 · No\. 1/)).toBeInTheDocument();
  expect(screen.getByText(/Omaha, Nebraska · Late edition/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /first released in the United States/ })).toBeInTheDocument();
  expect(screen.getByText(/SummerSlam/)).toBeInTheDocument();
  expect(screen.queryByText(/World-Herald/)).toBeNull();
});
it('falls back to the near story, then to a quiet week', () => {
  const { rerender } = render(<Paper week={{ ...base, news: [], near: { date: '1991-08-20', text: 'Earlier story.' } }} weekNumber={2} />);
  expect(screen.getByRole('heading', { name: 'Earlier story.' })).toBeInTheDocument();
  rerender(<Paper week={{ ...base, news: [], near: null }} weekNumber={2} />);
  expect(screen.getByRole('heading', { name: 'A quiet week in the news' })).toBeInTheDocument();
});
it('compact drops the side column', () => {
  render(<Paper week={base} weekNumber={1} compact />);
  expect(screen.queryByText(/SummerSlam/)).toBeNull();
});
