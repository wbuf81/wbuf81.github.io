import { tableGrid } from '@/lib/snes/wikitext';
import { parseChart, parseNews, popText, firstArticle } from '@/lib/snes/pop';

const HOT = `{| class="wikitable"
! width=31|{{abbr|No.|Hot 100 consecutive No.1}}
!align="center"|Issue date
!align="center"|Song
!align="center"|Artist(s)
!align="center"|{{abbr|Ref.|References}}
|-
| bgcolor=#EDEAE0 align=center rowspan=3|753
|align="center"|August 17
|bgcolor=#FFFF99 align="center" rowspan="3"| "[[(Everything I Do) I Do It for You]]"{{dagger}}
|align="center" rowspan="3"| [[Bryan Adams]]
|align="center"|<ref>{{cite web|url=x|title=August 17, 1991}}</ref>
|-
|align="center"|August 24
|align="center"|<ref>x</ref>
|-
|align="center"|August 31
|align="center"|<ref>x</ref>
|}`;

const ALBUMS = `{| class="wikitable sortable plainrowheaders" style="text-align: center"
! scope=col| Issue date
! scope=col| Album
! scope=col| Artist(s)
! scope=col| Label
|-
! scope="row" | {{dts|August 24}}
| rowspan="1" | ''[[Unforgettable... with Love]]''
| {{Sortname|Natalie|Cole}}
| [[Elektra Records|Elektra]]
|-
! scope="row" | {{dts|August 31}}
|style="text-align: center;" rowspan=4|''[[Metallica (album)|Metallica]]''
|style="text-align: center;" rowspan=4|[[Metallica]]
| Elektra
|}`;

const BOX = `{| class="wikitable sortable"
! {{abbr|#|Week number}}
! Weekend end date
! Film
! Box office
! Notes
|-
| 33 || {{dts|1991|August|18}} || rowspan="2" | ''[[Hot Shots!]]'' || $6,330,309 || ||
|-
| 34 || {{dts|1991|August|25}} || $4,676,467 || ||
|}`;

const NEWS = `== Incumbents ==
* August 3 – not an event (incumbents)
== Events ==
=== August ===
* August 19 – [[Hurricane Bob]] hits the Northeastern United States.
* August 23 – The [[Super Nintendo Entertainment System]] is first released in the United States.<ref>x</ref>
* August 26
** The [[WWE|World Wrestling Federation]] holds its [[SummerSlam (1991)|SummerSlam]] event.
** Second thing that day.
=== September ===
* September 2 &ndash; The US recognizes the independence of [[Estonia]].
== Births ==
* August 10 – [[Maci Bookout]], reality star
`;

describe('tableGrid', () => {
  it('expands rowspan cells down into later rows', () => {
    const { header, rows } = tableGrid(HOT);
    expect(header).toEqual(['No.', 'Issue date', 'Song', 'Artist(s)', 'Ref.']);
    expect(rows).toHaveLength(3);
    expect(rows[2][1].trim()).toBe('August 31');
    expect(popText(rows[2][2])).toBe('(Everything I Do) I Do It for You');
    expect(popText(rows[2][3])).toBe('Bryan Adams');
  });
});

describe('parseChart', () => {
  it('reads Hot 100 rows with carried-down songs', () => {
    expect(parseChart(HOT, 1991)).toEqual([
      { date: '1991-08-17', title: '(Everything I Do) I Do It for You', by: 'Bryan Adams', article: '(Everything I Do) I Do It for You' },
      { date: '1991-08-24', title: '(Everything I Do) I Do It for You', by: 'Bryan Adams', article: '(Everything I Do) I Do It for You' },
      { date: '1991-08-31', title: '(Everything I Do) I Do It for You', by: 'Bryan Adams', article: '(Everything I Do) I Do It for You' },
    ]);
  });
  it('reads row-header dates and Sortname artists on the Billboard 200', () => {
    const rows = parseChart(ALBUMS, 1991);
    expect(rows[0]).toEqual({ date: '1991-08-24', title: 'Unforgettable... with Love', by: 'Natalie Cole', article: 'Unforgettable... with Love' });
    expect(rows[1]).toMatchObject({ date: '1991-08-31', title: 'Metallica', by: 'Metallica', article: 'Metallica (album)' });
  });
  it('reads ||-joined box office rows with gross and a carried film', () => {
    expect(parseChart(BOX, 1991)).toEqual([
      { date: '1991-08-18', title: 'Hot Shots!', by: null, article: 'Hot Shots!', gross: '$6,330,309' },
      { date: '1991-08-25', title: 'Hot Shots!', by: null, article: 'Hot Shots!', gross: '$4,676,467' },
    ]);
  });
  it('throws when no table has a date and title column', () => {
    expect(() => parseChart('{|\n! A\n! B\n|-\n| 1 || 2\n|}', 1991)).toThrow(/no chart table/);
  });
});

describe('parseNews', () => {
  it('reads only the Events section, including nested bullets under a date', () => {
    expect(parseNews(NEWS, 1991)).toEqual([
      { date: '1991-08-19', text: 'Hurricane Bob hits the Northeastern United States.' },
      { date: '1991-08-23', text: 'The Super Nintendo Entertainment System is first released in the United States.' },
      { date: '1991-08-26', text: 'The World Wrestling Federation holds its SummerSlam event.' },
      { date: '1991-08-26', text: 'Second thing that day.' },
      { date: '1991-09-02', text: 'The US recognizes the independence of Estonia.' },
    ]);
  });
});

describe('cell helpers', () => {
  it('strips quotes, italics, links, refs and daggers', () => {
    expect(popText(`"[[A|B]]"{{dagger}}<ref>x</ref>`)).toBe('B');
    expect(firstArticle(`''[[Metallica (album)|Metallica]]''`)).toBe('Metallica (album)');
    expect(firstArticle('plain')).toBeNull();
  });
  it('strips bare daggers and joins double A-sides', () => {
    expect(popText(`''[[Titanic (1997 film)|Titanic]]'' †`)).toBe('Titanic');
    expect(popText(`"[[Candle in the Wind 1997]]" / <br>"[[Something About the Way You Look Tonight]]"`)).toBe('Candle in the Wind 1997 / Something About the Way You Look Tonight');
  });
});
