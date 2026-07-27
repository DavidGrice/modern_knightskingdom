// Castle interior verification: enter the Grand Keep's great hall, open the
// treasure chest (one-time reward + deed), exit, and confirm the sealed
// exterior blocks a normal walk-in from outside.
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

// steer toward (tx,tz) and walk until within `arrive` meters (or `tries` exhausted)
async function approach(tx, tz, arrive = 2.4, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const p = await page.evaluate(() => ({ ...window.__kkp }));
    const dx = tx - p.x;
    const dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    if (d < arrive) break;
    const desired = Math.atan2(-dx, -dz);
    let diff = desired - p.yaw;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > 0.12) {
      const key = diff > 0 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(key);
      await page.waitForTimeout(Math.min(900, Math.abs(diff) * 950));
      await page.keyboard.up(key);
    }
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(Math.min(1400, d * 320));
    await page.keyboard.up('KeyW');
  }
  await page.waitForTimeout(300);
}

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(2500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// build a Grand Keep near spawn
const setup = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ stone: 50, plank: 30, iron_bar: 10 });
  window.__kk.setState({ unlocks: ['building2', 'mining', 'smithing', 'keep'] });
  const placed = st.placeBuilding('keep', 0, 20, 0);
  return { placed };
});
console.log('keep placed:', setup.placed);

// approach it and check the enter prompt
await page.evaluate(() => { window.__kkc.teleportTo = [0, 12]; });
await page.waitForTimeout(500);
await approach(0, 20, 5.5);
const prompt1 = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt near keep:', prompt1);

await page.keyboard.down('KeyE');
await page.waitForTimeout(600);
await page.keyboard.up('KeyE');
await page.waitForTimeout(600);
const afterEnter = await page.evaluate(() => ({
  interior: window.__kk.getState().interior,
  pos: { x: window.__kkp.x.toFixed(1), z: window.__kkp.z.toFixed(1) },
}));
console.log('after enter:', JSON.stringify(afterEnter));
await page.screenshot({ path: `${OUT}/140_keep_interior.png` });

// walk to the treasure chest corner and open it
await approach(88.3, 87.6, 2.0);
const chestPrompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt near chest:', chestPrompt);
await page.screenshot({ path: `${OUT}/141_near_chest.png` });

const goldBefore = await page.evaluate(() => window.__kk.getState().inventory.gold ?? 0);
await page.keyboard.down('KeyE');
await page.waitForTimeout(3000);
await page.keyboard.up('KeyE');
await page.waitForTimeout(400);
const afterChest = await page.evaluate(() => ({
  gold: window.__kk.getState().inventory.gold ?? 0,
  treasureOpened: window.__kk.getState().treasureOpened,
}));
console.log('gold before/after chest:', goldBefore, '->', afterChest.gold, '| treasureOpened:', afterChest.treasureOpened);

// open again -> flavor message only, no extra gold
await page.keyboard.down('KeyE');
await page.waitForTimeout(3000);
await page.keyboard.up('KeyE');
await page.waitForTimeout(400);
const secondOpen = await page.evaluate(() => window.__kk.getState().inventory.gold ?? 0);
console.log('gold after re-opening (expect unchanged):', secondOpen);

// wait for the deed checker (4s interval) and confirm it fired
await page.waitForTimeout(4500);
const deeds = await page.evaluate(() => window.__kk.getState().deeds);
console.log('treasury deed earned:', deeds.includes('treasury'));

// step away from the chest (findTarget should fall back to keep_exit), then leave
await approach(85, 82, 1.5);
const exitPrompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt away from chest (expect Leave the Keep):', exitPrompt);
await page.keyboard.down('KeyE');
await page.waitForTimeout(900);
await page.keyboard.up('KeyE');
await page.waitForTimeout(600);
const afterExit = await page.evaluate(() => ({
  interior: window.__kk.getState().interior,
  pos: { x: window.__kkp.x.toFixed(1), z: window.__kkp.z.toFixed(1) },
}));
console.log('after exit:', JSON.stringify(afterExit));
await page.screenshot({ path: `${OUT}/142_outside_after_exit.png` });

// sealed exterior: teleport just outside the room and try to walk straight in
await page.evaluate(() => { window.__kkc.teleportTo = [85, 95]; });
await page.waitForTimeout(500);
await approach(85, 85, 0.5, 8);
const blocked = await page.evaluate(() => ({
  x: window.__kkp.x.toFixed(1), z: window.__kkp.z.toFixed(1),
  interior: window.__kk.getState().interior,
}));
console.log('after walking toward the sealed room from outside:', JSON.stringify(blocked),
  '(expect z stopped well short of 85, interior still false)');
await page.screenshot({ path: `${OUT}/143_sealed_exterior.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
