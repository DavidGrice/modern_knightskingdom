// Full progression verification (the reported deadlock): quests 1-4 played
// through the real game functions, with Smelt Iron Bar exercised via the
// crafting panel UI at the forge.
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

const state = () => page.evaluate(() => {
  const s = window.__kk.getState();
  return {
    quests: s.completedQuests, unlocks: s.unlocks,
    wood: s.inventory.wood ?? 0, plank: s.inventory.plank ?? 0,
    stone: s.inventory.stone ?? 0, ore: s.inventory.iron_ore ?? 0,
    bars: s.inventory.iron_bar ?? 0,
  };
});

// --- Quest 1: chop 5 wood (real harvest calls on the grove trees)
await page.evaluate(() => {
  const st = window.__kk.getState();
  for (const n of st.nodes) {
    if (n.kind !== 'tree') continue;
    for (let i = 0; i < 3; i++) window.__kk.getState().harvestNode(n.id);
    if ((window.__kk.getState().inventory.wood ?? 0) >= 15) break;
  }
});
console.log('after chopping:', JSON.stringify(await state()));

// --- Quest 2: craft 4 planks, build campfire + workbench
await page.evaluate(() => {
  const st = window.__kk.getState();
  for (let i = 0; i < 5; i++) st.craft('plank'); // 10 planks: workbench 6 + pickaxe 3 + spare
  st.placeBuilding('campfire', -4, 20, 0);
  st.placeBuilding('workbench', 4, 20, 0);
});
console.log('after cozy:', JSON.stringify(await state()));

// --- Quest 3: craft pickaxe, mine 6 stone (real harvests)
await page.evaluate(() => {
  window.__kk.getState().craft('pickaxe');
  for (const n of window.__kk.getState().nodes) {
    if (n.kind !== 'rock' || n.variant === 'iron') continue;
    for (let i = 0; i < 4; i++) window.__kk.getState().harvestNode(n.id);
    if ((window.__kk.getState().inventory.stone ?? 0) >= 8) break;
  }
});
console.log('after mining:', JSON.stringify(await state()));

// --- Quest 4: build the forge, then SMELT THROUGH THE UI (the reported bug)
const q4 = await page.evaluate(() => {
  const st = window.__kk.getState();
  // iron veins for guaranteed ore
  let visited = 0;
  for (const n of st.nodes) {
    if (n.variant !== 'iron') continue;
    visited++;
    for (let i = 0; i < 4; i++) window.__kk.getState().harvestNode(n.id);
    if ((window.__kk.getState().inventory.iron_ore ?? 0) >= 6) break;
  }
  // more firewood from the forest ring (each smelt burns 1 wood)
  for (const n of window.__kk.getState().nodes) {
    if (n.kind !== 'tree' || n.respawnAt) continue;
    for (let i = 0; i < 3; i++) window.__kk.getState().harvestNode(n.id);
    if ((window.__kk.getState().inventory.wood ?? 0) >= 5) break;
  }
  const placed = window.__kk.getState().placeBuilding('forge', 0, 21, 0);
  window.__kkc.teleportTo = [0, 24]; // stand at the forge
  return {
    visited,
    placed,
    ore: window.__kk.getState().inventory.iron_ore ?? 0,
    wood: window.__kk.getState().inventory.wood ?? 0,
  };
});
console.log('quest-4 setup:', JSON.stringify(q4));
await page.waitForTimeout(3200); // station scan runs at 2 Hz (half-speed headless)
const dbg = await page.evaluate(() => ({
  buildings: window.__kk.getState().buildings.map((b) => `${b.type}@${b.x},${b.z}`),
  near: window.__kk.getState().nearStations,
  player: { x: window.__kkp.x.toFixed(1), z: window.__kkp.z.toFixed(1) },
}));
console.log('debug:', JSON.stringify(dbg));
await page.keyboard.press('KeyC');
await page.waitForTimeout(600);
console.log('panel-time near:', JSON.stringify(await page.evaluate(() => window.__kk.getState().nearStations)));
const smeltRow = page.locator('.recipe-row', { hasText: 'Smelt Iron Bar' });
const smeltState = await smeltRow.locator('button').innerText();
console.log('smelt button reads:', JSON.stringify(smeltState), '(bug would say "Locked")');
console.log('smelt row text:', JSON.stringify((await smeltRow.innerText()).replace(/\n/g, ' | ')));
console.log('smelt row html:', JSON.stringify(await smeltRow.evaluate((el) => el.outerHTML)));
await page.screenshot({ path: `${OUT}/106_smelt_available.png` });
for (let i = 0; i < 3; i++) {
  await smeltRow.locator('button').click();
  await page.waitForTimeout(250);
}
await page.waitForTimeout(600);
const final = await state();
console.log('after smelting:', JSON.stringify(final));
console.log('forge_ahead complete:', final.quests.includes('forge_ahead'), '| smithing unlocked:', final.unlocks.includes('smithing'));

// weapons should now be craftable (UI shows them unlocked at the forge)
const swordBtn = await page.locator('.recipe-row', { hasText: 'Knight Sword' }).locator('button').innerText();
console.log('sword button now reads:', JSON.stringify(swordBtn));
await page.screenshot({ path: `${OUT}/107_weapons_unlocked.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
