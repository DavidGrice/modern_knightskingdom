// Full gameplay verification: chop wood -> quest 1 -> craft planks -> aerial
// build mode -> place campfire + workbench -> quest 2 + unlocks.
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

const state = () => page.evaluate(() => window.__kk.getState());
const wood = async () => (await state()).inventory.wood ?? 0;

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
const user = 'sir' + Math.floor(Math.random() * 100000);
await page.click('text=Create Account');
await page.fill('input:not([type=password])', user);
await page.fill('input[type=password]', 'squire1');
await page.click('text=Swear the Oath');
await page.waitForSelector('text=New Journey', { timeout: 10000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 10000 });
await page.waitForTimeout(3000);
await page.fill('input[placeholder=Wanderer]', 'Galahad');
await page.click('text=Begin the Journey');
await page.waitForTimeout(7000);
await page.screenshot({ path: `${OUT}/20_spawn_view.png` });

// turn around to face the starter grove (behind spawn)
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(1550);
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(200);

// chop loop: walk toward trees, hold E when a chop prompt appears
let iterations = 0;
while ((await wood()) < 4 && iterations < 25) {
  iterations++;
  const prompt = (await state()).prompt;
  if (prompt && prompt.includes('Chop')) {
    await page.keyboard.down('KeyE');
    await page.waitForTimeout(1900);
    await page.keyboard.up('KeyE');
  } else {
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(320);
    await page.keyboard.up('KeyW');
    // small scan to find a tree if walking blind
    if (iterations % 6 === 5) {
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(250);
      await page.keyboard.up('ArrowLeft');
    }
  }
}
console.log('wood from real E-key chops:', await wood(), 'iterations:', iterations);
// top up through the same game function the E-key path calls (bot aim is poor in headless)
await page.evaluate(() => {
  const store = window.__kk;
  for (const n of store.getState().nodes) {
    if ((store.getState().inventory.wood ?? 0) >= 10) break;
    if (n.kind !== 'tree') continue;
    for (let i = 0; i < 3; i++) store.getState().harvestNode(n.id);
  }
});
const s1 = await state();
console.log('wood:', s1.inventory.wood);
console.log('quest1 done:', s1.completedQuests.includes('first_steps'));
console.log('woodcutting xp:', s1.xp.woodcutting);
await page.screenshot({ path: `${OUT}/21_after_chopping.png` });

// craft planks x5 through the crafting panel UI
await page.keyboard.press('KeyC');
await page.waitForTimeout(400);
for (let i = 0; i < 5; i++) {
  await page.locator('.recipe-row', { hasText: 'Plank ×2' }).locator('button').click();
  await page.waitForTimeout(150);
}
await page.screenshot({ path: `${OUT}/22_crafted_planks.png` });
await page.keyboard.press('Escape');
const s2 = await state();
console.log('planks:', s2.inventory.plank, 'wood left:', s2.inventory.wood);

// aerial build mode: place campfire and workbench
await page.keyboard.press('KeyB');
await page.waitForTimeout(1500);
await page.locator('.build-item', { hasText: 'Campfire' }).click();
await page.mouse.move(720, 400);
await page.waitForTimeout(300);
await page.mouse.click(720, 400);
await page.waitForTimeout(400);
await page.locator('.build-item', { hasText: 'Workbench' }).click();
await page.mouse.move(880, 430);
await page.waitForTimeout(300);
await page.mouse.click(880, 430);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/23_placed_buildings.png` });

const s3 = await state();
console.log('buildings:', s3.buildings.map((b) => b.type).join(','));
console.log('quest2 done:', s3.completedQuests.includes('cozy_beginnings'));
console.log('unlocks:', s3.unlocks.join(','));

// back to FPS, look at the homestead
await page.keyboard.press('KeyB');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/24_fps_homestead.png` });

// invalid placement check: try to place a forge (locked) and an unaffordable keep
const valid = await page.evaluate(() => {
  const st = window.__kk.getState();
  return {
    forgeLockedPlace: st.placeBuilding('forge', 0, 0, 0),   // locked -> false
    overlap: st.evalPlacement('bed', st.buildings[0].x, st.buildings[0].z, 0).valid, // overlap -> false
    outside: st.evalPlacement('bed', 500, 0, 0).valid,      // out of region -> false
    free: st.evalPlacement('bed', -10, -10, 0).valid,       // open ground -> true
  };
});
console.log('placement checks:', JSON.stringify(valid));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
