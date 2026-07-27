// Template-world travel verification: signpost interaction opens the travel
// panel, traveling teleports + grants one-time loot, collision bounds the
// destination, and Return Home brings the player back.
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

async function approach(tx, tz, arrive = 2.2, tries = 14) {
  for (let i = 0; i < tries; i++) {
    const p = await page.evaluate(() => ({ ...window.__kkp }));
    const dx = tx - p.x;
    const dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    if (d < arrive) break;
    const desired = Math.atan2(-dx, -dz);
    let diff = desired - p.yaw;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > 0.12) {
      const key = diff > 0 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(key);
      await page.waitForTimeout(Math.min(900, Math.abs(diff) * 950));
      await page.keyboard.up(key);
    }
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(Math.min(1400, d * 320));
    await page.keyboard.up('KeyW');
  }
  await page.waitForTimeout(300);
}

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(2500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// walk to the signpost (-14, 18) and open the travel map
await approach(-14, 18, 2.0);
const prompt1 = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt at signpost:', prompt1);
await page.keyboard.down('KeyE');
await page.waitForTimeout(300);
await page.keyboard.up('KeyE');
await page.waitForTimeout(400);
const panel1 = await page.evaluate(() => window.__kk.getState().panel);
console.log('panel after E at signpost (expect travel):', panel1);
await page.screenshot({ path: `${OUT}/160_travel_panel.png` });

const cardCount = await page.locator('.game-panel button', { hasText: 'Travel' }).count();
console.log('travel buttons in panel (expect 9):', cardCount);

// click travel on the first destination (template-01)
await page.locator('.game-panel button', { hasText: 'Travel' }).first().click();
await page.waitForTimeout(1000);

const afterTravel = await page.evaluate(() => ({
  destination: window.__kk.getState().destination,
  visited: window.__kk.getState().visitedWorlds,
  inv: window.__kk.getState().inventory,
  p: { ...window.__kkp },
}));
console.log('after travel:', JSON.stringify(afterTravel));
await page.screenshot({ path: `${OUT}/161_at_template01.png` });

// try to wander far past the destination's radius; collision should bound us
await page.evaluate(() => { window.__kkp.yaw = 0; });
for (let i = 0; i < 6; i++) {
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
}
const bounded = await page.evaluate(() => ({ ...window.__kkp }));
const distFromOrigin = Math.hypot(bounded.x - 1000, bounded.z - 1000);
console.log('distance from template-01 origin after running north (expect <= ~46):', distFromOrigin.toFixed(1));

// return home
const promptAway = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt while away (expect Return Home):', promptAway);
await page.keyboard.down('KeyE');
await page.waitForTimeout(300);
await page.keyboard.up('KeyE');
await page.waitForTimeout(500);
const afterReturn = await page.evaluate(() => ({
  destination: window.__kk.getState().destination,
  p: { ...window.__kkp },
}));
console.log('after return home:', JSON.stringify(afterReturn));

// travel again to the same destination: loot should NOT be granted twice
const invBefore = await page.evaluate(() => ({ ...window.__kk.getState().inventory }));
await page.evaluate(() => { window.__kk.getState().travelTo('template-01'); });
await page.waitForTimeout(500);
const invAfter = await page.evaluate(() => ({ ...window.__kk.getState().inventory }));
console.log('gold before second visit:', invBefore.gold, 'after (expect same):', invAfter.gold);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
