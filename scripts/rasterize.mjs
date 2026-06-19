// Rasterize SVG sources -> transparent PNG sprites for Phaser, PWA icons, and
// favicon.ico. Sprites render at native (1x) dimensions so in-game sizes match
// SPEC.md §7.3 and config.ts hitbox math; the SVGs remain the scalable source.
// Run: node scripts/rasterize.mjs
import sharp from 'sharp';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svgDir = resolve(root, 'assets/svg');
const pngArchive = resolve(root, 'assets/png');
const pngPublic = resolve(root, 'public/assets/png');
const iconsDir = resolve(root, 'public/icons');
const publicDir = resolve(root, 'public');

const sprites = [
  'rainbow-fish', 'octopus', 'shell', 'star', 'bubble',
  'heart-full', 'heart-empty', 'coral', 'rock', 'seaweed', 'sparkle',
];

async function ensureDirs() {
  for (const d of [pngArchive, pngPublic, iconsDir]) await mkdir(d, { recursive: true });
}

async function renderSprite(name) {
  const svg = await readFile(resolve(svgDir, `${name}.svg`));
  const png = await sharp(svg).png().toBuffer();
  await writeFile(resolve(pngArchive, `${name}.png`), png);
  await writeFile(resolve(pngPublic, `${name}.png`), png);
}

async function renderIcon(svgName, outPath, size) {
  const svg = await readFile(resolve(svgDir, `${svgName}.svg`));
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  await writeFile(outPath, png);
  return png;
}

// Wrap a PNG buffer in a single-image ICO container (PNG-in-ICO, Vista+).
function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // size of image data
  entry.writeUInt32LE(22, 12); // offset (6 + 16)
  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  await ensureDirs();
  await Promise.all(sprites.map(renderSprite));

  await renderIcon('icon', resolve(iconsDir, 'icon-192.png'), 192);
  await renderIcon('icon', resolve(iconsDir, 'icon-512.png'), 512);
  await renderIcon('icon-maskable', resolve(iconsDir, 'icon-512-maskable.png'), 512);

  const fav = await renderIcon('icon', resolve(iconsDir, 'favicon-32.png'), 32);
  await writeFile(resolve(publicDir, 'favicon.ico'), pngToIco(fav, 32));

  // Keep an apple-touch friendly copy at the public root.
  await copyFile(resolve(iconsDir, 'icon-192.png'), resolve(publicDir, 'apple-touch-icon.png'));

  console.log(`Rasterized ${sprites.length} sprites + icons + favicon.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
