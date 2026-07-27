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
await page.waitForTimeout(3000);
const meta = await page.evaluate(() => {
  const sc = window.__kkscene; let box = null;
  sc.traverse((o) => { if (o.isMesh && o.geometry?.type === 'BoxGeometry') { o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius > 60) box = o; } });
  window.__sky = box;
  return { y: box.position.y, camY: window.__kkscene.getObjectByProperty('isCamera', true)?.position.y ?? null };
});
console.log('sky y', meta);
for (const dy of [0, -60, -140, 60]) {
  await page.evaluate((d) => {
    const b = window.__sky;
    b.matrixAutoUpdate = true;
    b.position.y = 139.4 + d;
    b.updateMatrix();
    b.matrixAutoUpdate = false; // freeze so the per-frame write cannot undo it
  }, dy);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `scripts/shots/ride/dy_${dy}.png` });
}
await b.close();
