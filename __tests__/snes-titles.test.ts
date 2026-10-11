import { normalizeTitle, slugify, stripDiacritics } from '@/lib/snes/titles';

describe('normalizeTitle', () => {
  test('moves a trailing article and drops a leading "the"', () => {
    expect(normalizeTitle('7th Saga, The (USA)')).toBe('7th saga');
    expect(normalizeTitle('The 7th Saga')).toBe('7th saga');
  });
  test('moves an article that sits before a subtitle', () => {
    expect(normalizeTitle('Legend of Zelda, The - A Link to the Past')).toBe(
      normalizeTitle('The Legend of Zelda: A Link to the Past'),
    );
  });
  test('treats a colon and a spaced dash alike', () => {
    expect(normalizeTitle("Super Mario World 2 - Yoshi's Island")).toBe('super mario world 2 yoshis island');
    expect(normalizeTitle("Super Mario World 2: Yoshi's Island")).toBe('super mario world 2 yoshis island');
  });
  test('turns Roman numerals II–VIII into digits, but leaves X alone', () => {
    expect(normalizeTitle('Street Fighter II Turbo')).toBe('street fighter 2 turbo');
    expect(normalizeTitle('Final Fantasy III')).toBe('final fantasy 3');
    expect(normalizeTitle('Mega Man X')).toBe('mega man x');
  });
  test('unifies "&" and "and", drops region tags and diacritics', () => {
    expect(normalizeTitle('Tetris & Dr. Mario (USA) (Rev 1)')).toBe('tetris and dr mario');
    expect(normalizeTitle('Pokémon Jūma')).toBe('pokemon juma');
  });
});

describe('slugify', () => {
  test('makes URL-safe slugs', () => {
    expect(slugify("Super Mario World 2: Yoshi's Island")).toBe('super-mario-world-2-yoshis-island');
    expect(slugify('Tetris & Dr. Mario')).toBe('tetris-and-dr-mario');
    expect(slugify('A.S.P. Air Strike Patrol')).toBe('a-s-p-air-strike-patrol');
    expect(slugify('Aaahh!!! Real Monsters')).toBe('aaahh-real-monsters');
    expect(slugify('')).toBe('');
  });
});

test('stripDiacritics', () => {
  expect(stripDiacritics('Shōgi')).toBe('Shogi');
});
