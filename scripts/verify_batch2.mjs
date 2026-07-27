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

// give the player a sword + shield, and equip a shield
await page.evaluate(() => {
  window.__kk.getState().addItems({ sword: 1, shield: 1 });
});
await page.waitForTimeout(300);

// --- 1. Skeleton walking direction: spawn one chasing the player, watch its facing vs motion
await page.evaluate(() => {
  window.__kkenv.time = 0.95;
  const p = window.__kkp;
  window.__kke.getState().spawn('skeleton', p.x, p.z - 6);
});
await page.waitForTimeout(1500);
const before = await page.evaluate(() => {
  const e = window.__kke.getState().enemies[0];
  return e ? { x: e.mob.x, z: e.mob.z, yaw: e.mob.yaw } : null;
});
await page.waitForTimeout(1200);
const after = await page.evaluate(() => {
  const e = window.__kke.getState().enemies[0];
  return e ? { x: e.mob.x, z: e.mob.z, yaw: e.mob.yaw } : null;
});
if (before && after) {
  const dx = after.x - before.x, dz = after.z - before.z;
  const moveYaw = Math.atan2(-dx, -dz);
  let diff = Math.abs(moveYaw - after.yaw);
  while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
  console.log('skeleton facing vs movement diff (expect small, <0.5):', diff.toFixed(3));
}
await page.keyboard.press('KeyV');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/500_skeleton_chase.png` });

// --- 2. third-person sword swing + shield appearance
await page.evaluate(() => { window.__kk.getState().enemies?.forEach(() => {}); });
await page.keyboard.down('KeyW');
await page.waitForTimeout(50);
await page.keyboard.up('KeyW');
await page.evaluate(() => window.__kkAttack && window.__kkAttack());
await page.waitForTimeout(120);
await page.screenshot({ path: `${OUT}/501_third_person_swing.png` });

// block to show the shield
await page.mouse.down({ button: 'right' });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/502_third_person_shield.png` });
await page.mouse.up({ button: 'right' });

// --- 3. first person sword angle
await page.keyboard.press('KeyV');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/503_fps_sword_idle.png` });
await page.evaluate(() => window.__kkAttack && window.__kkAttack());
await page.waitForTimeout(120);
await page.screenshot({ path: `${OUT}/504_fps_sword_swing.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
