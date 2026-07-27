// A6: bolt/arrow damage against real enemies, via the existing __kkBolt /
// __kkArrow hooks (CombatController's mousedown path needs pointer lock,
// which headless cannot grant).
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

await page.evaluate(() => {
  window.__kk.getState().addItems({ crossbow: 1, bolt: 40, longbow: 1, arrow: 40 });
});

async function shoot(kind, power) {
  return page.evaluate(async ([k, p]) => {
    // clear the field, drop one bandit straight in front, shoot it
    const es = window.__kke.getState();
    es.enemies.slice().forEach((e) => es.remove(e.id));
    window.__kkp.pendingTeleport = { x: 0, z: 20, yaw: 0 };
    await new Promise((r) => setTimeout(r, 400));
    const id = es.spawn ? es.spawn('bandit', 0, 12) : null;
    await new Promise((r) => setTimeout(r, 600));
    const before = window.__kke.getState().enemies.map((e) => ({ kind: e.kind, hp: e.hp }));
    window.__kkc.weapon = 'ranged';
    window.__kkc.rangedWeapon = k === 'arrow' ? 'longbow' : 'crossbow';
    window.__kkp.pitch = 0;
    if (k === 'arrow') window.__kkArrow(p); else window.__kkBolt();
    const shot = window.__kkBolts?.getState?.().bolts?.slice(-1)[0] ?? null;
    return { spawned: !!id, before, damage: shot ? +shot.damage.toFixed(2) : null, kindOf: shot?.kind ?? null };
  }, [kind, power]);
}

console.log('bolt      ', JSON.stringify(await shoot('bolt', 1)));
console.log('arrow 20% ', JSON.stringify(await shoot('arrow', 0.2)));
console.log('arrow 100%', JSON.stringify(await shoot('arrow', 1)));
await b.close();
