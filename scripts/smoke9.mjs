// Phase 6+7 verification: NPC dialogue + side-quest loop + walkable structures.
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
await page.waitForTimeout(7000);

// Queen and Richard now stay hidden until their gating quest completes (the
// world opens as a plain village) — seed that progress so this dialogue/
// errand test can still reach them.
await page.evaluate(() => {
  window.__kk.setState({
    completedQuests: ['first_steps', 'cozy_beginnings', 'stone_age', 'forge_ahead', 'gone_fishing', 'squires_errand'],
  });
});

// --- dialogue: walk to Queen Leonora (-6,-8) via teleport + approach
await page.evaluate(() => { window.__kkc.teleportTo = [-6, -4]; });
await page.waitForTimeout(600);
// face her (-Z ahead; she's straight south of us) and step closer
await page.keyboard.down('KeyW');
await page.waitForTimeout(500);
await page.keyboard.up('KeyW');
let prompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt near queen:', prompt);
await page.keyboard.down('KeyE');
await page.waitForTimeout(450);
await page.keyboard.up('KeyE');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/90_dialogue_queen.png` });

// first-ever meeting opens on her one-time voiced lore intro (Continue/Skip)
// before the regular flavor-line + errand offer — skip straight through it
const skipLore = await page.locator('text=Skip').count();
if (skipLore) await page.click('text=Skip');
await page.waitForTimeout(300);

// accept her errand through the UI
const offered = await page.locator('text=Accept Errand').count();
if (offered) await page.click('text=Accept Errand');
await page.waitForTimeout(400);
let sq = await page.evaluate(() => window.__kk.getState().sideQuest);
console.log('side quest accepted:', JSON.stringify(sq));
await page.click('text=Farewell');

// progress it through the real gather path
await page.evaluate(() => {
  window.__kk.getState().addItems({ flowers: 2 }, 'gather');
});
sq = await page.evaluate(() => window.__kk.getState().sideQuest);
console.log('side quest after gathering:', JSON.stringify(sq));

// turn in at the queen (wait out the talk cooldown at headless framerate)
await page.waitForTimeout(1800);
await page.keyboard.down('KeyE');
await page.waitForTimeout(750);
await page.keyboard.up('KeyE');
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/91_turnin_ready.png` });
const turnIn = await page.locator('button:has-text("Turn In")').count();
if (turnIn) await page.click('button:has-text("Turn In")');
await page.waitForTimeout(500);
const after = await page.evaluate(() => ({
  sq: window.__kk.getState().sideQuest,
  planks: window.__kk.getState().inventory.plank ?? 0,
  wcXp: window.__kk.getState().xp.woodcutting,
}));
console.log('after turn-in:', JSON.stringify(after));
await page.click('text=Farewell').catch(() => {});

// --- kill errand wiring: accept Richard's, slay a skeleton
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.abandonSideQuest(); // in case the queen errand is still pending
  st.acceptSideQuest('richard', 'r_slay2');
  window.__kkenv.time = 0.95;
  const p = window.__kkp;
  window.__kke.getState().spawn('skeleton', p.x, p.z - 2.5);
});
await page.waitForTimeout(1200);
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => window.__kkAttack());
  await page.waitForTimeout(600);
}
sq = await page.evaluate(() => window.__kk.getState().sideQuest);
console.log('kill errand progress:', JSON.stringify(sq));

// --- walkable structures: brick staircase, then stand on top
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ plank: 40 });
  window.__kk.setState({ unlocks: ['building2'] });
  window.__kkc.teleportTo = [10, 10];
  window.__kkenv.time = 0.4;
});
await page.waitForTimeout(600);
await page.evaluate(() => {
  const st = window.__kk.getState();
  // staircase straight ahead (-Z): 1-, 2-, 3-brick columns, then a landing
  const B = 'gen_00_l300500'; // 1x1 brick, 0.42 tall
  const cols = [
    { z: 8.6, n: 1 }, { z: 8.25, n: 2 }, { z: 7.9, n: 3 },
  ];
  for (const c of cols) {
    for (let i = 0; i < c.n; i++) {
      for (const dx of [-0.35, 0, 0.35]) st.placeBuilding(B, 10.15 + dx, c.z, 0);
    }
  }
});
const placed = await page.evaluate(() => window.__kk.getState().buildings.length);
console.log('staircase pieces placed:', placed);
await page.waitForTimeout(500);
// walk up the stairs in short bursts, tracking the highest footing
let maxY = 0;
for (let i = 0; i < 8; i++) {
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(420);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(250);
  const s = await page.evaluate(() => ({ y: window.__kkp.y, z: window.__kkp.z }));
  maxY = Math.max(maxY, s.y);
  if (i === 4) await page.screenshot({ path: `${OUT}/92_on_stairs.png` });
  if (s.z < 7.4) break;
}
console.log('highest footing while climbing:', maxY.toFixed(2), '(expect ≥ 0.84)');
await page.waitForTimeout(900);
const y2 = await page.evaluate(() => window.__kkp.y);
console.log('after walking off the edge:', y2.toFixed(2), '(expect 0)');

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
