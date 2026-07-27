// L72: clicking a built piece opens its action menu; a wall offers charges
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/bmenu'; fs.mkdirSync(OUT, { recursive: true });
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
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ stone: 80, wood: 60, plank: 40, iron_bar: 10, gold: 200 }, 'grant');
  window.__kk.setState({ buildings: [...st.buildings, { id: 'wallA', type: 'stonewall', x: 4, z: 10, y: 0, rot: 0, built: 1, world: null }] });
  st.openBuildingMenu('wallA');
});
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/menu.png` });
const menu = await page.evaluate(() => ({
  panel: window.__kk.getState().panel,
  actions: [...document.querySelectorAll('.keep-option-name')].map((n) => n.textContent),
}));
// mount the cheapest charge and confirm it stands on the wall
const mounted = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.mountCharge('wallA', 'l394101');
  const s2 = window.__kk.getState();
  const c = s2.buildings.find((x) => x.type === 'l394101');
  return c ? { x: c.x, z: c.z, y: c.y } : null;
});
await page.waitForTimeout(1200);
console.log('menu:', JSON.stringify(menu));
console.log('charge on wall:', JSON.stringify(mounted));
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 3) : 'none');
await b.close();
