// L63: the collision volumes must sit where the stone is DRAWN, at every
// rotation. Compares the union of collisionBoxesFor against the rendered
// mesh's own world bounding box for each of the four facings.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/wallcol'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=d3d11', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 140)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

// one crenellated wall per rotation, spread far enough apart to measure alone
const placed = await page.evaluate(() => {
  const st = window.__kk.getState();
  const bs = [0, 1, 2, 3].map((rot) => ({
    id: `wcol${rot}`, type: 'stonewall', x: -40 + rot * 20, z: 60, y: 0, rot, built: 1, world: null,
  }));
  window.__kk.setState({ buildings: [...st.buildings, ...bs] });
  return bs.map((x) => ({ id: x.id, rot: x.rot, x: x.x, z: x.z }));
});
await page.waitForTimeout(6000);

const cmp = await page.evaluate((sites) => {
  const out = [];
  for (const site of sites) {
    // the drawn mesh: union of every mesh sitting near this building
    let min = [1e9, 1e9], max = [-1e9, -1e9];
    window.__kkscene.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox.clone();
      o.updateWorldMatrix(true, false);
      bb.applyMatrix4(o.matrixWorld);
      const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      if (Math.hypot(cx - site.x, cz - site.z) > 6) return;
      if (bb.max.y - bb.min.y > 20) return; // skip terrain/sky
      min = [Math.min(min[0], bb.min.x), Math.min(min[1], bb.min.z)];
      max = [Math.max(max[0], bb.max.x), Math.max(max[1], bb.max.z)];
    });
    const raw = window.__kkcollideFor('stonewall', site.rot);
    const boxes = { min: [Math.min(...raw.map((r) => site.x + r.ox - r.hx)), Math.min(...raw.map((r) => site.z + r.oz - r.hz))], max: [Math.max(...raw.map((r) => site.x + r.ox + r.hx)), Math.max(...raw.map((r) => site.z + r.oz + r.hz))] };
    out.push({ rot: site.rot, mesh: { min, max }, boxes });
  }
  return out;
}, placed);
console.log(JSON.stringify(cmp, null, 1).slice(0, 2600));
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 3) : 'none');
await b.close();
