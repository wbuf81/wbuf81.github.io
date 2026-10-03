import {
  createEmptyGrid,
  lockPiece,
  findFullRows,
  clearRows,
  collides,
  getShape,
  ghostY,
  POINTS,
  ROWS,
  COLS,
  isGameKey,
} from '@/lib/tetris';

test('a full row is found and cleared, and the rows above drop', () => {
  const g = createEmptyGrid();
  g[ROWS - 1] = Array(COLS).fill(1);
  g[ROWS - 2][0] = 2;
  expect(findFullRows(g)).toEqual([ROWS - 1]);
  clearRows(g, [ROWS - 1]);
  expect(g[ROWS - 1][0]).toBe(2);
  expect(g[0].every((c) => c === null)).toBe(true);
  expect(g).toHaveLength(ROWS);
});

test('a row with one gap is not full', () => {
  const g = createEmptyGrid();
  g[ROWS - 1] = Array(COLS).fill(3);
  g[ROWS - 1][4] = null;
  expect(findFullRows(g)).toEqual([]);
});

test('pieces collide with the walls, the floor and the stack', () => {
  const g = createEmptyGrid();
  const o = getShape(1, 0);
  expect(collides(g, o, -1, 0)).toBe(true);
  expect(collides(g, o, COLS - 1, 0)).toBe(true);
  expect(collides(g, o, 0, ROWS - 1)).toBe(true);
  expect(collides(g, o, 0, ROWS - 2)).toBe(false);
  lockPiece(g, { type: 1, rotation: 0, x: 0, y: ROWS - 2 });
  expect(collides(g, o, 0, ROWS - 3)).toBe(true);
});

test('a hard drop lands on the stack', () => {
  const g = createEmptyGrid();
  g[ROWS - 1][0] = 5;
  expect(ghostY(g, { type: 1, rotation: 0, x: 0, y: 0 })).toBe(ROWS - 3);
});

test('scoring table and the keys the game takes', () => {
  expect(POINTS).toEqual([0, 100, 300, 500, 800]);
  for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ']) expect(isGameKey(k)).toBe(true);
  for (const k of ['Tab', 'Enter', 'a', 'PageDown']) expect(isGameKey(k)).toBe(false);
});
