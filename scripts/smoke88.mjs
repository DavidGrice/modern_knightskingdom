import { chromium } from 'playwright-core';
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(8000);
const info = await page.evaluate(() => {
  const out = {};
  out.inset = getComputedStyle(document.documentElement).getPropertyValue('--kk-hud-inset');
  for (const sel of ['.hud', '.kk-vitals', '.kk-topright', '.kk-objective', '.kk-bottom', '.kk-minimap-frame']) {
    const el = document.querySelector(sel);
    if (!el) { out[sel] = 'MISSING'; continue; }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[sel] = {
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      pos: cs.position, left: cs.left, right: cs.right, top: cs.top, radius: cs.borderRadius,
    };
  }
  const ticks = [...document.querySelectorAll('.kk-compass-ticks > span')].map((e) => {
    const r = e.getBoundingClientRect();
    return { t: e.textContent, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), color: getComputedStyle(e).color };
  });
  out.ticks = ticks;
  out.yaw = window.__kkp.yaw;
  return out;
});
console.log(JSON.stringify(info, null, 1));
await b.close();
