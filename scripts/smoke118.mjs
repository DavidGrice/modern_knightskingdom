// J47/J48/J49: a construction site shows the real model as a wireframe plan
// with the solid piece rising out of the ground as the work goes in
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/build'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
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

// stake out a real-model piece straight into the store, then look at it
const site = await page.evaluate(() => {
  const st = window.__kk.getState();
  const p = window.__kkp;
  const x = p.x + 1, z = p.z - 5;
  st.buildings.push({ id: 'jsite', type: 'tower', x, z, y: 0, rot: 0, built: 0, world: null });
  window.__kk.setState({ buildings: [...st.buildings] });
  return { x, z, types: st.buildings.map((b2) => b2.type) };
});
await page.waitForTimeout(2500);
await page.evaluate((s) => { window.__kkp.pendingTeleport = { x: s.x + 5, z: s.z + 7, yaw: Math.atan2(-5, -7) + Math.PI }; }, site);
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/site_0.png` });

for (const pct of [0.35, 0.75, 1]) {
  await page.evaluate((v) => {
    const st = window.__kk.getState();
    window.__kk.setState({ buildings: st.buildings.map((b2) => (b2.id === 'jsite' ? { ...b2, built: v } : b2)) });
  }, pct);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/site_${Math.round(pct * 100)}.png` });
}
console.log('site:', site.x.toFixed(1), site.z.toFixed(1));
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4) : 'none');
await b.close();
