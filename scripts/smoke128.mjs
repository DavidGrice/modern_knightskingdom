// M: the assembly workshop — lay a set out, set pieces, watch it grow
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/workshop'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=d3d11', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 160)));
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-42)); });
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

// a workbench to work at, and bricks to work with
const setup = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ stone: 400, plank: 400, wood: 200 }, 'grant');
  window.__kk.setState({ buildings: [...st.buildings, { id: 'wb1', type: 'workbench', x: 2, z: 20, y: 0, rot: 0, built: 1, world: null }] });
  window.__kk.getState().startSet('1289');
  return { workshop: window.__kk.getState().workshop };
});
await page.waitForTimeout(2000);
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 2, z: 24.5, yaw: 0 }; });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/step0.png` });

// set four pieces and look again
const after = await page.evaluate(() => {
  const st = window.__kk.getState();
  for (let i = 0; i < 4; i++) st.placeSetPart();
  return window.__kk.getState().workshop;
});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/step4.png` });

// finish it and confirm the set unlocks its buildable
const done = await page.evaluate(() => {
  const st = window.__kk.getState();
  for (let i = 0; i < 40; i++) st.placeSetPart();
  const s2 = window.__kk.getState();
  return { workshop: s2.workshop, built: s2.builtSets };
});
await page.waitForTimeout(1500);
console.log('setup:', JSON.stringify(setup), '\nafter 4:', JSON.stringify(after), '\ndone:', JSON.stringify(done));
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4) : 'none');
await b.close();
