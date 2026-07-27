// Generates the real in-game screenshots used by src/components/stacks/HelpStack.tsx
// (the "How to Play" guide). Run with the dev server already up on :3789 and
// re-run whenever a screenshotted screen's layout changes meaningfully.
import { chromium } from 'playwright-core';
const OUT = 'public/help';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/01_create.png` });
console.log('01_create.png');

await page.click('text=Take up the road');
await page.waitForTimeout(6000);

// 02 — spawning in: the world + HUD hint box, minimap, vitals
await page.screenshot({ path: `${OUT}/02_hud.png` });
console.log('02_hud.png');

// 03 — gather: teleport beside the starter grove's first tree (grove0 @ 7,35)
// and hold E partway through the chop so the prompt + progress bar both show
await page.evaluate(() => {
  window.__kkp.pendingTeleport = { x: 7, z: 37, yaw: 0 };
});
await page.waitForTimeout(500);
await page.keyboard.down('KeyE');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/03_gather.png` });
console.log('03_gather.png');
await page.keyboard.up('KeyE');
await page.waitForTimeout(300);

// 04 — crafting panel
await page.keyboard.press('KeyC');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04_craft.png` });
console.log('04_craft.png');
await page.keyboard.press('KeyC');
await page.waitForTimeout(300);

// 05 — quest log
await page.keyboard.press('KeyJ');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05_quests.png` });
console.log('05_quests.png');
await page.keyboard.press('KeyJ');
await page.waitForTimeout(300);

// 06 — aerial build mode
await page.keyboard.press('KeyB');
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/06_build.png` });
console.log('06_build.png');
await page.keyboard.press('KeyB');
await page.waitForTimeout(300);

// 07 — equipment & combat readiness: grant a sword/shield/helmet purely for
// this documentation shot (a throwaway guest save, not a real playthrough)
await page.evaluate(() => {
  window.__kk.getState().addItems({ sword: 1, shield: 1, helmet: 1 }, 'grant');
});
await page.keyboard.press('KeyI');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/07_equipment.png` });
console.log('07_equipment.png');
await page.keyboard.press('KeyI');

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
