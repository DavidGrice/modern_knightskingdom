// D13: the vitals crest shows the player's real head, and follows a palette change
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/portrait'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(10000);
const canvases = await page.evaluate(() => document.querySelectorAll('canvas').length);
console.log('canvases on screen (game + portrait):', canvases);
await page.screenshot({ path: `${OUT}/crest_default.png`, clip: { x: 0, y: 0, width: 420, height: 130 } });

// a different face donor must change the crest
await page.evaluate(() => {
  const st = window.__kk.getState();
  window.__kk.setState({ character: { ...st.character, headDonor: 'minifigcedricbull00', bodyDonor: 'minifigcedricbull00' } });
});
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/crest_cedric.png`, clip: { x: 0, y: 0, width: 420, height: 130 } });
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
