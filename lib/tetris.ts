/*
 * Tetris's rules, with no drawing: the pieces, wall kicks, collisions, line clears and the auto-play AI.
 * app/components/home/TetrisBoard.tsx draws and runs it; __tests__/tetris.test.ts covers it.
 */

// ── Constants ──────────────────────────────────────────────────────────
export const COLS = 10;
export const ROWS = 20;
export const IDLE_TIMEOUT = 10_000;
export const AI_STEP_MS = 100;
export const GRAVITY_MS = 500;
export const LOCK_DELAY_MS = 300;
export const LINE_FLASH_MS = 300;
export const GAME_OVER_ROW_MS = 60;
export const CELEBRATION_MS = 1500;
export const POINTS = [0, 100, 300, 500, 800]; // 0,1,2,3,4 lines

// SRS piece definitions: [pieceType][rotation][row][col]
export const PIECES: number[][][][] = [
  // I
  [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  // O
  [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
  ],
  // T
  [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  // S
  [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  // Z
  [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  // J
  [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  // L
  [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
];

// SRS wall kick data (non-I pieces)
export const WALL_KICKS: Record<string, [number, number][]> = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};

// SRS wall kick data (I piece)
export const I_WALL_KICKS: Record<string, [number, number][]> = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

// ── Types ──────────────────────────────────────────────────────────────
export interface ActivePiece {
  type: number;
  rotation: number;
  x: number;
  y: number;
}

export interface AiTarget {
  x: number;
  rotation: number;
}

export interface LineClearAnim {
  rows: number[];
  startTime: number;
}

export interface GameOverAnim {
  phase: 'fill' | 'clear';
  row: number;
  lastRowTime: number;
  finalScore: number;
  finalLines: number;
}

export interface TetrisCelebration {
  startTime: number;
  text: string;
}

export interface TetrisState {
  grid: (number | null)[][]; // stores piece type index, or null
  active: ActivePiece | null;
  bag: number[];
  mode: 'auto' | 'player';
  score: number;
  lines: number;
  lastGravity: number;
  lockTimer: number | null;
  aiTarget: AiTarget | null;
  lastAiStep: number;
  lastInput: number;
  lineClear: LineClearAnim | null;
  gameOver: GameOverAnim | null;
  celebration: TetrisCelebration | null;
}

// ── Helpers ────────────────────────────────────────────────────────────
export function createEmptyGrid(): (number | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function getShape(type: number, rotation: number): number[][] {
  return PIECES[type][rotation];
}

export function collides(grid: (number | null)[][], shape: number[][], px: number, py: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = px + c;
      const ny = py + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && grid[ny][nx] !== null) return true;
    }
  }
  return false;
}

export function lockPiece(grid: (number | null)[][], piece: ActivePiece): void {
  const shape = getShape(piece.type, piece.rotation);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const ny = piece.y + r;
      const nx = piece.x + c;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        grid[ny][nx] = piece.type;
      }
    }
  }
}

export function findFullRows(grid: (number | null)[][]): number[] {
  const rows: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (grid[r].every((cell) => cell !== null)) {
      rows.push(r);
    }
  }
  return rows;
}

export function clearRows(grid: (number | null)[][], rows: number[]): void {
  const sorted = [...rows].sort((a, b) => a - b);
  for (const row of sorted) {
    grid.splice(row, 1);
    grid.unshift(Array(COLS).fill(null));
  }
}

export function ghostY(grid: (number | null)[][], piece: ActivePiece): number {
  const shape = getShape(piece.type, piece.rotation);
  let gy = piece.y;
  while (!collides(grid, shape, piece.x, gy + 1)) {
    gy++;
  }
  return gy;
}

export function fillBag(bag: number[]): void {
  const set = [0, 1, 2, 3, 4, 5, 6];
  for (let i = set.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [set[i], set[j]] = [set[j], set[i]];
  }
  bag.push(...set);
}

export function spawnPiece(state: TetrisState): ActivePiece | null {
  if (state.bag.length < 7) fillBag(state.bag);
  const type = state.bag.shift()!;
  const shape = getShape(type, 0);
  const x = Math.floor((COLS - shape[0].length) / 2);
  const y = -1;

  if (collides(state.grid, shape, x, y) && collides(state.grid, shape, x, y - 1)) {
    return null;
  }

  return { type, rotation: 0, x, y };
}

