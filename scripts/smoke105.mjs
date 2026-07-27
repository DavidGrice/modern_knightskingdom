// D13b: appearance is editable mid-game and every consumer follows
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
await page.waitForTimeout(9000);

await page.evaluate(() => window.__kk.getState().setPanel('appearance'));
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/appearance.png` });
const shape = await page.evaluate(() => ({
  faces: document.querySelectorAll('.kk-face').length,
  swatchGroups: document.querySelectorAll('.kk-swatch-group').length,
  before: window.__kk.getState().character.armColor,
}));
// click a different arm swatch and confirm the character changed
await page.evaluate(() => {
  const groups = [...document.querySelectorAll('.kk-swatch-group')];
  const arms = groups.find((g) => g.textContent.trim().startsWith('Arms'));
  const btns = [...arms.querySelectorAll('.kk-swatch')];
  const target = btns.find((x) => !x.classList.contains('on'));
  target.click();
});
await page.waitForTimeout(1200);
const after = await page.evaluate(() => window.__kk.getState().character.armColor);
console.log('panel:', JSON.stringify(shape), '-> armColor now', after,
  after !== shape.before ? 'CHANGED' : 'NO CHANGE');
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
