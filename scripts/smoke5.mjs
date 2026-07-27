// Phase 2 verification: dusk/night lighting + stars, rain + lightning,
// wildlife (horses/falcon/bats), torch at night, sleep in bed.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'scripts/shots';
fs.mkdirSync(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(2500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(7000);

const setTime = (t) => page.evaluate((v) => { window.__kkenv.time = v; }, t);
const setRain = (on) => page.evaluate((v) => { window.__kkenv.raining = v; }, on);

// noon
await setTime(0.5);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/50_noon.png` });

// dusk
await setTime(0.73);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/51_dusk.png` });

// night + stars + bats
await setTime(0.98);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/52_night.png` });

// rain at day + lightning region
await setTime(0.45);
await setRain(true);
await page.waitForTimeout(9000); // rain fades in
const env = await page.evaluate(() => ({ rain: window.__kkenv.rain, night: window.__kkenv.night }));
console.log('env after rain-on:', JSON.stringify(env));
await page.screenshot({ path: `${OUT}/53_rain.png` });
await setRain(false);

// wildlife: look west toward the horses (turn right ~90° from -Z to -X? west is -X)
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1600);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/54_meadow_dir.png` });

// give ourselves a bed + torch and test sleeping (build through the store to keep it fast)
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ plank: 10, wood: 10, flowers: 2 });
  st.placeBuilding('bed', 2, 22, 0);
  st.placeBuilding('torch', 4, 24, 0);
});
await setTime(0.9); // late night
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/55_night_torch.png` });

// walk to the bed and sleep
const before = await page.evaluate(() => window.__kkenv.time);
// stand next to bed at (2,22); spawn walk: player at (0,26) facing -Z after reset? we turned right 90°... turn back left
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(1600);
await page.keyboard.up('ArrowLeft');
for (let i = 0; i < 8; i++) {
  const p = await page.evaluate(() => ({ ...window.__kkp }));
  const dx = 2 - p.x, dz = 22.6 - p.z;
  const d = Math.hypot(dx, dz);
  const desired = Math.atan2(-dx, -dz);
  let diff = desired - p.yaw;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > 0.15 && d > 1.2) {
    const key = diff > 0 ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.down(key);
    await page.waitForTimeout(Math.min(800, Math.abs(diff) * 950));
    await page.keyboard.up(key);
  }
  if (d < 1.6) break;
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(Math.min(1200, d * 320));
  await page.keyboard.up('KeyW');
}
const bedPrompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('bed prompt:', bedPrompt);
await page.keyboard.down('KeyE');
await page.waitForTimeout(2600);
await page.keyboard.up('KeyE');
const after = await page.evaluate(() => window.__kkenv.time);
console.log('time before sleep:', before.toFixed(3), 'after:', after.toFixed(3));
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/56_after_sleep.png` });

const clock = await page.evaluate(() => window.__kk.getState().timeOfDay);
console.log('store clock:', clock.toFixed(3));
console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