// ── AI ─────────────────────────────────────────────────────────────────
export function computeAiTarget(grid: (number | null)[][], piece: ActivePiece): AiTarget {
  let bestScore = -Infinity;
  let bestX = piece.x;
  let bestRot = 0;

  for (let rot = 0; rot < 4; rot++) {
    const shape = getShape(piece.type, rot);

    for (let x = -2; x <= COLS; x++) {
      if (collides(grid, shape, x, -1) && collides(grid, shape, x, 0)) continue;

      let ly = -1;
      while (!collides(grid, shape, x, ly + 1)) {
        ly++;
      }

      if (ly < 0) {
        let anyVisible = false;
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] && ly + r >= 0) anyVisible = true;
          }
        }
        if (!anyVisible) continue;
      }

      const testGrid = grid.map((row) => [...row]);
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const ny = ly + r;
          const nx = x + c;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
            testGrid[ny][nx] = piece.type;
          }
        }
      }

      const score = evaluateGrid(testGrid);
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestRot = rot;
      }
    }
  }

  return { x: bestX, rotation: bestRot };
}

export function evaluateGrid(grid: (number | null)[][]): number {
  let completedLines = 0;
  let holes = 0;
  let aggregateHeight = 0;
  let bumpiness = 0;
  const colHeights: number[] = new Array(COLS).fill(0);

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c] !== null) {
        colHeights[c] = ROWS - r;
        break;
      }
    }
  }

  for (let r = 0; r < ROWS; r++) {
    if (grid[r].every((cell) => cell !== null)) {
      completedLines++;
    }
  }

  for (let c = 0; c < COLS; c++) {
    let foundBlock = false;
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c] !== null) {
        foundBlock = true;
      } else if (foundBlock) {
        holes++;
      }
    }
  }

  aggregateHeight = colHeights.reduce((a, b) => a + b, 0);

  for (let c = 0; c < COLS - 1; c++) {
    bumpiness += Math.abs(colHeights[c] - colHeights[c + 1]);
  }

  return completedLines * 7.6 - aggregateHeight * 0.51 - holes * 3.56 - bumpiness * 0.18;
}

const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ']);

/** The keys the game takes while someone is playing (and only then stops from scrolling the page). */
export function isGameKey(key: string): boolean {
  return GAME_KEYS.has(key);
}

/**
 * What a key does to the game. Returns true when the key is the game's, so the page must not act on it
 * (scroll, or press a focused button). While someone plays, the game keys stay the game's even mid-animation
 * (a line clear, game over), so holding Down never scrolls the page out from under the board.
 */
export function handleKey(state: TetrisState, key: string, now: number): boolean {
  if (state.mode !== 'player' || !isGameKey(key)) return false;
  if (!state.active || state.gameOver || state.lineClear) return true;

  state.lastInput = now;
  const piece = state.active;
  const shape = getShape(piece.type, piece.rotation);

  switch (key) {
    case 'ArrowLeft':
      if (!collides(state.grid, shape, piece.x - 1, piece.y)) {
        piece.x--;
        if (state.lockTimer !== null) state.lockTimer = now;
      }
      break;
    case 'ArrowRight':
      if (!collides(state.grid, shape, piece.x + 1, piece.y)) {
        piece.x++;
        if (state.lockTimer !== null) state.lockTimer = now;
      }
      break;
    case 'ArrowDown':
      if (!collides(state.grid, shape, piece.x, piece.y + 1)) {
        piece.y++;
        state.lastGravity = now;
      }
      break;
    case 'ArrowUp': {
      // Rotate CW
      const newRot = (piece.rotation + 1) % 4;
      const newShape = getShape(piece.type, newRot);
      const kicks = piece.type === 0
        ? I_WALL_KICKS[`${piece.rotation}>${newRot}`]
        : WALL_KICKS[`${piece.rotation}>${newRot}`];

      if (kicks) {
        for (const [kx, ky] of kicks) {
          if (!collides(state.grid, newShape, piece.x + kx, piece.y - ky)) {
            piece.rotation = newRot;
            piece.x += kx;
            piece.y -= ky;
            if (state.lockTimer !== null) state.lockTimer = now;
            break;
          }
        }
      }
      break;
    }
    case ' ': {
      // Hard drop
      const gy = ghostY(state.grid, piece);
      piece.y = gy;
      lockPiece(state.grid, piece);

      const fullRows = findFullRows(state.grid);
      if (fullRows.length > 0) {
        state.lineClear = { rows: fullRows, startTime: now };
        state.active = null;
      } else {
        state.active = spawnPiece(state);
        if (!state.active) {
          state.gameOver = { phase: 'fill', row: 0, lastRowTime: now, finalScore: state.score, finalLines: state.lines };
          return true;
        }
        state.lastGravity = now;
      }
      break;
    }
  }
  return true;
}
