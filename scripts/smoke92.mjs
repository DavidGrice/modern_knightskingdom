// A4: does the ghost's facing arrow agree with the placed piece's facing?
// Place a wall at rot=0, then look at it from above alongside the ghost.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/facing'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 160)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(8000);
// a gatehouse-ish wall with an obvious front, placed at rot 0
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ stone: 200, wood: 200, plank: 100, iron_bar: 40 });
  window.__kk.setState({
    buildings: [{ id: 'w1', type: 'stonewall', x: 0, z: 0, rot: 0, y: 0, world: null, built: 1 }],
  });
});
await page.waitForTimeout(1200);
await page.keyboard.press('KeyB');
await page.waitForTimeout(2500);
// select the same wall type so the ghost renders next to the placed one
await page.evaluate(() => window.__kk.getState().setBuildSelection('stonewall'));
await page.waitForTimeout(600);
// park the ghost inside the grid, immediately beside the placed wall, so the
// arrow and the real model can be compared at the same angle
await page.mouse.move(790, 196);
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/ghost_vs_placed.png`, clip: { x: 560, y: 80, width: 460, height: 300 } });
console.log('selection:', await page.evaluate(() => window.__kk.getState().buildSelection));
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
