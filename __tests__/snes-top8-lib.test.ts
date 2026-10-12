import { EMPTY_STATE, STARTERS, cleanName, parseQuery, recommend, toQuery, type Top8Game, type Top8State } from '@/lib/snes/top8';

const G = (slug: string, o: Partial<Top8Game> = {}): Top8Game => ({ slug, title: slug.toUpperCase(), year: '1993', genres: [], series: null, similar: [], score: 7, ...o });
const games = [
  G('metroid', { genres: ['Platform', 'Adventure'], similar: ['castlevania', 'megaman'], score: 9.5 }),
  G('castlevania', { genres: ['Platform'], score: 8.5 }),
  G('megaman', { genres: ['Platform'], series: 'Mega Man', score: 8.8 }),
  G('megaman7', { genres: ['Platform'], series: 'Mega Man', score: 7.4 }),
  G('golf', { genres: ['Sport'], score: 9.0 }),
  G('puzzle', { genres: ['Puzzle'], score: 8.9 }),
  ...['super-mario-world', 'the-legend-of-zelda-a-link-to-the-past', 'super-metroid', 'chrono-trigger', 'donkey-kong-country', 'super-mario-kart'].map((s) => G(s)),
];
const st = (slots: (string | null)[], extra: Partial<Top8State> = {}): Top8State => ({ ...EMPTY_STATE, slots: [...slots, ...Array(8 - slots.length).fill(null)], ...extra });

describe('recommend', () => {
  it('suggests the starters when nothing is picked, skipping denied ones', () => {
    const r = recommend(st([], { denied: ['super-mario-world'] }), games);
    expect(r[0]).toEqual({ slug: 'the-legend-of-zelda-a-link-to-the-past', reason: 'a classic to start with' });
    expect(r.every((x) => STARTERS.includes(x.slug))).toBe(true);
  });
  it('weights similar over series over genre and explains the strongest signal', () => {
    const r = recommend(st(['metroid', 'megaman7']), games);
    expect(r[0]).toEqual({ slug: 'megaman', reason: 'because you picked METROID' }); // similar 3 + series 2 + genre 1 + 0.88
    expect(r[1]).toEqual({ slug: 'castlevania', reason: 'because you picked METROID' });
    expect(r.map((x) => x.slug)).not.toContain('metroid');
  });
  it('falls back to well-scored genre matches when there are too few candidates', () => {
    const r = recommend(st(['golf']), games);
    expect(r).toEqual([]); // no other Sport game scores 8.0+ in this fixture
    const r2 = recommend(st(['castlevania']), games);
    expect(r2.find((x) => x.slug === 'metroid')?.reason).toBe('you like platform games');
  });
  it('never suggests denied or picked games, and is deterministic', () => {
    const s = st(['metroid'], { denied: ['castlevania'] });
    expect(recommend(s, games).map((x) => x.slug)).not.toContain('castlevania');
    expect(recommend(s, games)).toEqual(recommend(s, games));
  });
});

describe('query', () => {
  const known = new Set(games.map((g) => g.slug));
  it('round-trips slots with empties, theme and name', () => {
    const s = st(['metroid', null, 'golf'], { theme: 'crystal', name: "Wes's pal" });
    const q = toQuery(s);
    expect(q).toBe("?g=metroid,_,golf,_,_,_,_,_&skin=crystal&n=Wes's%20pal");
    expect(parseQuery(q, known)).toEqual({ slots: s.slots, theme: 'crystal', name: "Wes's pal" });
  });
  it('drops unknown and duplicate slugs, keeps at most 8, ignores a bad skin', () => {
    const p = parseQuery('?g=metroid,nope,metroid,golf,a,b,c,d,e,f,g&skin=evil', known)!;
    expect(p.slots).toEqual(['metroid', 'golf', null, null, null, null, null, null]);
    expect(p.theme).toBeUndefined();
  });
  it('returns null when the query has none of its keys', () => {
    expect(parseQuery('?w=1994-04-18', known)).toBeNull();
  });
});

describe('cleanName', () => {
  it('keeps letters, numbers, spaces and a few marks, trims, caps at 24', () => {
    expect(cleanName('  <b>Wes</b> & Co!  ')).toBe('bWesb & Co!');
    expect(cleanName('x'.repeat(40))).toHaveLength(24);
    expect(cleanName('Zoë-Ann_9.')).toBe('Zoë-Ann_9.');
  });
});
