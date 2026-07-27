// A5: the crossbow viewmodel, before/after the PCA flip
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/weapon'; fs.mkdirSync(OUT, { recursive: true });
const tag = process.argv[2] ?? 'after';
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(8000);
await page.evaluate(() => {
  window.__kk.getState().addItems({ crossbow: 1, bolt: 20 });
  window.__kkc.weapon = 'ranged';
  window.__kkc.rangedWeapon = 'crossbow';
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/crossbow_${tag}.png`, clip: { x: 720, y: 420, width: 720, height: 480 } });
console.log('shot', tag);
await b.close();
