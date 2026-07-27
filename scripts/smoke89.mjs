// remaining front-door screens: How to Play (5.9) and Credits
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/ui'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 200)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForTimeout(1200);
await page.click('text=How to Play');
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/help.png` });
await page.click('button:has-text("Back")');
await page.waitForTimeout(900);
await page.click('text=Credits');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/credits.png` });
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
