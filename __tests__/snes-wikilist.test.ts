import { parseDts, parseTitleCell, parseSoftwareList, parseChipList, normalizeChip } from '@/lib/snes/wikiList';
import { splitTopLevel, linkText, stripNoise } from '@/lib/snes/wikitext';

const LIST = `intro text
{|class="wikitable plainrowheaders sortable sticky-header-multi" id="softwarelist"
|-
!rowspan="2"|Title<ref name="NintendoList">{{cite web |url=http://x |title=Super NES Games}}</ref>
!rowspan="2"|Developer(s)
!rowspan="2"|Publisher(s)
!colspan="3"|Release date
!rowspan="2" class="unsortable"|{{abbr|Ref.|Reference}}
|-
!style="width:12%;"|Japan
!style="width:12%;"|North America
!style="width:12%;"|PAL region
|-
|id="0–9"|''[[3 Ninjas Kick Back (video game)|3 Ninjas Kick Back]]''
|[[Malibu Interactive]]
|[[Sony Imagesoft]]
|{{unreleased}}||{{dts|1994|6}}||{{unreleased}}
|
|-
|''[[3×3 Eyes#Video games|3×3 Eyes Jūma Hōkan]]''
|System Supply N-Tech
|[[Banpresto]]
|{{dts|1995|12|22}}||{{unreleased}}||{{unreleased}}
|
|-
|data-sort-value="7th Saga"|''[[The 7th Saga]]''<br />•''Elnard''<sup>JP</sup>
|[[Produce (company)|Produce]]
|{{vgrtbl|JP|[[Gameplan21]]|NA|[[Enix]]}}
|{{dts|1993|4|23}}||{{dts|1993|9}}||{{unreleased}}
|
|-
|''[[A.S.P. Air Strike Patrol]]''<br />•''Desert Fighter''<sup>PAL</sup>
|Opus
|{{vgrtbl|JP/NA|[[SETA Corporation|SETA]]|PAL|[[System 3 (company)|System 3]]}}
|{{unreleased}}||{{dts|1995|1}}||{{unreleased}}
|
|-
|''[[Super Metroid]]''
||{{hlist|[[Nintendo R&D1]]|[[Intelligent Systems]]}}
|[[Nintendo]]
|{{dts|1994|3|19}}||{{dts|1994|4|18}}||{{dts|1994|7|28}}
|<ref>{{cite web |url=http://gamespot |title=''Super Metroid'' Release}}</ref>
|-
|''Kirby Bundle''
|[[HAL Laboratory]] <small>(''Kirby's Avalanche'' only)</small><br />[[Compile (company)|Compile]]
|[[Nintendo]]
|{{unreleased}}||{{dts|1994|10|}}||{{unreleased}}
|
|-
|''[[Super Bomberman 3]]''
|[[Hudson Soft]]
|[[Hudson Soft]]
|{{dts|1995|4|28}}||{{unreleased}}{{efn|name=Bomberman|Released as part of ''[[Super Bomberman Collection]]'' (2026)}}||{{dts|1995|5}}
|
|}
after`;

describe('parseDts', () => {
  test('reads day, month and year precision, tolerating a trailing empty field', () => {
    expect(parseDts('{{dts|1994|4|18}}')).toEqual({ date: '1994-04-18', precision: 'day' });
    expect(parseDts('{{dts|1994|10|}}')).toEqual({ date: '1994-10', precision: 'month' });
    expect(parseDts('{{dts|1993}}')).toEqual({ date: '1993', precision: 'year' });
    expect(parseDts('{{unreleased}}')).toBeNull();
  });
});

describe('wikitext helpers', () => {
  test('splitTopLevel ignores separators inside links and templates', () => {
    expect(splitTopLevel('JP|[[A|B]]|NA|{{x|y}}')).toEqual(['JP', '[[A|B]]', 'NA', '{{x|y}}']);
    expect(splitTopLevel('{{dts|1993|4}}||{{unreleased}}', '||')).toEqual(['{{dts|1993|4}}', '{{unreleased}}']);
  });
  test('linkText keeps display text and drops italics', () => {
    expect(linkText("''[[Produce (company)|Produce]]''")).toBe('Produce');
  });
  test('stripNoise drops refs, comments, small and sup tags, and efn notes', () => {
    expect(stripNoise('A<ref name="x"/>B<ref>c</ref><!-- d -->C<small>(e)</small><sup>JP</sup>{{efn|f}}')).toBe('ABC');
  });
});

