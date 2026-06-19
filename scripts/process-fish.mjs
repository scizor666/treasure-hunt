// Turn the hand-painted Rainbow Fish PNG into a transparent, game-ready swim
// spritesheet. Background removal is a border flood-fill (NOT a global white
// replace) so the white tail/eye highlights inside the fish are preserved.
// A few frames bend the rear tail for a swim wobble.
// Run: node scripts/process-fish.mjs
import sharp from 'sharp';
import { writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOWNLOAD = '/home/alex/Downloads/Gemini_Generated_Image_vfr33nvfr33nvfr3.png';
const ARCHIVE = resolve(root, 'assets/source/rainbow-fish.png');

// --- config ---
const BG = [248, 249, 243];
const TOL = 46;            // distance to treat a border-connected pixel as background
const TARGET_MAX = 96;     // longest side of the trimmed fish, in px
const FRAME_W = 104;       // fixed frame canvas (decoupled from trim size)
const FRAME_H = 112;
const FRAMES = [0, 1, 0, -1]; // tail-bend phase per frame
const TAIL_SEAM = 0.58;    // fraction of fish width where the tail fork starts
const MAX_SHIFT = 7;       // px of vertical tail-tip displacement at full bend

const dist2 = (r, g, b) => {
  const dr = r - BG[0], dg = g - BG[1], db = b - BG[2];
  return dr * dr + dg * dg + db * db;
};

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function loadRaw(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// Flood-fill transparency inward from every border pixel.
function removeBackground({ data, w, h }) {
  const tol2 = TOL * TOL;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    const i = p * 4;
    if (dist2(data[i], data[i + 1], data[i + 2]) > tol2) return; // hit the fish outline
    seen[p] = 1;
    data[i + 3] = 0;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
}

function bbox({ data, w, h }) {
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// Build one frame: center the fish in the FRAME canvas, bend tail columns by `phase`.
function buildFrame(fish, fw, fh, phase) {
  const out = Buffer.alloc(FRAME_W * FRAME_H * 4, 0);
  const ox = ((FRAME_W - fw) / 2) | 0;
  const oy = ((FRAME_H - fh) / 2) | 0;
  const seam = Math.round(fw * TAIL_SEAM);
  for (let x = 0; x < fw; x++) {
    const t = x <= seam ? 0 : (x - seam) / (fw - seam);
    const shift = Math.round(phase * MAX_SHIFT * t);
    for (let y = 0; y < fh; y++) {
      const si = (y * fw + x) * 4;
      if (fish[si + 3] === 0) continue;
      const dx = ox + x;
      const dy = oy + y + shift;
      if (dx < 0 || dy < 0 || dx >= FRAME_W || dy >= FRAME_H) continue;
      const di = (dy * FRAME_W + dx) * 4;
      out[di] = fish[si]; out[di + 1] = fish[si + 1]; out[di + 2] = fish[si + 2]; out[di + 3] = fish[si + 3];
    }
  }
  return out;
}

async function main() {
  // Archive the source into the repo so regeneration doesn't depend on ~/Downloads.
  await mkdir(dirname(ARCHIVE), { recursive: true });
  const src = (await exists(ARCHIVE)) ? ARCHIVE : DOWNLOAD;
  if (src === DOWNLOAD) await copyFile(DOWNLOAD, ARCHIVE);

  const img = await loadRaw(src);
  removeBackground(img);
  const box = bbox(img);

  // Trim + scale the fish to target size, as raw RGBA.
  const scale = TARGET_MAX / Math.max(box.width, box.height);
  const fw = Math.round(box.width * scale);
  const fh = Math.round(box.height * scale);
  const { data: fish } = await sharp(Buffer.from(img.data), { raw: { width: img.w, height: img.h, channels: 4 } })
    .extract(box)
    .resize(fw, fh)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Compose frames left-to-right into a horizontal spritesheet.
  const sheetW = FRAME_W * FRAMES.length;
  const sheet = Buffer.alloc(sheetW * FRAME_H * 4, 0);
  FRAMES.forEach((phase, f) => {
    const frame = buildFrame(fish, fw, fh, phase);
    const xoff = f * FRAME_W;
    for (let y = 0; y < FRAME_H; y++) {
      const srcStart = (y * FRAME_W) * 4;
      const dstStart = (y * sheetW + xoff) * 4;
      frame.copy(sheet, dstStart, srcStart, srcStart + FRAME_W * 4);
    }
  });

  const png = await sharp(sheet, { raw: { width: sheetW, height: FRAME_H, channels: 4 } }).png().toBuffer();
  await writeFile(resolve(root, 'public/assets/png/rainbow-fish.png'), png);
  await writeFile(resolve(root, 'assets/png/rainbow-fish.png'), png);

  // Emit a typed constant so the loader/animation stay in sync with this output.
  const ts = `// AUTO-GENERATED by scripts/process-fish.mjs — do not edit.
export const FISH_FRAME = { width: ${FRAME_W}, height: ${FRAME_H}, count: ${FRAMES.length} } as const;
`;
  await mkdir(resolve(root, 'src/generated'), { recursive: true });
  await writeFile(resolve(root, 'src/generated/fishFrames.ts'), ts);

  console.log(`Fish spritesheet: ${FRAMES.length} frames @ ${FRAME_W}x${FRAME_H} (fish ${fw}x${fh}).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
