// Arm-fix verification: screenshot every donor as torso/arms source.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'scripts/shots/donors';
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
await page.waitForTimeout(3500);

// body/torso cycler is the 2nd pair of arrows (index 2=prev, 3=next)
const names = ['kingleo', 'queenleonora', 'richardstrong', 'johnmayne', 'princessstorm', 'cedricbull', 'gilbertbad', 'weezil', 'skeleton'];
// start at John of Mayne (index 3). Cycle through all 9.
for (let i = 0; i < 9; i++) {
  const donorIdx = (3 + i) % 9;
  await page.waitForTimeout(2400);
  await page.screenshot({
    path: `${OUT}/${names[donorIdx]}.png`,
    clip: { x: 300, y: 210, width: 400, height: 520 },
  });
  await page.locator('.arrow-btn').nth(3).click();
}

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
console.log('done');
