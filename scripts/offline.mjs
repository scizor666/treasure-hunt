// Offline verification: load once (service worker precaches), go offline,
// reload, and confirm the game still boots with zero failed requests.
// Requires `npm run preview`. Run: node scripts/offline.mjs
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:4173/treasure-hunt/';
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const t0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();

log('goto online');
await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
log('waiting for SW ready + control');
await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  // Wait for the precache install to finish if still installing.
  const sw = reg.installing || reg.waiting || reg.active;
  if (sw && sw.state !== 'activated') {
    await new Promise((res) => sw.addEventListener('statechange', () => sw.state === 'activated' && res()));
  }
});
await sleep(3000); // let precache writes settle
const ks0 = await page.evaluate(async () => {
  const keys = await caches.keys();
  let n = 0;
  for (const k of keys) n += (await caches.open(k).then((c) => c.keys())).length;
  return { keys, n };
});
log('cache after online load:', JSON.stringify(ks0));

log('going offline');
await page.setOfflineMode(true);

const failures = [];
page.on('requestfailed', (r) => failures.push(`${r.url()} ${r.failure()?.errorText}`));
page.on('console', (m) => { if (m.type() === 'error') failures.push(`console.error: ${m.text()}`); });
page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));

log('reload offline');
await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
log('wait canvas');
await page.waitForSelector('canvas', { timeout: 15000 });
await sleep(1500);
await page.keyboard.press('Enter');
await sleep(1500);
await page.screenshot({ path: '/tmp/shot-offline.png' });
const ok = await page.evaluate(() => !!document.querySelector('canvas'));
log('canvas present offline:', ok);

await browser.close();

if (!ok || ks0.n === 0 || failures.length) {
  console.log('OFFLINE TEST FAILED');
  for (const f of failures.slice(0, 30)) console.log(' -', f);
  process.exit(1);
}
console.log(`OFFLINE OK: ${ks0.n} precached entries, game booted offline, no failed requests.`);
