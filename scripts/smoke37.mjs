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

await page.evaluate(() => {
  window.__kk.getState().addItems({ helmet: 1, chestplate: 1, sword: 1, shield: 1 }, 'grant');
});
await page.waitForTimeout(300);

await page.keyboard.down('KeyI');
await page.waitForTimeout(300);
await page.keyboard.up('KeyI');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/570_armor_paperdoll.png` });

// zoom in tighter on just the preview for a clearer look at helmet fit
const box = await page.locator('.equip-preview').boundingBox();
await page.screenshot({ path: `${OUT}/571_armor_closeup.png`, clip: box });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
