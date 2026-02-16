'use client';

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

// ── Constants ──────────────────────────────────────────────────────────
const MAZE_COLS = 31;
const MAZE_ROWS = 17;
const IDLE_TIMEOUT = 10_000;
const GAME_OVER_DISPLAY_MS = 2500;
const DEATH_ANIM_MS = 1000;
const LEVEL_PAUSE_MS = 1500;
const CHASE_SCATTER_CYCLE = [7000, 20000, 7000, 20000, 5000, 20000, 5000];

const DOT_SCORE = 10;
const PELLET_SCORE = 50;
const GHOST_SCORES = [200, 400, 800, 1600];

// Speeds (tiles per second)
const PACMAN_SPEED_AUTO = 4;
const PACMAN_SPEED_PLAYER = 6;
const GHOST_SPEED_BASE = 3.5;
const GHOST_SPEED_FRIGHTENED = 2;
const GHOST_SPEED_EATEN = 8;
const GHOST_SPEED_PER_LEVEL = 0.3;

// Canvas opacity when used as background
const CANVAS_OPACITY_IDLE = '0.2';
const CANVAS_OPACITY_PLAYING = '0.3';

// Movement thresholds (in tile units)
const TILE_CENTER_SNAP = 0.05;
const COLLISION_RADIUS = 0.7;

// Directions
const DIR_UP = 0;
const DIR_DOWN = 1;
const DIR_LEFT = 2;
const DIR_RIGHT = 3;

const DIR_DX = [0, 0, -1, 1];
const DIR_DY = [-1, 1, 0, 0];
const OPPOSITE_DIR = [DIR_DOWN, DIR_UP, DIR_RIGHT, DIR_LEFT];

// Ghost colors
const GHOST_COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
const GHOST_COLORS_SUBTLE = ['#b08080', '#c0a0b0', '#80b0b0', '#b0a080'];
const FRIGHTENED_COLOR = '#2020ff';
const FRIGHTENED_COLOR_SUBTLE = '#8080b0';

// Ms. Pac-Man colors
const PACMAN_COLOR = '#ffff00';
const PACMAN_COLOR_SUBTLE = '#d1d5b0';
const BOW_COLOR = '#ff0000';
const BOW_COLOR_SUBTLE = '#c09090';

const WALL_COLOR = '#4a5568';
const WALL_COLOR_VIVID = '#6366f1';
const DOT_COLOR = '#d1d5db';
const DOT_COLOR_VIVID = '#fbbf24';

// Ghost house door position
const GHOST_DOOR_X = 15;
const GHOST_DOOR_Y = 7;

// ── Maze Definition ────────────────────────────────────────────────────
// Every row is exactly 31 characters wide.
// # wall, . dot, O power pellet, - ghost door, G ghost house, T tunnel, (space) empty
const MAZE_TEMPLATE = [
  '###############################', // 0
  '#..............#..............#', // 1
  '#.####.#####.#.#.#.#####.####.#', // 2
  '#O####.#####.#.#.#.#####.####O#', // 3
  '#.............................#', // 4
  '#.####.#.#####.#.#####.#.####.#', // 5
  '#......#...............#......#', // 6
  '#.####.#.######-######.#.####.#', // 7
  'T  ....#.#GGGGGGGGGGG#.#....  T', // 8
  '#.####.#.#############.#.####.#', // 9
  '#......#...............#......#', // 10
  '#.####.#.#####.#.#####.#.####.#', // 11
  '#.............................#', // 12
  '#O####.#####.#.#.#.#####.####O#', // 13
  '#.####.#####.#.#.#.#####.####.#', // 14
  '#..............#..............#', // 15
  '###############################', // 16
];

// Cell types
const CELL_WALL = 0;
const CELL_DOT = 1;
const CELL_PELLET = 2;
const CELL_EMPTY = 3;
const CELL_GHOST_DOOR = 4;
const CELL_GHOST_HOUSE = 5;
const CELL_TUNNEL = 6;

function parseMaze(): number[][] {
  const maze: number[][] = [];
  for (let r = 0; r < MAZE_ROWS; r++) {
    const row: number[] = [];
    const line = MAZE_TEMPLATE[r];
    for (let c = 0; c < MAZE_COLS; c++) {
      const ch = c < line.length ? line[c] : ' ';
      switch (ch) {
        case '#': row.push(CELL_WALL); break;
        case '.': row.push(CELL_DOT); break;
        case 'O': row.push(CELL_PELLET); break;
        case '-': row.push(CELL_GHOST_DOOR); break;
        case 'G': row.push(CELL_GHOST_HOUSE); break;
        case 'T': row.push(CELL_TUNNEL); break;
        case ' ': row.push(CELL_EMPTY); break;
        default: row.push(CELL_EMPTY); break;
      }
    }
    maze.push(row);
  }
  return maze;
}

function cloneMaze(maze: number[][]): number[][] {
  return maze.map(row => [...row]);
}

function countDots(maze: number[][]): number {
  let count = 0;
  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      if (maze[r][c] === CELL_DOT || maze[r][c] === CELL_PELLET) count++;
    }
  }
  return count;
}

function isWalkable(maze: number[][], col: number, row: number, canUseDoor: boolean = false): boolean {
  if (row < 0 || row >= MAZE_ROWS) return false;
  if (col < 0 || col >= MAZE_COLS) {
    if (maze[row][0] === CELL_TUNNEL || maze[row][MAZE_COLS - 1] === CELL_TUNNEL) return true;
    return false;
  }
  const cell = maze[row][col];
  if (cell === CELL_WALL) return false;
  if (cell === CELL_GHOST_DOOR || cell === CELL_GHOST_HOUSE) return canUseDoor;
  return true;
}

