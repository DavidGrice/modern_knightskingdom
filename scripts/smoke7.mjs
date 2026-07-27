// Verify the QA fixes (skeleton head, arms, iron veins, minimap) and combat.
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
await page.waitForTimeout(3500);

// arms fix: default donor
await page.screenshot({ path: `${OUT}/70_creator_arms.png`, clip: { x: 265, y: 155, width: 470, height: 590 } });
// skeleton head: cycle head donor to Skeleton (index 8 from John of Mayne at 3 -> 5 clicks forward)
for (let i = 0; i < 5; i++) {
  await page.locator('.arrow-btn').nth(1).click();
  await page.waitForTimeout(300);
}
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/71_creator_skeleton_head.png`, clip: { x: 265, y: 155, width: 470, height: 590 } });

// enter world
await page.click('text=Begin the Journey');
await page.waitForTimeout(6500);

// iron veins: harvest one via the game function, check ore
const ore = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.harvestNode('iron0');
  return window.__kk.getState().inventory.iron_ore ?? 0;
});
console.log('iron ore from vein:', ore);

// minimap visible + large toggle
await page.screenshot({ path: `${OUT}/72_minimap_small.png` });
await page.keyboard.press('KeyM');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/73_minimap_large.png` });
await page.keyboard.press('KeyM');

// combat: spawn a skeleton right in front of the player (facing -Z)
await page.evaluate(() => {
  window.__kkenv.time = 0.95; // night so it doesn't crumble
  const p = window.__kkp;
  window.__kke.getState().spawn('skeleton', p.x, p.z - 3);
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/74_skeleton_attacks.png` });
const hp1 = await page.evaluate(() => window.__kkc.hp);
console.log('hp after skeleton attacks:', hp1, '(started at 10)');

// fight back
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => window.__kkAttack());
  await page.waitForTimeout(650);
}
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/75_pop_apart.png` });
const after = await page.evaluate(() => ({
  enemies: window.__kke.getState().enemies.length,
  combatXp: window.__kk.getState().xp.combat,
  stone: window.__kk.getState().inventory.stone ?? 0,
}));
await page.waitForTimeout(1200);
const final = await page.evaluate(() => window.__kke.getState().enemies.length);
console.log('after fight:', JSON.stringify(after), '| enemies after scatter:', final);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
