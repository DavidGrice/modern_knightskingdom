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
for (const [x, z, yaw, tag] of [[0.8, 2.3, Math.PI / 4, 'bad'], [0, 0, Math.PI / 2, 'good']]) {
  await page.evaluate(([px, pz, py]) => { window.__kkp.pendingTeleport = { x: px, z: pz, yaw: py }; }, [x, z, yaw]);
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const cam = window.__kkcam;
    let box = null;
    window.__kkscene.traverse((o) => { if (o.isMesh && o.geometry?.type === 'BoxGeometry') { o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius > 60) box = o; } });
    return {
      cam: cam.getWorldPosition(new cam.position.constructor()).toArray().map((v) => +v.toFixed(2)),
      camFov: cam.fov, camFar: cam.far,
      box: box.getWorldPosition(new cam.position.constructor()).toArray().map((v) => +v.toFixed(2)),
      camDirY: +cam.getWorldDirection(new cam.position.constructor()).y.toFixed(3),
    };
  });
  console.log(tag, JSON.stringify(info));
}
await b.close();
