// Headless smoke test: load the built game, exercise input, capture errors.
// Requires a running `npm run preview`. Run: node scripts/smoke.mjs
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:4173/treasure-hunt/';
const errors = [];

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--window-size=1280,720',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) =>
  errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`),
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 15000 });
await sleep(1500); // boot -> preload -> menu
await page.screenshot({ path: '/tmp/shot-menu.png' });

// Start the game.
await page.keyboard.press('Enter');
await sleep(1500);
await page.screenshot({ path: '/tmp/shot-game-start.png' });

// Swim right and fire for a few seconds.
await page.keyboard.down('ArrowRight');
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('Space');
  await sleep(400);
}
await sleep(2500);
await page.keyboard.up('ArrowRight');
await page.screenshot({ path: '/tmp/shot-gameplay.png' });

// Probe internal state via the Phaser game instance if exposed.
const state = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return { hasCanvas: !!c, w: c?.width, h: c?.height };
});

await browser.close();

console.log('canvas:', JSON.stringify(state));
if (errors.length) {
  console.log(`\nFOUND ${errors.length} error(s):`);
  for (const e of errors.slice(0, 20)) console.log(' -', e);
  process.exit(1);
}
console.log('\nNo console/page errors. Screenshots in /tmp/shot-*.png');
