import { noteMarksFor } from '@/lib/noteMarks';
import { HealthNoteMark } from '@/types/health';

const CHURCH: HealthNoteMark = { match: 'church', icon: '✝️', label: 'Church' };
const OTF: HealthNoteMark = {
  match: 'orange theory',
  icon: '🍊',
  label: 'Orange Theory',
  replaces: 'cardio',
};
const MARKS = [CHURCH, OTF];

describe('noteMarksFor', () => {
  test('matches a note containing the phrase, whatever the case', () => {
    expect(noteMarksFor('Church', MARKS)).toEqual([CHURCH]);
    expect(noteMarksFor('church with the family', MARKS)).toEqual([CHURCH]);
    expect(noteMarksFor('CHURCH', MARKS)).toEqual([CHURCH]);
  });

  test('matches a phrase sitting inside a longer cardio note', () => {
    expect(noteMarksFor('30 mins Orange Theory', MARKS)).toEqual([OTF]);
  });

  test('does not match a note that only mentions the usual treadmill session', () => {
    expect(noteMarksFor('30 mins 12.5 / 3.0', MARKS)).toEqual([]);
  });

  test('returns every mark whose phrase appears', () => {
    expect(noteMarksFor('Church, then 30 mins Orange Theory', MARKS)).toEqual([CHURCH, OTF]);
  });

  test('is empty for a day with no notes', () => {
    expect(noteMarksFor('', MARKS)).toEqual([]);
    expect(noteMarksFor('   ', MARKS)).toEqual([]);
  });

  test('is empty with nothing configured', () => {
    expect(noteMarksFor('Church', [])).toEqual([]);
    expect(noteMarksFor('Church', undefined)).toEqual([]);
  });

  test('ignores a mark with no icon to draw or no phrase to match', () => {
    expect(noteMarksFor('Church', [{ match: 'church', icon: '', label: 'Church' }])).toEqual([]);
    expect(noteMarksFor('Church', [{ match: '  ', icon: '✝️', label: 'Church' }])).toEqual([]);
  });
});
