// L73: how the weapons actually sit in the first-person hands
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/weapons'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=d3d11', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 140)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
await page.evaluate(() => {
  window.__kk.getState().addItems({ sword: 1, shield: 1, crossbow: 1, bolt: 20, longbow: 1, arrow: 20, axe: 1, pickaxe: 1, halberd: 1 }, 'grant');
});
for (const [tag, set] of [
  ['sword', () => { window.__kkc.weapon = 'melee'; }],
  ['crossbow', () => { window.__kkc.weapon = 'ranged'; window.__kkc.rangedWeapon = 'crossbow'; }],
  ['bow', () => { window.__kkc.weapon = 'ranged'; window.__kkc.rangedWeapon = 'longbow'; }],
]) {
  await page.evaluate(set);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/${tag}.png` });
}
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 3) : 'none');
await b.close();
