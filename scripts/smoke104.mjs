// D14/D15/D16: aim readout, crosshair standing colour, scan -> collection book
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/aim'; fs.mkdirSync(OUT, { recursive: true });
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

// --- hostile: stand off and look straight at a bandit ---------------------
await page.evaluate(async () => {
  const es = window.__kke.getState();
  es.enemies.slice().forEach((e) => es.remove(e.id));
  window.__kkp.pendingTeleport = { x: 0, z: 20, yaw: 0 };
  await new Promise((r) => setTimeout(r, 300));
  es.spawn('bandit', 0, 12);
});
await page.waitForTimeout(4500);
await page.evaluate(() => {
  const e = window.__kke.getState().enemies[0];
  if (e) { e.mob.state = 'wander'; e.mob.x = 0; e.mob.z = 12; }
  window.__kkp.pitch = 0;
});
await page.waitForTimeout(1200);
const hostile = await page.evaluate(() => ({
  target: window.__kkaim.target && {
    name: window.__kkaim.target.name,
    standing: window.__kkaim.target.standing,
    hp: window.__kkaim.target.hp,
    maxHp: window.__kkaim.target.maxHp,
    dist: Math.round(window.__kkaim.target.distance),
  },
  reticle: document.querySelector('.kk-reticle')?.className,
  readout: document.querySelector('.kk-aim-name')?.textContent,
  cardShown: !!document.querySelector('.kk-aim'),
}));
console.log('hostile aim :', JSON.stringify(hostile));
await page.screenshot({ path: `${OUT}/hostile.png`, clip: { x: 420, y: 250, width: 600, height: 400 } });

// --- scan it into the book -----------------------------------------------
const before = await page.evaluate(() => window.__kk.getState().bestiary.slice());
await page.keyboard.down('KeyF'); await page.waitForTimeout(400); await page.keyboard.up('KeyF');
await page.waitForTimeout(800);
const after = await page.evaluate(() => window.__kk.getState().bestiary.slice());
console.log('bestiary    :', JSON.stringify(before), '->', JSON.stringify(after));

// --- friendly: look at a court NPC ---------------------------------------
const friendly = await page.evaluate(async () => {
  const es = window.__kke.getState();
  es.enemies.slice().forEach((e) => es.remove(e.id));
  const ids = Object.keys(window.__kknpcs);
  if (!ids.length) return { note: 'no npcs registered' };
  const m = window.__kknpcs[ids[0]];
  window.__kkp.pendingTeleport = { x: m.x, z: m.z + 5, yaw: 0 };
  await new Promise((r) => setTimeout(r, 1600));
  window.__kkp.pitch = 0;
  await new Promise((r) => setTimeout(r, 900));
  return {
    target: window.__kkaim.target && { name: window.__kkaim.target.name, standing: window.__kkaim.target.standing },
    reticle: document.querySelector('.kk-reticle')?.className,
    cardShown: !!document.querySelector('.kk-aim'),
  };
});
console.log('friendly aim:', JSON.stringify(friendly));
await page.screenshot({ path: `${OUT}/friendly.png`, clip: { x: 420, y: 250, width: 600, height: 400 } });

// --- the book itself ------------------------------------------------------
await page.evaluate(() => window.__kk.getState().setPanel('bestiary'));
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/book.png` });
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
