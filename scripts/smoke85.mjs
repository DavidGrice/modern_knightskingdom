// front-door screens: title/sign-in (3a) and main menu + holdfasts (3b)
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
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/3a_title.png` });

await page.click('text=Play as guest');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/3b_menu_empty.png` });

// make a save so the holdfast card has something real to show
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/3c_forge.png` });
await page.click('text=Take up the road');
await page.waitForTimeout(8000);
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ gold: 1240, wood: 30 });
  st.save?.();
});
await page.waitForTimeout(1500);
// back out to the menu
await page.keyboard.press('Escape'); await page.waitForTimeout(900);
await page.click('text=Save & Return to Menu').catch(() => {});
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/3b_menu_save.png` });
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
