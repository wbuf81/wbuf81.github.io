'use client';

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

// ── Constants ──────────────────────────────────────────────────────────
const VIRTUAL_W = 400;
const VIRTUAL_H = 500;
const IDLE_TIMEOUT = 10_000;
const STAGE_INTRO_MS = 2000;
const GAME_OVER_MS = 3000;
const INVINCIBILITY_MS = 2000;
const MAX_PLAYER_BULLETS = 2;
const SHIP_SPEED = 200;
const BULLET_SPEED = 400;
const ALIEN_BULLET_SPEED = 180;
const PARTICLE_LIFE_MS = 500;
const SCORE_FLOAT_MS = 1000;
const FORMATION_COLS = 10;
const FORMATION_ROWS = 4;
const DIVE_INTERVAL_BASE = 2500;
const WING_TOGGLE_MS = 300;

// Alien types
const ALIEN_BEE = 0;
const ALIEN_BUTTERFLY = 1;
const ALIEN_BOSS = 2;

// Colors
const ALIEN_COLORS: Record<number, string> = {
  [ALIEN_BEE]: '#eab308',
  [ALIEN_BUTTERFLY]: '#ef4444',
  [ALIEN_BOSS]: '#22c55e',
};
const BOSS_ACCENT = '#3b82f6';
const BOSS_HIT_COLOR = '#f97316';

// Scoring
const SCORE_VALUES: Record<number, { formation: number; diving: number }> = {
  [ALIEN_BEE]: { formation: 50, diving: 100 },
  [ALIEN_BUTTERFLY]: { formation: 80, diving: 160 },
  [ALIEN_BOSS]: { formation: 150, diving: 400 },
};

// ── Types ──────────────────────────────────────────────────────────────
interface Star {
  x: number;
  y: number;
  speed: number;
  opacity: number;
  size: number;
}

interface Alien {
  type: number;
  row: number;
  col: number;
  alive: boolean;
  hp: number;
  diving: boolean;
  divePath: { p0: Vec2; p1: Vec2; p2: Vec2; p3: Vec2 } | null;
  diveT: number;
  diveSpeed: number;
  x: number;
  y: number;
  returningToFormation: boolean;
  returnStartX: number;
  returnStartY: number;
  returnT: number;
  diveFired: boolean;
  diveFired2: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  isAlien: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingScore {
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
}

interface Vec2 {
  x: number;
  y: number;
}

interface GalagaState {
  mode: 'auto' | 'player';
  stars: Star[];
  aliens: Alien[];
  bullets: Bullet[];
  particles: Particle[];
  floatingScores: FloatingScore[];
  shipX: number;
  shipY: number;
  lives: number;
  score: number;
  stage: number;
  stageIntro: { startTime: number; stage: number } | null;
  gameOver: { startTime: number; finalScore: number } | null;
  invincibleUntil: number;
  lastDiveTime: number;
  wingFrame: number;
  lastWingToggle: number;
  lastInput: number;
  keys: Set<string>;
  lastTime: number;
  diveIntervalMs: number;
  diveSpeedMultiplier: number;
  stageCleared: boolean;
  stageClearTime: number;
}

// ── Helpers ────────────────────────────────────────────────────────────
function bezierPoint(t: number, p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2): Vec2 {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function createStars(): Star[] {
  const stars: Star[] = [];
  const speeds = [0.2, 0.5, 1.0];
  for (let i = 0; i < 50; i++) {
    const layer = i % 3;
    stars.push({
      x: Math.random() * VIRTUAL_W,
      y: Math.random() * VIRTUAL_H,
      speed: speeds[layer],
      opacity: 0.3 + Math.random() * 0.5,
      size: 1 + Math.random(),
    });
  }
  return stars;
}

function getFormationPos(row: number, col: number, time: number): Vec2 {
  const spacingX = VIRTUAL_W / (FORMATION_COLS + 1);
  const spacingY = 24;
  const topMargin = 40;
  const sway = Math.sin(time * 0.001) * 20;
  return {
    x: spacingX * (col + 1) + sway,
    y: topMargin + row * spacingY,
  };
}

function getAlienType(row: number): number {
  if (row <= 1) return ALIEN_BEE;
  if (row === 2) return ALIEN_BUTTERFLY;
  return ALIEN_BOSS;
}

function createAliens(): Alien[] {
  const aliens: Alien[] = [];
  for (let row = 0; row < FORMATION_ROWS; row++) {
    const type = getAlienType(row);
    const colStart = type === ALIEN_BOSS ? 3 : 0;
    const colEnd = type === ALIEN_BOSS ? 7 : FORMATION_COLS;
    for (let col = colStart; col < colEnd; col++) {
      const pos = getFormationPos(row, col, 0);
      aliens.push({
        type,
        row,
        col,
        alive: true,
        hp: type === ALIEN_BOSS ? 2 : 1,
        diving: false,
        divePath: null,
        diveT: 0,
        diveSpeed: 0,
        x: pos.x,
        y: pos.y,
        returningToFormation: false,
        returnStartX: 0,
        returnStartY: 0,
        returnT: 0,
        diveFired: false,
        diveFired2: false,
      });
    }
  }
  return aliens;
}

function createDivePath(
  startX: number,
  startY: number,
  targetX: number,
  pattern: number,
): { p0: Vec2; p1: Vec2; p2: Vec2; p3: Vec2 } {
  const p0 = { x: startX, y: startY };
  const p3 = { x: startX + (Math.random() - 0.5) * 100, y: VIRTUAL_H + 40 };

  if (pattern === 0) {
    // Loop-de-loop
    const loopDir = Math.random() > 0.5 ? 1 : -1;
    return {
      p0,
      p1: { x: startX + loopDir * 120, y: startY + 80 },
      p2: { x: startX - loopDir * 80, y: VIRTUAL_H * 0.5 },
      p3,
    };
  } else if (pattern === 1) {
    // S-curve
    const dir = Math.random() > 0.5 ? 1 : -1;
    return {
      p0,
      p1: { x: startX + dir * 100, y: startY + VIRTUAL_H * 0.25 },
      p2: { x: startX - dir * 100, y: startY + VIRTUAL_H * 0.55 },
      p3,
    };
  } else {
    // Straight aggressive toward player
    return {
      p0,
      p1: { x: (startX + targetX) / 2, y: startY + 100 },
      p2: { x: targetX, y: VIRTUAL_H * 0.6 },
      p3: { x: targetX, y: VIRTUAL_H + 40 },
    };
  }
}

function spawnExplosion(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number,
  sizeRange: [number, number],
) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 40 + Math.random() * 80;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE_MS,
      maxLife: PARTICLE_LIFE_MS,
      color,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
    });
  }
}

