import { EMPTY_STATE, STARTERS, addPick, compareReleased, fromSlug, norm, cleanName, isPicked, removePick, replacePick, parseQuery, recommend, toQuery, type Top8Game, type Top8State } from '@/lib/snes/top8';

const G = (slug: string, o: Partial<Top8Game> = {}): Top8Game => ({ slug, title: slug.toUpperCase(), year: '1993', released: '1993-06-01', genres: [], series: null, similar: [], score: 7, ...o });
const games = [
  G('metroid', { genres: ['Platform', 'Adventure'], similar: ['castlevania', 'megaman'], score: 9.5 }),
  G('castlevania', { genres: ['Platform'], score: 8.5 }),
  G('megaman', { genres: ['Platform'], series: 'Mega Man', score: 8.8 }),
  G('megaman7', { genres: ['Platform'], series: 'Mega Man', score: 7.4 }),
  G('golf', { genres: ['Sport'], score: 9.0 }),
  G('puzzle', { genres: ['Puzzle'], score: 8.9 }),
  ...['super-mario-world', 'the-legend-of-zelda-a-link-to-the-past', 'super-metroid', 'chrono-trigger', 'donkey-kong-country', 'super-mario-kart', 'final-fantasy-iii', 'street-fighter-ii-the-world-warrior'].map((s) => G(s)),
];
const st = (slots: (string | null)[], extra: Partial<Top8State> = {}): Top8State => ({ ...EMPTY_STATE, slots: [...slots, ...Array(8 - slots.length).fill(null)], ...extra });

describe('recommend', () => {
  it('starts with the spec\'s eight slugs in order and shows five rows', () => {
    expect(STARTERS).toEqual(['super-mario-world', 'the-legend-of-zelda-a-link-to-the-past', 'super-metroid', 'chrono-trigger', 'donkey-kong-country', 'super-mario-kart', 'final-fantasy-iii', 'street-fighter-ii-the-world-warrior']);
    const r = recommend(st([]), games);
    expect(r).toHaveLength(5);
    expect(r[0].slug).toBe('super-mario-world');
  });
  it('adds +1 per shared genre', () => {
    const gs = [G('p', { genres: ['A', 'B'], similar: ['x', 'y'] }), G('x', { genres: ['A', 'B'], score: 7 }), G('y', { genres: ['A'], score: 7 })];
    const r = recommend(st(['p']), gs);
    expect(r.map((e) => e.slug)).toEqual(['x', 'y']); // same score and similar weight; x shares two genres
  });
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

describe('name robustness', () => {
  const known = new Set(games.map((g) => g.slug));
  it('round-trips names with &, an apostrophe and non-ASCII', () => {
    const s = st(['metroid'], { name: "Zoë & Ann's" });
    expect(parseQuery(toQuery(s), known)?.name).toBe("Zoë & Ann's");
  });
  it('counts code points, so an astral 24th character cannot leave a lone surrogate', () => {
    const name = cleanName('x'.repeat(23) + '\u{1D49C}');
    expect(Array.from(name)).toHaveLength(24);
    expect(() => toQuery(st([], { name }))).not.toThrow();
    expect(parseQuery(toQuery(st([], { name })), known)?.name).toBe(name);
  });
  it('is idempotent', () => {
    for (const raw of ['a'.repeat(23) + ' b', '  <b>Wes</b> & Co!  ', 'x'.repeat(40)]) expect(cleanName(cleanName(raw))).toBe(cleanName(raw));
    expect(cleanName('a'.repeat(23) + ' b')).toBe('a'.repeat(23));
  });
});

describe('pick helpers', () => {
  it('isPicked', () => {
    expect(isPicked(st(['a', null, 'b']), 'b')).toBe(true);
    expect(isPicked(st(['a']), 'z')).toBe(false);
  });
  it('addPick fills the first empty slot, including a gap', () => {
    const r = addPick(st(['a', null, 'c']), 'b');
    expect(r.full).toBe(false);
    expect(r.state.slots.slice(0, 3)).toEqual(['a', 'b', 'c']);
  });
  it('addPick of an already-picked slug returns the same state, not full', () => {
    const s = st(['a']);
    const r = addPick(s, 'a');
    expect(r.state).toBe(s);
    expect(r.full).toBe(false);
  });
  it('addPick with no empty slot returns the same state, full', () => {
    const s = st(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    const r = addPick(s, 'z');
    expect(r.state).toBe(s);
    expect(r.full).toBe(true);
  });
  it('addPick of an already-picked slug on a full list is not full', () => {
    expect(addPick(st(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']), 'c').full).toBe(false);
  });
  it('removePick nulls the slot and keeps the others in place; unknown slug is a no-op', () => {
    const s = st(['a', 'b', 'c']);
    expect(removePick(s, 'b').slots.slice(0, 3)).toEqual(['a', null, 'c']);
    expect(removePick(s, 'zz')).toBe(s);
  });
  it('replacePick overwrites, and empties the slug\'s other slot', () => {
    const r = replacePick(st(['a', 'b', 'c']), 0, 'c');
    expect(r.slots.slice(0, 3)).toEqual(['c', 'b', null]);
    expect(replacePick(st(['a', 'b']), 1, 'b').slots.slice(0, 2)).toEqual(['a', 'b']);
    expect(replacePick(st(['a']), 5, 'x').slots[5]).toBe('x');
  });
  it('replacePick ignores a non-integer or out-of-range index', () => {
    const s = st(['a']);
    for (const i of [-1, 8, 1.5, NaN]) expect(replacePick(s, i, 'x')).toBe(s);
  });
  it('does not mutate its input', () => {
    const s = st(['a', 'b']);
    const copy = JSON.stringify(s);
    addPick(s, 'q'); removePick(s, 'a'); replacePick(s, 0, 'b');
    expect(JSON.stringify(s)).toBe(copy);
  });
});

describe('small helpers', () => {
  it('compareReleased orders by date, with month-only and year-only dates after the dated ones', () => {
    const dates = ['1994-03', '1993', '1994-03-15', '1991-08-23', '1994-04-01', '1993-12-31'];
    expect(dates.slice().sort(compareReleased)).toEqual(['1991-08-23', '1993-12-31', '1993', '1994-03-15', '1994-03', '1994-04-01']);
    expect(compareReleased('1994-03-15', '1994-03-15')).toBe(0);
  });
  it('norm drops case, accents and punctuation', () => {
    expect(norm('  Pokémon: STREET-Fighter II!! ')).toBe('pokemon street fighter ii');
  });
  it('fromSlug title-cases a slug', () => {
    expect(fromSlug('super-metroid')).toBe('Super Metroid');
  });
});

