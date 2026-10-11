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

test('series is the first franchise, else the first collection, else null', () => {
  expect(mapIgdbGame({ ...base, franchises: [{ name: 'Metroid' }], collections: [{ name: 'Metroid series' }] }).series).toBe('Metroid');
  expect(mapIgdbGame({ ...base, collections: [{ name: 'Metroid series' }, { name: 'Other' }] }).series).toBe('Metroid series');
  expect(mapIgdbGame(base).series).toBeNull();
});

test('similar ids, themes and perspectives are plain lists', () => {
  const f = mapIgdbGame({ ...base, similar_games: [5, 9], themes: [{ name: 'Sci-fi' }], player_perspectives: [{ name: 'Side view' }] });
  expect(f).toMatchObject({ similarIds: [5, 9], themes: ['Sci-fi'], perspectives: ['Side view'] });
  expect(mapIgdbGame(base)).toMatchObject({ similarIds: [], themes: [], perspectives: [] });
});

test('coop and versus come from SNES-or-unspecified multiplayer modes only', () => {
  expect(mapIgdbGame({ ...base, multiplayer_modes: [{ platform: 19, offlinecoop: true }] })).toMatchObject({ coop: true, versus: false });
  expect(mapIgdbGame({ ...base, multiplayer_modes: [{ offlinecoopmax: 2 }] })).toMatchObject({ coop: true, versus: false });
  expect(mapIgdbGame({ ...base, multiplayer_modes: [{ platform: 19, offlinemax: 2 }] })).toMatchObject({ coop: false, versus: true });
  expect(mapIgdbGame({ ...base, multiplayer_modes: [{ platform: 6, offlinecoop: true, offlinemax: 4 }] })).toMatchObject({ coop: false, versus: false });
  expect(mapIgdbGame(base)).toMatchObject({ coop: false, versus: false });
});

test('critic and user scores round and follow the 3-rating floor', () => {
  expect(mapIgdbGame({ ...base, aggregated_rating: 88.5, aggregated_rating_count: 7, rating: 91.2, rating_count: 120 }))
    .toMatchObject({ critic: 89, criticCount: 7, userScore: 91, userCount: 120 });
  expect(mapIgdbGame({ ...base, aggregated_rating: 88, aggregated_rating_count: 2, rating: 90, rating_count: 1 }))
    .toMatchObject({ critic: null, criticCount: 2, userScore: null, userCount: 1 });
  expect(mapIgdbGame(base)).toMatchObject({ critic: null, criticCount: 0, userScore: null, userCount: 0 });
});
