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
const info = await page.evaluate(() => {
  const sc = window.__kkscene; const found = [];
  sc.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const r = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z);
    if (r > 60) { o.userData.__probe = found.length; found.push({ i: found.length, n: o.name || '?', r: +r.toFixed(1),
      parent: o.parent?.name || o.parent?.type, type: o.geometry.type, mat: o.material?.type }); }
  });
  window.__probeSet = (i, v) => { sc.traverse((o) => { if (o.userData.__probe === i) o.visible = v; }); };
  return found;
});
console.log(JSON.stringify(info));
for (const m of info) {
  await page.evaluate((i) => window.__probeSet(i, false), m.i);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `scripts/shots/ride/hide_${m.i}.png` });
  await page.evaluate((i) => window.__probeSet(i, true), m.i);
  await page.waitForTimeout(400);
}
await b.close();
