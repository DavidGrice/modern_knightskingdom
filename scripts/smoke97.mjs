// B8/B9: per-part hitboxes from the real rig, and bolts that stick
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/hitbox'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(8000);
await page.evaluate(() => window.__kk.getState().addItems({ crossbow: 1, bolt: 60 }));

// spawn one bandit dead ahead and let its rig load
const setup = await page.evaluate(async () => {
  const es = window.__kke.getState();
  es.enemies.slice().forEach((e) => es.remove(e.id));
  window.__kkp.pendingTeleport = { x: 0, z: 20, yaw: 0 };
  await new Promise((r) => setTimeout(r, 300));
  es.spawn('bandit', 0, 12);
  await new Promise((r) => setTimeout(r, 4000));
  const e = window.__kke.getState().enemies[0];
  const boxes = window.__kkhitbox[String(e.id)] ?? [];
  return {
    id: e.id, hp: e.hp,
    parts: boxes.map((x) => ({
      part: x.part,
      cy: +x.cy.toFixed(2), cx: +x.cx.toFixed(2),
      h: +(x.hy * 2).toFixed(2),
      w: +(x.hx * 2).toFixed(2),
    })),
  };
});
console.log('measured hitboxes from the rig:');
for (const p of setup.parts) console.log(`  ${p.part.padEnd(9)} centreY ${String(p.cy).padStart(5)}  x ${String(p.cx).padStart(6)}  h ${p.h}  w ${p.w}`);

// aim at the head, then at a leg, and compare the damage each deals
async function shootAt(targetY) {
  return page.evaluate(async (ty) => {
    const e = window.__kke.getState().enemies[0];
    if (!e) return { err: 'no enemy' };
    e.hp = 999;               // isolate the damage measurement
    e.mob.state = 'wander';
    const before = e.hp;
    // aim from the player's eye at the requested height on the target
    const px = window.__kkp.x, pz = window.__kkp.z, py = 1.45;
    const dx = e.mob.x - px, dz = e.mob.z - pz;
    const flat = Math.hypot(dx, dz);
    window.__kkp.pitch = Math.atan2(ty - py, flat);
    window.__kkc.weapon = 'ranged';
    window.__kkc.rangedWeapon = 'crossbow';
    window.__kkBolt();
    await new Promise((r) => setTimeout(r, 1400));
    const after = window.__kke.getState().enemies[0];
    const stuck = window.__kkBolts.getState().bolts.filter((x) => x.stuck);
    return {
      dealt: after ? +(before - after.hp).toFixed(2) : null,
      stuckCount: stuck.length,
      stuckPart: stuck.length ? stuck[stuck.length - 1].stuck.part : null,
    };
  }, targetY);
}

const head = await shootAt(1.62);
console.log('shot at head height :', JSON.stringify(head));
const leg = await shootAt(0.35);
console.log('shot at leg height  :', JSON.stringify(leg));
const miss = await shootAt(4.0);
console.log('shot high over them :', JSON.stringify(miss));

await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/stuck.png`, clip: { x: 480, y: 260, width: 520, height: 420 } });
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
