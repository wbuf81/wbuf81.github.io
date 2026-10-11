import { indexBoxart, parseLibretroName } from '@/lib/snes/boxart';
import { normalizeTitle } from '@/lib/snes/titles';

const PATHS = [
  'Named_Boxarts/7th Saga, The (USA).png',
  'Named_Boxarts/F-Zero (Europe).png',
  'Named_Boxarts/F-Zero (USA).png',
  'Named_Boxarts/F-Zero (USA, Europe) (Virtual Console, Classic Mini, Switch Online).png',
  "Named_Boxarts/Super Mario World 2 - Yoshi's Island (USA) (Rev 1).png",
  "Named_Boxarts/Super Mario World 2 - Yoshi's Island (USA).png",
  'Named_Boxarts/Super Metroid (Japan, USA) (En,Ja).png',
  'Named_Boxarts/Super Metroid - Redux (USA).png',
  'Named_Boxarts/Tetris _ Dr. Mario (USA).png',
  'Named_Boxarts/Street Fighter II (USA) (Beta).png',
  'Named_Boxarts/2020 Super Baseball (Japan).png',
];

test('only US, non-reissue, non-prototype art qualifies', () => {
  expect(parseLibretroName('Named_Boxarts/F-Zero (Europe).png')).toBeNull();
  expect(parseLibretroName('Named_Boxarts/F-Zero (USA, Europe) (Virtual Console, Classic Mini, Switch Online).png')).toBeNull();
  expect(parseLibretroName('Named_Boxarts/Street Fighter II (USA) (Beta).png')).toBeNull();
  expect(parseLibretroName('Named_Boxarts/Super Metroid (Japan, USA) (En,Ja).png')).toMatchObject({ key: 'super metroid' });
});

test('indexes the best US file per title', () => {
  const index = indexBoxart(PATHS);
  expect(index.get(normalizeTitle('The 7th Saga'))).toBe('7th Saga, The (USA).png');
  expect(index.get(normalizeTitle('F-Zero'))).toBe('F-Zero (USA).png');
  expect(index.get(normalizeTitle("Super Mario World 2: Yoshi's Island"))).toBe("Super Mario World 2 - Yoshi's Island (USA).png");
  expect(index.get(normalizeTitle('Super Metroid'))).toBe('Super Metroid (Japan, USA) (En,Ja).png');
  expect(index.get(normalizeTitle('Tetris & Dr. Mario'))).toBe('Tetris _ Dr. Mario (USA).png');
  expect(index.has(normalizeTitle('Street Fighter II'))).toBe(false);
});

test('arcade-cabinet, promo and symbolic-link variants never beat the retail box', () => {
  const index = indexBoxart([
    'Named_Boxarts/ActRaiser (USA) (Arcade).png',
    'Named_Boxarts/ActRaiser (USA).png',
    "Named_Boxarts/George Foreman's KO Boxing (USA) (Doritos Promo).png",
    'Named_Boxarts/Relief Pitcher (USA) - SymbolicLink.png',
    'Named_Boxarts/Relief Pitcher (USA).png',
  ]);
  expect(index.get(normalizeTitle('ActRaiser'))).toBe('ActRaiser (USA).png');
  expect(index.get(normalizeTitle('Relief Pitcher'))).toBe('Relief Pitcher (USA).png');
  // A promo printing is still that game's box: kept, but only when there is nothing better.
  expect(index.get(normalizeTitle("George Foreman's KO Boxing"))).toBe("George Foreman's KO Boxing (USA) (Doritos Promo).png");
  expect(indexBoxart(['Named_Boxarts/X (USA) (Promo).png', 'Named_Boxarts/X (USA).png']).get('x')).toBe('X (USA).png');
});
