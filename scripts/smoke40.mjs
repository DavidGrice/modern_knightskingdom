import { chromium } from 'playwright-core';
const OUT = 'scripts/shots';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(1500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// find a herb node and walk up to forage it for real
const herbNode = await page.evaluate(() => window.__kk.getState().nodes.find((n) => n.kind === 'herb'));
console.log('herb node:', JSON.stringify(herbNode));
await page.evaluate((n) => {
  const dx = n.x - window.__kkp.x, dz = n.z - window.__kkp.z;
  const dist = Math.hypot(dx, dz);
  const ux = dx / dist, uz = dz / dist;
  const x = n.x - ux * 0.5, z = n.z - uz * 0.5;
  const ddx = n.x - x, ddz = n.z - z;
  window.__kkp.pendingTeleport = { x, z, yaw: Math.atan2(-ddx, -ddz) };
}, herbNode);
await page.waitForTimeout(1200);
const promptAtHerb = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt at herb:', promptAtHerb);

await page.keyboard.down('KeyE');
await page.waitForTimeout(2600); // 1.0s nominal duration, headless needs ~2.4x
await page.keyboard.up('KeyE');
await page.waitForTimeout(300);
const afterForage = await page.evaluate(() => ({
  herb: window.__kk.getState().inventory.herb ?? 0,
  farmingXp: window.__kk.getState().xp.farming,
}));
console.log('after foraging:', JSON.stringify(afterForage));

// grant ingredients directly and brew all three potions
await page.evaluate(() => {
  window.__kk.getState().addItems({ herb: 10, flowers: 5 }, 'grant');
});
const crafted = await page.evaluate(() => {
  const st = window.__kk.getState();
  const results = {
    heal: st.craft('potion_heal'),
    stamina: st.craft('potion_stamina'),
    nightvision: st.craft('potion_nightvision'),
  };
  return { results, inventory: st.inventory };
});
console.log('crafted potions:', JSON.stringify(crafted));

// drink the healing draught (only works if not already at full hp)
await page.evaluate(() => { window.__kkc.hp = 3; });
await page.keyboard.down('KeyI');
await page.waitForTimeout(300);
await page.keyboard.up('KeyI');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/580_potions_satchel.png` });
await page.click('text=Healing Draught');
await page.waitForTimeout(200);
const afterHeal = await page.evaluate(() => ({ hp: window.__kkc.hp, potions: window.__kk.getState().inventory.potion_heal ?? 0 }));
console.log('after drinking healing draught:', JSON.stringify(afterHeal));

// drink stamina draught
await page.evaluate(() => { window.__kkc.stamina = 10; });
await page.click('text=Stamina Draught');
await page.waitForTimeout(200);
const afterStamina = await page.evaluate(() => ({ stamina: window.__kkc.stamina, potions: window.__kk.getState().inventory.potion_stamina ?? 0 }));
console.log('after drinking stamina draught:', JSON.stringify(afterStamina));

// drink night-vision draught and check the buff timestamp + ambient boost path
await page.click('text=Night-Vision Brew');
await page.waitForTimeout(200);
const afterNV = await page.evaluate(() => ({
  active: window.__kkenv.nightVisionUntil > performance.now(),
  potions: window.__kk.getState().inventory.potion_nightvision ?? 0,
}));
console.log('after drinking night-vision brew:', JSON.stringify(afterNV));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
