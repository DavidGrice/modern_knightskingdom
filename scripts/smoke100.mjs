// C12: the first-person view uses the player's OWN minifig arm, across every
// tool/weapon state. Shoots one frame per state for eyeball review.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/fps'; fs.mkdirSync(OUT, { recursive: true });
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

await page.evaluate(() => {
  window.__kk.getState().addItems({
    sword: 1, shield: 1, axe: 1, pickaxe: 1, hammer: 1, fishing_rod: 1,
    crossbow: 1, bolt: 30, longbow: 1, arrow: 30,
  });
});
await page.waitForTimeout(2500);

const clip = { x: 360, y: 220, width: 1080, height: 680 };

async function shot(name, setup) {
  await page.evaluate(setup);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/${name}.png`, clip });
  console.log('  shot', name);
}

await shot('fist', () => {
  const inv = { ...window.__kk.getState().inventory };
  window.__kk.setState({ inventory: {}, targetKind: null });
  window.__kkc.weapon = 'melee';
  window.__kkFPSinv = inv;
});
await shot('sword', () => {
  window.__kk.setState({ inventory: window.__kkFPSinv, targetKind: null });
  window.__kkc.weapon = 'melee';
});
await shot('crossbow', () => { window.__kkc.weapon = 'ranged'; window.__kkc.rangedWeapon = 'crossbow'; });
await shot('longbow', () => { window.__kkc.weapon = 'ranged'; window.__kkc.rangedWeapon = 'longbow'; });
// targetKind is recomputed by PlayerController every frame, so setState on it
// is stomped within ~16ms — the tool states have to be reached by actually
// standing in front of the node, exactly as a player would
await shot('axe', () => {
  window.__kkc.weapon = 'melee';
  const n = window.__kk.getState().nodes.find((x) => x.kind === 'tree');
  if (n) window.__kkp.pendingTeleport = { x: n.x, z: n.z + 2.2, yaw: 0 };
});
await shot('pickaxe', () => {
  const n = window.__kk.getState().nodes.find((x) => x.kind === 'rock');
  if (n) window.__kkp.pendingTeleport = { x: n.x, z: n.z + 2.0, yaw: 0 };
});
await shot('blocking', () => {
  window.__kkp.pendingTeleport = { x: 0, z: 22, yaw: 0 };
  window.__kkc.weapon = 'melee';
  window.__kkc.blocking = true;
});

const state = await page.evaluate(() => ({
  armsLoaded: !!document.querySelector('canvas'),
  character: window.__kk.getState().character?.bodyDonor,
}));
console.log('donor:', state.character);
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
