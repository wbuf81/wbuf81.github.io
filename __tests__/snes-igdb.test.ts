import { mapIgdbGame, trimSummary } from '@/lib/snes/igdb';
import type { IgdbRaw } from '@/lib/snes/types';

const base: IgdbRaw = { id: 1103, name: 'Super Metroid' };

test('maps genres, rounded aggregate and count', () => {
  expect(
    mapIgdbGame({ ...base, genres: [{ name: 'Platform' }, { name: 'Adventure' }], total_rating: 91.6, total_rating_count: 41 }),
  ).toMatchObject({ id: 1103, genres: ['Platform', 'Adventure'], aggregate: 92, aggregateCount: 41 });
});

test('aggregate is null under 3 ratings', () => {
  expect(mapIgdbGame({ ...base, total_rating: 80, total_rating_count: 2 })).toMatchObject({ aggregate: null, aggregateCount: 2 });
  expect(mapIgdbGame(base)).toMatchObject({ aggregate: null, aggregateCount: 0 });
});

test('players: the largest offline count on the SNES, else 1 for single-player, else unknown', () => {
  expect(mapIgdbGame({ ...base, multiplayer_modes: [{ platform: 19, offlinemax: 4 }, { platform: 6, offlinemax: 8 }] }).players).toBe(4);
  expect(mapIgdbGame({ ...base, multiplayer_modes: [{ offlinecoopmax: 2 }] }).players).toBe(2);
  expect(mapIgdbGame({ ...base, game_modes: [{ name: 'Single player' }] }).players).toBe(1);
  expect(mapIgdbGame(base).players).toBeNull();
});

test('ESRB from expanded age ratings; other boards and unknown ratings ignored', () => {
  const rating = (org: string, r: string) => ({ organization: { name: org }, rating_category: { rating: r } });
  expect(mapIgdbGame({ ...base, age_ratings: [rating('PEGI', '12'), rating('ESRB', 'T')] }).esrb).toBe('T');
  expect(mapIgdbGame({ ...base, age_ratings: [rating('ESRB', 'K-A')] }).esrb).toBe('K-A');
  expect(mapIgdbGame({ ...base, age_ratings: [rating('ESRB', 'E10+')] }).esrb).toBeNull();
  expect(mapIgdbGame({ ...base, age_ratings: [{ organization: 1, rating_category: 8 }] }).esrb).toBeNull();
});

test('trimSummary cuts at a sentence boundary under the limit', () => {
  const s = 'First sentence here. ' + 'Second sentence is longer. '.repeat(30);
  const t = trimSummary(s, 100);
  expect(t.length).toBeLessThanOrEqual(100);
  expect(t.endsWith('.')).toBe(true);
  expect(trimSummary('Short.', 400)).toBe('Short.');
  expect(trimSummary('x'.repeat(50) + ' ' + 'y'.repeat(80), 100)).toBe('x'.repeat(50) + '…');
});