function wrapCol(c: number): number {
  if (c < 0) return MAZE_COLS - 1;
  if (c >= MAZE_COLS) return 0;
  return c;
}

// ── Types ──────────────────────────────────────────────────────────────

// tileX/tileY: integer tile the entity is heading toward (used for wall checks)
// pixelX/pixelY: continuous position in tile-space (fractional, used for rendering)
interface Entity {
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
  dir: number;
  nextDir: number;
  speed: number;
}

interface Ghost extends Entity {
  colorIndex: number;
  mode: 'chase' | 'scatter' | 'frightened' | 'eaten';
  frightenedTimer: number;
  homeCorner: { x: number; y: number };
  inHouse: boolean;
  releaseTimer: number;
}

interface PacManState {
  maze: number[][];
  templateMaze: number[][];
  pacman: Entity;
  ghosts: Ghost[];
  mode: 'auto' | 'player';
  score: number;
  level: number;
  lives: number;
  dotsRemaining: number;
  ghostsEatenThisPellet: number;
  globalChaseTimer: number;
  globalChasePhase: number;
  isScatter: boolean;
  lastInput: number;
  deathAnim: { startTime: number } | null;
  levelPause: { startTime: number } | null;
  gameOver: { startTime: number; finalScore: number } | null;
}

// ── BFS Pathfinding ────────────────────────────────────────────────────
function bfs(maze: number[][], startX: number, startY: number, targetX: number, targetY: number, canUseDoor: boolean = false): number {
  if (startX === targetX && startY === targetY) return -1;

  const visited = new Set<string>();
  const queue: { x: number; y: number; firstDir: number }[] = [];

  for (let d = 0; d < 4; d++) {
    const nx = wrapCol(startX + DIR_DX[d]);
    const ny = startY + DIR_DY[d];
    if (isWalkable(maze, nx, ny, canUseDoor)) {
      const key = `${nx},${ny}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, firstDir: d });
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const { x, y, firstDir } = queue[head++];
    if (x === targetX && y === targetY) return firstDir;

    for (let d = 0; d < 4; d++) {
      const nx = wrapCol(x + DIR_DX[d]);
      const ny = y + DIR_DY[d];
      if (isWalkable(maze, nx, ny, canUseDoor)) {
        const key = `${nx},${ny}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny, firstDir });
        }
      }
    }
  }

  return -1;
}

