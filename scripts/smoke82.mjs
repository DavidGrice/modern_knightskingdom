import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/crew'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('response',(r)=>{ if(r.status()===404) errs.push('404 '+r.url().slice(-70)); });
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 160)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Begin the Journey'); await page.waitForTimeout(7000);

// one occupiable engine (oc6096-4 catapult) + one non-occupiable (oc1289)
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ stone: 30 });
  window.__kk.setState({
    buildings: [
      { id: 'eng', type: 'oc6096-4', x: -40, z: -40, rot: 0, y: 0, world: null, built: 1 },
    ],
  });
  window.__kkp.pendingTeleport = { x: -40, z: -37.6, yaw: 0 };
});
await page.waitForTimeout(2500);

// what buildable ids actually map to occupiable lab assets?
const ids = await page.evaluate(() => {
  const st = window.__kk.getState();
  return { types: st.buildings.map((b) => b.type), target: st.targetLabel, kind: st.targetKind };
});
console.log('placed:', JSON.stringify(ids));

const press = async (k, ms = 400) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); await page.waitForTimeout(400); };
await press('KeyE', 500);
const manned = await page.evaluate(() => ({
  engineId: window.__kkcrew?.engineId, mode: window.__kkcrew?.mode,
  y: window.__kkp.y, label: window.__kk.getState().targetLabel,
}));
console.log('after E:', JSON.stringify(manned));
await page.screenshot({ path: `${OUT}/manned.png` });

// fire with the attack button
const before = await page.evaluate(() => window.__kk.getState().inventory.stone ?? 0);
// headless can't take pointer lock, so CombatController's mousedown guard
// bails before it sets lmbDown — drive the flag the same way it would
await page.evaluate(() => { window.__kkc.lmbDown = true; });
await page.waitForTimeout(900);
await page.evaluate(() => { window.__kkc.lmbDown = false; });
await page.waitForTimeout(600);
const after = await page.evaluate(() => ({
  stone: window.__kk.getState().inventory.stone ?? 0,
  fired: !!window.__kkpropfire?.eng,
}));
console.log('fire:', before, '->', JSON.stringify(after));
await page.screenshot({ path: `${OUT}/fired.png` });

// step down
await press('KeyE', 500);
const off = await page.evaluate(() => ({ engineId: window.__kkcrew?.engineId, label: window.__kk.getState().targetLabel }));
console.log('after step down:', JSON.stringify(off));
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
await b.close();
