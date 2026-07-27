import { chromium } from 'playwright-core';
const OUT = 'scripts/shots';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(1500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);
await page.keyboard.press('KeyV');
await page.waitForTimeout(300);

// Alric (-40,38)
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -38.5, z: 38, yaw: Math.PI * 1.5 }; });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/530_alric.png` });

// Beda (-35,42)
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -33.5, z: 42, yaw: Math.PI * 1.5 }; });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/531_beda.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
