// F25: the road runs from the homestead edge past the signpost to a way-point
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/road'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-40)); });
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
// stand north of the signpost looking down the road
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -8, z: 30, yaw: Math.PI }; });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/road.png` });
// and from above, in build view, to see the whole run
await page.keyboard.press('KeyB');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/road_aerial.png` });
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4) : 'none');
await b.close();
