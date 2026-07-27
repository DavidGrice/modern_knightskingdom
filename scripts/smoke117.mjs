// K61: the target nameplate hangs over the figure's head and shows for
// whatever the player is holding — here, bare hands
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/plate'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  // d3d11, not swiftshader: this shot is about how it LOOKS
  args: ['--use-angle=d3d11', '--window-size=1440,900', '--window-position=-32000,-32000'],
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

// stand off an NPC and look at them, empty-handed
const at = await page.evaluate(() => {
  const ids = Object.keys(window.__kknpcs);
  if (!ids.length) return null;
  const n = window.__kknpcs[ids[0]];
  const d = 4.5;
  window.__kkp.pendingTeleport = { x: n.x + d, z: n.z + d, yaw: Math.atan2(d, d) };
  return { id: ids[0], x: n.x, z: n.z, weapon: window.__kkc?.weapon ?? null };
});
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/plate_barehand.png` });
const shown = await page.evaluate(() => {
  const el = document.querySelector('.kk-aim');
  if (!el) return { card: false, target: window.__kkaim.target?.name ?? null };
  const r = el.getBoundingClientRect();
  return { card: true, w: Math.round(r.width), h: Math.round(r.height),
    x: Math.round(r.left + r.width / 2), y: Math.round(r.top),
    target: window.__kkaim.target?.name ?? null, screen: window.__kkaim.screen };
});
console.log('npc:', at, '\nplate:', shown);
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4) : 'none');
await b.close();
