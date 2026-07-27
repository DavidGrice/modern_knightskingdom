// H35: Alric and Beda stand correctly at their posts
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/village'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
for (const [id, tag] of [['farmer_alric', 'alric'], ['miller_beda', 'beda']]) {
  await page.evaluate((n) => {
    const m = window.__kknpcs[n];
    if (!m) return;
    // stand 3.4m south of them, looking north (yaw 0 faces -Z)
    window.__kkp.pendingTeleport = { x: m.x, z: m.z + 6.5, yaw: 0 };
  }, id);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/${tag}.png`, clip: { x: 520, y: 280, width: 420, height: 430 } });
  console.log('shot', tag);
}
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
