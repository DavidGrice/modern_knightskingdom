// A1: does exiting build mode move the player?
import { chromium } from 'playwright-core';
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
// walk somewhere distinctive first
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 12, z: -8, yaw: 1.2 }; });
await page.waitForTimeout(1200);
const before = await page.evaluate(() => ({ x: +window.__kkp.x.toFixed(2), z: +window.__kkp.z.toFixed(2), yaw: +window.__kkp.yaw.toFixed(2) }));
await page.keyboard.press('KeyB');
await page.waitForTimeout(2000);
// pan the aerial camera a long way, as a player browsing would
for (const k of ['KeyS', 'KeyS', 'KeyD']) {
  await page.keyboard.down(k); await page.waitForTimeout(1400); await page.keyboard.up(k);
}
const cam = await page.evaluate(() => ({ ...window.__kkbuildcam }));
await page.keyboard.press('KeyB');
await page.waitForTimeout(2000);
const after = await page.evaluate(() => ({ x: +window.__kkp.x.toFixed(2), z: +window.__kkp.z.toFixed(2), yaw: +window.__kkp.yaw.toFixed(2) }));
console.log('before   ', JSON.stringify(before));
console.log('buildcam ', JSON.stringify(cam));
console.log('after    ', JSON.stringify(after));
console.log('drift    ', (after.x - before.x).toFixed(2), (after.z - before.z).toFixed(2));
await b.close();
