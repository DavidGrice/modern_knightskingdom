// H36: the horses use their verified rigs — four distinct legs, and they move
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/horse'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-46)); });
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

// stand beside the west-meadow herd
const where = await page.evaluate(async () => {
  const h = Object.values(window.__kkhorses)[0];
  if (!h) return null;
  window.__kkp.pendingTeleport = { x: h.x + 4.5, z: h.z + 4.5, yaw: Math.atan2(-(h.x - (h.x + 4.5)), -(h.z - (h.z + 4.5))) };
  await new Promise((r) => setTimeout(r, 2500));
  return { x: +h.x.toFixed(1), z: +h.z.toFixed(1), horses: Object.keys(window.__kkhorses).length };
});
console.log('herd:', JSON.stringify(where));
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/graze_a.png`, clip: { x: 420, y: 260, width: 640, height: 460 } });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/graze_b.png`, clip: { x: 420, y: 260, width: 640, height: 460 } });
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4) : 'none');
await b.close();
