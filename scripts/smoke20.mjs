// Gatehouse verification: toggle open/closed, player collision (blocked when
// shut, passable when open), and raiders blocked by a shut gate.
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

// place a gate spanning the path north of spawn, rot=0 (4m wide along x, 2m deep along z)
const setup = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ stone: 20, iron_bar: 5 });
  window.__kk.setState({ unlocks: ['building2', 'mining', 'smithing'] });
  const placed = st.placeBuilding('gate', 0, 18, 0);
  return { placed };
});
console.log('gate placed:', setup.placed);

// approach and check default state (should read "Close the Gate" — open by default)
await page.evaluate(() => { window.__kkc.teleportTo = [0, 10]; });
await page.waitForTimeout(500);
await approach(0, 18, 2.2);
const prompt1 = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt at gate (default open):', prompt1);
await page.screenshot({ path: `${OUT}/150_gate_open.png` });

// walk straight through while open — should pass to the far side unobstructed
await approach(0, 22, 1.0, 6);
const passedThrough = await page.evaluate(() => window.__kkp.z);
console.log('z after walking through open gate (expect > 19):', passedThrough.toFixed(1));

// come back, close it
await approach(0, 18, 2.2);
const dbg1 = await page.evaluate(() => ({ prompt: window.__kk.getState().prompt, p: { ...window.__kkp } }));
console.log('debug before hold:', JSON.stringify(dbg1));
await page.keyboard.down('KeyE');
await page.waitForTimeout(1200);
const dbg2 = await page.evaluate(() => ({
  prompt: window.__kk.getState().prompt,
  progress: window.__kk.getState().actionProgress,
  p: { ...window.__kkp },
}));
console.log('debug mid-hold:', JSON.stringify(dbg2));
await page.waitForTimeout(1800);
await page.keyboard.up('KeyE');
await page.waitForTimeout(500);
const closedState = await page.evaluate(() => {
  const st = window.__kk.getState();
  const gate = st.buildings.find((b) => b.type === 'gate');
  return st.gateOpen[gate.id];
});
console.log('gateOpen after toggling closed (expect false):', closedState);
await page.screenshot({ path: `${OUT}/151_gate_closed.png` });

// try to walk through the now-closed gate — should be blocked
await page.evaluate(() => { window.__kkc.teleportTo = [0, 10]; });
await page.waitForTimeout(500);
await approach(0, 25, 0.5, 10); // aim well past the gate; collision should stop us short
const blockedZ = await page.evaluate(() => window.__kkp.z);
console.log('z after walking at closed gate (expect stopped well short of ~18):', blockedZ.toFixed(1));

// re-open it via the prompt (approach again, should now read "Open the Gate")
await approach(0, 17.5, 2.2);
const prompt2 = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt at closed gate:', prompt2);
await page.keyboard.down('KeyE');
await page.waitForTimeout(1500);
const dbg3 = await page.evaluate(() => ({
  prompt: window.__kk.getState().prompt, progress: window.__kk.getState().actionProgress,
}));
console.log('debug mid re-open hold:', JSON.stringify(dbg3));
await page.waitForTimeout(4000);
await page.keyboard.up('KeyE');
await page.waitForTimeout(500);
const reopened = await page.evaluate(() => {
  const st = window.__kk.getState();
  const gate = st.buildings.find((b) => b.type === 'gate');
  return st.gateOpen[gate.id];
});
console.log('gateOpen after re-toggling (expect true):', reopened);

// raider collision: close the gate again, spawn a bandit on the far side, walk it toward us
await page.evaluate(() => {
  const st = window.__kk.getState();
  const gate = st.buildings.find((b) => b.type === 'gate');
  st.toggleGate(gate.id); // close
  window.__kkenv.time = 0.5;
  window.__kke.getState().spawn('bandit', 0, 24); // north of the gate, will chase player south of it
});
await page.waitForTimeout(6000); // let the AI chase for a few seconds
const banditPos = await page.evaluate(() => {
  const e = window.__kke.getState().enemies[0];
  return e ? { x: e.mob.x.toFixed(1), z: e.mob.z.toFixed(1) } : null;
});
console.log('bandit position after chasing toward a closed gate (expect z stopped north of ~19, not through to <17):', JSON.stringify(banditPos));
await page.screenshot({ path: `${OUT}/152_raider_blocked.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
