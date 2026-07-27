// full front-door run-through: title -> menu -> forge -> game, then the HUD
// under each of the four approved lane themes
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
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-60)); });

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
console.log('title:', await page.locator('.kk-plaque-word').textContent());
await page.click('text=Play as guest');
await page.waitForTimeout(1200);
console.log('menu rail items:', await page.locator('.kk-menu-item').count());
await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 });
await page.waitForTimeout(1400);
console.log('callings visible:', await page.locator('.kk-calling').count());
await page.click('text=Take up the road');
await page.waitForTimeout(8000);
await page.evaluate(() => {
  window.__kk.getState().addItems({ wood: 128, stone: 74, iron_bar: 12, herb: 31, gold: 1240, sword: 1, crossbow: 1, bolt: 14, axe: 1 });
});
await page.waitForTimeout(1500);

const clusters = await page.evaluate(() => {
  const q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
  return {
    vitals: q('.kk-vitals'), compass: q('.kk-compass'), objective: q('.kk-objective'),
    ledger: q('.kk-ledger'), hotbar: q('.kk-hotbar'), minimap: q('.kk-minimap-frame'),
    reticle: q('.kk-reticle'),
  };
});
console.log('clusters:', JSON.stringify(clusters));
// nothing may overflow the viewport
for (const [k, r] of Object.entries(clusters)) {
  if (!r) { console.log('  MISSING', k); continue; }
  if (r[0] < 0 || r[1] < 0 || r[0] + r[2] > 1440 || r[1] + r[3] > 900) console.log('  OFF-SCREEN', k, r);
}

for (const lane of ['glass', 'metal', 'chrome', 'leather']) {
  await page.evaluate((l) => window.__kk.getState().setPanel('none') ?? document.documentElement.setAttribute('data-kk-lane', l), lane);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/hud_${lane}.png`, clip: { x: 0, y: 0, width: 1440, height: 260 } });
}
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
await b.close();
