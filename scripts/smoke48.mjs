// Verifies Phase 13 (Kingdom & economy): the Market Stall + Merchant job,
// blueprints (starter stamp + capture), claiming a template world to build
// in, and keep taxation.
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

// grant unlocks + materials so we can test placement/economy without
// playing the whole quest chain through first
await page.evaluate(() => {
  window.__kk.setState({
    unlocks: ['fishing', 'building2', 'mining', 'smithing', 'keep'],
    inventory: { axe: 1, plank: 999, stone: 999, iron_bar: 999, wood: 999, gold: 500 },
  });
});

// ---- Market Stall + Merchant job ---- (well inside BUILD_REGION's +-30)
await page.evaluate(() => {
  const st = window.__kk.getState();
  const ok = st.placeBuilding('market_stall', 10, 20, 0);
  window.__kk.setState((s) => ({ villagers: [...s.villagers, { id: 'vTest', name: 'TestVillager', job: 'idle' }] }));
  return ok;
}).then((ok) => console.log('market_stall placed:', ok));
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 10, z: 21.6, yaw: 0 }; });
await page.waitForTimeout(500);
const promptUnstaffed = await page.evaluate(() => window.__kk.getState().prompt);
console.log('stall prompt while unstaffed:', promptUnstaffed);
await page.evaluate(() => window.__kk.getState().assignJob('vTest', 'merchant'));
await page.waitForTimeout(300);
const promptStaffed = await page.evaluate(() => window.__kk.getState().prompt);
console.log('stall prompt once staffed:', promptStaffed);
await page.screenshot({ path: `${OUT}/650_market_stall.png` });
await page.keyboard.down('KeyE');
await page.waitForTimeout(300);
await page.keyboard.up('KeyE');
await page.waitForTimeout(300);
const panelAfterE = await page.evaluate(() => window.__kk.getState().panel);
console.log('panel opened by interacting with the staffed stall (expect shop):', panelAfterE);
if (panelAfterE !== 'none') {
  await page.keyboard.press('Escape'); // closes the shop panel specifically
  await page.waitForTimeout(200);
}
// safety net: never leave this step accidentally paused for the rest of the run
await page.evaluate(() => window.__kk.getState().setPaused(false));

// ---- Blueprints: stamp a starter blueprint, then capture it back ---- (also within +-30)
const buildingsBefore = await page.evaluate(() => window.__kk.getState().buildings.length);
const placedOk = await page.evaluate(() => window.__kk.getState().placeBlueprintAt('bp_gatehouse', -15, -10, 0));
const buildingsAfter = await page.evaluate(() => window.__kk.getState().buildings.length);
console.log('blueprint stamp ok:', placedOk, 'buildings before/after (expect +5):', buildingsBefore, buildingsAfter);
const captureOk = await page.evaluate(() => window.__kk.getState().captureBlueprint('My Gatehouse Copy', -15, -10));
const custom = await page.evaluate(() => window.__kk.getState().customBlueprints);
console.log('captured custom blueprint ok:', captureOk, 'pieces:', custom[0]?.pieces?.length);

// confirm the Blueprints tab renders in the aerial Build Bar
await page.keyboard.press('KeyB');
await page.waitForTimeout(500);
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('.build-tabs button')];
  const bp = buttons.find((b) => b.textContent?.includes('Blueprints'));
  bp?.click();
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/651_blueprints_tab.png` });
const bpTabText = await page.evaluate(() => document.querySelector('.build-menu')?.textContent ?? '');
console.log('Blueprints tab lists starter + custom:', bpTabText.includes('Rival Gatehouse'), bpTabText.includes('My Gatehouse Copy'));
await page.keyboard.press('KeyB');
await page.waitForTimeout(300);

// ---- Claiming a template world ----
await page.evaluate(() => { window.__kk.getState().travelTo('template-09'); });
await page.waitForTimeout(2000);
await page.keyboard.press('KeyB');
await page.waitForTimeout(400);
console.log('build mode blocked before claiming (expect false):', await page.evaluate(() => window.__kk.getState().buildMode));
await page.screenshot({ path: `${OUT}/652_claim_banner.png` });
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.claimWorld('template-09', window.__kkp.x, window.__kkp.z, 0);
});
await page.waitForTimeout(300);
await page.keyboard.press('KeyB');
await page.waitForTimeout(500);
console.log('build mode allowed after claiming (expect true):', await page.evaluate(() => window.__kk.getState().buildMode));
await page.screenshot({ path: `${OUT}/653_claimed_build_mode.png` });
const claimPlaceOk = await page.evaluate(() => {
  const st = window.__kk.getState();
  return st.placeBuilding('campfire', window.__kkp.x + 3, window.__kkp.z, 0);
});
console.log('placed a building on the claimed plot:', claimPlaceOk);
await page.keyboard.press('KeyB');
await page.waitForTimeout(300);
await page.evaluate(() => window.__kk.getState().returnHome());
await page.waitForTimeout(1500);

// ---- Taxation ----
await page.evaluate(() => window.__kk.getState().placeBuilding('keep', -20, -20, 0));
const goldBefore = await page.evaluate(() => window.__kk.getState().inventory.gold);
await page.evaluate(() => window.__kk.getState().collectTaxes());
const goldAfter = await page.evaluate(() => window.__kk.getState().inventory.gold);
console.log('gold before/after collecting taxes (expect increase):', goldBefore, goldAfter);
await page.evaluate(() => window.__kk.getState().collectTaxes());
const goldAfter2 = await page.evaluate(() => window.__kk.getState().inventory.gold);
console.log('gold unchanged on an immediate second collection (cooldown, expect equal):', goldAfter, goldAfter2);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
