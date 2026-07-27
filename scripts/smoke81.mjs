// alpha-mask verification: the lab flagged l606400 (Cedric's camp scenery)
// as having its silhouette texture wired to Base Color. Travel to the camp
// and inspect both the pixels and the resulting materials.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/mask'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Begin the Journey'); await page.waitForTimeout(7000);
await page.evaluate(() => { window.__kk.getState().travelTo('template-05'); });
await page.waitForTimeout(7000);
const at = await page.evaluate(() => ({
  dest: window.__kk.getState().destination, x: window.__kkp.x, z: window.__kkp.z,
}));
console.log('at:', JSON.stringify(at));
// the camp only renders once Cedric is revealed; stand just south of the
// left-hand l606400 instance (camp origin + [5,·,2]) looking north at it
await page.evaluate(() => {
  const st = window.__kk.getState();
  window.__kk.setState({ completedQuests: [...st.completedQuests, 'knights_arms'] });
  window.__kkp.pendingTeleport = { x: 2185 + 5, z: 945 + 2 + 4.5, yaw: 0 };
});
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/camp.png` });
await b.close();
