// C12: the FPS arm must be the PLAYER's arm — change the arm/hand palette
// and the view should follow, because the arms come from the assembled rig
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/fps'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 160)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
await page.evaluate(() => window.__kk.getState().addItems({ sword: 1 }));
await page.waitForTimeout(2500);
const clip = { x: 700, y: 400, width: 740, height: 500 };
await page.screenshot({ path: `${OUT}/colour_default.png`, clip });

// 26 = royal blue, 18 = yellow (the palette anchors in memory)
await page.evaluate(() => {
  const st = window.__kk.getState();
  window.__kk.setState({ character: { ...st.character, armColor: 6, handColor: 26 } });
});
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/colour_changed.png`, clip });
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
