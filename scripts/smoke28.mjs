// Reproduce: does the skeleton show floating hands (arms not properly
// re-hung) when picked as both head/face and body donor in the creator?
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

// DONORS order: king, queen, richard, john, storm, cedric, gilbert, weezil, skeleton
// default head/body index = 3 (john); skeleton is index 8, 5 clicks forward
const rows = await page.locator('.part-row').all();
console.log('part-row count (expect 2: head, body):', rows.length);

// click the "next" arrow 5 times for both Head and Torso Crest rows
for (let r = 0; r < 2; r++) {
  const nextBtn = rows[r].locator('.arrow-btn').nth(1);
  for (let i = 0; i < 5; i++) {
    await nextBtn.click();
    await page.waitForTimeout(150);
  }
}
const labels = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.part-name')).map((el) => el.textContent),
);
console.log('selected donors (expect both "Skeleton"):', JSON.stringify(labels));
await page.waitForTimeout(1500); // let the preview finish assembling + spin a bit
await page.screenshot({ path: `${OUT}/240_skeleton_creator.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
