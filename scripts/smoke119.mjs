// J50: torches, campfires and the forge burn with the set's own flame element
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/flame'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=d3d11', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('console', (m) => { const t = m.text(); if (t.includes('KKFLAME')) console.log('>>', t.slice(0, 400)); });
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

const site = await page.evaluate(() => {
  const st = window.__kk.getState();
  const p = window.__kkp;
  const x = p.x, z = p.z - 6;
  const add = (type, dx, dz) => ({ id: 'f' + type, type, x: x + dx, z: z + dz, y: 0, rot: 0, built: 1, world: null });
  window.__kk.setState({ buildings: [...st.buildings, add('campfire', -2, 0), add('torch', 1.6, 0), add('forge', 5.5, 0)] });
  // dusk, so the light reads
  return { x, z };
});
await page.waitForTimeout(3000);
await page.evaluate((s) => { window.__kkp.pendingTeleport = { x: s.x + 1, z: s.z + 6, yaw: 0 }; }, site);
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/flames.png` });
const info = await page.evaluate(() => ({
  lights: (() => { let n = 0; window.__kkscene.traverse((o) => { if (o.isPointLight) n++; }); return n; })(),
  cones: (() => { let n = 0; window.__kkscene.traverse((o) => { if (o.geometry?.type === 'ConeGeometry') n++; }); return n; })(),
  flames: (() => { let n = 0; window.__kkscene.traverse((o) => { if (o.material?.map?.image?.currentSrc?.includes('spr010')) n++; }); return n; })(),
}));
console.log('scene:', info);
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4) : 'none');
await b.close();
