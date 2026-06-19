# Treasure Hunt — Game Specification

A kid-friendly underwater adventure: **Rainbow Fish** searches for treasures while avoiding **Mad Octopus** rivals. Built with **Phaser 3**, **TypeScript**, **Vite**, and **Node 20**.

This document is the source of truth for implementation. Where behavior is not explicitly defined below, prefer simple, readable defaults and note assumptions in code comments rather than inventing new mechanics.

> **Art pipeline (required):** All four JPEG references (Rainbow Fish, Mad Octopus, shell, star) must be **hand-traced into SVG** and exported as **transparent PNG sprites** for Phaser. JPEGs are **reference-only** — copy them to `assets/reference/` for tracing, but **never load or display them in gameplay**. See §7.1 for the full pipeline.

---

## 1. High-Level Concept

| Item | Detail |
|------|--------|
| Genre | Side-scrolling 2D underwater action |
| Perspective | Side view; player swims **left/right** through a wide level with **up/down** freedom in the water column |
| Scope (v1) | 2 levels, linear left-to-right progression |
| Tone | Playful, hand-drawn storybook aesthetic (based on reference sketches) |
| Target platform | Desktop browser (keyboard); **installable PWA**; mobile touch out of scope for v1 |
| Distribution | **GitHub Pages** at [scizor666/treasure-hunt](https://github.com/scizor666/treasure-hunt) — fully playable **offline** after first visit |

### Core loop

1. Player spawns at the **left** of the level with **4 HP (hearts)**.
2. Swim right through the level, surviving **nearly unavoidable** Mad Octopus encounters.
3. Neutralize rivals with bubbles **or** dodge through — clearing all rivals is **not** required.
4. Reach the **treasure at the far right** of the level to advance.
5. On **0 HP**, restart from **Level 1** (full game reset, not just current level).
6. After Level 2 treasure is collected, show a **win screen**.

---

## 2. Characters & Entities

### 2.1 Rainbow Fish (player)

**Reference:** `/home/alex/Downloads/rainbow-fish.jpg`

| Property | Value |
|----------|-------|
| Role | Player-controlled protagonist |
| Visual | Round teal body, heart-shaped dorsal fin (pink), side fins, striped tail (teal/white/red/orange/purple bands), single eye upper-right |
| Hitbox | Circle ~60% of sprite width (forgiving for kids) |
| Speed (horizontal) | `200 px/s` |
| Speed (vertical) | `160 px/s` |
| Facing | Faces **right** by default; `flipX` when moving left; idle keeps last horizontal facing |

**Abilities**

- **Move:** `←/→` or `A/D` to swim horizontally; `↑/↓` or `W/S` to swim vertically. Diagonal input normalized (no √2 speed boost).
- **Bubble attack:** Fires horizontally in facing direction (`Space` also fires up/down if no horizontal input and vertical key held).

| Bubble property | Value |
|-----------------|-------|
| Trigger | `Space` or left mouse click |
| Cooldown | `400 ms` |
| Speed | `320 px/s` |
| Lifetime | `1.5 s` or until off-screen / hit |
| Hit effect | **Fully neutralizes** one Mad Octopus (see §3.2) |
| Max on screen | `3` concurrent bubbles |

Bubbles do not damage the player, pass through treasure, and are destroyed on first enemy hit.

### 2.2 Mad Octopus (rival)

**Reference:** `/home/alex/Downloads/mad-octupus.jpg`

| Property | Value |
|----------|-------|
| Role | Hostile NPC |
| Visual | Lavender/purple bulbous body, teal dash spots, upward tentacles, large toothy mouth |
| Hitbox | Body ellipse ~70% of sprite; mouth zone used for bite detection |
| Speed (patrol) | `90 px/s` |
| Speed (chase) | `150 px/s` |
| Per level | Level 1: **7** · Level 2: **9** |

**AI states**

```
PATROL / AMBUSH → (player in detect radius or trigger) → CHASE → (in bite range) → BITE → CHASE
                ↑                                              │
                └──── (player leaves lose radius) ───────────────┘

NEUTRALIZED (terminal — no transitions out)
```

| State | Behavior |
|-------|----------|
| **Patrol** | Swim between 2–4 waypoints in assigned zone; pause `400 ms` at each waypoint |
| **Ambush** | Hidden/off-screen until player enters a **trigger zone** (see §4.5); then emerge and immediately Chase |
| **Chase** | Move toward player when within **260 px** detection radius (ellipse: wider horizontally) |
| **Bite** | When within **40 px** of player center, deal **1 HP** damage, play bite animation, enter **1.2 s** bite cooldown (octopus keeps chasing but cannot bite) |
| **Neutralized** | Hit by bubble: stop moving, play "deflated/dizzy" tint or sprite, no collision damage; remains on map as visual feedback |

**Lose aggro:** If player exceeds **360 px** from octopus for **2 s**, return to Patrol (ambush types do not re-hide).

Octopuses do not respawn after neutralization. **Clearing all rivals is optional** — only the treasure is required to finish a level.

### 2.3 Treasures

| Level | Treasure | Reference |
|-------|----------|-----------|
| 1 | Pink scallop shell | `/home/alex/Downloads/shell.jpg` |
| 2 | Teal five-point star | `/home/alex/Downloads/star.jpg` |

| Property | Value |
|----------|-------|
| Placement | Fixed at the **far-right end** of each level (see §4) |
| Collection | Overlap player hitbox with treasure hitbox |
| Effect | Level complete → transition to next level or win screen |
| Visual feedback | Brief scale pulse + particle sparkle on pickup |

The treasure sits just beyond the final encounter cluster — reaching it confirms the player survived the gauntlet.

---

## 3. Health & Combat

### 3.1 Hearts (HP)

| Rule | Detail |
|------|--------|
| Starting HP | **4 hearts** at new game / after game over |
| Damage | **1 octopus bite = −1 HP** |
| Invulnerability | **1.5 s** after taking damage (sprite flicker alpha 0.4 ↔ 1.0 every 100 ms) |
| Display | 4 heart icons, top-left HUD; empty hearts shown as outline |
| Game over | At **0 HP** → **Game Over** screen → restart from **Level 1** with 4 HP |

HP **persists across Level 1 → Level 2** during a single run. Only death (0 HP) resets to Level 1 with 4 HP.

### 3.2 Neutralization

One bubble hit → octopus enters **Neutralized** state permanently for that level:

- No movement, no bites
- Semi-transparent or gray-purple tint (`tint: 0x888899`, `alpha: 0.7`)
- Optional: small "zzz" or star spin animation above head

---

## 4. Levels

### 4.1 Shared rules

| Property | Value |
|----------|--------|
| Viewport | `1280 × 720` px (Phaser canvas) |
| Level width | Level 1: **`4800` px** · Level 2: **`6400` px** |
| Level height | **`720` px** (full water column; floor + surface boundaries) |
| Scroll | **Horizontal side-scroll** — camera follows player, clamped to level bounds |
| Boundaries | Solid floor, ceiling, left/right walls; coral/rock obstacles block movement |
| Background | Parallax underwater layers (2–3 depths) + gradient; optional bubble particles |
| Spawn | Player at **x ≈ 120**, vertically centered each level |
| Progression | Player moves **left → right**; treasure at **x ≈ levelWidth − 150** |

**Camera behavior**

- Follow Rainbow Fish with **`lerp: 0.08`** on X axis.
- Vertical follow: soft — keep player in middle **50%** of screen height; clamp so camera never exposes empty void.
- Do not scroll past level edges.

### 4.2 Encounter design philosophy

Rivals are **not required to be defeated**, but level layout must make encounters **nearly unavoidable** and **surprising**. The player should feel they are swimming through hostile territory, not opt-in combat arenas.

**Design rules (mandatory for both levels):**

| Rule | Intent |
|------|--------|
| **No safe corridor** | Any route to the treasure passes within **≤ 200 px** of at least **5** active rival zones (Level 1) or **7** (Level 2) |
| **Unexpected placement** | At least **50%** of rivals use **ambush** or **off-screen emerge** patterns (§4.5) |
| **Rhythm of tension** | Alternate brief calm stretches (≤ 1 screen wide) with choke points or multi-rival clusters |
| **Vertical surprise** | At least **2** rivals per level attack from a different vertical lane than the player's current path (above/below coral) |
| **False safety** | At least **1** rival hidden behind coral/rock that becomes visible only when player is committed to a narrow passage |
| **No pre-combat telegraph** | Avoid placing all rivals in open water at spawn; first encounter within **1.5 screens** of start |

Bubbles are the pressure valve — skilled players neutralize threats; others weave through at HP cost.

### 4.3 Level 1 — Shell Cove

| Item | Detail |
|------|--------|
| Width | `4800 px` (~3.75 screens) |
| Treasure | Shell at far right, mid-height |
| Rivals | **7** Mad Octopuses |
| Difficulty | Introduces ambush pattern; fewer overlapping chases |

**Encounter beat map (7 rivals):**

| # | X zone (approx) | Pattern | Notes |
|---|-----------------|---------|-------|
| 1 | `900` | Open patrol | First "warm-up" chase in wide water |
| 2 | `1400` | **Ambush** (coral alcove) | Hidden until player passes alcove mouth |
| 3 | `1900` | Vertical patrol | Blocks upper lane; forces dip or bubble |
| 4 | `2400` | **Drop-in** | Emerges from above when player crosses trigger |
| 5 | `2900` | Choke patrol | Narrow coral gap — hard to pass untouched |
| 6 | `3500` | **Ambush** (off-screen bottom) | Surges up from below after calm stretch |
| 7 | `4100` | Gate patrol | Final obstacle before shell |

Calm stretch before treasure: **≤ 400 px** only.

### 4.4 Level 2 — Star Reef

| Item | Detail |
|------|--------|
| Width | `6400 px` (~5 screens) |
| Treasure | Star at far right, upper third |
| Rivals | **9** Mad Octopuses |
| Difficulty | More ambushes, tighter vertical shafts, overlapping detection radii |

**Encounter beat map (9 rivals):**

| # | X zone (approx) | Pattern | Notes |
|---|-----------------|---------|-------|
| 1 | `700` | **Ambush** | Early surprise — sets tone immediately |
| 2 | `1200` | Vertical shaft block | Must swim through rival's patrol column |
| 3 | `1700` | Open patrol | Brief relief, then double threat ahead |
| 4 | `2100` | **False-safety ambush** | Hidden behind foreground coral |
| 5 | `2700` | **Drop-in** | From ceiling kelp |
| 6 | `3300` | Dual patrol (2 rivals) | Two waypoints overlapping same gap — counts as 2 of 9 |
| 7 | `4000` | **Ambush** (rear alcove) | Player thinks gap is clear |
| 8 | `4800` | Choke + vertical | Forces upward toward star lane |
| 9 | `5600` | Gate patrol | Last bite chance before star |

Calm stretch before treasure: **≤ 300 px** only.

### 4.5 Rival spawn patterns

```typescript
type OctopusPattern = 'patrol' | 'ambush' | 'drop-in' | 'surge-up';

interface OctopusSpawn {
  x: number;
  y: number;
  pattern: OctopusPattern;
  waypoints: { x: number; y: number }[];
  trigger?: Rectangle;   // required for ambush / drop-in / surge-up
  hiddenUntilTrigger?: boolean;
}
```

| Pattern | Behavior |
|---------|----------|
| **patrol** | Visible from level load; swims waypoints |
| **ambush** | Invisible or dimmed behind coral until player enters `trigger` rect; fades in + immediate chase |
| **drop-in** | Starts above viewport; drops into play when triggered |
| **surge-up** | Starts below floor line / hidden trench; rises into path when triggered |

Trigger zones should sit **just before** the rival's attack lane so the player commits before the reveal.

### 4.6 Level data format

Store layouts as JSON under `src/levels/`:

```typescript
interface LevelDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  playerSpawn: { x: number; y: number };
  treasure: { type: 'shell' | 'star'; x: number; y: number };
  walls: Rectangle[];           // floor, ceiling, coral, rocks
  parallaxLayers?: ParallaxLayer[];
  octopuses: OctopusSpawn[];
}
```

Implementation agent should author `level-1.json` and `level-2.json`, playtest scroll pacing, and verify §4.2 rules with debug overlays for trigger zones and detection radii.

---

## 5. Controls & Input

| Action | Keyboard | Mouse |
|--------|----------|-------|
| Swim horizontal | `A/D` / `←/→` | — |
| Swim vertical | `W/S` / `↑/↓` | — |
| Shoot bubble | `Space` (horizontal facing, or vertical if only ↑/↓ held) | Left click (fires toward cursor from player) |
| Pause | `Esc` | — |
| Restart (game over / win) | `Enter` or `R` | Click button |

Diagonal movement is normalized (no √2 speed boost).

---

## 6. UI & Flow

### 6.1 Scenes (Phaser)

```
BootScene → PreloadScene → MenuScene → GameScene (level 1 | 2) → WinScene
                              ↓                              ↓
                         (start game)                   GameOverScene → MenuScene
```

| Scene | Purpose |
|-------|---------|
| **Boot** | Init scale mode, registry |
| **Preload** | Load vector assets, progress bar |
| **Menu** | Title "Treasure Hunt", Play button, brief instructions |
| **Game** | Single scene reused with level parameter |
| **GameOver** | "Oh no! Try again?" — restart Level 1 |
| **Win** | "You found all treasures!" — play again |

### 6.2 HUD (in Game scene)

- Hearts (top-left)
- Level name (top-center): "Level 1: Shell Cove" / "Level 2: Star Reef"
- Optional: rivals remaining counter (neutralized count) — nice-to-have, not required v1

### 6.3 Instructions (Menu)

> Swim with arrow keys or WASD. Press Space to shoot bubbles at octopuses — you don't have to beat them all, but they'll get in your way! Reach the treasure at the end of each level. You have 4 hearts — each bite costs one.

---

## 7. Art & Asset Pipeline

### 7.1 Vectorization requirement

**Non-negotiable:** The shipped game must not use the source JPEGs as sprites. Every reference sketch below must be vectorized before it appears in-game.

Reference JPEGs are **concept art only**. Shipped game uses **clean SVG → PNG** (or SVG loaded directly where Phaser supports it).

**Process for implementation agent:**

1. Copy references into `assets/reference/` (read-only archive).
2. Trace each character as simplified SVG paths preserving silhouette and palette.
3. Export `@2x` PNG sprites with transparent background for Phaser textures.
4. Keep SVGs in `assets/svg/` as editable source.

### 7.2 Target palettes (from reference art)

| Asset | Colors (hex) |
|-------|----------------|
| Rainbow Fish body | `#5EC4BC` teal, `#E8847C` heart fin, `#D94F4F` stripe, `#F5A623` orange band, `#7B4397` purple scales, `#FFFFFF` tail highlights, `#1A1A1A` eye |
| Mad Octopus | `#B8A0D2` lavender body, `#5EC4BC` spots, `#FFFFFF` teeth, `#1A1A1A` eye/pupil |
| Shell | `#FF6B9D` pink fill, `#2D2D2D` outline |
| Star | `#4ECDC4` teal fill, `#2D2D2D` outline (optional) |

### 7.3 Sprite dimensions (canvas, transparent)

| Asset | Size (px) | Notes |
|-------|-----------|-------|
| Rainbow Fish | 64 × 64 | Side view, facing **right** in base frame; `flipX` for left |
| Mad Octopus | 72 × 80 | Side view; mouth toward forward/right direction |
| Shell | 48 × 40 | |
| Star | 44 × 44 | |
| Bubble | 16 × 16 | Simple circle, light blue `#A8E6FF`, white highlight |
| Heart (HUD) | 24 × 24 | Filled + empty variants |

### 7.4 Optional animations (v1 — minimal)

| Entity | Frames | FPS |
|--------|--------|-----|
| Rainbow Fish swim | 2-frame tail wobble | 4 |
| Octopus patrol | 2-frame tentacle sway | 3 |
| Octopus bite | 1-frame mouth open (scale squash) | event-driven |
| Bubble | 2-frame pulse | 6 |

Static sprites acceptable for v1 if time-constrained; note in PR.

### 7.5 Non-character assets

Implementation agent creates procedurally or with simple SVG:

- `heart-full`, `heart-empty`
- `rock` / `coral` tile (32×32)
- Background gradient (CSS or Phaser rectangle layers)
- Particle: 4px circle for treasure sparkle

---

## 8. Technical Architecture

### 8.1 Stack

| Tool | Version |
|------|---------|
| Node | **20.x** LTS |
| Package manager | `npm` |
| Bundler | **Vite** (latest 5.x) |
| Language | **TypeScript** 5.x strict |
| Game framework | **Phaser 3.80+** |
| PWA | **`vite-plugin-pwa`** (Workbox under the hood) |
| Hosting | **GitHub Pages** via GitHub Actions |

### 8.2 Project structure

```
treasure-hunt/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── SPEC.md                    ← this file
├── README.md                  ← setup, deploy URL, offline test steps
├── .github/
│   └── workflows/
│       └── deploy.yml         ← build + deploy to GitHub Pages
├── assets/
│   ├── reference/             ← copied JPEGs (not shipped in dist)
│   ├── svg/                   ← vector sources
│   └── png/                   ← exported sprites @2x
├── public/
│   ├── assets/                ← game sprites, levels copied/served statically
│   ├── icons/                 ← PWA icons (192, 512, maskable)
│   ├── favicon.ico
│   └── robots.txt             ← optional
└── src/
    ├── main.ts                ← Phaser game config entry
    ├── config.ts              ← constants (speeds, radii, colors)
    ├── scenes/
    │   ├── BootScene.ts
    │   ├── PreloadScene.ts
    │   ├── MenuScene.ts
    │   ├── GameScene.ts
    │   ├── GameOverScene.ts
    │   └── WinScene.ts
    ├── entities/
    │   ├── Player.ts
    │   ├── Octopus.ts
    │   ├── Bubble.ts
    │   └── Treasure.ts
    ├── systems/
    │   ├── CombatSystem.ts    ← damage, i-frames
    │   ├── LevelLoader.ts
    │   └── CameraController.ts ← horizontal follow + bounds
    ├── ui/
    │   └── HeartsHUD.ts
    └── levels/
        ├── level-1.json
        └── level-2.json
```

### 8.3 Phaser config

```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a4a6e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false, // true in dev via import.meta.env.DEV
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // GameScene: enable camera scroll via this.cameras.main.setBounds(0, 0, level.width, level.height)
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene, WinScene],
};
```

### 8.4 Key constants (`config.ts`)

Export tunables matching §2–§4 values so designers can tweak without hunting code.

### 8.5 Collision groups

| Group | Collides with |
|-------|----------------|
| Player | Walls, Octopus (bite), Treasure |
| Bubble | Octopus (active only) |
| Octopus | Walls |
| Treasure | Player |

Use Phaser Arcade Physics overlap for bite/treasure; tile/wall collision via static group or bounds.

### 8.6 Asset path base URL

GitHub Pages serves from a subpath. This repo deploys to **`https://scizor666.github.io/treasure-hunt/`** — all runtime asset URLs must respect Vite's `base`:

```typescript
// config.ts
export const BASE_URL = import.meta.env.BASE_URL;

// PreloadScene — prefix Phaser load paths
this.load.image('fish', `${BASE_URL}assets/png/rainbow-fish.png`);
```

Never hard-code absolute paths like `/assets/...` — they break on GitHub Pages.

---

## 9. PWA, Offline Play & GitHub Pages

### 9.1 Goals

| Requirement | Detail |
|-------------|--------|
| PWA | Installable from browser; valid Web App Manifest |
| Offline | **Fully playable offline** after the first successful load (both levels, all scenes, all assets) |
| Hosting | Production build deployed to **GitHub Pages** on push to `main` |
| HTTPS | GitHub Pages provides TLS (required for service workers) |

### 9.2 Vite configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/treasure-hunt/', // matches https://github.com/scizor666/treasure-hunt
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', 'assets/**/*'],
      manifest: {
        name: 'Treasure Hunt',
        short_name: 'Treasure Hunt',
        description: 'Help Rainbow Fish find treasures and dodge Mad Octopuses!',
        theme_color: '#1a4a6e',
        background_color: '#1a4a6e',
        display: 'standalone',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,png,svg,json,ico,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [], // prefer full precache; no network-dependent routes in v1
      },
    }),
  ],
});
```

**Target repository:** [scizor666/treasure-hunt](https://github.com/scizor666/treasure-hunt) — `base: '/treasure-hunt/'` matches the repo name.

### 9.3 Service worker & caching strategy

**Non-negotiable:** After one online visit, the game must run with **zero network requests** (verify in DevTools → Network → Offline).

| Cache target | Strategy | Notes |
|--------------|----------|-------|
| `index.html` | **Precache** | App shell |
| JS / CSS bundles | **Precache** | Hashed filenames from Vite build |
| Game sprites (`public/assets/**`) | **Precache** | All PNG/SVG used in gameplay |
| Level JSON (`level-1.json`, `level-2.json`) | **Precache** | Bundled or in `public/` — must be cached either way |
| PWA icons & favicon | **Precache** | Via `includeAssets` + manifest |
| Reference JPEGs | **Do not ship** | Stay out of `public/` and out of precache globs |
| Optional audio (§10) | **Precache** if added | Include in `globPatterns` |

Register the service worker from `src/main.ts`:

```typescript
import { registerSW } from 'virtual:pwa-register';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
```

**Update behavior:** `registerType: 'autoUpdate'` — new deploys replace cached assets on next visit/reload. No custom update UI required for v1.

**Dev mode:** Service worker disabled during `npm run dev` (default vite-plugin-pwa behavior). Always test offline against **`npm run build && npm run preview`**.

### 9.4 GitHub Pages deployment

| Item | Value |
|------|-------|
| Repository | [https://github.com/scizor666/treasure-hunt](https://github.com/scizor666/treasure-hunt) |
| Production URL | **https://scizor666.github.io/treasure-hunt/** |
| Vite `base` | `/treasure-hunt/` |

**Repository settings (document in README):**

1. GitHub repo → **Settings → Pages**
2. Source: **GitHub Actions** (not legacy branch deploy)

**Workflow** — `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**`package.json` scripts:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview --port 4173",
    "typecheck": "tsc --noEmit"
  }
}
```

### 9.5 PWA icons

Create from vectorized Rainbow Fish (or simplified fish icon) — not from raw JPEG:

| File | Size | Purpose |
|------|------|---------|
| `public/icons/icon-192.png` | 192×192 | Manifest |
| `public/icons/icon-512.png` | 512×512 | Manifest / splash |
| `public/icons/icon-512-maskable.png` | 512×512 | Android adaptive (safe zone centered) |
| `public/favicon.ico` | 32×32 | Browser tab |

### 9.6 Offline verification checklist

Before marking complete, test against **`npm run preview`** (not dev server):

1. Load game online → wait for service worker install (DevTools → Application → Service Workers).
2. Enable **Offline** in DevTools Network tab.
3. Hard refresh — game loads, menu works, **both levels fully playable** (movement, bubbles, octopuses, treasures, game over, win).
4. Confirm no failed network requests for game assets.
5. Optional: Lighthouse → PWA category passes installability checks.

---

## 10. Audio (optional v1)

Not required for first playable. If added:

| Event | Style |
|-------|-------|
| Bubble shoot | Soft pop |
| Octopus bite | Cartoon chomp |
| Neutralize | Boing / deflate |
| Treasure pickup | Sparkle chime |
| Game over | Sad trombone (short) |
| Win | Cheerful jingle |

Use royalty-free placeholders; keep files in `assets/audio/`.

---

## 11. Acceptance Criteria

Implementation is complete when:

- [ ] `npm install && npm run dev` starts Vite on Node 20
- [ ] Camera side-scrolls horizontally; player starts left, treasure at far right
- [ ] Menu → Level 1 playable with **7** octopuses and **shell** treasure
- [ ] Level 1 complete → Level 2 with **9** octopuses and **star** treasure
- [ ] Encounters are nearly unavoidable per §4.2 (verify with trigger/detect debug overlays)
- [ ] At least half of rivals use ambush/surprise spawn patterns
- [ ] Bubble fully neutralizes an octopus on hit
- [ ] Octopus bite removes 1 heart; invulnerability frames work
- [ ] 0 HP → Game Over → restart at Level 1 with 4 hearts
- [ ] Level 2 treasure → Win screen
- [ ] All four reference characters recognizable in vector form
- [ ] No raw JPEG sprites in gameplay
- [ ] TypeScript strict mode passes (`npm run build`)
- [ ] `npm run preview` serves production build correctly at subpath base
- [ ] PWA manifest present; app installable (Chrome → Install, or Lighthouse installable)
- [ ] Service worker precaches all gameplay assets; **both levels fully playable offline** after first load (§9.6)
- [ ] GitHub Actions workflow deploys to GitHub Pages on push to `main`
- [ ] Live URL loads and plays at **https://scizor666.github.io/treasure-hunt/**

---

## 12. Out of Scope (v1)

- Mobile touch controls
- Save / continue
- Score / timer
- More than 2 levels
- Multiplayer
- Cutscenes or dialogue
- Boss octopus variant

---

## 13. Open Decisions (resolve during implementation)

| # | Question | Recommended default |
|---|----------|---------------------|
| 1 | Bubble aim with keyboard only | Horizontal **facing** default; ↑/↓ fires vertical if no horizontal input |
| 2 | SVG in browser vs PNG only | Export PNG for Phaser; keep SVG sources in repo |
| 3 | Exact trigger zone coordinates | Tune during playtest; beat maps in §4.3/4.4 are targets |

Document final choices in `README.md` when resolved.

---

## 14. Reference Asset Paths

| Asset | Source path |
|-------|-------------|
| Rainbow Fish | `/home/alex/Downloads/rainbow-fish.jpg` |
| Mad Octopus | `/home/alex/Downloads/mad-octupus.jpg` |
| Shell | `/home/alex/Downloads/shell.jpg` |
| Star | `/home/alex/Downloads/star.jpg` |

Copy into `assets/reference/` at project setup **for tracing only**. Do not import these files into Phaser `preload()` — use the vectorized assets from `assets/svg/` and `assets/png/` instead.

---

## 15. Implementation Notes for Next Agent

1. **Scaffold first:** Vite + TS + Phaser with empty scenes and placeholder rectangles; verify game loop.
2. **Configure base path + PWA early:** Set `base` in `vite.config.ts`, wire `vite-plugin-pwa`, verify `import.meta.env.BASE_URL` on all asset loads.
3. **Vectorize second:** SVG/PNG before polishing gameplay feel.
4. **One level end-to-end:** Level 1 complete before Level 2.
5. **Tune constants:** Detection radii, scroll speed, and ambush triggers in `config.ts` — playtest until encounters feel surprising but survivable with 4 HP.
6. **Debug mode:** Toggle physics hitboxes + trigger zones + detection radii with `D` key in dev builds.
7. **Validate §4.2:** Walk through each level without bubbles and confirm rivals cannot be skipped wholesale.
8. **Offline pass:** `npm run build && npm run preview` → install SW → go offline → play through both levels.
9. **Deploy:** Push to `main`, confirm GitHub Pages workflow succeeds, smoke-test live URL.
10. **Commit strategy:** Logical commits (scaffold → PWA/base → assets → player → octopus AI → levels → deploy).

Good luck — make Rainbow Fish proud. 🐟
