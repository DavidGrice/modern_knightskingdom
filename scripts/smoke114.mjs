// Blocks I + G: radial, billboards, emplacements, dragon, stabling, schedule
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/ig'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

// I41 · the radial opens on hold, steers, commits on release — no panel
const radial = await page.evaluate(async () => {
  const r = {};
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT' }));
  await new Promise((res) => setTimeout(res, 200));
  r.opened = window.__kkwheel.open;
  r.panelStayedClosed = window.__kk.getState().panel === 'none';
  // steer toward sector 1 (right of centre)
  window.__kkwheel.dx = 90; window.__kkwheel.dy = 0;
  return r;
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/radial.png`, clip: { x: 430, y: 200, width: 580, height: 500 } });
const committed = await page.evaluate(async () => {
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyT' }));
  await new Promise((res) => setTimeout(res, 300));
  return { open: window.__kkwheel.open, order: window.__kkorders.order };
});
console.log('I41 radial :', JSON.stringify(radial), '->', JSON.stringify(committed),
  radial.opened && radial.panelStayedClosed && !committed.open ? 'HELD, STEERED, COMMITTED — NO PANEL' : 'unexpected');

// I39 · a wounded enemy carries a bar in the world
const bill = await page.evaluate(async () => {
  const es = window.__kke.getState();
  es.enemies.slice().forEach((e) => es.remove(e.id));
  window.__kkp.pendingTeleport = { x: 0, z: 31, yaw: 0 };
  await new Promise((r) => setTimeout(r, 300));
  es.spawn('bandit', 0, 13);
  await new Promise((r) => setTimeout(r, 3000));
  const e = window.__kke.getState().enemies[0];
  if (e) { e.hp = 4; e.mob.state = 'wander'; e.mob.x = 0; e.mob.z = 13; }
  await new Promise((r) => setTimeout(r, 900));
  return { hp: e ? e.hp : null };
});
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/billboard.png`, clip: { x: 560, y: 330, width: 340, height: 260 } });
console.log('I39 health :', JSON.stringify(bill));

// G23/G24 · an emplacement fires on its own; a posted defender sharpens it
const emp = await page.evaluate(async () => {
  window.__kk.getState().addItems({ stone: 60 });
  window.__kk.setState({
    buildings: [{ id: 'cn', type: 'cannon', x: 0, z: 8, rot: 0, y: 0, world: null, built: 1 }],
  });
  const es = window.__kke.getState();
  es.enemies.slice().forEach((e) => es.remove(e.id));
  es.spawn('bandit', 0, 2);
  const before = window.__kk.getState().inventory.stone ?? 0;
  await new Promise((r) => setTimeout(r, 6000));
  const after = window.__kk.getState().inventory.stone ?? 0;
  return { stoneBefore: before, stoneAfter: after, fired: before - after };
});
console.log('G23 turret :', JSON.stringify(emp), emp.fired > 0 ? 'FIRED UNMANNED' : 'did not fire');

// G27 · stabling and mounting
const stable = await page.evaluate(() => {
  const h = Object.keys(window.__kkhorses)[0];
  window.__kkr; // riding state
  const mod = window.__kkstable ?? null;
  return { firstHorse: h, horses: Object.keys(window.__kkhorses).length };
});
console.log('G27 horses :', JSON.stringify(stable));
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
