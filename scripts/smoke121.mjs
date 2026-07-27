// J51: the keep is composed — a foundation with named sockets, each offering
// only what fits it, each raised with its own work
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/keep'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=d3d11', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 140)));
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-46)); });
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

// lay the foundation and stock the parts bin
const laid = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ stone: 200, wood: 80, plank: 60, iron_bar: 20 }, 'grant');
  st.foundKeep(-2, 4);
  return !!window.__kk.getState().keep;
});
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -2, z: 26, yaw: 0 }; });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/foundation.png` });

// stand at the NW corner: the prompt must name the socket
const near = await page.evaluate(() => {
  const k = window.__kk.getState().keep;
  window.__kkp.pendingTeleport = { x: k.x - 6 + 2, z: k.z - 6 + 2 - 3, yaw: Math.PI };
  return { x: k.x, z: k.z };
});
await page.waitForTimeout(3000);
const prompt = await page.evaluate(() => document.querySelector('.kk-prompt, .prompt, .interact-prompt')?.textContent ?? null);

// raise every socket and finish the work, then look at the castle
const built = await page.evaluate(() => {
  const st = window.__kk.getState();
  const pick = { nw: 'corner_turret', ne: 'corner_turret', se: 'corner_block', sw: 'corner_block',
    n: 'gatehouse', e: 'wall_crenel', s: 'wall_crenel', w: 'wall_low', hall: 'great_hall' };
  for (const [sock, part] of Object.entries(pick)) st.raiseKeepPart(sock, part);
  const k1 = window.__kk.getState();
  for (const sock of Object.keys(pick)) k1.workKeepPart(sock, 0.5);
  return { parts: window.__kk.getState().keep.parts, built: window.__kk.getState().keep.built };
});
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -2, z: 30, yaw: 0 }; });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/half_built.png` });

await page.evaluate(() => {
  const st = window.__kk.getState();
  for (const sock of Object.keys(st.keep.parts)) st.workKeepPart(sock, 1);
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/castle.png` });
const done = await page.evaluate(() => window.__kk.getState().keep.built);
console.log('laid:', laid, 'prompt:', prompt);
console.log('parts:', JSON.stringify(built.parts));
console.log('final built:', JSON.stringify(done));
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 5) : 'none');
await b.close();
