// Phase 3 verification: tabbed build menu, brick stacking, move tool, undo.
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

// stock up + unlock everything build-related
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ plank: 60, stone: 60, wood: 30, iron_bar: 10, flowers: 5 });
  window.__kk.setState({ unlocks: ['building2', 'mining', 'smithing', 'fishing', 'keep'] });
});

// enter build mode
await page.keyboard.press('KeyB');
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/60_menu_essentials.png` });

// bricks tab
await page.click('text=🟫 Bricks');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/61_menu_bricks.png` });

// castle pieces tab + search
await page.click('text=🏰 Towers & Roofs');
await page.waitForTimeout(300);
await page.fill('.build-search', 'window');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/62_menu_search.png` });
await page.fill('.build-search', '');

// select a 2x4-ish brick and stack three of them at screen center
await page.evaluate(() => window.__kk.getState().setBuildSelection('gen_08_l245400'));
const cx = 720, cy = 420;
await page.mouse.move(cx, cy);
await page.waitForTimeout(350);
await page.screenshot({ path: `${OUT}/63_ghost.png` });
for (let i = 0; i < 3; i++) {
  await page.mouse.move(cx + (i % 2), cy); // nudge to force pointermove
  await page.waitForTimeout(250);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(350);
}
let st1 = await page.evaluate(() => window.__kk.getState().buildings.map((b) => ({ t: b.type, y: b.y })));
console.log('stacked bricks:', JSON.stringify(st1));
await page.screenshot({ path: `${OUT}/64_stacked.png` });

// move tool: clear selection, click the stack (top piece picked), drop it 200px right
await page.evaluate(() => window.__kk.getState().setBuildSelection(null));
await page.waitForTimeout(200);
await page.mouse.click(cx, cy);
await page.waitForTimeout(400);
const movingType = await page.evaluate(() => window.__kk.getState().movingBuilding?.type ?? null);
console.log('moving:', movingType);
await page.mouse.move(cx + 200, cy);
await page.waitForTimeout(300);
await page.mouse.click(cx + 200, cy);
await page.waitForTimeout(400);
st1 = await page.evaluate(() => window.__kk.getState().buildings.map((b) => ({ t: b.type, x: b.x.toFixed(1), y: b.y })));
console.log('after move:', JSON.stringify(st1));
await page.screenshot({ path: `${OUT}/65_after_move.png` });

// undo (U) — should remove the most recent placement and refund
const invBefore = await page.evaluate(() => window.__kk.getState().inventory.plank);
await page.keyboard.press('KeyU');
await page.waitForTimeout(400);
const after = await page.evaluate(() => ({
  count: window.__kk.getState().buildings.length,
  plank: window.__kk.getState().inventory.plank,
}));
console.log('undo: count', after.count, 'plank', invBefore, '->', after.plank);
await page.screenshot({ path: `${OUT}/66_after_undo.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
