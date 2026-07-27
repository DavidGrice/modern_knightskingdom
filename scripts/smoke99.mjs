// B11: the raiders' ram rolls (wheels turn with distance) and can be broken
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/ram'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-50)); });
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(8000);
await page.evaluate(() => window.__kk.getState().addItems({ crossbow: 1, bolt: 40 }));

// put a ram just north of the player and let it roll
await page.evaluate(() => {
  window.__kkp.pendingTeleport = { x: 0, z: 14, yaw: 0 };
  const r = window.__kkRam;
  r.active = true; r.x = 0; r.z = 6; r.hp = 30; r.travel = 0; r.wrecked = false; r.wreckT = 0;
});
await page.waitForTimeout(4000);
const rolled = await page.evaluate(() => ({
  travel: +window.__kkRam.travel.toFixed(2),
  hp: window.__kkRam.hp,
  z: +window.__kkRam.z.toFixed(2),
}));
console.log('after rolling 4s:', JSON.stringify(rolled), rolled.travel > 0.5 ? 'WHEELS HAVE DISTANCE' : 'NOT MOVING');
await page.screenshot({ path: `${OUT}/rolling.png`, clip: { x: 480, y: 300, width: 520, height: 400 } });

// shoot it apart
const before = await page.evaluate(() => ({
  wood: window.__kk.getState().inventory.wood ?? 0,
  plank: window.__kk.getState().inventory.plank ?? 0,
}));
const shots = await page.evaluate(async () => {
  window.__kkc.weapon = 'ranged';
  window.__kkc.rangedWeapon = 'crossbow';
  const hits = [];
  for (let i = 0; i < 8; i++) {
    const r = window.__kkRam;
    if (!r.active || r.wrecked) break;
    const dx = r.x - window.__kkp.x, dz = r.z - window.__kkp.z;
    window.__kkp.pitch = Math.atan2(0.9 - 1.45, Math.hypot(dx, dz));
    window.__kkBolt();
    await new Promise((res) => setTimeout(res, 900));
    hits.push(window.__kkRam.hp);
  }
  return { hits, wrecked: window.__kkRam.wrecked };
});
console.log('ram hp after each bolt:', JSON.stringify(shots));
await page.waitForTimeout(1200);
const after = await page.evaluate(() => ({
  wood: window.__kk.getState().inventory.wood ?? 0,
  plank: window.__kk.getState().inventory.plank ?? 0,
  wrecked: window.__kkRam.wrecked,
}));
console.log('salvage: wood', before.wood, '->', after.wood, '| plank', before.plank, '->', after.plank);
await page.screenshot({ path: `${OUT}/wrecked.png`, clip: { x: 480, y: 300, width: 520, height: 400 } });
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
