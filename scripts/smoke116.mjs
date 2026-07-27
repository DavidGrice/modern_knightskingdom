// K54: a defender assigned a stabled horse is actually drawn riding it, and
// that horse stops standing about in the meadow
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/ride'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-40)); });
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

// swear in a defender and put them on a stabled horse
const CONTROL = process.argv.includes('--control');
const setup = await page.evaluate((process_control) => {
  const st = window.__kk.getState();
  st.villagers.length; // touch
  window.__kk.setState({ villagers: [{ id: 'ride1', name: 'Rider', job: 'defender', level: 3 }] });
  const ids = Object.keys(window.__kkhorses);
  if (!ids.length) return { horses: 0 };
  const hid = ids[0];
  if (!process_control) { window.__kkstable.ids.push(hid); window.__kkstable.assigned.ride1 = hid; }
  return { horses: ids.length, hid, url: window.__kkhorses[hid].url };
}, CONTROL);
await page.waitForTimeout(4000);

// stand off the defender and look at them
const at = await page.evaluate(() => {
  const d = window.__kkdefenders.ride1;
  if (!d) return null;
  // yaw 0 faces -Z: look back at the defender from the offset
  window.__kkp.pendingTeleport = { x: d.x + 5, z: d.z + 5, yaw: Math.atan2(5, 5) };
  return { x: d.x, z: d.z };
});
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/${CONTROL ? 'control' : 'mounted'}.png` });

// and the meadow horse it came from must no longer be visible
const herd = await page.evaluate(() => {
  const hid = window.__kkstable.assigned.ride1;
  return { hid, ridden: !!hid };
});
console.log('setup:', setup, 'defender at:', at, 'herd:', herd);
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4) : 'none');
await b.close();
