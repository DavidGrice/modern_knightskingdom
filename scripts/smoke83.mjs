import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/crew'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Begin the Journey'); await page.waitForTimeout(7000);
await page.evaluate(() => {
  window.__kk.setState({
    timeOfDay: 12 * 60,
    buildings: [
      { id: 'a', type: 'oc6096-4', x: -44, z: -40, rot: 0, y: 0, world: null, built: 1 },
      { id: 'b', type: 'oc6096-3', x: -38, z: -40, rot: 0, y: 0, world: null, built: 1 },
      { id: 'c', type: 'oc4806b2', x: -32, z: -40, rot: 0, y: 0, world: null, built: 1 },
    ],
  });
  window.__kkp.pendingTeleport = { x: -38, z: -28, yaw: 0 };
});
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/lineup.png` });
// data-driven differentiation: oc1289 has no crew position, oc4806b2 seats one
for (const [type, want] of [['oc1289', 'fire in place'], ['oc4806b2', 'seated crew']]) {
  await page.evaluate((t) => {
    window.__kk.setState({ buildings: [{ id: 'x', type: t, x: -60, z: -60, rot: 0, y: 0, world: null, built: 1 }] });
    window.__kkp.pendingTeleport = { x: -60, z: -57.5, yaw: 0 };
  }, type);
  await page.waitForTimeout(1800);
  await page.keyboard.down('KeyE'); await page.waitForTimeout(500); await page.keyboard.up('KeyE');
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({
    kind: window.__kk.getState().targetKind, label: window.__kk.getState().targetLabel,
    crew: window.__kkcrew.engineId, mode: window.__kkcrew.mode,
  }));
  console.log(type, '(' + want + '):', JSON.stringify(r));
  await page.evaluate(() => { window.__kkcrew.engineId = null; });
}
await b.close();
