// Phase 5 verification: horse riding (mount, gallop, dismount), quintain
// training, cannon fire vs a raider.
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
await page.waitForTimeout(6500);

// bring a horse right in front of the player, then mount via the real E-interaction
await page.evaluate(() => {
  const p = window.__kkp;
  const h = window.__kkhorses.horse0;
  h.x = p.x;
  h.z = p.z - 2.5; // straight ahead (player faces -Z at spawn)
  h.tx = h.x; h.tz = h.z; h.pause = 30;
});
await page.waitForTimeout(600);
const prompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt near horse:', prompt);
await page.keyboard.down('KeyE'); // hold so slow headless frames see it
await page.waitForTimeout(450);
await page.keyboard.up('KeyE');
await page.waitForTimeout(1200);
const riding1 = await page.evaluate(() => window.__kkr.active);
console.log('riding:', riding1);
await page.screenshot({ path: `${OUT}/80_mounted.png` });

// gallop
await page.keyboard.down('ShiftLeft');
await page.keyboard.down('KeyW');
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/81_gallop.png` });
await page.keyboard.up('KeyW');
await page.keyboard.up('ShiftLeft');
const stamina = await page.evaluate(() => window.__kkc.stamina);
console.log('stamina after gallop:', Math.round(stamina));

// dismount
await page.keyboard.down('KeyE');
await page.waitForTimeout(450);
await page.keyboard.up('KeyE');
await page.waitForTimeout(800);
console.log('riding after dismount:', await page.evaluate(() => window.__kkr.active));

// quintain + cannon: place both next to the player via the store, then use them
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ plank: 20, stone: 20, iron_bar: 5 });
  window.__kk.setState({ unlocks: ['building2', 'mining', 'smithing'] });
  const p = window.__kkp;
  // face the player toward them: they spawn 2.5m ahead (-Z of current yaw)
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  st.placeBuilding('quintain', Math.round(p.x + fx * 3), Math.round(p.z + fz * 3), 0);
});
await page.waitForTimeout(600);
const q = await page.evaluate(() => {
  const st = window.__kk.getState();
  const quintain = st.buildings.find((b) => b.type === 'quintain');
  const xpBefore = st.xp.combat;
  return { placed: !!quintain, xpBefore };
});
console.log('quintain placed:', q.placed);
// hold E to train
await page.keyboard.down('KeyE');
await page.waitForTimeout(2600);
await page.keyboard.up('KeyE');
const xpAfter = await page.evaluate(() => window.__kk.getState().xp.combat);
console.log('combat xp from training:', q.xpBefore, '->', xpAfter);
await page.screenshot({ path: `${OUT}/82_quintain.png` });

// cannon: place one aimed at a spawned bandit, fire via store-level interact
const cannonTest = await page.evaluate(() => {
  const st = window.__kk.getState();
  const p = window.__kkp;
  const cx = Math.round(p.x / 2) * 2 + 6;
  const cz = Math.round(p.z / 2) * 2;
  st.placeBuilding('cannon', cx, cz, 0); // rot 0 fires toward +Z
  return { cx, cz };
});
await page.waitForTimeout(800);
const fired = await page.evaluate(({ cx, cz }) => {
  const st = window.__kk.getState();
  const cannon = st.buildings.find((b) => b.type === 'cannon' && b.x === cx && b.z === cz);
  window.__kkFire(cannon); // same function the E-interaction calls
  // drop a bandit right on the expected landing spot (~16.5m downrange)
  window.__kke.getState().spawn('bandit', cx, cz + 16);
  return true;
}, cannonTest);
console.log('cannon fired:', fired);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/83_cannonball.png` });
await page.waitForTimeout(4500);
const bandit = await page.evaluate(() => ({
  enemies: window.__kke.getState().enemies.map((e) => ({ k: e.kind, hp: e.hp, s: e.mob.state })),
  ballsLeft: 0,
}));
console.log('bandit after cannon:', JSON.stringify(bandit.enemies));
await page.screenshot({ path: `${OUT}/84_after_blast.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
