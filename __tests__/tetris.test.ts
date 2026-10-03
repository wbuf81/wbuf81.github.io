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
  handleKey,
  type TetrisState,
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


function playing(over: Partial<TetrisState> = {}): TetrisState {
  return {
    grid: createEmptyGrid(), active: { type: 1, rotation: 0, x: 4, y: 0 }, bag: [2, 3, 4, 5, 6, 0, 1], mode: 'player',
    score: 0, lines: 0, lastGravity: 0, lockTimer: null, aiTarget: null, lastAiStep: 0, lastInput: 0,
    lineClear: null, gameOver: null, celebration: null, ...over,
  };
}

test('keys belong to the page while the game plays itself', () => {
  const s = playing({ mode: 'auto' });
  expect(handleKey(s, 'ArrowLeft', 1)).toBe(false);
  expect(s.active!.x).toBe(4);
});

test('other keys always belong to the page', () => {
  expect(handleKey(playing(), 'Tab', 1)).toBe(false);
});

test('a game key moves the piece while playing', () => {
  const s = playing();
  expect(handleKey(s, 'ArrowLeft', 5)).toBe(true);
  expect(s.active!.x).toBe(3);
  expect(s.lastInput).toBe(5);
});

test('space hard-drops the piece to the floor', () => {
  const s = playing();
  expect(handleKey(s, ' ', 1)).toBe(true);
  expect(s.grid[ROWS - 1][4]).toBe(1);
  expect(s.grid[ROWS - 2][5]).toBe(1);
});

test('game keys stay the game\'s during a line clear and game over, so the page never scrolls mid-game', () => {
  const clearing = playing({ active: null, lineClear: { rows: [ROWS - 1], startTime: 0 } });
  expect(handleKey(clearing, 'ArrowDown', 1)).toBe(true);
  const over = playing({ gameOver: { phase: 'fill', row: 3, lastRowTime: 0, finalScore: 0, finalLines: 0 } });
  expect(handleKey(over, ' ', 1)).toBe(true);
  expect(over.grid.every((row) => row.every((c) => c === null))).toBe(true);
});
