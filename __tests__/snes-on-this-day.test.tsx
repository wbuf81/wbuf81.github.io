import React from 'react';
import '@testing-library/jest-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render, screen } from '@testing-library/react';
import { getGames, getWeeks } from '@/lib/snes/data';
import { onThisDay, onThisDayYears, slimWeeks } from '@/lib/snes/onThisDay';
import OnThisDay from '@/app/snes/components/OnThisDay';

const weeks = getWeeks();

describe('onThisDay', () => {
  it('maps the launch date to week 0', () => {
    expect(onThisDay(weeks, '2026-08-23', 1991)).toBe(0);
  });
  it('finds the week holding the same month and day, even mid-week', () => {
    const i = onThisDay(weeks, '2026-10-06', 1998);
    expect(weeks[i].start).toBe('1998-10-02');
  });
  it('lists the years that have a week for the date', () => {
    expect(onThisDayYears(weeks, '2026-01-10')).toEqual([1992, 1993, 1994, 1995, 1996, 1997, 1998]);
    expect(onThisDayYears(weeks, '2026-12-25')).toEqual([1991, 1992, 1993, 1994, 1995, 1996, 1997]);
    expect(onThisDayYears(weeks, '2026-08-23')).toEqual([1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998]);
    expect(onThisDayYears(weeks, '2026-08-22')).not.toContain(1991);
  });
  it('treats Feb 29 as Feb 28 in a common year', () => {
    expect(weeks[onThisDay(weeks, '2028-02-29', 1993)].start <= '1993-02-28').toBe(true);
  });
});

describe('slimWeeks', () => {
  const slim = slimWeeks(weeks, getGames());
  it('is small enough to ship as a prop', () => {
    expect(slim).toHaveLength(weeks.length);
    expect(JSON.stringify(slim).length).toBeLessThan(60 * 1024);
  });
  it('carries the song, film, a lead and the game count', () => {
    const [start, song, by, film, lead, games] = slim[0];
    expect([start, song, by, film]).toEqual(['1991-08-23', '(Everything I Do) I Do It for You', 'Bryan Adams', 'Hot Shots!']);
    expect(lead).toMatch(/Super Nintendo/);
    expect(games).toBeGreaterThanOrEqual(2);
    expect(slim.every((r) => !r[4] || r[4].length <= 80)).toBe(true);
  });
});

describe('<OnThisDay>', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-14T12:00:00'));
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const slim = slimWeeks(weeks, getGames());

  it('shows a placeholder on the server render', () => {
    const html = renderToStaticMarkup(<OnThisDay weeks={slim} />);
    expect(html).toContain('On this day in SNES history');
    expect(html).not.toContain('This week in');
  });

  it('picks a year for today, shows the week and links to the Time Machine; arrows cycle', () => {
    render(<OnThisDay weeks={slim} />);
    const years = onThisDayYears(weeks, '2026-03-14');
    const at = (y: number) => slim[onThisDay(weeks, '2026-03-14', y)];
    expect(screen.getByText(`This week in ${years[0]}`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(at(years[0])[1].replace(/[()]/g, '.')))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open this week in the Time Machine/ })).toHaveAttribute('href', `/videogames/snes-history/time-machine?w=${at(years[0])[0]}`);
    fireEvent.click(screen.getByRole('button', { name: 'Later year' }));
    expect(screen.getByText(`This week in ${years[1]}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Earlier year' }));
    fireEvent.click(screen.getByRole('button', { name: 'Earlier year' }));
    expect(screen.getByText(`This week in ${years[years.length - 1]}`)).toBeInTheDocument();
  });

});
