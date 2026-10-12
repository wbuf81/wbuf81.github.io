import { FIRST_WEEK, artId, assembleWeeks, gamesForWeek, panelWeekFor, weekIndexFor, weekStarts } from '@/lib/snes/weeks';

const hot = [{ date: '1991-08-17', title: 'Song A', by: 'A', article: 'Song A' }, { date: '1991-08-24', title: 'Song B', by: 'B', article: 'Song B' }, { date: '1991-08-31', title: 'Song C', by: 'C', article: null }];
const album = [{ date: '1991-08-24', title: 'Unforgettable... with Love', by: 'Natalie Cole', article: 'Unforgettable... with Love' }, { date: '1991-08-31', title: 'Metallica', by: 'Metallica', article: 'Metallica (album)' }];
const box = [{ date: '1991-08-25', title: 'Hot Shots!', by: null, article: 'Hot Shots!', gross: '$4,676,467' }, { date: '1991-09-01', title: 'Film 2', by: null, article: 'Film 2', gross: null }];
const news = [
  { date: '1991-08-19', text: 'Hurricane Bob' },
  { date: '1991-08-23', text: 'The Super Nintendo Entertainment System is first released in the United States.' },
  { date: '1991-08-26', text: 'SummerSlam' },
  { date: '1991-08-28', text: 'Late August story' },
];
const art = (a: string | null) => (a ? `/snes/pop/${artId(a)}.webp` : null);

describe('weekStarts', () => {
  it('runs Friday to Friday from launch through the week holding the last game', () => {
    const s = weekStarts('1991-09-07');
    expect(s[0]).toBe(FIRST_WEEK);
    expect(s).toEqual(['1991-08-23', '1991-08-30', '1991-09-06']);
  });
});

describe('assembleWeeks', () => {
  const { weeks, errors } = assembleWeeks({ starts: ['1991-08-23', '1991-08-30', '1991-09-06'], hot, album, box, news, art });
  it('picks Saturday charts on or before start + 1 and Sunday box office on or before start + 2', () => {
    expect(errors).toEqual([]);
    expect(weeks[0].song.title).toBe('Song B');
    expect(weeks[0].album.title).toBe('Unforgettable... with Love');
    expect(weeks[0].film).toMatchObject({ title: 'Hot Shots!', gross: '$4,676,467' });
    expect(weeks[1].album.title).toBe('Metallica');
    expect(weeks[1].film.title).toBe('Film 2');
  });
  it('keeps in-week news (max 4) and falls back to the latest story in the 10 days before', () => {
    expect(weeks[0].news.map((n) => n.text)).toEqual(['The Super Nintendo Entertainment System is first released in the United States.', 'SummerSlam', 'Late August story']);
    expect(weeks[0].near).toBeNull();
    expect(weeks[2].news).toEqual([]);
    expect(weeks[2].near).toEqual({ date: '1991-08-28', text: 'Late August story' });
  });
  it('attaches art paths by article', () => {
    expect(weeks[0].song.art).toBe(`/snes/pop/${artId('Song B')}.webp`);
    expect(weeks[1].song.art).toBeNull();
  });
  it('reports a week missing a chart entry', () => {
    const r = assembleWeeks({ starts: ['1991-08-02'], hot, album, box, news, art });
    expect(r.errors.join(' ')).toMatch(/1991-08-02.*song/);
  });
  it('applies headline overrides and rejects unknown weeks', () => {
    const r = assembleWeeks({ starts: ['1991-08-23'], hot, album, box, news, art, overrides: { weeks: { '1991-08-23': { news: 'hide' }, '1990-01-05': { news: 'hide' } } } });
    expect(r.weeks[0].news).toEqual([]);
    expect(r.errors.join(' ')).toMatch(/1990-01-05/);
  });
});

describe('lookups', () => {
  const { weeks } = assembleWeeks({ starts: ['1991-08-23', '1991-08-30', '1991-09-06'], hot, album, box, news, art });
  it('finds the week holding a date and clamps outside the range', () => {
    expect(weekIndexFor(weeks, '1991-08-29')).toBe(0);
    expect(weekIndexFor(weeks, '1991-08-30')).toBe(1);
    expect(weekIndexFor(weeks, '1980-01-01')).toBe(0);
    expect(weekIndexFor(weeks, '2001-01-01')).toBe(2);
  });
  const games = [
    { slug: 'f-zero', releasedUS: '1991-08-23', datePrecision: 'day' },
    { slug: 'sept-month', releasedUS: '1991-09', datePrecision: 'month' },
  ];
  it('splits a week into exact-date games and month-only games for weeks starting in that month', () => {
    expect(gamesForWeek(games, weeks, 0)).toEqual({ exact: ['f-zero'], month: [] });
    expect(gamesForWeek(games, weeks, 2)).toEqual({ exact: [], month: ['sept-month'] });
  });
  it('places a month-only game in the first week starting that month and labels it by month', () => {
    expect(panelWeekFor(weeks, games[1])).toEqual({ index: 2, label: 'month' });
    expect(panelWeekFor(weeks, games[0])).toEqual({ index: 0, label: 'week' });
  });
  it('makes stable file-safe art ids', () => {
    expect(artId('Metallica (album)')).toBe('metallica-album');
    expect(artId('(Everything I Do) I Do It for You')).toBe('everything-i-do-i-do-it-for-you');
  });
});
