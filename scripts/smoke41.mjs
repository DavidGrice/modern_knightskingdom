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
await page.waitForTimeout(1500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// wear the starter axe all the way down via 50 real uses (fast via the store)
const afterWear = await page.evaluate(() => {
  const st = window.__kk.getState();
  for (let i = 0; i < 50; i++) st.useTool('axe');
  return { durability: window.__kk.getState().durability.axe };
});
console.log('axe durability after 50 uses:', JSON.stringify(afterWear));

// one more use once already at 0 should be a harmless no-op, not go negative
await page.evaluate(() => window.__kk.getState().useTool('axe'));
const stillZero = await page.evaluate(() => window.__kk.getState().durability.axe);
console.log('axe durability after an extra use at 0 (expect 0, not negative):', stillZero);

// place a workbench so "near workbench" is true, then teleport onto it
await page.evaluate(() => {
  window.__kk.setState({ buildings: [{ id: 'wb1', type: 'workbench', x: 0, z: 20, rot: 0 }] });
});
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 0, z: 19, yaw: Math.PI }; });
await page.waitForTimeout(1000);

await page.keyboard.down('KeyC');
await page.waitForTimeout(300);
await page.keyboard.up('KeyC');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/590_repair_panel.png` });

const beforeRepair = await page.evaluate(() => window.__kk.getState().inventory);
console.log('inventory before repair:', JSON.stringify(beforeRepair));

// grant materials and repair
await page.evaluate(() => window.__kk.getState().addItems({ plank: 10, wood: 10 }, 'grant'));
await page.waitForTimeout(200);
const debugState = await page.evaluate(() => {
  const st = window.__kk.getState();
  return { nearStations: st.nearStations, wood: st.inventory.wood, durabilityAxe: st.durability.axe, panel: st.panel };
});
console.log('debug state before click:', JSON.stringify(debugState));
const clicked = await page.locator('button:has-text("Repair")').first().isVisible();
console.log('repair button visible:', clicked);
await page.click('button:has-text("Repair")');
await page.waitForTimeout(300);
const afterRepair = await page.evaluate(() => ({
  durability: window.__kk.getState().durability.axe,
  inventory: window.__kk.getState().inventory,
}));
console.log('after repair:', JSON.stringify(afterRepair));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