// ── Drawing helpers ────────────────────────────────────────────────────
function drawBee(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  wingFrame: number,
) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = ALIEN_COLORS[ALIEN_BEE];

  // Body - diamond shape
  ctx.beginPath();
  ctx.moveTo(0, -5 * s);
  ctx.lineTo(4 * s, 0);
  ctx.lineTo(0, 6 * s);
  ctx.lineTo(-4 * s, 0);
  ctx.closePath();
  ctx.fill();

  // Wings
  const wingY = wingFrame === 0 ? -2 * s : 0;
  ctx.fillStyle = 'rgba(234,179,8,0.6)';
  // Left wing
  ctx.beginPath();
  ctx.moveTo(-4 * s, 0);
  ctx.lineTo(-8 * s, wingY - 3 * s);
  ctx.lineTo(-5 * s, wingY + 1 * s);
  ctx.closePath();
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(4 * s, 0);
  ctx.lineTo(8 * s, wingY - 3 * s);
  ctx.lineTo(5 * s, wingY + 1 * s);
  ctx.closePath();
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(-2 * s, -3 * s, 1.5 * s, 1.5 * s);
  ctx.fillRect(0.5 * s, -3 * s, 1.5 * s, 1.5 * s);

  ctx.restore();
}

function drawButterfly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  wingFrame: number,
) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = ALIEN_COLORS[ALIEN_BUTTERFLY];

  // Body - tall narrow
  ctx.beginPath();
  ctx.moveTo(0, -6 * s);
  ctx.lineTo(3 * s, -2 * s);
  ctx.lineTo(3 * s, 4 * s);
  ctx.lineTo(0, 7 * s);
  ctx.lineTo(-3 * s, 4 * s);
  ctx.lineTo(-3 * s, -2 * s);
  ctx.closePath();
  ctx.fill();

  // Wings - wider, curved appearance
  const wingSpread = wingFrame === 0 ? 1.0 : 0.7;
  ctx.fillStyle = 'rgba(239,68,68,0.6)';
  // Left wing
  ctx.beginPath();
  ctx.moveTo(-3 * s, -2 * s);
  ctx.lineTo(-10 * s * wingSpread, -5 * s);
  ctx.lineTo(-11 * s * wingSpread, 2 * s);
  ctx.lineTo(-3 * s, 4 * s);
  ctx.closePath();
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(3 * s, -2 * s);
  ctx.lineTo(10 * s * wingSpread, -5 * s);
  ctx.lineTo(11 * s * wingSpread, 2 * s);
  ctx.lineTo(3 * s, 4 * s);
  ctx.closePath();
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(-2 * s, -4 * s, 1.5 * s, 1.5 * s);
  ctx.fillRect(0.5 * s, -4 * s, 1.5 * s, 1.5 * s);

  ctx.restore();
}

