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
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 0, z: 0, yaw: Math.PI / 2 }; });
await page.waitForTimeout(3000);
console.log(JSON.stringify(await page.evaluate(() => {
  const sc = window.__kkscene; let box = null, cam = null;
  sc.traverse((o) => {
    if (o.isMesh && o.geometry?.type === 'BoxGeometry') { o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius > 60) box = o; }
    if (o.isCamera && o.isPerspectiveCamera) cam = o;
  });
  const m = box.material[1];
  const img = m.map?.image;
  return {
    boxPos: box.position.toArray().map((v) => +v.toFixed(2)),
    boxScale: box.scale.toArray(),
    params: box.geometry.parameters,
    tex: { flipY: m.map.flipY, repeat: m.map.repeat.toArray(), offset: m.map.offset.toArray(),
      rotation: m.map.rotation, center: m.map.center.toArray(), wrapS: m.map.wrapS, wrapT: m.map.wrapT,
      w: img?.width, h: img?.height, complete: img?.complete },
    uvNZ: Array.from(box.geometry.attributes.uv.array.slice(40, 48)),
    posNZ: Array.from(box.geometry.attributes.position.array.slice(60, 72)),
    groups: box.geometry.groups,
    cam: cam ? { pos: cam.position.toArray().map((v) => +v.toFixed(2)), fov: cam.fov, near: cam.near, far: cam.far,
      parent: cam.parent?.type } : null,
    scaleOfSkyParent: box.parent?.scale?.toArray(),
  };
}), null, 1));
await page.screenshot({ path: 'scripts/shots/ride/face_x.png' });
await b.close();
