// Cart & battering-ram verification: pushing the Battering Cart glues it in
// front of the player and rams open a closed gate on contact; hitching the
// Blade Cart makes it trail behind; letting go commits the live position
// back into the placed building's stored x/z.
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

async function approach(tx, tz, arrive = 2.0, tries = 14) {
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

// place a warcart, a bladecart, and a closed gate a short push away
const setup = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ stone: 20, iron_bar: 20, plank: 40 }, 'grant');
  window.__kk.setState({ unlocks: [...new Set([...st.unlocks, 'building2', 'mining', 'smithing'])] });
  const warcart = window.__kk.getState().placeBuilding('warcart', -20, 20, 0);
  const bladecart = window.__kk.getState().placeBuilding('bladecart', -20, 26, 0);
  const gate = window.__kk.getState().placeBuilding('gate', -20, 14, 2); // rot=2, facing north
  const gateB = window.__kk.getState().buildings.find((b) => b.type === 'gate');
  window.__kk.getState().toggleGate(gateB.id); // start closed
  return { warcart, bladecart, gate, gateId: gateB.id };
});
console.log('setup:', JSON.stringify(setup));

// walk to the warcart and push it
await approach(-20, 20, 1.8);
const prompt1 = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt at warcart:', prompt1);
await page.keyboard.down('KeyE');
await page.waitForTimeout(300);
await page.keyboard.up('KeyE');
await page.waitForTimeout(400);
const pushing = await page.evaluate(() => window.__kkCart.pushingId);
console.log('pushingId after E (expect the warcart id):', pushing);

// turn to face the gate (north, decreasing z) and walk it into the gate
await approach(-20, 15, 1.0, 10);
await page.waitForTimeout(500);
const rammed = await page.evaluate((gateId) => ({
  gateOpen: window.__kk.getState().gateOpen[gateId],
  cartLivePos: window.__kkCartPos[window.__kkCart.pushingId],
}), setup.gateId);
console.log('after ramming toward the closed gate (expect gateOpen: true):', JSON.stringify(rammed));
await page.screenshot({ path: `${OUT}/220_ram_gate.png` });

// let go of the ram; its position should commit into the store
await page.keyboard.down('KeyE');
await page.waitForTimeout(300);
await page.keyboard.up('KeyE');
await page.waitForTimeout(400);
const afterLetGo = await page.evaluate(() => {
  const st = window.__kk.getState();
  const b = st.buildings.find((x) => x.type === 'warcart');
  return { pushingId: window.__kkCart.pushingId, committed: { x: b.x, z: b.z }, livePosCleared: !window.__kkCartPos[b.id] };
});
console.log('after letting go of the ram (expect pushingId null, committed near the gate, live pos cleared):', JSON.stringify(afterLetGo));

// hitch the bladecart and confirm it follows while walking
await approach(-20, 26, 1.8);
await page.keyboard.down('KeyE');
await page.waitForTimeout(300);
await page.keyboard.up('KeyE');
await page.waitForTimeout(300);
const hitchedId = await page.evaluate(() => window.__kkCart.hitchedId);
const posA = await page.evaluate((id) => ({ ...window.__kkCartPos[id] }), hitchedId);
await page.keyboard.down('KeyW');
await page.waitForTimeout(1200);
await page.keyboard.up('KeyW');
const posB = await page.evaluate((id) => ({ ...window.__kkCartPos[id] }), hitchedId);
const moved = Math.hypot(posB.x - posA.x, posB.z - posA.z);
console.log('hitched cart live position moved while walking (expect > 0):', moved.toFixed(2));
await page.screenshot({ path: `${OUT}/221_hitched_cart.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
