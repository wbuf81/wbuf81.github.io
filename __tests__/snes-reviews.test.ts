import {
  extractReviewBox, reviewFields, snesValue, parseEgm, parseNintendoPower, reviewScores, contentForBatch,
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

// Real boxes from 11 Oct 2026 where the first parser leaked port scores onto the SNES game (final review).
describe('multi-platform values keep only the SNES part', () => {
  const box = (lines: string) => `{{Video game reviews\n${lines}\n}}`;

  test('one line per platform, tags in <small>, {{small}} and plain parentheses', () => {
    expect(reviewFields(box(
      '| GR = 81.17% {{small|(Genesis)}}<br />83% (SNES)<br />84% (IOS)\n' +
      '| EGM = 9/10, 9/10, 9/10, 8/10 <small>(Genesis)</small><br />8/10, 9/10, 9/10, 8/10, 8/10 <small>(SNES)</small><br />9/10, 8.5/10, 9/10, 9/10<small>(Sega CD)</small><br />6.5/10 <small>(Game Gear)</small>\n' +
      "| rev1 = ''Maximum''\n| rev1Score = 4/5 <small>(Windows 95)</small>\n" +
      "| rev2 = ''[[Mega (video game magazine)|Mega]]''\n| rev2Score = 92% <small>(Mega Drive)</small>",
    ))).toEqual({ GR: '83%', EGM: '8/10, 9/10, 9/10, 8/10, 8/10' });
  });

  test('a tag in front, wrapped in {{abbr}}, for another platform drops the value', () => {
    expect(reviewFields(box(
      '| CVG = ({{abbr|NG|Neo Geo}}) 94% <br /> ({{abbr|SMD|Sega Mega Drive}}) 85%\n' +
      '| EGM = ({{abbr|GEN|Sega Genesis}}) 4/10, 5/10, 4/10, 3/10\n' +
      "| rev1 = ''Maximum''\n| rev1Score = (NG) 2/5",
    ))).toEqual({});
  });

  test('picks the SNES line out of several, with SMD/GB/NES tags', () => {
    expect(reviewFields(box(
      '| CVG = 88/100 (SMD)<br>90/100 (SNES)\n| EGM = 8/10, 6/10, 6/10, 7/10, 7/10 (SMD)<br>30/40 (SNES)\n| NP = 14.2/20',
    ))).toEqual({ CVG: '90/100', EGM: '30/40', NP: '14.2/20' });
    expect(reviewFields(box('|EGM=4/10 (SMD) \n|NP=12/20 (GB)<br/>9.5/20 (NES)<br/>10.6/20 (SNES)'))).toEqual({ NP: '10.6/20' });
  });

  test('footnotes with nested templates are removed, not parsed as scores', () => {
    expect(reviewFields(box(
      "| EGM = 10/9/9/9{{efn|''EGM''{{'s}} four reviewers gave it one 10/10 score and three 9/10 scores.{{sfn|Semrad|1994|p=34}}}}{{sfn|Semrad|1994|p=34}}",
    ))).toEqual({ EGM: '10/9/9/9' });
  });

  test('platform-suffixed keys in a single-platform box are dropped', () => {
    expect(reviewFields(box("| CVG_ARC = 90%\n| rev1 = ''[[MegaTech]]''\n| rev1Score = Mega Drive: 92%\n| GI = 8/10"))).toEqual({ GI: '8/10' });
  });

  test('several platform prefixes on one line, and parenthesised tags mid-line', () => {
    expect(snesValue('NES: 13.5/20 SNES: 14.1/20')).toBe('14.1/20');
    expect(snesValue('8/10 (GEN) 9/10 (SNES)')).toBe('9/10');
    expect(snesValue('8/10 (Sega Genesis)')).toBeNull();
    expect(snesValue('Wii U: 7/10')).toBeNull();
    expect(snesValue('Genesis: 60% SNES: 64%')).toBe('64%');
  });

  test('an untagged score beside another platform is ambiguous and dropped', () => {
    expect(snesValue('9/10\n8/10 (GB)')).toBeNull();
  });
});

describe('EGM edge cases', () => {
  test('slash-run scores, the spelled-out name, and 40-point totals kept raw', () => {
    expect(parseEgm('10/9/9/9')).toEqual([10, 9, 9, 9]);
    expect(reviewScores({ 'Electronic Gaming Monthly': '8/10, 7/10' }).egm).toEqual([8, 7]);
    expect(reviewScores({ EGM: '30/40' })).toEqual({ egm: null, nintendoPower: null, other: { EGM: '30/40' } });
  });
});

describe('contentForBatch', () => {
  test('follows normalisation and whole-article redirects back to the asked name', () => {
    const query = {
      normalized: [{ from: 'super_Metroid', to: 'Super Metroid' }],
      redirects: [{ from: 'F-Zero (SNES)', to: 'F-Zero (video game)' }],
      pages: [
        { title: 'Super Metroid', revisions: [{ slots: { main: { content: 'SM text' } } }] },
        { title: 'F-Zero (video game)', revisions: [{ slots: { main: { content: 'FZ text' } } }] },
      ],
    };
    expect(contentForBatch(['super_Metroid', 'F-Zero (SNES)', 'Missing Game'], query)).toEqual({
      super_Metroid: 'SM text', 'F-Zero (SNES)': 'FZ text', 'Missing Game': null,
    });
  });
  test('a redirect to a section of another article is not that article', () => {
    const query = {
      redirects: [{ from: 'The Great Circus Mystery Starring Mickey & Minnie', to: 'The Magical Quest Starring Mickey Mouse', tofragment: 'Sequels' }],
      pages: [{ title: 'The Magical Quest Starring Mickey Mouse', revisions: [{ slots: { main: { content: 'MQ text' } } }] }],
    };
    expect(contentForBatch(['The Great Circus Mystery Starring Mickey & Minnie'], query)).toEqual({
      'The Great Circus Mystery Starring Mickey & Minnie': null,
    });
  });
});

test('list, interlanguage-link and star-rating templates are read as their text', () => {
  expect(reviewFields(`{{Video game reviews
| Fam = {{ubl|8/10, 7/10,|7/10, 6/10}}
| TOT = {{ubl|(UK) 54%,|(DE) 3-}}
| GamePro = {{Rating|4|5|score=3.8/5 stars}}
| rev1 = {{ill|Play Time (magazine)|lt=Play Time|de|Play Time|italics=yes}}
| rev1Score = 55% (SNES)
}}`)).toEqual({ Fam: '8/10, 7/10, 7/10, 6/10', TOT: '(UK) 54%, (DE) 3-', GamePro: '3.8/5 stars', 'Play Time': '55%' });
});
