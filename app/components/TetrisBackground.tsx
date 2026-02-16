'use client';

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

// ── Constants ──────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const COLORS_SUBTLE = ['#d1d5db', '#e5e7eb', '#9ca3af', '#c4c8d0', '#b0b5bd', '#bcc1c9', '#a8adb6'];
// I=cyan, O=yellow, T=purple, S=green, Z=red, J=blue, L=orange
const COLORS_VIVID = ['#06b6d4', '#eab308', '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#f97316'];
const GRID_COLOR = 'rgba(0,0,0,0.04)';
const IDLE_TIMEOUT = 10_000;
const AI_STEP_MS = 100;
const GRAVITY_MS = 500;
const LOCK_DELAY_MS = 300;
const LINE_FLASH_MS = 300;
const GAME_OVER_ROW_MS = 60;
const CELEBRATION_MS = 1500;
const POINTS = [0, 100, 300, 500, 800]; // 0,1,2,3,4 lines

// SRS piece definitions: [pieceType][rotation][row][col]
const PIECES: number[][][][] = [
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
const WALL_KICKS: Record<string, [number, number][]> = {
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
const I_WALL_KICKS: Record<string, [number, number][]> = {
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
interface ActivePiece {
  type: number;
  rotation: number;
  x: number;
  y: number;
}

interface AiTarget {
  x: number;
  rotation: number;
}

interface LineClearAnim {
  rows: number[];
  startTime: number;
}

interface GameOverAnim {
  phase: 'fill' | 'clear';
  row: number;
  lastRowTime: number;
  finalScore: number;
  finalLines: number;
}

interface TetrisCelebration {
  startTime: number;
  text: string;
}

interface TetrisState {
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
  paused: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────
function createEmptyGrid(): (number | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function getShape(type: number, rotation: number): number[][] {
  return PIECES[type][rotation];
}

function collides(grid: (number | null)[][], shape: number[][], px: number, py: number): boolean {
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

function lockPiece(grid: (number | null)[][], piece: ActivePiece): void {
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

function findFullRows(grid: (number | null)[][]): number[] {
  const rows: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (grid[r].every((cell) => cell !== null)) {
      rows.push(r);
    }
  }
  return rows;
}

function clearRows(grid: (number | null)[][], rows: number[]): void {
  const sorted = [...rows].sort((a, b) => a - b);
  for (const row of sorted) {
    grid.splice(row, 1);
    grid.unshift(Array(COLS).fill(null));
  }
}

function ghostY(grid: (number | null)[][], piece: ActivePiece): number {
  const shape = getShape(piece.type, piece.rotation);
  let gy = piece.y;
  while (!collides(grid, shape, piece.x, gy + 1)) {
    gy++;
  }
  return gy;
}

function fillBag(bag: number[]): void {
  const set = [0, 1, 2, 3, 4, 5, 6];
  for (let i = set.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [set[i], set[j]] = [set[j], set[i]];
  }
  bag.push(...set);
}

function spawnPiece(state: TetrisState): ActivePiece | null {
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
function computeAiTarget(grid: (number | null)[][], piece: ActivePiece): AiTarget {
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

function evaluateGrid(grid: (number | null)[][]): number {
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

// ── Component ──────────────────────────────────────────────────────────
export interface TetrisHandle {
  togglePlay: () => void;
}

export interface TetrisProps {
  onStateChange?: (state: { isPlaying: boolean; score: number; lines: number }) => void;
}

const TetrisBackground = forwardRef<TetrisHandle, TetrisProps>(function TetrisBackground({ onStateChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<TetrisState | null>(null);
  const rafRef = useRef<number>(0);
  const cellSizeRef = useRef(20);
  const boardOffsetRef = useRef({ x: 0, y: 0 });
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const lastSyncedScore = useRef(0);
  const lastSyncedLines = useRef(0);
  const isPlayingRef = useRef(false);

  const initState = useCallback((): TetrisState => {
    const bag: number[] = [];
    fillBag(bag);
    const state: TetrisState = {
      grid: createEmptyGrid(),
      active: null,
      bag,
      mode: 'auto',
      score: 0,
      lines: 0,
      lastGravity: performance.now(),
      lockTimer: null,
      aiTarget: null,
      lastAiStep: performance.now(),
      lastInput: performance.now(),
      lineClear: null,
      gameOver: null,
      celebration: null,
      paused: false,
    };
    state.active = spawnPiece(state);
    if (state.active && state.mode === 'auto') {
      state.aiTarget = computeAiTarget(state.grid, state.active);
    }
    return state;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;

    const ctx = canvas.getContext('2d')!;
    stateRef.current = initState();

    function resize() {
      const rect = hero!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      canvas!.style.width = rect.width + 'px';
      canvas!.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cs = Math.floor(rect.height / ROWS);
      cellSizeRef.current = Math.max(cs, 10);
      const boardW = cellSizeRef.current * COLS;
      const boardH = cellSizeRef.current * ROWS;
      boardOffsetRef.current = {
        x: Math.floor((rect.width - boardW) / 2),
        y: Math.floor((rect.height - boardH) / 2),
      };
    }
    resize();
    window.addEventListener('resize', resize);

    function drawCell(x: number, y: number, color: string, alpha: number = 1) {
      const cs = cellSizeRef.current;
      const ox = boardOffsetRef.current.x + x * cs;
      const oy = boardOffsetRef.current.y + y * cs;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(ox, oy, cs, cs);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(ox, oy, cs, 1);
      ctx.fillRect(ox, oy, 1, cs);

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(ox, oy + cs - 1, cs, 1);
      ctx.fillRect(ox + cs - 1, oy, 1, cs);

      ctx.globalAlpha = 1;
    }

    function draw(now: number) {
      const state = stateRef.current!;
      const rect = hero!.getBoundingClientRect();
      const cs = cellSizeRef.current;
      const ox = boardOffsetRef.current.x;
      const oy = boardOffsetRef.current.y;
      const boardW = cs * COLS;
      const boardH = cs * ROWS;
      const palette = isPlayingRef.current ? COLORS_VIVID : COLORS_SUBTLE;

      ctx.clearRect(0, 0, rect.width, rect.height);

      // Grid lines
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(ox + c * cs + 0.5, oy);
        ctx.lineTo(ox + c * cs + 0.5, oy + boardH);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + r * cs + 0.5);
        ctx.lineTo(ox + boardW, oy + r * cs + 0.5);
        ctx.stroke();
      }

      // Locked cells
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = state.grid[r][c];
          if (cell !== null) {
            drawCell(c, r, palette[cell]);
          }
        }
      }

      // Ghost piece
      if (state.active && !state.gameOver) {
        const gy = ghostY(state.grid, state.active);
        const shape = getShape(state.active.type, state.active.rotation);
        const ghostColor = palette[state.active.type];
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const ny = gy + r;
            const nx = state.active.x + c;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
              drawCell(nx, ny, ghostColor, 0.3);
            }
          }
        }
      }

      // Active piece
      if (state.active && !state.gameOver) {
        const shape = getShape(state.active.type, state.active.rotation);
        const activeColor = palette[state.active.type];
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const ny = state.active.y + r;
            const nx = state.active.x + c;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
              drawCell(nx, ny, activeColor);
            }
          }
        }
      }

      // Line clear flash
      if (state.lineClear) {
        const elapsed = now - state.lineClear.startTime;
        const progress = Math.min(elapsed / LINE_FLASH_MS, 1);
        const alpha = 1 - progress;
        if (alpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
          for (const row of state.lineClear.rows) {
            ctx.fillRect(ox, oy + row * cs, boardW, cs);
          }
        }
      }

      // Game over fill animation
      if (state.gameOver) {
        const fillColor = '#e5e7eb';
        if (state.gameOver.phase === 'fill') {
          for (let r = ROWS - 1; r >= ROWS - 1 - state.gameOver.row; r--) {
            if (r >= 0) {
              for (let c = 0; c < COLS; c++) {
                drawCell(c, r, fillColor);
              }
            }
          }
        } else {
          const rowsRemaining = ROWS - state.gameOver.row;
          for (let r = ROWS - 1; r >= ROWS - rowsRemaining; r--) {
            if (r >= 0) {
              for (let c = 0; c < COLS; c++) {
                drawCell(c, r, fillColor);
              }
            }
          }
        }
      }

      // Game over text overlay
      if (state.gameOver && state.gameOver.phase === 'fill' && state.gameOver.row > ROWS * 0.4) {
        const textProgress = Math.min((state.gameOver.row - ROWS * 0.4) / (ROWS * 0.4), 1);
        const alpha = textProgress * 0.9;

        ctx.save();
        ctx.globalAlpha = alpha;

        // "GAME OVER" text
        const goFontSize = cs * 1.8;
        ctx.font = `800 ${goFontSize}px var(--font-playfair), Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textX = ox + boardW / 2;
        const textY = oy + boardH * 0.42;

        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillText('GAME OVER', textX + 1, textY + 2);
        ctx.fillStyle = '#374151';
        ctx.fillText('GAME OVER', textX, textY);

        // Final score
        if (state.gameOver.finalScore > 0) {
          const scoreFontSize = cs * 0.9;
          ctx.font = `600 ${scoreFontSize}px var(--font-outfit), system-ui, sans-serif`;
          ctx.fillStyle = '#6b7280';
          ctx.fillText(
            `${state.gameOver.finalScore.toLocaleString()} pts  ·  ${state.gameOver.finalLines} lines`,
            textX,
            textY + goFontSize * 0.8,
          );
        }

        ctx.restore();
      }

      // Board outline when playing
      if (isPlayingRef.current) {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox + 0.5, oy + 0.5, boardW - 1, boardH - 1);
      }

      // Next piece preview
      if (state.bag.length > 0) {
        const nextType = state.bag[0];
        const nextShape = getShape(nextType, 0);
        const nextColor = palette[nextType];
        const previewCs = Math.floor(cs * 0.65);
        const previewGap = Math.floor(cs * 0.8);
        const previewX = ox + boardW + previewGap;
        const previewY = oy;

        // "NEXT" label
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.font = `600 ${Math.max(previewCs * 0.7, 8)}px var(--font-outfit), system-ui, sans-serif`;
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('NEXT', previewX, previewY);

        // Draw piece cells
        const labelH = Math.max(previewCs * 0.7, 8) + 6;
        ctx.globalAlpha = 0.7;
        for (let r = 0; r < nextShape.length; r++) {
          for (let c = 0; c < nextShape[r].length; c++) {
            if (!nextShape[r][c]) continue;
            const px = previewX + c * previewCs;
            const py = previewY + labelH + r * previewCs;

            ctx.fillStyle = nextColor;
            ctx.fillRect(px, py, previewCs, previewCs);

            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(px, py, previewCs, 1);
            ctx.fillRect(px, py, 1, previewCs);

            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(px, py + previewCs - 1, previewCs, 1);
            ctx.fillRect(px + previewCs - 1, py, 1, previewCs);
          }
        }
        ctx.restore();
      }

      // Celebration animation
      if (state.celebration) {
        const elapsed = now - state.celebration.startTime;
        const progress = Math.min(elapsed / CELEBRATION_MS, 1);

        if (progress < 1) {
          const isTetris = state.celebration.text === 'TETRIS!';

          // Phase 1: quick flash across the board (0-15%)
          if (progress < 0.15) {
            const flashAlpha = (1 - progress / 0.15) * (isTetris ? 0.5 : 0.3);
            ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
            ctx.fillRect(ox, oy, boardW, boardH);
          }

          // Phase 2: text scales up and fades (10-100%)
          if (progress > 0.1) {
            const textProgress = (progress - 0.1) / 0.9;
            // Scale: starts at 0.5, peaks at 1.0 around 30%, holds
            const scaleT = Math.min(textProgress / 0.25, 1);
            const scale = 0.5 + 0.5 * (1 - Math.pow(1 - scaleT, 3));
            // Fade: holds until 60%, then fades out
            const alpha = textProgress < 0.6 ? 1 : 1 - (textProgress - 0.6) / 0.4;
            // Drift upward slightly
            const drift = textProgress * -12;

            const fontSize = (isTetris ? cs * 2.2 : cs * 1.6) * scale;
            ctx.save();
            ctx.globalAlpha = alpha * 0.85;
            ctx.font = `800 ${fontSize}px var(--font-playfair), Georgia, serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const textX = ox + boardW / 2;
            const textY = oy + boardH / 2 + drift;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillText(state.celebration.text, textX + 1, textY + 2);

            // Main text
            ctx.fillStyle = isTetris ? '#374151' : '#6b7280';
            ctx.fillText(state.celebration.text, textX, textY);

            // Subtle shimmer line for TETRIS
            if (isTetris && textProgress < 0.5) {
              const shimmerX = ox + boardW * (textProgress / 0.5);
              const gradient = ctx.createLinearGradient(shimmerX - 20, 0, shimmerX + 20, 0);
              gradient.addColorStop(0, 'rgba(255,255,255,0)');
              gradient.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.3})`);
              gradient.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.fillStyle = gradient;
              ctx.fillRect(ox, oy + boardH * 0.35, boardW, boardH * 0.3);
            }

            ctx.restore();
          }
        } else {
          state.celebration = null;
        }
      }

      // Sync score/lines to parent (only when changed)
      if (state.score !== lastSyncedScore.current || state.lines !== lastSyncedLines.current) {
        lastSyncedScore.current = state.score;
        lastSyncedLines.current = state.lines;
        onStateChangeRef.current?.({ isPlaying: isPlayingRef.current, score: state.score, lines: state.lines });
      }
    }

    function update(now: number) {
      const state = stateRef.current!;
      if (state.paused) return;

      // Handle game over animation
      if (state.gameOver) {
        if (now - state.gameOver.lastRowTime >= GAME_OVER_ROW_MS) {
          state.gameOver.lastRowTime = now;
          if (state.gameOver.phase === 'fill') {
            state.gameOver.row++;
            if (state.gameOver.row >= ROWS) {
              state.gameOver.phase = 'clear';
              state.gameOver.row = 0;
              state.grid = createEmptyGrid();
            }
          } else {
            state.gameOver.row++;
            if (state.gameOver.row >= ROWS) {
              const wasPlaying = state.mode === 'player';
              state.gameOver = null;
              state.score = 0;
              state.lines = 0;
              state.bag = [];
              fillBag(state.bag);
              state.active = spawnPiece(state);
              state.lastGravity = now;
              state.lockTimer = null;
              // After game over, revert to auto mode
              if (wasPlaying) {
                state.mode = 'auto';
                isPlayingRef.current = false;
                if (canvasRef.current) canvasRef.current.style.opacity = '0.2';
                onStateChangeRef.current?.({ isPlaying: false, score: 0, lines: 0 });
              }
              if (state.active && state.mode === 'auto') {
                state.aiTarget = computeAiTarget(state.grid, state.active);
              }
            }
          }
        }
        return;
      }

      // Handle line clear pause
      if (state.lineClear) {
        if (now - state.lineClear.startTime >= LINE_FLASH_MS) {
          const numLines = state.lineClear.rows.length;
          state.score += POINTS[numLines] || 0;
          state.lines += numLines;
          // Trigger celebration for a Tetris (4 lines)
          if (numLines === 4) {
            state.celebration = { startTime: now, text: 'TETRIS!' };
          } else if (numLines === 3) {
            state.celebration = { startTime: now, text: 'Triple!' };
          }
          clearRows(state.grid, state.lineClear.rows);
          state.lineClear = null;
          state.active = spawnPiece(state);
          if (!state.active) {
            state.gameOver = { phase: 'fill', row: 0, lastRowTime: now, finalScore: state.score, finalLines: state.lines };
            return;
          }
          state.lastGravity = now;
          state.lockTimer = null;
          if (state.mode === 'auto') {
            state.aiTarget = computeAiTarget(state.grid, state.active);
            state.lastAiStep = now;
          }
        }
        return;
      }

      if (!state.active) return;

      // Idle timeout: revert to auto-play
      if (state.mode === 'player' && now - state.lastInput > IDLE_TIMEOUT) {
        state.mode = 'auto';
        isPlayingRef.current = false;
        onStateChangeRef.current?.({ isPlaying: false, score: state.score, lines: state.lines });
        if (canvasRef.current) canvasRef.current.style.opacity = '0.2';
        if (state.active) {
          state.aiTarget = computeAiTarget(state.grid, state.active);
          state.lastAiStep = now;
        }
      }

      // AI moves
      if (state.mode === 'auto' && state.aiTarget && now - state.lastAiStep >= AI_STEP_MS) {
        state.lastAiStep = now;
        const target = state.aiTarget;
        const piece = state.active;

        if (piece.rotation !== target.rotation) {
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
                state.lockTimer = null;
                break;
              }
            }
          }
        } else if (piece.x < target.x) {
          const shape = getShape(piece.type, piece.rotation);
          if (!collides(state.grid, shape, piece.x + 1, piece.y)) {
            piece.x++;
            state.lockTimer = null;
          }
        } else if (piece.x > target.x) {
          const shape = getShape(piece.type, piece.rotation);
          if (!collides(state.grid, shape, piece.x - 1, piece.y)) {
            piece.x--;
            state.lockTimer = null;
          }
        }
      }

      // Gravity
      if (now - state.lastGravity >= GRAVITY_MS) {
        state.lastGravity = now;
        const shape = getShape(state.active.type, state.active.rotation);

        if (!collides(state.grid, shape, state.active.x, state.active.y + 1)) {
          state.active.y++;
          state.lockTimer = null;
        } else {
          if (state.lockTimer === null) {
            state.lockTimer = now;
          }
        }
      }

      // Lock piece
      if (state.lockTimer !== null && now - state.lockTimer >= LOCK_DELAY_MS) {
        const shape = getShape(state.active.type, state.active.rotation);
        if (collides(state.grid, shape, state.active.x, state.active.y + 1)) {
          lockPiece(state.grid, state.active);
          state.lockTimer = null;

          const fullRows = findFullRows(state.grid);
          if (fullRows.length > 0) {
            state.lineClear = { rows: fullRows, startTime: now };
            state.active = null;
          } else {
            state.active = spawnPiece(state);
            if (!state.active) {
              state.gameOver = { phase: 'fill', row: 0, lastRowTime: now, finalScore: state.score, finalLines: state.lines };
              return;
            }
            state.lastGravity = now;
            if (state.mode === 'auto') {
              state.aiTarget = computeAiTarget(state.grid, state.active);
              state.lastAiStep = now;
            }
          }
        } else {
          state.lockTimer = null;
        }
      }
    }

    function loop(now: number) {
      update(now);
      draw(now);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    // Keyboard
    function handleKeyDown(e: KeyboardEvent) {
      const state = stateRef.current;
      if (!state || !state.active || state.gameOver || state.lineClear) return;
      if (state.mode !== 'player') return;

      const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '];
      if (!gameKeys.includes(e.key)) return;
      e.preventDefault();

      state.lastInput = performance.now();
      const piece = state.active;
      const shape = getShape(piece.type, piece.rotation);

      switch (e.key) {
        case 'ArrowLeft':
          if (!collides(state.grid, shape, piece.x - 1, piece.y)) {
            piece.x--;
            if (state.lockTimer !== null) state.lockTimer = performance.now();
          }
          break;
        case 'ArrowRight':
          if (!collides(state.grid, shape, piece.x + 1, piece.y)) {
            piece.x++;
            if (state.lockTimer !== null) state.lockTimer = performance.now();
          }
          break;
        case 'ArrowDown':
          if (!collides(state.grid, shape, piece.x, piece.y + 1)) {
            piece.y++;
            state.lastGravity = performance.now();
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
                if (state.lockTimer !== null) state.lockTimer = performance.now();
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
            state.lineClear = { rows: fullRows, startTime: performance.now() };
            state.active = null;
          } else {
            state.active = spawnPiece(state);
            if (!state.active) {
              state.gameOver = { phase: 'fill', row: 0, lastRowTime: performance.now(), finalScore: state.score, finalLines: state.lines };
              return;
            }
            state.lastGravity = performance.now();
          }
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [initState]);

  const handlePlay = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    if (state.mode === 'player') {
      state.mode = 'auto';
      isPlayingRef.current = false;
      if (canvasRef.current) canvasRef.current.style.opacity = '0.2';
      if (state.active) {
        state.aiTarget = computeAiTarget(state.grid, state.active);
        state.lastAiStep = performance.now();
      }
    } else {
      state.mode = 'player';
      state.lastInput = performance.now();
      state.aiTarget = null;
      isPlayingRef.current = true;
      if (canvasRef.current) canvasRef.current.style.opacity = '0.3';
    }
    onStateChangeRef.current?.({ isPlaying: isPlayingRef.current, score: state.score, lines: state.lines });
  }, []);

  useImperativeHandle(ref, () => ({ togglePlay: handlePlay }), [handlePlay]);

  return (
    <div
      ref={heroRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.2,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
});

export default TetrisBackground;
