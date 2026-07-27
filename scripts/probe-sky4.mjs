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
// swap each face's MAP for a flat colour (the per-frame tint rewrites .color,
// but never touches .map) so the screenshot says which face is which
await page.evaluate(() => {
  const sc = window.__kkscene; let box = null;
  sc.traverse((o) => { if (o.isMesh && o.geometry?.type === 'BoxGeometry') { o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius > 60) box = o; } });
  const cols = ['#ff0000', '#0000ff', '#ffffff', '#000000', '#ffff00', '#ff00ff']; // +x -x +y -y +z -z
  box.material.forEach((m, i) => {
    const c = document.createElement('canvas'); c.width = c.height = 4;
    const g = c.getContext('2d'); g.fillStyle = cols[i]; g.fillRect(0, 0, 4, 4);
    const T = box.material.find((x) => x.map)?.map.constructor;
    const t = new T(c); t.needsUpdate = true;
    m.map = t; m.needsUpdate = true;
  });
  window.__sky = box;
});
await page.waitForTimeout(1200);
await page.screenshot({ path: 'scripts/shots/ride/faceid.png' });
await b.close();
