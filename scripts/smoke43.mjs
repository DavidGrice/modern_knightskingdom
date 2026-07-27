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

// force deterministic outcomes for the raid's probabilistic branches
// (Cedric-led chance, ram-spawn chance) before any game code runs
await page.addInitScript(() => { Math.random = () => 0.05; });

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(1500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// ---- Cedric-led raid + raider ram ----
await page.evaluate(() => {
  window.__kk.setState({
    buildings: [
      { id: 'g1', type: 'gate', x: 10, z: 10, rot: 0 },
      { id: 'b1', type: 'campfire', x: 0, z: 0, rot: 0 },
      { id: 'b2', type: 'workbench', x: 2, z: 0, rot: 0 },
      { id: 'b3', type: 'forge', x: 4, z: 0, rot: 0 },
    ],
    gateOpen: { g1: false },
    completedQuests: ['first_steps', 'cozy_beginnings', 'stone_age', 'forge_ahead', 'gone_fishing', 'squires_errand', 'knights_arms'],
    unlocks: ['fishing', 'building2', 'mining', 'smithing', 'keep'],
    defeatedCedric: false,
  });
  window.__kkenv.time = 0.74;
});
await page.waitForTimeout(2500); // let the 1Hz raid-decision tick fire

const raidState = await page.evaluate(() => ({
  enemies: window.__kke.getState().enemies.map((e) => ({ kind: e.kind, raid: e.raid })),
  ramActive: window.__kkRam.active,
}));
console.log('raid spawn (expect cedric + 2 bandit, ram active):', JSON.stringify(raidState));

// pull the ram right up next to the shut gate and confirm it rams it open
await page.evaluate(() => {
  window.__kkRam.x = 10.5;
  window.__kkRam.z = 10;
});
await page.waitForTimeout(1200);
const afterRam = await page.evaluate(() => ({
  gateOpen: window.__kk.getState().gateOpen.g1,
}));
console.log('gate after the ram reaches it (expect true = forced open):', JSON.stringify(afterRam));
await page.screenshot({ path: `${OUT}/600_raider_ram.png` });

// end the raid and confirm the ram deactivates with it
await page.evaluate(() => { window.__kke.getState().clear(); });
await page.waitForTimeout(1300);
const afterRaidEnd = await page.evaluate(() => window.__kkRam.active);
console.log('ram active after raid ends (expect false):', afterRaidEnd);

// ---- battlement archery bonus ----
await page.evaluate(() => {
  window.__kk.getState().addItems({ crossbow: 1, bolt: 10 }, 'grant');
  window.__kkc.weapon = 'ranged';
  window.__kkc.rangedWeapon = 'crossbow';
});
const dmgGround = await page.evaluate(() => {
  window.__kkp.y = 1.6; // EYE_HEIGHT, on the ground
  window.__kkBolt();
  const b = window.__kkBolts.getState().bolts.at(-1);
  return b.damage;
});
const dmgElevated = await page.evaluate(() => {
  window.__kkp.y = 1.6 + 3; // standing well above a battlement
  window.__kkBolt();
  const b = window.__kkBolts.getState().bolts.at(-1);
  return b.damage;
});
console.log('crossbow bolt damage on the ground vs elevated (expect 4 vs 5):', dmgGround, dmgElevated);

// ---- villagers flee during a raid ----
await page.evaluate(() => {
  window.__kkp.y = 1.6;
  window.__kk.setState({ villagers: [{ id: 'v1', name: 'Test Villager', job: 'idle' }] });
});
await page.waitForTimeout(800);
const beforeFlee = await page.evaluate(() => ({ ...window.__kkvillagers.v1 }));
console.log('villager position before a raid:', JSON.stringify(beforeFlee));
await page.evaluate(() => {
  window.__kke.getState().spawn('bandit', 40, 40, true); // raid: true is what villagers watch for
});
await page.waitForTimeout(2500);
const afterFlee = await page.evaluate(() => ({ ...window.__kkvillagers.v1 }));
console.log('villager position ~2.5s into a raid (expect closer to 0,0):', JSON.stringify(afterFlee));
const distBefore = Math.hypot(beforeFlee.x, beforeFlee.z);
const distAfter = Math.hypot(afterFlee.x, afterFlee.z);
console.log('distance from home before/after (expect after < before, fleeing home):', distBefore.toFixed(2), distAfter.toFixed(2));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