function findNearestDot(maze: number[][], startX: number, startY: number): { x: number; y: number } | null {
  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  visited.add(`${startX},${startY}`);

  let head = 0;
  while (head < queue.length) {
    const { x, y } = queue[head++];
    if (y >= 0 && y < MAZE_ROWS && x >= 0 && x < MAZE_COLS) {
      if (maze[y][x] === CELL_DOT || maze[y][x] === CELL_PELLET) {
        return { x, y };
      }
    }

    for (let d = 0; d < 4; d++) {
      const nx = wrapCol(x + DIR_DX[d]);
      const ny = y + DIR_DY[d];
      if (isWalkable(maze, nx, ny)) {
        const key = `${nx},${ny}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  return null;
}

function tileDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Ghost Targeting ────────────────────────────────────────────────────
// Returns the target tile for ghost pathfinding in chase/scatter/eaten modes.
// Frightened ghosts pick random directions directly in the update loop.
function getGhostTarget(ghost: Ghost, pacman: Entity, ghosts: Ghost[]): { x: number; y: number } {
  if (ghost.mode === 'scatter') {
    return ghost.homeCorner;
  }

  if (ghost.mode === 'eaten') {
    return { x: GHOST_DOOR_X, y: GHOST_DOOR_Y };
  }

  // Chase mode — each ghost has a unique targeting personality
  switch (ghost.colorIndex) {
    case 0: // Blinky
      return { x: pacman.tileX, y: pacman.tileY };

    case 1: { // Pinky
      let tx = pacman.tileX + DIR_DX[pacman.dir] * 4;
      const ty = pacman.tileY + DIR_DY[pacman.dir] * 4;
      if (pacman.dir === DIR_UP) tx -= 4;
      return { x: Math.max(0, Math.min(MAZE_COLS - 1, tx)), y: Math.max(0, Math.min(MAZE_ROWS - 1, ty)) };
    }

    case 2: { // Inky
      const blinky = ghosts[0];
      const aheadX = pacman.tileX + DIR_DX[pacman.dir] * 2;
      const aheadY = pacman.tileY + DIR_DY[pacman.dir] * 2;
      const tx = aheadX + (aheadX - blinky.tileX);
      const ty = aheadY + (aheadY - blinky.tileY);
      return { x: Math.max(0, Math.min(MAZE_COLS - 1, tx)), y: Math.max(0, Math.min(MAZE_ROWS - 1, ty)) };
    }

    case 3: { // Sue
      const dist = tileDistance(ghost.tileX, ghost.tileY, pacman.tileX, pacman.tileY);
      if (dist > 8) {
        return { x: pacman.tileX, y: pacman.tileY };
      }
      return ghost.homeCorner;
    }

    default:
      return { x: pacman.tileX, y: pacman.tileY };
  }
}

function chooseGhostDirection(maze: number[][], ghost: Ghost, target: { x: number; y: number }): number {
  const canUseDoor = ghost.mode === 'eaten';
  const dirs = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];
  let bestDir = -1;
  let bestDist = Infinity;

  for (const d of dirs) {
    if (d === OPPOSITE_DIR[ghost.dir]) continue;

    const nx = wrapCol(ghost.tileX + DIR_DX[d]);
    const ny = ghost.tileY + DIR_DY[d];

    if (!isWalkable(maze, nx, ny, canUseDoor)) continue;

    const dist = tileDistance(nx, ny, target.x, target.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = d;
    }
  }

  // Fallback: allow U-turn if no other direction is available (dead end)
  if (bestDir === -1) {
    const rev = OPPOSITE_DIR[ghost.dir];
    const nx = wrapCol(ghost.tileX + DIR_DX[rev]);
    const ny = ghost.tileY + DIR_DY[rev];
    if (isWalkable(maze, nx, ny, canUseDoor)) return rev;
    return ghost.dir;
  }

  return bestDir;
}

// ── Component ──────────────────────────────────────────────────────────
export interface MsPacManHandle {
  togglePlay: () => void;
}

export interface MsPacManProps {
  onStateChange?: (state: { isPlaying: boolean; score: number; level: number }) => void;
}

const MsPacManBackground = forwardRef<MsPacManHandle, MsPacManProps>(function MsPacManBackground({ onStateChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<PacManState | null>(null);
  const rafRef = useRef<number>(0);
  const cellSizeRef = useRef(20);
  const boardOffsetRef = useRef({ x: 0, y: 0 });
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const lastSyncedScore = useRef(0);
  const lastSyncedLevel = useRef(0);
  const isPlayingRef = useRef(false);
  const lastUpdateTime = useRef(0);

  const createPacman = useCallback((): Entity => {
    return {
      tileX: 15,
      tileY: 12,
      pixelX: 15,
      pixelY: 12,
      dir: DIR_LEFT,
      nextDir: DIR_LEFT,
      speed: PACMAN_SPEED_AUTO,
    };
  }, []);

  const createGhosts = useCallback((): Ghost[] => {
    // Blinky starts above the ghost house door; others start inside the house
    const ghostStartPositions = [
      { x: 15, y: 6, corner: { x: MAZE_COLS - 2, y: 0 }, release: 0 },
      { x: 13, y: 8, corner: { x: 1, y: 0 }, release: 2000 },
      { x: 15, y: 8, corner: { x: MAZE_COLS - 2, y: MAZE_ROWS - 1 }, release: 5000 },
      { x: 17, y: 8, corner: { x: 1, y: MAZE_ROWS - 1 }, release: 8000 },
    ];

    return ghostStartPositions.map((pos, i) => ({
      tileX: pos.x,
      tileY: pos.y,
      pixelX: pos.x,
      pixelY: pos.y,
      dir: i === 0 ? DIR_LEFT : DIR_UP,
      nextDir: i === 0 ? DIR_LEFT : DIR_UP,
      speed: GHOST_SPEED_BASE,
      colorIndex: i,
      mode: 'scatter' as const,
      frightenedTimer: 0,
      homeCorner: pos.corner,
      inHouse: i !== 0,
      releaseTimer: pos.release,
    }));
  }, []);

  const initState = useCallback((): PacManState => {
    const templateMaze = parseMaze();
    const maze = cloneMaze(templateMaze);
    const total = countDots(maze);

    return {
      maze,
      templateMaze,
      pacman: createPacman(),
      ghosts: createGhosts(),
      mode: 'auto',
      score: 0,
      level: 1,
      lives: 3,
      dotsRemaining: total,
      ghostsEatenThisPellet: 0,
      globalChaseTimer: 0,
      globalChasePhase: 0,
      isScatter: true,
      lastInput: performance.now(),
      deathAnim: null,
      levelPause: null,
      gameOver: null,
    };
  }, [createPacman, createGhosts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;

    const ctx = canvas.getContext('2d')!;
    stateRef.current = initState();
    lastUpdateTime.current = performance.now();

    function resize() {
      const rect = hero!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      canvas!.style.width = rect.width + 'px';
      canvas!.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const csX = Math.floor(rect.width / MAZE_COLS);
      const csY = Math.floor(rect.height / MAZE_ROWS);
      cellSizeRef.current = Math.max(Math.min(csX, csY), 8);
      const boardW = cellSizeRef.current * MAZE_COLS;
      const boardH = cellSizeRef.current * MAZE_ROWS;
      boardOffsetRef.current = {
        x: Math.floor((rect.width - boardW) / 2),
        y: Math.floor((rect.height - boardH) / 2),
      };
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Drawing Functions ───────────────────────────────────────────
    function drawWalls(state: PacManState) {
      const cs = cellSizeRef.current;
      const ox = boardOffsetRef.current.x;
      const oy = boardOffsetRef.current.y;
      const wallCol = isPlayingRef.current ? WALL_COLOR_VIVID : WALL_COLOR;

      ctx.strokeStyle = wallCol;
      ctx.lineWidth = Math.max(1, cs * 0.08);

      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          if (state.maze[r][c] !== CELL_WALL) continue;

          const x = ox + c * cs;
          const y = oy + r * cs;

          // Draw wall borders on sides adjacent to non-wall cells
          if (r > 0 && state.maze[r - 1][c] !== CELL_WALL) {
            ctx.beginPath();
            ctx.moveTo(x, y + 0.5);
            ctx.lineTo(x + cs, y + 0.5);
            ctx.stroke();
          }
          if (r < MAZE_ROWS - 1 && state.maze[r + 1][c] !== CELL_WALL) {
            ctx.beginPath();
            ctx.moveTo(x, y + cs - 0.5);
            ctx.lineTo(x + cs, y + cs - 0.5);
            ctx.stroke();
          }
          if (c > 0 && state.maze[r][c - 1] !== CELL_WALL) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, y);
            ctx.lineTo(x + 0.5, y + cs);
            ctx.stroke();
          }
          if (c < MAZE_COLS - 1 && state.maze[r][c + 1] !== CELL_WALL) {
            ctx.beginPath();
            ctx.moveTo(x + cs - 0.5, y);
            ctx.lineTo(x + cs - 0.5, y + cs);
            ctx.stroke();
          }
        }
      }

      // Ghost house door
      ctx.strokeStyle = isPlayingRef.current ? '#ffb8ff' : '#a090a0';
      ctx.lineWidth = Math.max(2, cs * 0.15);
      const doorX = ox + GHOST_DOOR_X * cs;
      const doorY = oy + GHOST_DOOR_Y * cs;
      ctx.beginPath();
      ctx.moveTo(doorX, doorY + cs * 0.5);
      ctx.lineTo(doorX + cs, doorY + cs * 0.5);
      ctx.stroke();
    }

    function drawDots(state: PacManState, now: number) {
      const cs = cellSizeRef.current;
      const ox = boardOffsetRef.current.x;
      const oy = boardOffsetRef.current.y;
      const dotCol = isPlayingRef.current ? DOT_COLOR_VIVID : DOT_COLOR;

      ctx.fillStyle = dotCol;
      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          const cell = state.maze[r][c];
          if (cell === CELL_DOT) {
            const cx = ox + c * cs + cs * 0.5;
            const cy = oy + r * cs + cs * 0.5;
            const radius = Math.max(1.5, cs * 0.08);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell === CELL_PELLET) {
            const cx = ox + c * cs + cs * 0.5;
            const cy = oy + r * cs + cs * 0.5;
            const pulse = 0.7 + 0.3 * Math.sin(now * 0.005);
            const radius = Math.max(3, cs * 0.2) * pulse;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    function drawPacman(state: PacManState, now: number) {
      const cs = cellSizeRef.current;
      const ox = boardOffsetRef.current.x;
      const oy = boardOffsetRef.current.y;
      const pacCol = isPlayingRef.current ? PACMAN_COLOR : PACMAN_COLOR_SUBTLE;
      const bCol = isPlayingRef.current ? BOW_COLOR : BOW_COLOR_SUBTLE;

      const px = ox + state.pacman.pixelX * cs + cs * 0.5;
      const py = oy + state.pacman.pixelY * cs + cs * 0.5;
      const radius = cs * 0.42;

      // Death animation
      if (state.deathAnim) {
        const elapsed = now - state.deathAnim.startTime;
        const progress = Math.min(elapsed / DEATH_ANIM_MS, 1);
        const shrink = 1 - progress;
        if (shrink <= 0) return;

        ctx.save();
        ctx.fillStyle = pacCol;
        ctx.beginPath();
        const deathAngle = Math.PI * 2 * progress;
        ctx.arc(px, py, radius * shrink, deathAngle, Math.PI * 2 - deathAngle);
        ctx.lineTo(px, py);
        ctx.fill();
        ctx.restore();
        return;
      }

      // Mouth angle animation
      const mouthMax = Math.PI / 4;
      const mouthAngle = mouthMax * (0.5 + 0.5 * Math.sin(now * 0.015));

      // Direction to angle offset
      let angleOffset = 0;
      switch (state.pacman.dir) {
        case DIR_RIGHT: angleOffset = 0; break;
        case DIR_DOWN: angleOffset = Math.PI * 0.5; break;
        case DIR_LEFT: angleOffset = Math.PI; break;
        case DIR_UP: angleOffset = -Math.PI * 0.5; break;
      }

      ctx.save();
      ctx.fillStyle = pacCol;
      ctx.beginPath();
      ctx.arc(px, py, radius, angleOffset + mouthAngle, angleOffset + Math.PI * 2 - mouthAngle);
      ctx.lineTo(px, py);
      ctx.fill();

      // Bow on top (small red accent)
      const bowX = px + Math.cos(angleOffset - Math.PI * 0.5) * radius * 0.6;
      const bowY = py + Math.sin(angleOffset - Math.PI * 0.5) * radius * 0.6;
      const bowSize = Math.max(2, cs * 0.12);
      ctx.fillStyle = bCol;
      ctx.beginPath();
      ctx.arc(bowX - bowSize * 0.5, bowY, bowSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bowX + bowSize * 0.5, bowY, bowSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bowX, bowY, bowSize * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawGhostEyes(gx: number, gy: number, radius: number, dir: number) {
      const eyeOffsetX = radius * 0.28;
      const eyeOffsetY = -radius * 0.15;
      const eyeR = radius * 0.22;
      const pupilR = radius * 0.12;

      let pdx = 0;
      let pdy = 0;
      switch (dir) {
        case DIR_LEFT: pdx = -pupilR * 0.5; break;
        case DIR_RIGHT: pdx = pupilR * 0.5; break;
        case DIR_UP: pdy = -pupilR * 0.5; break;
        case DIR_DOWN: pdy = pupilR * 0.5; break;
      }

      for (const side of [-1, 1]) {
        const ex = gx + side * eyeOffsetX;
        const ey = gy + eyeOffsetY;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000044';
        ctx.beginPath();
        ctx.arc(ex + pdx, ey + pdy, pupilR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawGhost(ghost: Ghost) {
      const cs = cellSizeRef.current;
      const ox = boardOffsetRef.current.x;
      const oy = boardOffsetRef.current.y;

      const gx = ox + ghost.pixelX * cs + cs * 0.5;
      const gy = oy + ghost.pixelY * cs + cs * 0.5;
      const radius = cs * 0.42;

      if (ghost.mode === 'eaten') {
        drawGhostEyes(gx, gy, radius, ghost.dir);
        return;
      }

      let bodyColor: string;
      if (ghost.mode === 'frightened') {
        bodyColor = isPlayingRef.current ? FRIGHTENED_COLOR : FRIGHTENED_COLOR_SUBTLE;
      } else {
        bodyColor = isPlayingRef.current ? GHOST_COLORS[ghost.colorIndex] : GHOST_COLORS_SUBTLE[ghost.colorIndex];
      }

      ctx.save();
      ctx.fillStyle = bodyColor;

      // Body: rounded top, wavy bottom
      ctx.beginPath();
      ctx.arc(gx, gy - radius * 0.1, radius, Math.PI, 0);

      const bottom = gy + radius * 0.7;
      ctx.lineTo(gx + radius, bottom);

      // Wavy bottom (3 bumps)
      const bumpW = (radius * 2) / 3;
      for (let i = 2; i >= 0; i--) {
        const bx = gx - radius + i * bumpW + bumpW * 0.5;
        ctx.arc(bx, bottom, bumpW * 0.5, 0, Math.PI, i % 2 === 0);
      }

      ctx.lineTo(gx - radius, gy - radius * 0.1);
      ctx.fill();

      // Eyes
      if (ghost.mode !== 'frightened') {
        drawGhostEyes(gx, gy, radius, ghost.dir);
      } else {
        // Frightened face: small white dots
        const eyeR = radius * 0.13;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(gx - radius * 0.25, gy - radius * 0.1, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gx + radius * 0.25, gy - radius * 0.1, eyeR, 0, Math.PI * 2);
        ctx.fill();
        // Wavy mouth
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, radius * 0.08);
        ctx.beginPath();
        const my = gy + radius * 0.2;
        ctx.moveTo(gx - radius * 0.35, my);
        for (let i = 0; i < 4; i++) {
          const sx = gx - radius * 0.35 + (i + 0.5) * (radius * 0.7 / 4);
          const sy = my + (i % 2 === 0 ? -radius * 0.06 : radius * 0.06);
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      ctx.restore();
    }

    function draw(now: number) {
      const state = stateRef.current!;
      const rect = hero!.getBoundingClientRect();

      ctx.clearRect(0, 0, rect.width, rect.height);

      drawWalls(state);
      drawDots(state, now);

      if (!state.gameOver) {
        drawPacman(state, now);
        for (const ghost of state.ghosts) {
          drawGhost(ghost);
        }
      }

      // Game over text
      if (state.gameOver) {
        const cs = cellSizeRef.current;
        const ox = boardOffsetRef.current.x;
        const oy = boardOffsetRef.current.y;
        const boardW = cs * MAZE_COLS;
        const boardH = cs * MAZE_ROWS;

        const elapsed = now - state.gameOver.startTime;
        const alpha = Math.min(elapsed / 500, 0.9);

        ctx.save();
        ctx.globalAlpha = alpha;

        const goFontSize = cs * 1.8;
        ctx.font = `800 ${goFontSize}px var(--font-playfair), Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textX = ox + boardW * 0.5;
        const textY = oy + boardH * 0.42;

        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillText('GAME OVER', textX + 1, textY + 2);
        ctx.fillStyle = '#374151';
        ctx.fillText('GAME OVER', textX, textY);

        if (state.gameOver.finalScore > 0) {
          const scoreFontSize = cs * 0.9;
          ctx.font = `600 ${scoreFontSize}px var(--font-outfit), system-ui, sans-serif`;
          ctx.fillStyle = '#6b7280';
          ctx.fillText(
            `${state.gameOver.finalScore.toLocaleString()} pts  ·  Level ${state.level}`,
            textX,
            textY + goFontSize * 0.8,
          );
        }

        ctx.restore();
      }

      // Lives display
      if (!state.gameOver) {
        const cs = cellSizeRef.current;
        const ox = boardOffsetRef.current.x;
        const oy = boardOffsetRef.current.y;
        const boardH = cs * MAZE_ROWS;
        const lifeRadius = Math.max(4, cs * 0.3);

        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = isPlayingRef.current ? PACMAN_COLOR : PACMAN_COLOR_SUBTLE;
        for (let i = 0; i < state.lives - 1; i++) {
          const lx = ox + lifeRadius * 2 + i * (lifeRadius * 2.5);
          const ly = oy + boardH + lifeRadius * 1.5;
          ctx.beginPath();
          ctx.arc(lx, ly, lifeRadius, 0.2 * Math.PI, 1.8 * Math.PI);
          ctx.lineTo(lx, ly);
          ctx.fill();
        }
        ctx.restore();
      }

      // Sync score/level to parent
      if (state.score !== lastSyncedScore.current || state.level !== lastSyncedLevel.current) {
        lastSyncedScore.current = state.score;
        lastSyncedLevel.current = state.level;
        onStateChangeRef.current?.({ isPlaying: isPlayingRef.current, score: state.score, level: state.level });
      }
    }

    // ── Movement helpers ────────────────────────────────────────────
    function canMove(maze: number[][], tileX: number, tileY: number, dir: number, canUseDoor: boolean = false): boolean {
      const nx = wrapCol(tileX + DIR_DX[dir]);
      const ny = tileY + DIR_DY[dir];
      return isWalkable(maze, nx, ny, canUseDoor);
    }

    function moveEntity(entity: Entity, maze: number[][], dt: number, canUseDoor: boolean = false): boolean {
      const dist = entity.speed * dt;

      // Distance to current tile center
      const dxToCenter = entity.tileX - entity.pixelX;
      const dyToCenter = entity.tileY - entity.pixelY;
      const distToCenter = Math.sqrt(dxToCenter * dxToCenter + dyToCenter * dyToCenter);

      if (distToCenter < dist + TILE_CENTER_SNAP) {
        // At tile center: snap, try turn, then advance
        entity.pixelX = entity.tileX;
        entity.pixelY = entity.tileY;

        // Try queued direction
        if (entity.nextDir !== entity.dir && canMove(maze, entity.tileX, entity.tileY, entity.nextDir, canUseDoor)) {
          entity.dir = entity.nextDir;
        }

        // Advance to next tile
        if (canMove(maze, entity.tileX, entity.tileY, entity.dir, canUseDoor)) {
          const nx = wrapCol(entity.tileX + DIR_DX[entity.dir]);
          const ny = entity.tileY + DIR_DY[entity.dir];

          // Tunnel teleport for pixel pos
          if (Math.abs(nx - entity.pixelX) > MAZE_COLS * 0.5) {
            entity.pixelX = nx;
            entity.pixelY = ny;
          } else {
            entity.pixelX += DIR_DX[entity.dir] * dist;
            entity.pixelY += DIR_DY[entity.dir] * dist;
          }

          entity.tileX = nx;
          entity.tileY = ny;
          return true;
        }
        return false;
      }

      // Between tiles: keep moving
      entity.pixelX += DIR_DX[entity.dir] * dist;
      entity.pixelY += DIR_DY[entity.dir] * dist;

      // Tunnel wrapping for pixel pos
      if (entity.pixelX < -0.5) {
        entity.pixelX += MAZE_COLS;
        entity.tileX = wrapCol(Math.round(entity.pixelX));
      } else if (entity.pixelX > MAZE_COLS - 0.5) {
        entity.pixelX -= MAZE_COLS;
        entity.tileX = wrapCol(Math.round(entity.pixelX));
      }

      // Y-axis bounds safety (no vertical tunnels)
      if (entity.pixelY < 0 || entity.pixelY >= MAZE_ROWS) {
        entity.pixelY = Math.max(0, Math.min(MAZE_ROWS - 1, entity.tileY));
        entity.pixelX = entity.tileX;
      }
      return true;
    }

    // ── Auto-play AI ────────────────────────────────────────────────
    function autoPacmanAI(state: PacManState) {
      const pac = state.pacman;

      let closestDangerDist = Infinity;
      let closestFrightDist = Infinity;
      let closestFrightGhost: Ghost | null = null;

      for (const ghost of state.ghosts) {
        if (ghost.mode === 'eaten' || ghost.inHouse) continue;
        const d = tileDistance(pac.tileX, pac.tileY, ghost.tileX, ghost.tileY);
        if (ghost.mode === 'frightened') {
          if (d < closestFrightDist) {
            closestFrightDist = d;
            closestFrightGhost = ghost;
          }
        } else {
          if (d < closestDangerDist) {
            closestDangerDist = d;
          }
        }
      }

      // Chase frightened ghosts
      if (closestFrightGhost && closestFrightDist < 10) {
        const dir = bfs(state.maze, pac.tileX, pac.tileY, closestFrightGhost.tileX, closestFrightGhost.tileY);
        if (dir >= 0) { pac.nextDir = dir; return; }
      }

      // Flee from nearby ghosts
      if (closestDangerDist < 4) {
        let bestDir = pac.dir;
        let bestScore = -Infinity;

        for (let d = 0; d < 4; d++) {
          if (!canMove(state.maze, pac.tileX, pac.tileY, d)) continue;
          const nx = wrapCol(pac.tileX + DIR_DX[d]);
          const ny = pac.tileY + DIR_DY[d];

          let minGhostDist = Infinity;
          for (const ghost of state.ghosts) {
            if (ghost.mode === 'eaten' || ghost.mode === 'frightened' || ghost.inHouse) continue;
            minGhostDist = Math.min(minGhostDist, tileDistance(nx, ny, ghost.tileX, ghost.tileY));
          }

          const hasFood = (ny >= 0 && ny < MAZE_ROWS && nx >= 0 && nx < MAZE_COLS &&
            (state.maze[ny][nx] === CELL_DOT || state.maze[ny][nx] === CELL_PELLET)) ? 1 : 0;
          const score = minGhostDist * 2 + hasFood * 3;

          if (score > bestScore) {
            bestScore = score;
            bestDir = d;
          }
        }
        pac.nextDir = bestDir;
        return;
      }

      // Navigate to nearest dot
      const nearestDot = findNearestDot(state.maze, pac.tileX, pac.tileY);
      if (nearestDot) {
        const dir = bfs(state.maze, pac.tileX, pac.tileY, nearestDot.x, nearestDot.y);
        if (dir >= 0) {
          // 10% randomness for natural look
          if (Math.random() < 0.1) {
            const validDirs: number[] = [];
            for (let d = 0; d < 4; d++) {
              if (canMove(state.maze, pac.tileX, pac.tileY, d)) validDirs.push(d);
            }
            if (validDirs.length > 0) {
              pac.nextDir = validDirs[Math.floor(Math.random() * validDirs.length)];
              return;
            }
          }
          pac.nextDir = dir;
          return;
        }
      }

      // Fallback: random valid direction
      const validDirs: number[] = [];
      for (let d = 0; d < 4; d++) {
        if (canMove(state.maze, pac.tileX, pac.tileY, d)) validDirs.push(d);
      }
      if (validDirs.length > 0) {
        pac.nextDir = validDirs[Math.floor(Math.random() * validDirs.length)];
      }
    }

    // ── Update ──────────────────────────────────────────────────────
    function update(now: number) {
      const state = stateRef.current!;
      const dt = Math.min((now - lastUpdateTime.current) / 1000, 0.05);
      lastUpdateTime.current = now;

      // Game over
      if (state.gameOver) {
        if (now - state.gameOver.startTime >= GAME_OVER_DISPLAY_MS) {
          const wasPlaying = state.mode === 'player';
          const templateMaze = parseMaze();
          state.maze = cloneMaze(templateMaze);
          state.templateMaze = templateMaze;
          state.score = 0;
          state.level = 1;
          state.lives = 3;
          state.dotsRemaining = countDots(state.maze);
          state.ghostsEatenThisPellet = 0;
          state.globalChaseTimer = 0;
          state.globalChasePhase = 0;
          state.isScatter = true;
          state.gameOver = null;
          state.deathAnim = null;
          state.levelPause = null;
          state.pacman = createPacman();
          state.ghosts = createGhosts();

          if (wasPlaying) {
            state.mode = 'auto';
            isPlayingRef.current = false;
            if (canvasRef.current) canvasRef.current.style.opacity = CANVAS_OPACITY_IDLE;
            onStateChangeRef.current?.({ isPlaying: false, score: 0, level: 1 });
          }
        }
        return;
      }

      // Death animation
      if (state.deathAnim) {
        if (now - state.deathAnim.startTime >= DEATH_ANIM_MS) {
          state.deathAnim = null;
          state.lives--;

          if (state.lives <= 0) {
            state.gameOver = { startTime: now, finalScore: state.score };
            return;
          }

          state.pacman = createPacman();
          state.pacman.speed = state.mode === 'player' ? PACMAN_SPEED_PLAYER : PACMAN_SPEED_AUTO;
          state.ghosts = createGhosts();
          state.globalChaseTimer = 0;
          state.globalChasePhase = 0;
          state.isScatter = true;
        }
        return;
      }

      // Level pause
      if (state.levelPause) {
        if (now - state.levelPause.startTime >= LEVEL_PAUSE_MS) {
          state.levelPause = null;
          state.level++;
          state.maze = cloneMaze(state.templateMaze);
          state.dotsRemaining = countDots(state.maze);
          state.ghostsEatenThisPellet = 0;
          state.pacman = createPacman();
          state.pacman.speed = state.mode === 'player' ? PACMAN_SPEED_PLAYER : PACMAN_SPEED_AUTO;
          state.ghosts = createGhosts();
          for (const ghost of state.ghosts) {
            ghost.speed = GHOST_SPEED_BASE + state.level * GHOST_SPEED_PER_LEVEL;
          }
          state.globalChaseTimer = 0;
          state.globalChasePhase = 0;
          state.isScatter = true;
        }
        return;
      }

      // Idle timeout
      if (state.mode === 'player' && now - state.lastInput > IDLE_TIMEOUT) {
        state.mode = 'auto';
        state.pacman.speed = PACMAN_SPEED_AUTO;
        isPlayingRef.current = false;
        onStateChangeRef.current?.({ isPlaying: false, score: state.score, level: state.level });
        if (canvasRef.current) canvasRef.current.style.opacity = CANVAS_OPACITY_IDLE;
      }

      // Auto-play AI
      if (state.mode === 'auto') {
        const dxC = state.pacman.tileX - state.pacman.pixelX;
        const dyC = state.pacman.tileY - state.pacman.pixelY;
        if (Math.abs(dxC) < 0.1 && Math.abs(dyC) < 0.1) {
          autoPacmanAI(state);
        }
      }

      // Chase/scatter timer
      state.globalChaseTimer += dt * 1000;
      const phaseIndex = state.globalChasePhase;
      if (phaseIndex < CHASE_SCATTER_CYCLE.length) {
        if (state.globalChaseTimer >= CHASE_SCATTER_CYCLE[phaseIndex]) {
          state.globalChaseTimer = 0;
          state.globalChasePhase++;
          state.isScatter = state.globalChasePhase % 2 === 0;
        }
      } else {
        state.isScatter = false;
      }

      // Move Pac-Man
      moveEntity(state.pacman, state.maze, dt);

      // Eat dots
      const px = state.pacman.tileX;
      const py = state.pacman.tileY;
      if (py >= 0 && py < MAZE_ROWS && px >= 0 && px < MAZE_COLS) {
        const cell = state.maze[py][px];
        if (cell === CELL_DOT) {
          state.maze[py][px] = CELL_EMPTY;
          state.score += DOT_SCORE;
          state.dotsRemaining--;
        } else if (cell === CELL_PELLET) {
          state.maze[py][px] = CELL_EMPTY;
          state.score += PELLET_SCORE;
          state.dotsRemaining--;
          state.ghostsEatenThisPellet = 0;

          const frightenDuration = Math.max(2000, 6000 - (state.level - 1) * 500);
          for (const ghost of state.ghosts) {
            if (ghost.mode !== 'eaten' && !ghost.inHouse) {
              ghost.mode = 'frightened';
              ghost.frightenedTimer = frightenDuration;
              ghost.speed = GHOST_SPEED_FRIGHTENED;
              ghost.dir = OPPOSITE_DIR[ghost.dir];
              ghost.nextDir = ghost.dir;
              // Snap to nearest tile center so moveEntity gets proper wall checks
              // (without this, reversed ghosts move away from their tileX/tileY
              // and float through walls in the "between tiles" branch)
              ghost.tileX = Math.round(ghost.pixelX);
              ghost.tileY = Math.round(ghost.pixelY);
              ghost.pixelX = ghost.tileX;
              ghost.pixelY = ghost.tileY;
            }
          }
        }
      }

      // Level complete
      if (state.dotsRemaining <= 0) {
        state.levelPause = { startTime: now };
        return;
      }

      // Update ghosts
      for (const ghost of state.ghosts) {
        // Release from ghost house
        if (ghost.inHouse) {
          ghost.releaseTimer -= dt * 1000;
          if (ghost.releaseTimer <= 0) {
            ghost.inHouse = false;
            // Move to just above the door
            ghost.tileX = GHOST_DOOR_X;
            ghost.tileY = GHOST_DOOR_Y - 1; // row 6, which is walkable
            ghost.pixelX = ghost.tileX;
            ghost.pixelY = ghost.tileY;
            ghost.dir = DIR_LEFT;
            ghost.nextDir = DIR_LEFT;
            ghost.mode = state.isScatter ? 'scatter' : 'chase';
            ghost.speed = GHOST_SPEED_BASE + state.level * GHOST_SPEED_PER_LEVEL;
          } else {
            // Bob up and down while waiting in the house
            const bobPhase = now * 0.003 + ghost.colorIndex * Math.PI * 0.5;
            ghost.pixelY = ghost.tileY + Math.sin(bobPhase) * 0.3;
          }
          continue;
        }

        // Frightened timer
        if (ghost.mode === 'frightened') {
          ghost.frightenedTimer -= dt * 1000;
          if (ghost.frightenedTimer <= 0) {
            ghost.mode = state.isScatter ? 'scatter' : 'chase';
            ghost.speed = GHOST_SPEED_BASE + state.level * GHOST_SPEED_PER_LEVEL;
          }
        }

        // Eaten ghost returning to house
        if (ghost.mode === 'eaten') {
          ghost.speed = GHOST_SPEED_EATEN;
          // Check if arrived at or near the door
          if (Math.abs(ghost.pixelX - GHOST_DOOR_X) < 0.5 && Math.abs(ghost.pixelY - GHOST_DOOR_Y) < 0.5) {
            ghost.tileX = GHOST_DOOR_X;
            ghost.tileY = GHOST_DOOR_Y - 1;
            ghost.pixelX = ghost.tileX;
            ghost.pixelY = ghost.tileY;
            ghost.mode = state.isScatter ? 'scatter' : 'chase';
            ghost.speed = GHOST_SPEED_BASE + state.level * GHOST_SPEED_PER_LEVEL;
          }
        }

        // Update scatter/chase mode
        if (ghost.mode !== 'frightened' && ghost.mode !== 'eaten') {
          ghost.mode = state.isScatter ? 'scatter' : 'chase';
        }

        // Ghost AI at tile center
        const gdxC = ghost.tileX - ghost.pixelX;
        const gdyC = ghost.tileY - ghost.pixelY;
        if (Math.abs(gdxC) < 0.1 && Math.abs(gdyC) < 0.1) {
          if (ghost.mode === 'frightened') {
            const validDirs: number[] = [];
            for (let d = 0; d < 4; d++) {
              if (d === OPPOSITE_DIR[ghost.dir]) continue;
              if (canMove(state.maze, ghost.tileX, ghost.tileY, d)) {
                validDirs.push(d);
              }
            }
            if (validDirs.length > 0) {
              ghost.nextDir = validDirs[Math.floor(Math.random() * validDirs.length)];
            }
          } else if (ghost.mode === 'eaten') {
            const dir = bfs(state.maze, ghost.tileX, ghost.tileY, GHOST_DOOR_X, GHOST_DOOR_Y, true);
            if (dir >= 0) ghost.nextDir = dir;
          } else {
            const target = getGhostTarget(ghost, state.pacman, state.ghosts);
            ghost.nextDir = chooseGhostDirection(state.maze, ghost, target);
          }
        }

        moveEntity(ghost, state.maze, dt, ghost.mode === 'eaten');

        // Collision check
        const distToPac = tileDistance(ghost.pixelX, ghost.pixelY, state.pacman.pixelX, state.pacman.pixelY);
        if (distToPac < COLLISION_RADIUS) {
          if (ghost.mode === 'frightened') {
            const scoreIndex = Math.min(state.ghostsEatenThisPellet, GHOST_SCORES.length - 1);
            state.score += GHOST_SCORES[scoreIndex];
            state.ghostsEatenThisPellet++;
            ghost.mode = 'eaten';
            ghost.speed = GHOST_SPEED_EATEN;
          } else if (ghost.mode !== 'eaten') {
            state.deathAnim = { startTime: now };
            return;
          }
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
      if (!state || state.gameOver || state.deathAnim) return;
      if (state.mode !== 'player') return;

      const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'];
      if (!gameKeys.includes(e.key)) return;
      e.preventDefault();

      state.lastInput = performance.now();

      switch (e.key) {
        case 'ArrowLeft': state.pacman.nextDir = DIR_LEFT; break;
        case 'ArrowRight': state.pacman.nextDir = DIR_RIGHT; break;
        case 'ArrowUp': state.pacman.nextDir = DIR_UP; break;
        case 'ArrowDown': state.pacman.nextDir = DIR_DOWN; break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [initState, createPacman, createGhosts]);

  const handlePlay = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    if (state.mode === 'player') {
      state.mode = 'auto';
      state.pacman.speed = PACMAN_SPEED_AUTO;
      isPlayingRef.current = false;
      if (canvasRef.current) canvasRef.current.style.opacity = CANVAS_OPACITY_IDLE;
    } else {
      state.mode = 'player';
      state.pacman.speed = PACMAN_SPEED_PLAYER;
      state.lastInput = performance.now();
      isPlayingRef.current = true;
      if (canvasRef.current) canvasRef.current.style.opacity = CANVAS_OPACITY_PLAYING;
    }
    onStateChangeRef.current?.({ isPlaying: isPlayingRef.current, score: state.score, level: state.level });
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
          opacity: Number(CANVAS_OPACITY_IDLE),
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
});

export default MsPacManBackground;
