// Ranged combat verification: craft crossbow+bolts, Q to ready it, shoot a
// skeleton with real clicks (third person avoids pointer lock in headless).
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
await page.waitForTimeout(6500);

// materials + unlock, then craft crossbow and bolts through the crafting UI
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ plank: 10, iron_bar: 4, wood: 6, stone: 6 });
  window.__kk.setState({ unlocks: ['building2', 'mining', 'smithing'] });
  st.placeBuilding('workbench', 2, 22, 0); // stand near it
});
await page.waitForTimeout(600);
await page.keyboard.press('KeyC');
await page.waitForTimeout(500);
await page.locator('.recipe-row', { hasText: 'Crossbow' }).locator('button').click();
await page.waitForTimeout(250);
for (let i = 0; i < 3; i++) {
  await page.locator('.recipe-row', { hasText: 'Bolts ×4' }).locator('button').click();
  await page.waitForTimeout(200);
}
await page.keyboard.press('Escape');
const inv = await page.evaluate(() => ({
  crossbow: window.__kk.getState().inventory.crossbow,
  bolts: window.__kk.getState().inventory.bolt,
}));
console.log('crafted:', JSON.stringify(inv));

// ready the crossbow (Q), third person so clicks work headless
await page.keyboard.press('KeyQ');
await page.keyboard.press('KeyV');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/95_crossbow_ready.png` });

// skeleton downrange (straight ahead, -Z), night so it lives
await page.evaluate(() => {
  window.__kkenv.time = 0.95;
  const p = window.__kkp;
  window.__kke.getState().spawn('skeleton', p.x, p.z - 8);
});
await page.waitForTimeout(600);

// fire real clicks until it dies (bolt dmg 4, skeleton hp 5 -> 2 hits)
for (let i = 0; i < 6; i++) {
  await page.mouse.click(720, 430);
  await page.waitForTimeout(1400);
  const left = await page.evaluate(() => window.__kke.getState().enemies.filter((e) => e.mob.state !== 'dying').length);
  if (left === 0) break;
}
await page.screenshot({ path: `${OUT}/96_after_shots.png` });
const result = await page.evaluate(() => ({
  alive: window.__kke.getState().enemies.filter((e) => e.mob.state !== 'dying').length,
  boltsLeft: window.__kk.getState().inventory.bolt,
  combatXp: window.__kk.getState().xp.combat,
}));
console.log('after shooting:', JSON.stringify(result));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
