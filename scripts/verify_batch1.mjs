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
await page.waitForTimeout(1500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);
await page.keyboard.press('KeyV');
await page.waitForTimeout(300);

// fishing dock
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 44, z: 35, yaw: Math.PI * 0.3 }; });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/400_fishing_dock.png` });
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 47.5, z: 38, yaw: 0.87 }; });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/401_fishing_dock_walk.png` });

// keep interior
await page.evaluate(() => { window.__kk.getState().enterKeep(85, 85); });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/402_keep_interior.png` });
await page.evaluate(() => {
  window.__kkp.pendingTeleport = { x: 85 + 2.5, z: 85 + 0.5, yaw: Math.PI * 0.7 };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/403_keep_table.png` });
await page.evaluate(() => { window.__kk.getState().exitKeep(); });
await page.waitForTimeout(500);

// build menu walls category
await page.keyboard.press('KeyB');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/404_build_menu.png` });
const wallsTab = await page.locator('text=Walls').count();
console.log('Walls tab present:', wallsTab > 0);
if (wallsTab) {
  await page.click('text=Walls');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/405_walls_tab.png` });
}

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
