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
await page.evaluate(() => {
  let box = null;
  window.__kkscene.traverse((o) => { if (o.isMesh && o.geometry?.type === 'BoxGeometry') { o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius > 60) box = o; } });
  const T = box.material.find((m) => m.map).map.constructor;
  // a UV chart: 8 horizontal bands (v) in distinct greys, 8 vertical bands (u) tinted red
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    g.fillStyle = `rgb(${i * 32}, ${(7 - j) * 32}, ${j % 2 ? 255 : 0})`; // green = v (bottom bright), blue stripes
    g.fillRect(i * 32, j * 32, 32, 32);
  }
  box.material.forEach((m) => { const t = new T(c); t.needsUpdate = true; m.map = t; m.needsUpdate = true; });
});
await page.waitForTimeout(1200);
await page.screenshot({ path: 'scripts/shots/ride/uvchart.png' });
await b.close();
