// Verifies Phase 9's forest/herb instancing refactor (InstancedProps.tsx):
// visual parity with the old per-node PropModel rendering, correct per-node
// shrink-on-damage behavior surviving the switch to drei <Instances>, and a
// real draw-call reduction.
import { chromium } from 'playwright-core';
const OUT = 'scripts/shots';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(1200);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// stand back from the starter grove so several instanced trees are in frame
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 0, z: 45, yaw: 0 }; });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/640_forest_instanced.png` });
console.log('640_forest_instanced.png');

// draw-call count with the instanced forest/herbs
const calls1 = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  return canvas?.__r3f?.root?.getState()?.gl?.info?.render?.calls ?? null;
});
console.log('render.calls with instanced trees/herbs in view:', calls1);

// chop grove0 (@ 7,35) down to a stump and confirm it still shrinks + swaps
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 7, z: 37, yaw: 0 }; });
await page.waitForTimeout(400);
const st0 = await page.evaluate(() => window.__kk.getState().nodes.find((n) => n.id === 'grove0').hitsLeft);
await page.evaluate(() => window.__kk.getState().harvestNode('grove0'));
await page.waitForTimeout(300);
const st1 = await page.evaluate(() => window.__kk.getState().nodes.find((n) => n.id === 'grove0'));
console.log('grove0 hitsLeft before/after one chop (expect 3 -> 2, still standing):', st0, st1.hitsLeft, 'respawnAt:', st1.respawnAt);
await page.evaluate(() => window.__kk.getState().harvestNode('grove0'));
await page.evaluate(() => window.__kk.getState().harvestNode('grove0'));
await page.waitForTimeout(300);
const st2 = await page.evaluate(() => window.__kk.getState().nodes.find((n) => n.id === 'grove0'));
console.log('grove0 after depleting all 3 hits (expect hitsLeft 0, respawnAt set = stump rendered):', JSON.stringify(st2));
await page.screenshot({ path: `${OUT}/641_stump.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
