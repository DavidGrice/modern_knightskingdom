// A4 decisive check: place an ARCHWAY wall (mc009 — the lab's holed wall) at
// rot 0 and photograph it from both Z sides at ground level. The side showing
// the opening is the model's true front; the ghost arrow must point there.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/facing'; fs.mkdirSync(OUT, { recursive: true });
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

const type = await page.evaluate(() => {
  // find whichever catalog id maps to the lab's holed wall mc009
  const ids = ['workbench'];
  return ids[0];
});
await page.evaluate(() => {
  window.__kk.setState({
    buildings: [{ id: 'arch', type: 'workbench', x: -50, z: -50, rot: 0, y: 0, world: null, built: 1 }],
  });
});
await page.waitForTimeout(2500);

// stand on the -Z side looking toward +Z (yaw = PI faces +Z)
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -50, z: -53, yaw: Math.PI }; });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/bench_from_negZ.png`, clip: { x: 460, y: 250, width: 520, height: 420 } });

// stand on the +Z side looking toward -Z (yaw = 0 faces -Z)
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -50, z: -47, yaw: 0 }; });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/bench_from_posZ.png`, clip: { x: 460, y: 250, width: 520, height: 420 } });
console.log('placed type:', type);
await b.close();
