// Merchant cart swap verification: the procedural box cart was replaced with
// the real oc6095b3 model (a yoked two-horse team + shared chest). Confirm it
// loads without error and looks right next to the merchant NPC.
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
await page.waitForTimeout(1500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// force daytime so the merchant + cart are present, then teleport to his spot
await page.evaluate(() => { window.__kkenv.time = 0.4; });
await page.waitForTimeout(200);
await page.evaluate(() => {
  window.__kkp.pendingTeleport = { x: 10, z: 16, yaw: Math.PI * 0.65 };
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/270_merchant_cart_wide.png` });

// closer look
await page.evaluate(() => {
  window.__kkp.pendingTeleport = { x: 13, z: 22.5, yaw: Math.PI * 0.15 };
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/271_merchant_cart_close.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
