// Real-weapon verification: original sword in viewmodel + on avatar,
// original crossbow viewmodel, bandits carrying the halberd.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'scripts/shots';
fs.mkdirSync(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(2500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

await page.evaluate(() => {
  window.__kk.getState().addItems({ sword: 1, shield: 1, crossbow: 1, bolt: 8 });
});
await page.waitForTimeout(2500); // weapon donors stream in

// fps sword viewmodel (sword owned, melee default)
await page.screenshot({ path: `${OUT}/120_real_sword_fps.png` });

// crossbow viewmodel
await page.keyboard.press('KeyQ');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/121_real_crossbow_fps.png` });
await page.keyboard.press('KeyQ');

// third person: sword at hand
await page.keyboard.press('KeyV');
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/122_real_sword_avatar.png` });

// bandit with halberd, right in front
await page.evaluate(() => {
  window.__kkenv.time = 0.5;
  const p = window.__kkp;
  window.__kke.getState().spawn('bandit', p.x + 1.5, p.z - 5);
});
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/123_bandit_halberd.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
