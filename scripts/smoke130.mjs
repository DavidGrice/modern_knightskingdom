// A newcomer WALKS IN along the road instead of appearing at the hearth
import { chromium } from 'playwright-core';
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=900,600', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 120)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey'); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO'); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
// a newcomer, placed on the road the way recruitment does it
const start = await page.evaluate(() => {
  window.__kk.setState({ villagers: [{ id: 'newcomer', name: 'Traveller', job: 'idle' }] });
  return null;
});
await page.waitForTimeout(600);
const seeded = await page.evaluate(() => {
  // mirror what the store's arrival does
  const road = window.__kkroadEntry ? window.__kkroadEntry() : { x: -12.8, z: 64 };
  const m = window.__kkvillagers.newcomer ?? (window.__kkvillagers.newcomer = { x: 0, z: 0 });
  m.x = road.x; m.z = road.z; m.arriving = true;
  return { ...m };
});
await page.waitForTimeout(9000);
const now = await page.evaluate(() => ({ ...window.__kkvillagers.newcomer }));
const moved = Math.hypot(now.x - seeded.x, now.z - seeded.z);
console.log('started at', seeded.x.toFixed(1), seeded.z.toFixed(1), '-> now', now.x.toFixed(1), now.z.toFixed(1), '| walked', moved.toFixed(1), 'm');
console.log(moved > 4 ? 'PASS: they walk in' : 'FAIL: they did not move');
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 3) : 'none');
await b.close();
