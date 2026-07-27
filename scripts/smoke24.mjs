// Longbow + building-damage verification: Q cycles melee/crossbow/longbow,
// holding LMB draws the bow (weak shot if released early, strong at full
// draw), arrows consume ammo and damage enemies; separately, cannon splash
// damage now also destroys nearby buildings for a partial rubble refund.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'scripts/shots';
fs.mkdirSync(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(2500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// grant gear + spawn a bandit dead ahead to shoot at
const setup = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ longbow: 1, arrow: 20, crossbow: 1, bolt: 20, stone: 30, iron_bar: 10, plank: 30 }, 'grant');
  window.__kkp.yaw = 0; window.__kkp.pitch = 0;
  window.__kke.getState().spawn('bandit', 0, 15);
  return { ...window.__kk.getState().inventory };
});
console.log('granted inventory:', JSON.stringify(setup));

// Q cycle: melee -> crossbow -> longbow
await page.keyboard.press('KeyQ');
await page.waitForTimeout(150);
const afterQ1 = await page.evaluate(() => window.__kkc.weapon + '/' + window.__kkc.rangedWeapon);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(150);
const afterQ2 = await page.evaluate(() => window.__kkc.weapon + '/' + window.__kkc.rangedWeapon);
console.log('after 1st Q (expect ranged/crossbow):', afterQ1, ' after 2nd Q (expect ranged/longbow):', afterQ2);

// weak shot: release almost immediately (under MIN_DRAW) -> should NOT fire (no arrow consumed)
const arrowsBefore = await page.evaluate(() => window.__kk.getState().inventory.arrow);
await page.mouse.down({ button: 'left' });
await page.waitForTimeout(50);
await page.mouse.up({ button: 'left' });
await page.waitForTimeout(200);
const arrowsAfterWeak = await page.evaluate(() => window.__kk.getState().inventory.arrow);
console.log('arrows before/after a too-quick release (expect unchanged, no shot):', arrowsBefore, arrowsAfterWeak);

// full draw: hold past FULL_DRAW_TIME, then release — inspect the fired
// projectile directly (damage/speed should reflect full power) rather than
// depend on a moving, AI-chasing enemy's exact position at release time
await page.mouse.down({ button: 'left' });
await page.waitForTimeout(1300);
await page.screenshot({ path: `${OUT}/200_longbow_draw.png` });
await page.mouse.up({ button: 'left' });
await page.waitForTimeout(80); // read the bolt store before the arrow travels far / despawns
const fullDrawShot = await page.evaluate(() => {
  const b = window.__kkBolts.getState().bolts.at(-1);
  return b && { kind: b.kind, damage: b.damage, speed: Math.hypot(b.vel.x, b.vel.y, b.vel.z) };
});
console.log('full-draw arrow (expect kind=arrow, damage~10, speed~46):', JSON.stringify(fullDrawShot));
// headless frame rate is low and CombatController clamps dt to 0.05/frame, so
// the 1.3s cooldown can take far longer than 1.3s of *real* time to clear
await page.waitForTimeout(6000);

// a light draw (~40% of full) should fire a weaker, slower arrow
await page.evaluate(() => { window.__kk.getState().addItems({ arrow: 5 }, 'grant'); });
await page.mouse.down({ button: 'left' });
await page.waitForTimeout(450);
await page.mouse.up({ button: 'left' });
await page.waitForTimeout(80);
const lightDrawShot = await page.evaluate(() => {
  const b = window.__kkBolts.getState().bolts.at(-1);
  return b && { kind: b.kind, damage: b.damage, speed: Math.hypot(b.vel.x, b.vel.y, b.vel.z) };
});
console.log('light-draw arrow (expect damage/speed well below full-draw):', JSON.stringify(lightDrawShot));
await page.screenshot({ path: `${OUT}/201_longbow_fired.png` });

// ---- building damage ----
const bset = await page.evaluate(() => {
  const st = window.__kk.getState();
  window.__kk.setState({ unlocks: [...new Set([...st.unlocks, 'building2', 'mining', 'smithing'])] });
  const cannon = window.__kk.getState().placeBuilding('cannon', 10, 10, 0);
  const wall = window.__kk.getState().placeBuilding('stonewall', 10, 14, 0);
  return { cannon, wall, buildings: window.__kk.getState().buildings.map((b) => ({ id: b.id, type: b.type })) };
});
console.log('placed cannon + wall:', JSON.stringify(bset));
const wallId = bset.buildings.find((b) => b.type === 'stonewall').id;

// explode cannonballs directly at the wall's position (real fireCannon +
// ballistic flight is exercised by simply firing the real cannon buildable
// elsewhere in normal play; this isolates the splash-damage-to-buildings
// logic itself, which is the part being verified here)
let destroyed = false;
for (let i = 0; i < 5 && !destroyed; i++) {
  const check = await page.evaluate((wallId) => {
    const st = window.__kk.getState();
    const wall = st.buildings.find((b) => b.id === wallId);
    if (wall) window.__kkExplode({ id: 999, pos: { x: wall.x, y: 0, z: wall.z }, vel: { x: 0, y: 0, z: 0 } });
    const st2 = window.__kk.getState();
    return { hp: st2.buildingHp[wallId], stillThere: !!st2.buildings.find((b) => b.id === wallId) };
  }, wallId);
  console.log(`cannon hit ${i + 1}:`, JSON.stringify(check));
  destroyed = !check.stillThere;
}
const finalInv = await page.evaluate(() => window.__kk.getState().inventory);
console.log('final inventory after wall destroyed (expect partial stone refund):', JSON.stringify({ stone: finalInv.stone }));
await page.screenshot({ path: `${OUT}/202_building_damage.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
