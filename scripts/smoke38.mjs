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
// pick "Weathered" face (2nd option) which reads bare-headed in the thumbnail grid
await page.click('text=Weathered');
await page.waitForTimeout(300);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

await page.keyboard.down('KeyI');
await page.waitForTimeout(300);
await page.keyboard.up('KeyI');
await page.waitForTimeout(500);
const box = await page.locator('.equip-preview').boundingBox();
// freeze the auto-spin at a fixed angle so both shots are directly comparable
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/572_no_helmet.png`, clip: box });

await page.evaluate(() => { window.__kk.getState().addItems({ helmet: 1 }, 'grant'); });
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/573_with_helmet.png`, clip: box });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
