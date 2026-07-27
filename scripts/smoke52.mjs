// Verifies the pond's new textured water (real spr199 sprite, tinted +
// UV-animated) renders without errors and looks like water, not a flat color.
import { chromium } from 'playwright-core';
const OUT = 'scripts/shots';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(1200);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// POND = { x: 52, z: 42, radius: 8 } per data/world.ts — stand at the near
// shore looking across it
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 52, z: 55, yaw: 0 }; });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/680_pond_texture_1.png` });
await page.waitForTimeout(4000); // let the UV drift move visibly
await page.screenshot({ path: `${OUT}/680_pond_texture_2.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
