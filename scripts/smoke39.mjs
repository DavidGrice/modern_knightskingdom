import { chromium } from 'playwright-core';
const OUT = 'scripts/shots';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
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
await page.keyboard.down('KeyV'); // third person
await page.waitForTimeout(200);
await page.keyboard.up('KeyV');
await page.waitForTimeout(500);
// back up a bit and look at the player from the front by turning around
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(900);
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/574_thirdperson_armor.png` });
await browser.close();
