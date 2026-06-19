/**
 * Central tunables. Values trace directly to SPEC.md §2–§4 so designers can
 * tweak gameplay feel without hunting through entity code.
 */

export const BASE_URL = import.meta.env.BASE_URL;

/** Resolve a runtime asset path against Vite's configured base. */
export function asset(path: string): string {
  return `${BASE_URL}${path.replace(/^\/+/, '')}`;
}

export const VIEWPORT = { width: 1280, height: 720 } as const;

export const DEBUG_KEY = 'D';

// --- Rainbow Fish (player) — §2.1 ---
export const PLAYER = {
  speedX: 200,
  speedY: 160,
  hitboxScale: 0.6, // circle ~60% of sprite width
  spriteSize: 64,
} as const;

// --- Bubble — §2.1 ---
export const BUBBLE = {
  cooldownMs: 400,
  speed: 320,
  lifetimeMs: 1500,
  maxOnScreen: 3,
  size: 16,
} as const;

// --- Mad Octopus — §2.2 ---
export const OCTOPUS = {
  patrolSpeed: 90,
  chaseSpeed: 150,
  detectRadiusX: 260, // ellipse, wider horizontally
  detectRadiusY: 180,
  biteRange: 40,
  biteDamage: 1,
  biteCooldownMs: 1200,
  loseRadius: 360,
  loseAggroMs: 2000,
  waypointPauseMs: 400,
  neutralizedTint: 0x888899,
  neutralizedAlpha: 0.7,
  spriteW: 72,
  spriteH: 80,
} as const;

// --- Health & Combat — §3 ---
export const HEALTH = {
  startHP: 4,
  invulnMs: 1500,
  flickerMs: 100,
} as const;

// --- Camera — §4.1 ---
export const CAMERA = {
  lerpX: 0.08,
  lerpY: 0.08,
  // keep player within middle 50% of screen height (deadzone)
  deadzoneHeightFraction: 0.5,
} as const;

// --- Palette — §7.2 ---
export const COLORS = {
  bgTop: 0x1a4a6e,
  bgBottom: 0x0d2f4a,
  fishTeal: 0x5ec4bc,
  fishHeartFin: 0xe8847c,
  fishStripe: 0xd94f4f,
  fishOrange: 0xf5a623,
  fishPurple: 0x7b4397,
  white: 0xffffff,
  eye: 0x1a1a1a,
  octoBody: 0xb8a0d2,
  octoSpot: 0x5ec4bc,
  shellPink: 0xff6b9d,
  shellOutline: 0x2d2d2d,
  starTeal: 0x4ecdc4,
  bubble: 0xa8e6ff,
  coral: 0xff7e6b,
  rock: 0x4a5b6e,
  heartFull: 0xe8487c,
} as const;