function drawBoss(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  wingFrame: number,
  hit: boolean,
) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);

  const bodyColor = hit ? BOSS_HIT_COLOR : ALIEN_COLORS[ALIEN_BOSS];
  ctx.fillStyle = bodyColor;

  // Body - larger, more imposing
  ctx.beginPath();
  ctx.moveTo(0, -7 * s);
  ctx.lineTo(5 * s, -3 * s);
  ctx.lineTo(5 * s, 4 * s);
  ctx.lineTo(3 * s, 8 * s);
  ctx.lineTo(-3 * s, 8 * s);
  ctx.lineTo(-5 * s, 4 * s);
  ctx.lineTo(-5 * s, -3 * s);
  ctx.closePath();
  ctx.fill();

  // Accent stripes
  ctx.fillStyle = BOSS_ACCENT;
  ctx.fillRect(-4 * s, -1 * s, 8 * s, 2 * s);
  ctx.fillRect(-3 * s, 3 * s, 6 * s, 1.5 * s);

  // Wings / horns
  const wingY = wingFrame === 0 ? -2 * s : 0;
  ctx.fillStyle = hit ? 'rgba(249,115,22,0.6)' : 'rgba(34,197,94,0.6)';
  // Left
  ctx.beginPath();
  ctx.moveTo(-5 * s, -3 * s);
  ctx.lineTo(-10 * s, wingY - 6 * s);
  ctx.lineTo(-8 * s, wingY + 0 * s);
  ctx.lineTo(-5 * s, 0);
  ctx.closePath();
  ctx.fill();
  // Right
  ctx.beginPath();
  ctx.moveTo(5 * s, -3 * s);
  ctx.lineTo(10 * s, wingY - 6 * s);
  ctx.lineTo(8 * s, wingY + 0 * s);
  ctx.lineTo(5 * s, 0);
  ctx.closePath();
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(-3 * s, -5 * s, 2 * s, 2 * s);
  ctx.fillRect(1 * s, -5 * s, 2 * s, 2 * s);
  // Pupils
  ctx.fillStyle = '#000';
  ctx.fillRect(-2.5 * s, -4.5 * s, 1 * s, 1 * s);
  ctx.fillRect(1.5 * s, -4.5 * s, 1 * s, 1 * s);

  ctx.restore();
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;

  // Main body - triangle/arrow
  ctx.beginPath();
  ctx.moveTo(0, -8 * s);
  ctx.lineTo(7 * s, 6 * s);
  ctx.lineTo(4 * s, 4 * s);
  ctx.lineTo(0, 5 * s);
  ctx.lineTo(-4 * s, 4 * s);
  ctx.lineTo(-7 * s, 6 * s);
  ctx.closePath();
  ctx.fill();

  // Cockpit highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(0, -5 * s);
  ctx.lineTo(2 * s, 0);
  ctx.lineTo(0, 1 * s);
  ctx.lineTo(-2 * s, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawAlien(
  ctx: CanvasRenderingContext2D,
  alien: Alien,
  scale: number,
  wingFrame: number,
) {
  if (!alien.alive) return;
  switch (alien.type) {
    case ALIEN_BEE:
      drawBee(ctx, alien.x, alien.y, scale, wingFrame);
      break;
    case ALIEN_BUTTERFLY:
      drawButterfly(ctx, alien.x, alien.y, scale, wingFrame);
      break;
    case ALIEN_BOSS:
      drawBoss(ctx, alien.x, alien.y, scale, wingFrame, alien.hp < 2);
      break;
  }
}

function getAlienRadius(type: number): number {
  switch (type) {
    case ALIEN_BEE:
      return 8;
    case ALIEN_BUTTERFLY:
      return 10;
    case ALIEN_BOSS:
      return 12;
    default:
      return 8;
  }
}

// ── Component ──────────────────────────────────────────────────────────
export interface GalagaHandle {
  togglePlay: () => void;
}

export interface GalagaProps {
  onStateChange?: (state: { isPlaying: boolean; score: number; stage: number }) => void;
}

const GalagaBackground = forwardRef<GalagaHandle, GalagaProps>(function GalagaBackground(
  { onStateChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GalagaState | null>(null);
  const rafRef = useRef<number>(0);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const lastSyncedScore = useRef(0);
  const lastSyncedStage = useRef(0);
  const isPlayingRef = useRef(false);

  const initState = useCallback((): GalagaState => {
    const now = performance.now();
    return {
      mode: 'auto',
      stars: createStars(),
      aliens: createAliens(),
      bullets: [],
      particles: [],
      floatingScores: [],
      shipX: VIRTUAL_W / 2,
      shipY: VIRTUAL_H - 40,
      lives: 3,
      score: 0,
      stage: 1,
      stageIntro: { startTime: now, stage: 1 },
      gameOver: null,
      invincibleUntil: 0,
      lastDiveTime: now,
      wingFrame: 0,
      lastWingToggle: now,
      lastInput: now,
      keys: new Set(),
      lastTime: now,
      diveIntervalMs: DIVE_INTERVAL_BASE,
      diveSpeedMultiplier: 1.0,
      stageCleared: false,
      stageClearTime: 0,
    };
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

      // Calculate scale to fit virtual space in canvas
      const scaleX = rect.width / VIRTUAL_W;
      const scaleY = rect.height / VIRTUAL_H;
      const scale = Math.min(scaleX, scaleY);
      scaleRef.current = scale;
      offsetRef.current = {
        x: (rect.width - VIRTUAL_W * scale) / 2,
        y: (rect.height - VIRTUAL_H * scale) / 2,
      };
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Drawing ──────────────────────────────────────────────────────
    function toScreen(vx: number, vy: number): [number, number] {
      return [
        offsetRef.current.x + vx * scaleRef.current,
        offsetRef.current.y + vy * scaleRef.current,
      ];
    }

    function draw(now: number) {
      const state = stateRef.current!;
      const rect = hero!.getBoundingClientRect();
      const scale = scaleRef.current;
      const playing = isPlayingRef.current;

      ctx.clearRect(0, 0, rect.width, rect.height);

      // Stars (always drawn)
      for (const star of state.stars) {
        const [sx, sy] = toScreen(star.x, star.y);
        ctx.globalAlpha = star.opacity;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, star.size * scale * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Play area border (subtle)
      if (playing) {
        const [bx, by] = toScreen(0, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, VIRTUAL_W * scale, VIRTUAL_H * scale);
      }

      // Aliens
      const alienScale = scale * 0.85;
      for (const alien of state.aliens) {
        if (!alien.alive) continue;
        ctx.save();
        const [ax, ay] = toScreen(alien.x, alien.y);
        // Translate to screen coords for drawing
        const drawScale = alienScale / scale; // normalize since drawAlien uses its own scale internally
        // We need to draw in screen space
        drawAlien(
          ctx,
          { ...alien, x: ax, y: ay },
          drawScale,
          state.wingFrame,
        );
        ctx.restore();
      }

      // Player ship
      if (!state.gameOver) {
        const shipColor = playing ? '#06b6d4' : '#ffffff';
        const [sx, sy] = toScreen(state.shipX, state.shipY);
        // Invincibility blink
        if (now < state.invincibleUntil) {
          const blink = Math.sin(now * 0.02) > 0;
          if (blink) {
            drawShip(ctx, sx, sy, alienScale / scale, shipColor);
          }
        } else {
          drawShip(ctx, sx, sy, alienScale / scale, shipColor);
        }

        // Lives indicator
        for (let i = 0; i < state.lives - 1; i++) {
          const [lx, ly] = toScreen(20 + i * 20, VIRTUAL_H - 12);
          drawShip(ctx, lx, ly, alienScale / scale * 0.5, shipColor);
        }
      }

      // Bullets
      for (const bullet of state.bullets) {
        const [bx, by] = toScreen(bullet.x, bullet.y);
        const bw = 2 * scale;
        const bh = 6 * scale;
        ctx.fillStyle = bullet.isAlien ? '#eab308' : (playing ? '#06b6d4' : '#ffffff');
        ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      }

      // Particles
      for (const p of state.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        const [px, py] = toScreen(p.x, p.y);
        ctx.beginPath();
        ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Floating scores
      for (const fs of state.floatingScores) {
        const alpha = fs.life / fs.maxLife;
        const rise = (1 - fs.life / fs.maxLife) * 30;
        const [fx, fy] = toScreen(fs.x, fs.y - rise);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(10 * scale)}px var(--font-outfit), system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fs.value.toString(), fx, fy);
      }
      ctx.globalAlpha = 1;

      // Stage intro text
      if (state.stageIntro) {
        const elapsed = now - state.stageIntro.startTime;
        const progress = elapsed / STAGE_INTRO_MS;
        let alpha = 0;
        if (progress < 0.2) {
          alpha = progress / 0.2;
        } else if (progress < 0.7) {
          alpha = 1;
        } else if (progress < 1.0) {
          alpha = 1 - (progress - 0.7) / 0.3;
        }
        if (alpha > 0) {
          const [tx, ty] = toScreen(VIRTUAL_W / 2, VIRTUAL_H * 0.4);
          ctx.globalAlpha = alpha * 0.9;
          const fontSize = Math.round(24 * scale);
          ctx.font = `800 ${fontSize}px var(--font-playfair), Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillText(`STAGE ${state.stageIntro.stage}`, tx + 1, ty + 2);
          ctx.fillStyle = '#374151';
          ctx.fillText(`STAGE ${state.stageIntro.stage}`, tx, ty);
          ctx.globalAlpha = 1;
        }
      }

      // Game over text
      if (state.gameOver) {
        const elapsed = now - state.gameOver.startTime;
        const progress = Math.min(elapsed / GAME_OVER_MS, 1);
        let alpha = 0;
        if (progress < 0.15) {
          alpha = progress / 0.15;
        } else if (progress < 0.85) {
          alpha = 1;
        } else {
          alpha = 1 - (progress - 0.85) / 0.15;
        }

        if (alpha > 0) {
          const [tx, ty] = toScreen(VIRTUAL_W / 2, VIRTUAL_H * 0.42);
          ctx.globalAlpha = alpha * 0.9;

          const goFontSize = Math.round(22 * scale);
          ctx.font = `800 ${goFontSize}px var(--font-playfair), Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillText('GAME OVER', tx + 1, ty + 2);
          ctx.fillStyle = '#374151';
          ctx.fillText('GAME OVER', tx, ty);

          if (state.gameOver.finalScore > 0) {
            const scoreFontSize = Math.round(12 * scale);
            ctx.font = `600 ${scoreFontSize}px var(--font-outfit), system-ui, sans-serif`;
            ctx.fillStyle = '#6b7280';
            ctx.fillText(
              `${state.gameOver.finalScore.toLocaleString()} pts`,
              tx,
              ty + goFontSize * 0.9,
            );
          }

          ctx.globalAlpha = 1;
        }
      }

      // Score display (top right, subtle)
      {
        const [sx2, sy2] = toScreen(VIRTUAL_W - 10, 12);
        ctx.globalAlpha = 0.5;
        ctx.font = `600 ${Math.round(10 * scale)}px var(--font-outfit), system-ui, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(state.score.toLocaleString(), sx2, sy2);
        ctx.globalAlpha = 1;
      }

      // Sync state to parent
      if (state.score !== lastSyncedScore.current || state.stage !== lastSyncedStage.current) {
        lastSyncedScore.current = state.score;
        lastSyncedStage.current = state.stage;
        onStateChangeRef.current?.({
          isPlaying: isPlayingRef.current,
          score: state.score,
          stage: state.stage,
        });
      }
    }

    // ── Update ─────────────────────────────────────────────────────
    function update(now: number) {
      const state = stateRef.current!;
      const dt = Math.min((now - state.lastTime) / 1000, 0.05); // cap delta for tab switches
      state.lastTime = now;

      // Update stars (always)
      for (const star of state.stars) {
        star.y += star.speed * 30 * dt;
        if (star.y > VIRTUAL_H) {
          star.y -= VIRTUAL_H;
          star.x = Math.random() * VIRTUAL_W;
        }
      }

      // Wing animation toggle
      if (now - state.lastWingToggle >= WING_TOGGLE_MS) {
        state.wingFrame = state.wingFrame === 0 ? 1 : 0;
        state.lastWingToggle = now;
      }

      // Update particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 1000;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
        }
      }

      // Update floating scores
      for (let i = state.floatingScores.length - 1; i >= 0; i--) {
        const fs = state.floatingScores[i];
        fs.life -= dt * 1000;
        if (fs.life <= 0) {
          state.floatingScores.splice(i, 1);
        }
      }

      // Stage intro
      if (state.stageIntro) {
        if (now - state.stageIntro.startTime >= STAGE_INTRO_MS) {
          state.stageIntro = null;
        }
        // Don't process game logic during intro
        return;
      }

      // Game over
      if (state.gameOver) {
        if (now - state.gameOver.startTime >= GAME_OVER_MS) {
          // Reset to auto mode
          const wasPlaying = state.mode === 'player';
          state.gameOver = null;
          state.score = 0;
          state.stage = 1;
          state.lives = 3;
          state.aliens = createAliens();
          state.bullets = [];
          state.particles = [];
          state.floatingScores = [];
          state.shipX = VIRTUAL_W / 2;
          state.shipY = VIRTUAL_H - 40;
          state.invincibleUntil = 0;
          state.lastDiveTime = now;
          state.stageCleared = false;
          state.diveIntervalMs = DIVE_INTERVAL_BASE;
          state.diveSpeedMultiplier = 1.0;
          state.stageIntro = { startTime: now, stage: 1 };
          if (wasPlaying) {
            state.mode = 'auto';
            isPlayingRef.current = false;
            if (canvasRef.current) canvasRef.current.style.opacity = '0.2';
            onStateChangeRef.current?.({ isPlaying: false, score: 0, stage: 1 });
          }
        }
        return;
      }

      // Stage cleared check
      if (!state.stageCleared) {
        const aliveCount = state.aliens.filter((a) => a.alive).length;
        if (aliveCount === 0) {
          state.stageCleared = true;
          state.stageClearTime = now;
          state.bullets = [];
        }
      }

      // Stage transition
      if (state.stageCleared) {
        if (now - state.stageClearTime >= 1500) {
          state.stage++;
          state.stageCleared = false;
          state.aliens = createAliens();
          state.bullets = [];
          state.diveIntervalMs = Math.max(1000, DIVE_INTERVAL_BASE - (state.stage - 1) * 200);
          state.diveSpeedMultiplier = 1.0 + (state.stage - 1) * 0.15;
          state.stageIntro = { startTime: now, stage: state.stage };
        }
        return;
      }

      // Idle timeout
      if (state.mode === 'player' && now - state.lastInput > IDLE_TIMEOUT) {
        state.mode = 'auto';
        isPlayingRef.current = false;
        onStateChangeRef.current?.({ isPlaying: false, score: state.score, stage: state.stage });
        if (canvasRef.current) canvasRef.current.style.opacity = '0.2';
      }

      // ── Ship movement ────────────────────────────────────────────
      if (state.mode === 'player') {
        if (state.keys.has('ArrowLeft') || state.keys.has('a')) {
          state.shipX -= SHIP_SPEED * dt;
        }
        if (state.keys.has('ArrowRight') || state.keys.has('d')) {
          state.shipX += SHIP_SPEED * dt;
        }
        state.shipX = Math.max(15, Math.min(VIRTUAL_W - 15, state.shipX));
      } else {
        // AI movement
        updateAI(state, now, dt);
      }

      // ── Update alien formations ──────────────────────────────────
      for (const alien of state.aliens) {
        if (!alien.alive) continue;

        if (alien.returningToFormation) {
          // Smoothly return to formation position
          alien.returnT += dt * 1.5;
          if (alien.returnT >= 1) {
            alien.returningToFormation = false;
            alien.diving = false;
            alien.divePath = null;
            const fp = getFormationPos(alien.row, alien.col, now);
            alien.x = fp.x;
            alien.y = fp.y;
          } else {
            const fp = getFormationPos(alien.row, alien.col, now);
            alien.x = alien.returnStartX + (fp.x - alien.returnStartX) * alien.returnT;
            alien.y = alien.returnStartY + (fp.y - alien.returnStartY) * alien.returnT;
          }
        } else if (alien.diving && alien.divePath) {
          // Follow dive path
          alien.diveT += dt * alien.diveSpeed * state.diveSpeedMultiplier;

          if (alien.diveT >= 1) {
            // Exited bottom, return from top
            alien.returningToFormation = true;
            alien.returnStartX = alien.x;
            alien.returnStartY = -20;
            alien.y = -20;
            alien.returnT = 0;
            alien.diveFired = false;
            alien.diveFired2 = false;
          } else {
            const pos = bezierPoint(
              alien.diveT,
              alien.divePath.p0,
              alien.divePath.p1,
              alien.divePath.p2,
              alien.divePath.p3,
            );
            alien.x = pos.x;
            alien.y = pos.y;

            // Fire bullets during dive
            if (!alien.diveFired && alien.diveT > 0.25) {
              alien.diveFired = true;
              state.bullets.push({
                x: alien.x,
                y: alien.y + 8,
                vy: ALIEN_BULLET_SPEED,
                isAlien: true,
              });
            }
            if (!alien.diveFired2 && alien.diveT > 0.55) {
              alien.diveFired2 = true;
              state.bullets.push({
                x: alien.x,
                y: alien.y + 8,
                vy: ALIEN_BULLET_SPEED,
                isAlien: true,
              });
            }
          }
        } else {
          // In formation - follow sway
          const fp = getFormationPos(alien.row, alien.col, now);
          alien.x = fp.x;
          alien.y = fp.y;
        }
      }

      // ── Trigger dive attacks ─────────────────────────────────────
      if (now - state.lastDiveTime >= state.diveIntervalMs) {
        state.lastDiveTime = now;
        const formationAliens = state.aliens.filter(
          (a) => a.alive && !a.diving && !a.returningToFormation,
        );
        if (formationAliens.length > 0) {
          const numDivers = Math.random() > 0.5 ? 2 : 1;
          for (let d = 0; d < numDivers && formationAliens.length > 0; d++) {
            const idx = Math.floor(Math.random() * formationAliens.length);
            const diver = formationAliens[idx];
            formationAliens.splice(idx, 1);
            const pattern = Math.floor(Math.random() * 3);
            diver.diving = true;
            diver.diveT = 0;
            diver.diveSpeed = 0.4 + Math.random() * 0.2;
            diver.divePath = createDivePath(diver.x, diver.y, state.shipX, pattern);
            diver.diveFired = false;
            diver.diveFired2 = false;
          }
        }
      }

      // ── Update bullets ───────────────────────────────────────────
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        if (b.isAlien) {
          b.y += b.vy * dt;
        } else {
          b.y -= BULLET_SPEED * dt;
        }
        // Remove off-screen bullets
        if (b.y < -10 || b.y > VIRTUAL_H + 10) {
          state.bullets.splice(i, 1);
        }
      }

      // ── Collision: player bullets vs aliens ──────────────────────
      for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
        const b = state.bullets[bi];
        if (b.isAlien) continue;

        for (const alien of state.aliens) {
          if (!alien.alive) continue;
          const r = getAlienRadius(alien.type);
          if (dist({ x: b.x, y: b.y }, { x: alien.x, y: alien.y }) < r) {
            // Hit!
            state.bullets.splice(bi, 1);
            alien.hp--;
            if (alien.hp <= 0) {
              alien.alive = false;
              const isDiving = alien.diving || alien.returningToFormation;
              const scoreVal = isDiving
                ? SCORE_VALUES[alien.type].diving
                : SCORE_VALUES[alien.type].formation;
              state.score += scoreVal;
              spawnExplosion(
                state.particles,
                alien.x,
                alien.y,
                ALIEN_COLORS[alien.type],
                10,
                [1.5, 3],
              );
              state.floatingScores.push({
                x: alien.x,
                y: alien.y,
                value: scoreVal,
                life: SCORE_FLOAT_MS,
                maxLife: SCORE_FLOAT_MS,
              });
            } else {
              // Boss took first hit - small particle burst
              spawnExplosion(state.particles, alien.x, alien.y, BOSS_ACCENT, 5, [1, 2]);
            }
            break;
          }
        }
      }

      // ── Collision: alien bullets vs player ───────────────────────
      if (now >= state.invincibleUntil) {
        for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
          const b = state.bullets[bi];
          if (!b.isAlien) continue;
          if (dist({ x: b.x, y: b.y }, { x: state.shipX, y: state.shipY }) < 12) {
            state.bullets.splice(bi, 1);
            playerHit(state, now);
            break;
          }
        }

        // Collision: diving aliens vs player
        for (const alien of state.aliens) {
          if (!alien.alive || (!alien.diving && !alien.returningToFormation)) continue;
          const r = getAlienRadius(alien.type) + 8;
          if (dist({ x: alien.x, y: alien.y }, { x: state.shipX, y: state.shipY }) < r) {
            // Alien also dies
            alien.alive = false;
            spawnExplosion(
              state.particles,
              alien.x,
              alien.y,
              ALIEN_COLORS[alien.type],
              8,
              [1.5, 3],
            );
            playerHit(state, now);
            break;
          }
        }
      }
    }

    function playerHit(state: GalagaState, now: number) {
      state.lives--;
      spawnExplosion(state.particles, state.shipX, state.shipY, '#ffffff', 15, [2, 4]);

      if (state.lives <= 0) {
        state.gameOver = { startTime: now, finalScore: state.score };
      } else {
        state.invincibleUntil = now + INVINCIBILITY_MS;
        state.shipX = VIRTUAL_W / 2;
      }
    }

    function updateAI(state: GalagaState, now: number, dt: number) {
      // Find nearest alive alien
      let targetX = VIRTUAL_W / 2;
      let nearestDist = Infinity;
      for (const alien of state.aliens) {
        if (!alien.alive) continue;
        const d = Math.abs(alien.x - state.shipX);
        if (d < nearestDist) {
          nearestDist = d;
          targetX = alien.x;
        }
      }

      // Dodge incoming bullets
      let dodgeDir = 0;
      for (const b of state.bullets) {
        if (!b.isAlien) continue;
        const dx = b.x - state.shipX;
        const dy = state.shipY - b.y;
        if (Math.abs(dx) < 50 && dy > 0 && dy < 150) {
          dodgeDir = dx > 0 ? -1 : 1;
          break;
        }
      }

      // Dodge diving aliens
      if (dodgeDir === 0) {
        for (const alien of state.aliens) {
          if (!alien.alive || !alien.diving) continue;
          const dx = alien.x - state.shipX;
          const dy = state.shipY - alien.y;
          if (Math.abs(dx) < 50 && dy > 0 && dy < 150) {
            dodgeDir = dx > 0 ? -1 : 1;
            break;
          }
        }
      }

      if (dodgeDir !== 0) {
        state.shipX += dodgeDir * SHIP_SPEED * 0.8 * dt;
      } else {
        // Move toward target with smoothing
        const diff = targetX - state.shipX;
        const moveSpeed = SHIP_SPEED * 0.6;
        if (Math.abs(diff) > 3) {
          state.shipX += Math.sign(diff) * Math.min(moveSpeed * dt, Math.abs(diff));
        }
      }
      state.shipX = Math.max(15, Math.min(VIRTUAL_W - 15, state.shipX));

      // Auto-fire
      const playerBullets = state.bullets.filter((b) => !b.isAlien);
      if (playerBullets.length < MAX_PLAYER_BULLETS) {
        // Check if roughly aligned with any alien
        let aligned = false;
        for (const alien of state.aliens) {
          if (!alien.alive) continue;
          if (Math.abs(alien.x - state.shipX) < 20) {
            aligned = true;
            break;
          }
        }
        if (aligned && Math.random() > 0.1) {
          state.bullets.push({
            x: state.shipX,
            y: state.shipY - 10,
            vy: 0,
            isAlien: false,
          });
        }
      }
    }

    // ── RAF loop ──────────────────────────────────────────────────
    function loop(now: number) {
      update(now);
      draw(now);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    // ── Keyboard ──────────────────────────────────────────────────
    function handleKeyDown(e: KeyboardEvent) {
      const state = stateRef.current;
      if (!state || state.gameOver) return;
      if (state.mode !== 'player') return;

      const gameKeys = ['ArrowLeft', 'ArrowRight', 'a', 'd', ' '];
      if (!gameKeys.includes(e.key)) return;
      e.preventDefault();

      state.lastInput = performance.now();
      state.keys.add(e.key);

      // Fire on space press
      if (e.key === ' ') {
        const playerBullets = state.bullets.filter((b) => !b.isAlien);
        if (playerBullets.length < MAX_PLAYER_BULLETS) {
          state.bullets.push({
            x: state.shipX,
            y: state.shipY - 10,
            vy: 0,
            isAlien: false,
          });
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      const state = stateRef.current;
      if (!state) return;
      state.keys.delete(e.key);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
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
      state.keys.clear();
      if (canvasRef.current) canvasRef.current.style.opacity = '0.2';
    } else {
      state.mode = 'player';
      state.lastInput = performance.now();
      isPlayingRef.current = true;
      if (canvasRef.current) canvasRef.current.style.opacity = '0.3';
      // If game over is active, skip it
      if (state.gameOver) {
        state.gameOver = null;
        state.score = 0;
        state.stage = 1;
        state.lives = 3;
        state.aliens = createAliens();
        state.bullets = [];
        state.particles = [];
        state.floatingScores = [];
        state.shipX = VIRTUAL_W / 2;
        state.shipY = VIRTUAL_H - 40;
        state.invincibleUntil = 0;
        state.lastDiveTime = performance.now();
        state.stageCleared = false;
        state.diveIntervalMs = DIVE_INTERVAL_BASE;
        state.diveSpeedMultiplier = 1.0;
        state.stageIntro = { startTime: performance.now(), stage: 1 };
      }
    }
    onStateChangeRef.current?.({
      isPlaying: isPlayingRef.current,
      score: state.score,
      stage: state.stage,
    });
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

export default GalagaBackground;
