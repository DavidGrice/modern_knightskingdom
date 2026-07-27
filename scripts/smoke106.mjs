// G25: A* over the collision-derived navgrid — a wall must be routed AROUND,
// an opening must be routed THROUGH, and enemies must stop crossing masonry.
import { chromium } from 'playwright-core';
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
await page.waitForTimeout(9000);

const mk = (id, type, x, z) => ({ id, type, x, z, rot: 0, y: 0, world: null, built: 1 });

// --- 1. a long solid wall between two points: the path must go around ------
const around = await page.evaluate((mkSrc) => {
  const mk = eval(`(${mkSrc})`);
  // three 8m walls end to end at z=0, spanning x -12..12
  window.__kk.setState({ buildings: [mk('w1', 'stonewall', -8, 0), mk('w2', 'stonewall', 0, 0), mk('w3', 'stonewall', 8, 0)] });
  window.__kknav.rebuildNav(window.__kk.getState().buildings);
  const p = window.__kknav.findPath(0, 8, 0, -8);
  return {
    found: !!p,
    waypoints: p ? p.length : 0,
    // does any waypoint sit on the wall line? and does the route detour wide?
    maxAbsX: p && p.length ? Math.max(...p.map((w) => Math.abs(w.x))) : 0,
    crossesAt: p ? p.filter((w) => Math.abs(w.z) < 1.2 && Math.abs(w.x) < 12).length : -1,
  };
}, mk.toString());
console.log('solid wall  :', JSON.stringify(around),
  around.found && around.maxAbsX > 12 ? 'ROUTED AROUND' : around.found ? 'went through/near' : 'no route');

// --- 2. leave a gap in the middle: the path must go straight through -------
const through = await page.evaluate((mkSrc) => {
  const mk = eval(`(${mkSrc})`);
  window.__kk.setState({ buildings: [mk('w1', 'stonewall', -12, 0), mk('w3', 'stonewall', 12, 0)] });
  window.__kknav.rebuildNav(window.__kk.getState().buildings);
  const p = window.__kknav.findPath(0, 8, 0, -8);
  return { found: !!p, waypoints: p ? p.length : 0, maxAbsX: p && p.length ? Math.max(...p.map((w) => Math.abs(w.x))) : 0 };
}, mk.toString());
console.log('wall w/ gap :', JSON.stringify(through),
  through.found && through.maxAbsX < 6 ? 'STRAIGHT THROUGH THE GAP' : 'detoured');

// --- 3. a chasing enemy must not end up on the far side of a solid wall ----
const chase = await page.evaluate(async (mkSrc) => {
  const mk = eval(`(${mkSrc})`);
  window.__kk.setState({ buildings: [mk('w1', 'stonewall', -8, 0), mk('w2', 'stonewall', 0, 0), mk('w3', 'stonewall', 8, 0)] });
  window.__kknav.rebuildNav(window.__kk.getState().buildings);
  const es = window.__kke.getState();
  es.enemies.slice().forEach((e) => es.remove(e.id));
  // player south of the wall, bandit due north of it
  window.__kkp.pendingTeleport = { x: 0, z: 9, yaw: 0 };
  await new Promise((r) => setTimeout(r, 400));
  es.spawn('bandit', 0, -9);
  await new Promise((r) => setTimeout(r, 1200));
  const e0 = window.__kke.getState().enemies[0];
  const start = { x: +e0.mob.x.toFixed(1), z: +e0.mob.z.toFixed(1) };
  let crossedInsideWall = 0;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const e = window.__kke.getState().enemies[0];
    if (!e) break;
    // the wall's real stone spans x -12..12 at z about -1.4..-0.5
    if (Math.abs(e.mob.x) < 12 && e.mob.z > -1.6 && e.mob.z < -0.3) crossedInsideWall++;
  }
  const e1 = window.__kke.getState().enemies[0];
  return {
    start,
    end: e1 ? { x: +e1.mob.x.toFixed(1), z: +e1.mob.z.toFixed(1) } : null,
    framesInsideWall: crossedInsideWall,
  };
}, mk.toString());
console.log('chase       :', JSON.stringify(chase),
  chase.framesInsideWall === 0 ? 'NEVER STOOD IN THE STONE' : 'entered the wall volume');
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
