import { displayedMagazines, formatRelease, gameCount, magazineName, npLabel, playersLabel, ratingLabel, reviewerScores } from '@/lib/snes/display';

test('release dates read at their real precision', () => {
  expect(formatRelease('1994-04-18', 'day')).toBe('April 18, 1994');
  expect(formatRelease('1994-04', 'month')).toBe('April 1994');
  expect(formatRelease('1994', 'year')).toBe('1994');
});

test('magazine abbreviations are expanded; unknown keys stay as written', () => {
  expect(magazineName('GI')).toBe('Game Informer');
  expect(magazineName('Fam')).toBe('Famitsu');
  expect(magazineName('Hippon Super!')).toBe('Hippon Super!');
});

test('displayedMagazines drops award and empty-reviewer fields and anything skipped', () => {
  expect(displayedMagazines({ GR: '83%', award1: 'Best', award1Pub: 'X', rev1: 'Y', Fam: '7/10, 8/10', 'Play Time': '55%' }, ['Fam'])).toEqual([
    { name: 'GameRankings', score: '83%' },
    { name: 'Play Time', score: '55%' },
  ]);
});

test('reviewerScores reads a multi-reviewer score, else null', () => {
  expect(reviewerScores('7/10, 8/10, 8/10, 9/10')).toEqual([7, 8, 8, 9]);
  expect(reviewerScores('9/10')).toBeNull();
  expect(reviewerScores(undefined)).toBeNull();
});

test('small labels', () => {
  expect(npLabel({ score: 3.8, scale: 5 })).toBe('3.8/5');
  expect(playersLabel(1)).toBe('1 player');
  expect(playersLabel(4)).toBe('1–4 players');
  expect(ratingLabel(null, '1991-08-23')).toBe('Pre-ESRB');
  expect(ratingLabel(null, '1995-01')).toBe('Not rated');
  expect(ratingLabel('T', '1995-01')).toBe('ESRB T');
  expect(gameCount(1)).toBe('1 game');
  expect(gameCount(48)).toBe('48 games');
});
