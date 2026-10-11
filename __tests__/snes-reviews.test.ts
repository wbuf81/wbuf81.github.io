import {
  extractReviewBox, reviewFields, snesValue, parseEgm, parseNintendoPower, reviewScores,
} from '@/lib/snes/reviews';

const SUPER_MARIO_WORLD = `{{Infobox video game}}
Text.
{{Video game reviews
| SNES = true
| GBA = true
| GR_SNES = 94.44%<ref>{{cite web |url=http://gamerankings |title=x}}</ref>
| MC_GBA = 92/100
| EGM_GBA = 9/10, 9/10, 9/10
| EGM_SNES = 9/10, 9/10, 9/10, 9/10{{sfn|Harris|1991|p=18}}
| GI_SNES = 10/10
| rev1 = ''[[Nintendo Power]]''
| rev1Score = 4.5/5 (SNES)
}}
More text {{other template}}.`;

const F_ZERO = `{{Video game reviews
| GR = 83% (SNES & Wii)
| GSpot = 8/10 (Wii)
| IGN = 7.5/10 (SNES)
| MM = 90%
| rev1 = ''[[Entertainment Weekly]]''
| rev1Score = A− (SNES)
}}`;

const MORTAL_KOMBAT_II = `{{Video game reviews
| GR = SMD: 86%
| EGM = SNES: 9/10, 8/10, 8/10, 8/10
| Fam = SNES: 8/10, 7/10, 7/10, 6/10<ref>{{cite magazine |last1=Noda |first1=Minoru}}</ref>
| GI = SSAT: 7/10
}}`;

const ACTRAISER = `{{video game reviews
| EGM = 9/10, 8/10,<br/>9/10, 8/10
| TOT = (UK) 91%
}}`;

describe('extractReviewBox', () => {
  test('returns the whole template, nested braces and all', () => {
    const box = extractReviewBox(SUPER_MARIO_WORLD)!;
    expect(box.startsWith('{{Video game reviews')).toBe(true);
    expect(box.endsWith('}}')).toBe(true);
    expect(box).toContain('rev1Score');
    expect(box).not.toContain('More text');
  });
  test('is null when the article has no review box', () => {
    expect(extractReviewBox('{{Infobox video game}} Just prose.')).toBeNull();
  });
});

describe('reviewFields', () => {
  test('uses only _SNES keys in a multi-platform box, plus named reviewers', () => {
    expect(reviewFields(extractReviewBox(SUPER_MARIO_WORLD)!)).toEqual({
      GR: '94.44%',
      EGM: '9/10, 9/10, 9/10, 9/10',
      GI: '10/10',
      'Nintendo Power': '4.5/5',
    });
  });
  test('drops values tagged for other platforms and strips SNES tags', () => {
    expect(reviewFields(F_ZERO)).toEqual({ GR: '83%', IGN: '7.5/10', MM: '90%', 'Entertainment Weekly': 'A−' });
  });
  test('reads platform prefixes', () => {
    expect(reviewFields(MORTAL_KOMBAT_II)).toEqual({
      EGM: '9/10, 8/10, 8/10, 8/10',
      Fam: '8/10, 7/10, 7/10, 6/10',
    });
  });
  test('turns line breaks into spaces and keeps non-platform tags', () => {
    expect(reviewFields(ACTRAISER)).toEqual({ EGM: '9/10, 8/10, 9/10, 8/10', TOT: '(UK) 91%' });
  });
});

describe('score parsers', () => {
  test('snesValue', () => {
    expect(snesValue('SNES: 9/10, GEN: 8/10')).toBe('9/10');
    expect(snesValue('86% (Genesis)')).toBeNull();
  });
  test('parseEgm reads every reviewer', () => {
    expect(parseEgm('9/10, 9.5/10, 9.5/10, 9/10')).toEqual([9, 9.5, 9.5, 9]);
    expect(parseEgm('7.75/10')).toEqual([7.75]);
    expect(parseEgm('A')).toBeNull();
  });
  test('parseNintendoPower keeps its scale', () => {
    expect(parseNintendoPower('4.5/5')).toEqual({ score: 4.5, scale: 5 });
    expect(parseNintendoPower('16 / 20')).toEqual({ score: 16, scale: 20 });
    expect(parseNintendoPower('great')).toBeNull();
    expect(parseNintendoPower('6/5')).toBeNull();
  });
  test('reviewScores splits EGM and Nintendo Power from the rest', () => {
    expect(reviewScores({ EGM: '9/10, 8/10', NP: '3.9/5', GI: '9.5/10' })).toEqual({
      egm: [9, 8], nintendoPower: { score: 3.9, scale: 5 }, other: { GI: '9.5/10' },
    });
    expect(reviewScores({})).toEqual({ egm: null, nintendoPower: null, other: {} });
  });
});
