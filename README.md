# Treasure Hunt 🐟

A kid-friendly underwater adventure: help **Rainbow Fish** swim through hostile
reefs, dodge or pop **Mad Octopuses** with bubbles, and reach the treasure at
the end of each level.

Built with **Phaser 3**, **TypeScript**, **Vite**, and shipped as an
installable, **fully offline-capable PWA**.

- **Play:** https://scizor666.github.io/treasure-hunt/
- **Spec:** [SPEC.md](./SPEC.md) is the source of truth for game design.

## Quick start

Requires **Node 20.x** and npm.

```bash
npm install
npm run dev        # http://localhost:5173/treasure-hunt/
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server (service worker disabled) |
| `npm run build` | Type-check (strict) + production build to `dist/` |
| `npm run preview` | Serve the production build at `:4173` (use this for offline testing) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run gen:art` | Re-rasterize `assets/svg/*.svg` → PNG sprites + PWA icons + favicon |
| `npm run gen:audio` | Re-generate placeholder SFX WAVs |

## Controls

| Action | Keys |
|--------|------|
| Swim | `←/→/↑/↓` or `WASD` |
| Shoot bubble | `Space` (facing dir, or up/down if only vertical held) · left-click aims at cursor |
| Pause | `Esc` (translucent overlay; `Esc` again to resume) |
| Restart (game over / win) | `Enter` or `R` |
| Toggle debug overlay | `D` (detection ellipses + ambush trigger zones; on by default in `dev`) |

You start with **4 hearts**. Each octopus bite costs one, with 1.5 s of
invulnerability after a hit. Clearing octopuses is optional — only the treasure
is required. HP carries from Level 1 to Level 2; dying restarts at Level 1.

## Art pipeline

The four hand-drawn reference JPEGs in `assets/reference/` are **concept art
only** and never ship. Each was traced by hand into a clean SVG in
`assets/svg/`, then rasterized to transparent PNGs in `public/assets/png/` (and
archived to `assets/png/`) via `scripts/rasterize.mjs`. The SVGs are the
scalable source of truth; regenerate sprites with `npm run gen:art`.

## Offline / PWA

After one online visit the game caches its full app shell and assets and runs
with **zero network requests**. Test against the production build:

1. `npm run build && npm run preview`
2. Open the URL, then DevTools → **Application → Service Workers** (wait for
   "activated") and **Cache Storage** (a `workbox-precache` entry with ~50+
   files should appear).
3. DevTools → **Network → Offline**, then hard refresh.
4. Both levels should be fully playable with no failed requests.

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
deploys `dist/` to GitHub Pages.

**One-time repo setup:** GitHub → **Settings → Pages → Source: GitHub Actions**.

The Vite `base` is `/treasure-hunt/` to match the repo path; all runtime asset
URLs go through `import.meta.env.BASE_URL` (see `src/config.ts` `asset()`), so
nothing breaks on the Pages subpath.

## Resolved decisions

Open items from SPEC §13 and project setup, as built:

- **Bubble aim (keyboard):** fires in the current horizontal facing; fires
  up/down when only a vertical key is held. Mouse fires toward the cursor.
- **Vectors:** SVG sources kept in `assets/svg/`; PNGs exported for Phaser.
- **Audio:** placeholder synthesized SFX included (`scripts/gen-audio.mjs`).
- **Pause:** simple translucent overlay (no separate scene).
- **Trigger/encounter coordinates:** authored to the §4.3/4.4 beat maps in
  `public/assets/levels/*.json`; tune live with the `D` debug overlay.

### Deviations from spec (noted per SPEC §5)

- **Sprite scale:** PNGs are exported at native (1×) sizes from §7.3 rather than
  `@2x`, so in-game dimensions match the hitbox/config math directly. The SVG
  sources are resolution-independent; bump `density` in `scripts/rasterize.mjs`
  to export `@2x` if desired.
- **Rainbow Fish facing:** the hand-drawn source faces **left** (heart "lips"
  and eye on the left, forked tail on the right), so the base sprite faces left
  and is mirrored (`flipX`) when swimming right — the inverse of the §2.1 note,
  but visually faithful to the reference.

## Project structure

```
src/
  main.ts              Phaser game config + SW registration
  config.ts            All tunables (speeds, radii, colors) + asset() base-URL helper
  scenes/              Boot, Preload, Menu, Game, GameOver, Win
  entities/            Player, Bubble, Octopus, Treasure
  systems/             CombatSystem, LevelLoader, CameraController, GameState
  ui/                  HeartsHUD
  levels/types.ts      Level data contracts
public/assets/         Shipped PNG sprites, level JSON, audio
assets/                reference/ (JPEGs), svg/ (sources), png/ (exports archive)
scripts/               rasterize.mjs, gen-audio.mjs, smoke.mjs, offline.mjs
```

## License

[MIT](./LICENSE) © 2026 Alexander Teplyashin
