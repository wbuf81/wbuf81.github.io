'use client';

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  COLS, ROWS, IDLE_TIMEOUT, AI_STEP_MS, GRAVITY_MS, LOCK_DELAY_MS, LINE_FLASH_MS, GAME_OVER_ROW_MS, CELEBRATION_MS, POINTS,
  WALL_KICKS, I_WALL_KICKS, type TetrisState,
  createEmptyGrid, getShape, collides, lockPiece, findFullRows, clearRows, ghostY, fillBag, spawnPiece, computeAiTarget, isGameKey, handleKey,
} from '@/lib/tetris';

/*
 * The Tetris board inside the hero's arcade print. It fills its parent box (the print's screen sets the size),
 * plays itself in dim greys, and switches to the classic colours while someone plays. Keys reach it only while
 * playing. The rules live in lib/tetris.ts.
 */
const VIVID = ['#06b6d4', '#eab308', '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#f97316']; // I O T S Z J L
const DIM = ['#556170', '#5e6a78', '#4b5664', '#586472', '#515c6a', '#5a6674', '#4f5a68'];
const GRID = 'rgba(255,255,255,0.045)';

export interface TetrisHandle {
  togglePlay: () => void;
}

export interface TetrisProps {
  onStateChange?: (state: { isPlaying: boolean; score: number; lines: number }) => void;
}

const TetrisBoard = forwardRef<TetrisHandle, TetrisProps>(function TetrisBoard({ onStateChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
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
    };
    state.active = spawnPiece(state);
    if (state.active && state.mode === 'auto') {
      state.aiTarget = computeAiTarget(state.grid, state.active);
    }
    return state;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d')!;
    stateRef.current = initState();

    function resize() {
      const rect = wrap!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      canvas!.style.width = rect.width + 'px';
      canvas!.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cs = Math.floor(Math.min(rect.height / ROWS, rect.width / COLS));
      cellSizeRef.current = Math.max(cs, 4);
      const boardW = cellSizeRef.current * COLS;
      const boardH = cellSizeRef.current * ROWS;
      boardOffsetRef.current = {
        x: Math.floor((rect.width - boardW) / 2),
        y: Math.floor((rect.height - boardH) / 2),
      };
    }
    resize();
    window.addEventListener('resize', resize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap);

    // Canvas text can't read CSS variables, so resolve the design system's faces once.
    const cssVar = (name: string) => getComputedStyle(wrap).getPropertyValue(name).trim();
    const fonts = { serif: cssVar('--serif') || 'Georgia, serif', sans: cssVar('--sans') || 'system-ui, sans-serif' };
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

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
      const rect = wrap!.getBoundingClientRect();
      const cs = cellSizeRef.current;
      const ox = boardOffsetRef.current.x;
      const oy = boardOffsetRef.current.y;
      const boardW = cs * COLS;
      const boardH = cs * ROWS;
      const palette = isPlayingRef.current ? VIVID : DIM;

      ctx.clearRect(0, 0, rect.width, rect.height);

      // Grid lines
      ctx.strokeStyle = GRID;
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
        const fillColor = '#3b4552';
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
        ctx.font = `800 ${goFontSize}px ${fonts.serif}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textX = ox + boardW / 2;
        const textY = oy + boardH * 0.42;

        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillText('GAME OVER', textX + 1, textY + 2);
        ctx.fillStyle = '#e6ebf0';
        ctx.fillText('GAME OVER', textX, textY);

        // Final score
        if (state.gameOver.finalScore > 0) {
          const scoreFontSize = cs * 0.9;
          ctx.font = `600 ${scoreFontSize}px ${fonts.sans}`;
          ctx.fillStyle = '#9aa7b3';
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
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox + 0.5, oy + 0.5, boardW - 1, boardH - 1);
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
            ctx.font = `800 ${fontSize}px ${fonts.serif}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const textX = ox + boardW / 2;
            const textY = oy + boardH / 2 + drift;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillText(state.celebration.text, textX + 1, textY + 2);

            // Main text
            ctx.fillStyle = isTetris ? '#e6ebf0' : '#9aa7b3';
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
      // With reduced motion the board holds still until someone plays.
      if (!(reduceMotion && stateRef.current!.mode === 'auto')) update(now);
      draw(now);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    // Keyboard
    function handleKeyDown(e: KeyboardEvent) {
      const state = stateRef.current;
      if (state && handleKey(state, e.key, performance.now())) e.preventDefault();
    }

    // Some browsers press a focused button with Space on keyup; while playing, Space is the game's.
    function handleKeyUp(e: KeyboardEvent) {
      const state = stateRef.current;
      if (state && state.mode === 'player' && isGameKey(e.key)) e.preventDefault();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      ro?.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [initState]);

  const handlePlay = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    if (state.mode === 'player') {
      state.mode = 'auto';
      isPlayingRef.current = false;
      if (state.active) {
        state.aiTarget = computeAiTarget(state.grid, state.active);
        state.lastAiStep = performance.now();
      }
    } else {
      state.mode = 'player';
      state.lastInput = performance.now();
      state.aiTarget = null;
      isPlayingRef.current = true;
    }
    onStateChangeRef.current?.({ isPlaying: isPlayingRef.current, score: state.score, lines: state.lines });
  }, []);

  useImperativeHandle(ref, () => ({ togglePlay: handlePlay }), [handlePlay]);

  return (
    <div ref={wrapRef} aria-hidden="true" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />
    </div>
  );
});

export default TetrisBoard;
