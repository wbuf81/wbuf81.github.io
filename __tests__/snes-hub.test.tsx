import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import VideoGamesPage, { metadata } from '@/app/videogames/page';

jest.mock('next/navigation', () => ({ usePathname: () => '/videogames' }));

test('the hub links to the SNES history and stays out of search', () => {
  render(<VideoGamesPage />);
  expect(screen.getByRole('heading', { level: 1, name: 'Video games' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Super Nintendo history/ })).toHaveAttribute('href', '/videogames/snes-history');
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
