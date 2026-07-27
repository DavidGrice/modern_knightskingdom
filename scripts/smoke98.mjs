// B10: real OBJ-derived collision — can the player walk THROUGH a piece's
// actual opening, and is a genuinely solid piece still solid?
//
// The arch pieces are thin in X and long in Z, with their legs spread along
// Z — so the doorway faces ±X and you pass through by walking along X.
// Walking along Z would be walking into the legs, which should block.
import { chromium } from 'playwright-core';
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(8000);

/** forward is (-sin yaw, -cos yaw), so yaw=+PI/2 faces -X and yaw=0 faces -Z */
async function tryWalk(type, label, axis, expect) {
  await page.evaluate(([t, ax]) => {
    window.__kk.setState({
      buildings: [{ id: 'w', type: t, x: 0, z: 0, rot: 0, y: 0, world: null, built: 1 }],
    });
    window.__kkp.pendingTeleport = ax === 'x'
      ? { x: 5, z: 0, yaw: Math.PI / 2 }
      : { x: 0, z: 5, yaw: 0 };
  }, [type, axis]);
  await page.waitForTimeout(1600);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(16000);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(400);
  const end = await page.evaluate(() => ({ x: +window.__kkp.x.toFixed(2), z: +window.__kkp.z.toFixed(2) }));
  const v = axis === 'x' ? end.x : end.z;
  const through = v < -1.2;
  const verdict = through ? 'WALKED THROUGH' : 'BLOCKED';
  const ok = verdict === expect ? 'OK ' : 'FAIL';
  console.log(`${ok} ${label.padEnd(30)} along ${axis}: 5 -> ${v}  ${verdict}`);
  return through;
}

// L-shaped corner walls: the empty inner corner used to be blocked, because
// one bounding box covers the whole L including the void inside it
await tryWalk('mc005', 'L-corner wall, through void', 'x', 'WALKED THROUGH');
await tryWalk('mc006', 'L-corner wall, through void', 'x', 'WALKED THROUGH');
// the decorative arches crown at ~1.35m — too low to stand under, so these
// SHOULD block; they are not gateways
await tryWalk('gen_14_l302720', 'Arch 4x12 (crown too low)', 'x', 'BLOCKED');
await tryWalk('gen_16_l302721', 'Arch 4x12 solid variant', 'x', 'BLOCKED');
await tryWalk('mc009', 'breached wall (authored)', 'z', 'WALKED THROUGH');
await tryWalk('stonewall', 'solid wall (control)', 'z', 'BLOCKED');
await b.close();
