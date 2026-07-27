// L71: the road is laid from the four real road plates, each cell picking the
// right piece and facing from its neighbours
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/road2'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=d3d11', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('console', (m) => { const t = m.text(); if (t.includes('[grounds]')) console.log('WARN', t.slice(0, 140)); });
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 140)));
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-40)); });
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
// straight up above the junction, looking down: the layout has to read as a road
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -16, z: 44, yaw: 0 }; });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/ground.png` });
await page.keyboard.press('KeyB');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/aerial.png` });
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4) : 'none');
await b.close();
