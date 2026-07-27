// New character creator verification: gender toggle, face/crest thumbnail
// grids, and switching gender swaps the option sets.
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

const maleFaceCount = await page.locator('.face-grid').first().locator('.face-tile').count();
console.log('male face tile count (expect 6):', maleFaceCount);
await page.screenshot({ path: `${OUT}/250_creator_male.png` });

await page.click('text=Female');
await page.waitForTimeout(1000);
const femaleFaceCount = await page.locator('.face-grid').first().locator('.face-tile').count();
console.log('female face tile count (expect 2):', femaleFaceCount);
await page.screenshot({ path: `${OUT}/251_creator_female.png` });

// pick the second female face + second female crest, confirm preview updates without errors
const faceTiles = page.locator('.face-grid').first().locator('.face-tile');
await faceTiles.nth(1).click();
await page.waitForTimeout(300);
const crestTiles = page.locator('.face-grid').nth(1).locator('.face-tile');
await crestTiles.nth(1).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/252_creator_female_pick2.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
