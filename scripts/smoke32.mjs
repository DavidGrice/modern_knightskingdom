// Rig validation across all 9 donors, replacing smoke10.mjs now that the
// character creator no longer exposes a raw donor-cycling UI (it's a
// gender-first face/crest thumbnail picker over a curated 8-donor subset —
// Skeleton is intentionally excluded from it, see data/minifigs.ts). This
// script instead drives the third-person avatar directly via store state,
// so all 9 donors (including Skeleton) stay screenshot-checkable for arm/
// hand placement regressions independent of what the creator UI exposes.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'scripts/shots/donors2';
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
await page.waitForTimeout(1500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// third person so the assembled rig is actually on screen
await page.keyboard.press('KeyV');
await page.waitForTimeout(500);

const DONORS = [
  'minifigkingleo00', 'minifigqueenleonora00', 'minifigrichardstrong00', 'minifigjohnmayne00',
  'minifigprincessstorm00', 'minifigcedricbull00', 'minifiggilbertbad00', 'minifigweezil00',
  'minifigskeleton00',
];

for (const id of DONORS) {
  await page.evaluate((donorId) => {
    window.__kk.setState({
      character: {
        name: 'Test', headDonor: donorId, bodyDonor: donorId,
        armColor: 26, handColor: 18, legColor: 38, hipColor: 38,
      },
    });
  }, id);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${id}.png` });
}
console.log(`screenshotted ${DONORS.length} donors to ${OUT}/`);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
