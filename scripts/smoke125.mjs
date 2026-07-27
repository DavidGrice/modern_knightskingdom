// L62: you can see the horse you are riding, and you can fight from it
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/ride2'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=d3d11', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 140)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
const mounted = await page.evaluate(() => {
  const ids = Object.keys(window.__kkhorses);
  if (!ids.length) return null;
  const h = window.__kkhorses[ids[0]];
  window.__kkp.pendingTeleport = { x: h.x, z: h.z, yaw: 0 };
  return { id: ids[0], url: h.url };
});
await page.waitForTimeout(2500);
await page.evaluate((id) => { window.__kkmount(id); }, mounted?.id);
await page.waitForTimeout(600);
const state = await page.evaluate(() => ({ active: window.__kkr.active, url: window.__kkr.horseUrl, pitch: window.__kkp.pitch }));
// look down a touch, the way a rider does
await page.waitForTimeout(2000);
await page.evaluate(() => { window.__kkp.pitch = -0.32; });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/mounted_view.png` });
// can we fight from the saddle? give a crossbow, ready it, and loose
const shot = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ crossbow: 1, bolt: 20 }, 'grant');
  window.__kkc.weapon = 'ranged';
  window.__kkc.rangedWeapon = 'crossbow';
  const before = (window.__kkbolts ?? []).length;
  const ok = window.__kkfireBolt ? window.__kkfireBolt() : 'no handle';
  return { fired: ok, weapon: window.__kkc.weapon, riding: window.__kkr.active, bolts: st.inventory.bolt };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/mounted_crossbow.png` });
console.log('mounted:', mounted, 'state:', state, 'shot:', shot);
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 3) : 'none');
await b.close();