describe('parseSoftwareList', () => {
  const { rows } = parseSoftwareList(LIST);
  const byTitle = Object.fromEntries(rows.map((r) => [r.title, r]));

  test('keeps only rows with a North American date', () => {
    expect(rows.map((r) => r.title)).toEqual([
      '3 Ninjas Kick Back',
      'The 7th Saga',
      'A.S.P. Air Strike Patrol',
      'Super Metroid',
      'Kirby Bundle',
    ]);
  });
  test('reads the article, the NA date and precision', () => {
    expect(byTitle['3 Ninjas Kick Back']).toMatchObject({
      article: '3 Ninjas Kick Back (video game)', releasedUS: '1994-06', datePrecision: 'month',
    });
    expect(byTitle['Super Metroid']).toMatchObject({ releasedUS: '1994-04-18', datePrecision: 'day' });
    expect(byTitle['Kirby Bundle']).toMatchObject({ article: null, releasedUS: '1994-10' });
  });
  test('picks the North American publisher out of a region table', () => {
    expect(byTitle['The 7th Saga'].publisher).toBe('Enix');
    expect(byTitle['A.S.P. Air Strike Patrol'].publisher).toBe('SETA');
  });
  test('reads developers from hlist and line breaks, without the small print', () => {
    expect(byTitle['Super Metroid'].developers).toEqual(['Nintendo R&D1', 'Intelligent Systems']);
    expect(byTitle['Kirby Bundle'].developers).toEqual(['HAL Laboratory', 'Compile']);
  });
  test('throws when the table is missing', () => {
    expect(() => parseSoftwareList('no table here')).toThrow(/softwarelist/);
  });
});

describe('parseTitleCell', () => {
  test('an alternate title on its own line is not part of the title', () => {
    expect(parseTitleCell("''[[Sensible Soccer|International Sensible Soccer: World Champions]]''\n•''Championship Soccer '94''")).toEqual({
      title: 'International Sensible Soccer: World Champions', article: 'Sensible Soccer',
    });
  });
  test('a section link is not the game article', () => {
    expect(parseTitleCell("''[[3×3 Eyes#Video games|3×3 Eyes Jūma Hōkan]]''")).toEqual({
      title: '3×3 Eyes Jūma Hōkan', article: null,
    });
  });
});

describe('chips', () => {
  const CHIPS = `==Super FX==
text
==List of Super NES games with enhancement chips==
{|class="wikitable sortable" width=100%
|-
!Title
!Chip
!Year
!Developer
!Publisher
|-
|''[[Mega Man X2]]'' <sup>NA, PAL</sup><br />''Rockman X2'' <sup>JP</sup>||CX4||1994||[[Capcom]]||Capcom (NA, JP, PAL)
|-
|''[[Pilotwings (video game)|Pilotwings]]''||DSP-1/1B<ref group=note>Attract mode crash.</ref>||1990||[[Nintendo EAD]]||[[Nintendo]]
|-
|''[[Super Mario RPG]]''||SA1||1996||[[Square]]||[[Nintendo]]
|-
|''[[Mystery Game]]''||RTC-9999||1996||X||Y
|}`;
  test('normalizes chip names', () => {
    expect(normalizeChip('Super FX GSU-2')).toBe('Super FX 2');
    expect(normalizeChip('Super FX GSU-1')).toBe('Super FX');
    expect(normalizeChip('SPC7110, RTC-4513')).toBe('SPC7110');
    expect(normalizeChip('OBC-1')).toBe('OBC1');
    expect(normalizeChip('Rockwell RC2324DPL')).toBeNull();
  });
  test('parses the games table, skipping unknown chips', () => {
    expect(parseChipList(CHIPS)).toEqual([
      { title: 'Mega Man X2', article: 'Mega Man X2', chip: 'Cx4' },
      { title: 'Pilotwings', article: 'Pilotwings (video game)', chip: 'DSP-1' },
      { title: 'Super Mario RPG', article: 'Super Mario RPG', chip: 'SA-1' },
    ]);
  });
});

describe('rows the parser cannot read are counted, never silently dropped', () => {
  const table = (rows: string) => `{|class="wikitable" id="softwarelist"
|-
!Title
!Developer(s)
!Publisher(s)
!Japan
!North America
!PAL region
|-
${rows}
|}`;
  test('an NA date that is neither {{dts}} nor a known non-release counts as skipped', () => {
    const { rows, skipped } = parseSoftwareList(table(`|''[[A]]''
|X
|Y
|{{unreleased}}||October 1992||{{unreleased}}
|-
|''[[B]]''
|X
|Y
|{{unreleased}}||{{dts|1992|October|10}}||{{unreleased}}
|-
|''[[C]]''
|X
|Y
|{{dts|1993|1|1}}||{{n/a|Cancelled}}||{{unreleased}}
|-
|''[[D]]''
|X
|Y
|{{dts|1993|1|1}}||{{unreleased}}||—`));
    expect(rows).toEqual([]);
    expect(skipped).toBe(2);
  });
  test('a row whose title is a row header (! scope="row") is still a row', () => {
    const { rows } = parseSoftwareList(table(`! scope="row" | ''[[Super Metroid]]''
|[[Nintendo R&D1]]
|[[Nintendo]]
|{{dts|1994|3|19}}||{{dts|1994|4|18}}||{{dts|1994|7|28}}`));
    expect(rows.map((r) => r.title)).toEqual(['Super Metroid']);
  });
});
