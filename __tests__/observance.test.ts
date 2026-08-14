import { observanceFor } from '@/lib/observance';
import { HealthObservance } from '@/types/health';

const CHURCH: HealthObservance = { weekday: 0, icon: '✝️', label: 'Church' };

describe('observanceFor', () => {
  test('matches a Sunday date to a Sunday observance', () => {
    expect(observanceFor('2026-08-09', [CHURCH])).toEqual(CHURCH);
  });

  test('does not match any other weekday', () => {
    const weekdays = [
      '2026-08-03', '2026-08-04', '2026-08-05',
      '2026-08-06', '2026-08-07', '2026-08-08',
    ];

    for (const date of weekdays) {
      expect(observanceFor(date, [CHURCH])).toBeNull();
    }
  });

  test('reads the weekday in UTC, so a local timezone cannot shift the day', () => {
    // Late-evening local time in the Americas is already the next day in UTC;
    // the date string itself must decide the weekday.
    expect(observanceFor('2026-08-16', [CHURCH])).toEqual(CHURCH);
    expect(observanceFor('2026-08-15', [CHURCH])).toBeNull();
  });

  test('is null with no observances configured', () => {
    expect(observanceFor('2026-08-09', [])).toBeNull();
    expect(observanceFor('2026-08-09', undefined)).toBeNull();
  });

  test('ignores an observance with no icon to draw', () => {
    const iconless = { weekday: 0, icon: '', label: 'Church' };

    expect(observanceFor('2026-08-09', [iconless])).toBeNull();
  });

  test('returns the first match when several cover the same weekday', () => {
    const second: HealthObservance = { weekday: 0, icon: '🕊️', label: 'Other' };

    expect(observanceFor('2026-08-09', [CHURCH, second])).toEqual(CHURCH);
  });
});
