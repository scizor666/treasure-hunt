// Generate tiny placeholder SFX as 16-bit mono WAV files (no dependencies).
// Royalty-free by construction (pure synthesis). Run: node scripts/gen-audio.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/assets/audio');
const RATE = 44100;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE((s * 32767) | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const n = (sec) => Math.floor(sec * RATE);
// envelope: exponential decay
const env = (i, len, k = 5) => Math.exp((-k * i) / len);

// A single tone with decay.
function tone(freq, dur, { type = 'sine', k = 5, vol = 0.6, vibrato = 0 } = {}) {
  const len = n(dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const f = freq * (1 + vibrato * Math.sin(2 * Math.PI * 6 * t));
    const ph = 2 * Math.PI * f * t;
    let s;
    if (type === 'square') s = Math.sign(Math.sin(ph));
    else if (type === 'saw') s = 2 * (((f * t) % 1) - 0.5);
    else if (type === 'noise') s = Math.random() * 2 - 1;
    else s = Math.sin(ph);
    out[i] = s * env(i, len, k) * vol;
  }
  return out;
}

// Frequency sweep.
function sweep(f0, f1, dur, { k = 4, vol = 0.6, type = 'sine' } = {}) {
  const len = n(dur);
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const f = f0 + (f1 - f0) * (i / len);
    ph += (2 * Math.PI * f) / RATE;
    const s = type === 'square' ? Math.sign(Math.sin(ph)) : Math.sin(ph);
    out[i] = s * env(i, len, k) * vol;
  }
  return out;
}

function concat(...arrs) {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Float32Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
function mix(a, b) {
  const len = Math.max(a.length, b.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = (a[i] || 0) + (b[i] || 0);
  return out;
}
function seq(notes) {
  // notes: [freq, dur]
  return concat(...notes.map(([f, d]) => tone(f, d, { type: 'square', vol: 0.4, k: 3 })));
}

const sfx = {
  // soft pop
  shoot: sweep(700, 1200, 0.12, { vol: 0.4, k: 6 }),
  // cartoon chomp: two quick low square bites + noise
  bite: mix(
    concat(tone(180, 0.06, { type: 'square', vol: 0.5 }), tone(120, 0.08, { type: 'square', vol: 0.5 })),
    tone(0, 0.14, { type: 'noise', vol: 0.12, k: 8 }),
  ),
  // deflate / boing
  neutralize: sweep(900, 160, 0.35, { vol: 0.4, type: 'square', k: 3 }),
  // sparkle chime arpeggio
  pickup: seq([[784, 0.08], [988, 0.08], [1319, 0.16]]),
  // sad descending
  gameover: seq([[440, 0.18], [392, 0.18], [330, 0.18], [262, 0.34]]),
  // cheerful ascending jingle
  win: seq([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.28]]),
};

await mkdir(outDir, { recursive: true });
for (const [name, samples] of Object.entries(sfx)) {
  await writeFile(resolve(outDir, `${name}.wav`), wav(samples));
}
console.log(`Generated ${Object.keys(sfx).length} placeholder SFX in public/assets/audio.`);
