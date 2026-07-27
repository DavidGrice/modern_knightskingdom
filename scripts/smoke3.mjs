// Visual check of the hollow-model fix: creator preview from several angles.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'scripts/shots';
fs.mkdirSync(OUT, { recursive: true });

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
await page.waitForTimeout(4500);
// figure slowly rotates; capture three angles
await page.screenshot({ path: `${OUT}/30_fix_angle1.png`, clip: { x: 265, y: 155, width: 470, height: 590 } });
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/31_fix_angle2.png`, clip: { x: 265, y: 155, width: 470, height: 590 } });
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/32_fix_angle3.png`, clip: { x: 265, y: 155, width: 470, height: 590 } });
// swap to a helmeted head for a second donor check
await page.locator('.arrow-btn').nth(1).click();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/33_fix_donor2.png`, clip: { x: 265, y: 155, width: 470, height: 590 } });
await browser.close();
console.log('done');
