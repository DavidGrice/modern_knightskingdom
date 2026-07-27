import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1440,900','--window-position=-32000,-32000'] });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey'); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO'); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 0.8, z: 2.3, yaw: Math.PI / 4 }; });
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__kkcam.far = 2400; window.__kkcam.updateProjectionMatrix(); });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'scripts/shots/ride/far2400.png' });
await b.close();
