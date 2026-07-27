// field HUD (1a-1d cluster plan) + build view hint placement
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/ui'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 200)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(8000);
// give the ledger and readied row something to show
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ wood: 128, stone: 74, iron_bar: 12, herb: 31, gold: 1240, sword: 1, crossbow: 1, bolt: 14, axe: 1, pickaxe: 1 });
});
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/1c_hud.png` });

// stand at a tree so the hold-E ring shows
await page.evaluate(() => {
  const st = window.__kk.getState();
  const n = st.nodes.find((x) => x.kind === 'tree');
  // yaw 0 faces -Z, so standing at z+2.2 looks straight at the trunk
  if (n) window.__kkp.pendingTeleport = { x: n.x, z: n.z + 2.2, yaw: 0 };
});
await page.waitForTimeout(1500);
await page.keyboard.down('KeyE');
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/1c_hold.png` });
await page.keyboard.up('KeyE');

// build view: the control hint must sit under the vitals, not centred
await page.keyboard.press('KeyB');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/2g_build.png` });
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
