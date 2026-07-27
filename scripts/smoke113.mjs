// Block I: XP scaling, level-up vitals, Richard's line, loading screen
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/blocki'; fs.mkdirSync(OUT, { recursive: true });
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

// I43 · a level should cost roughly the same NUMBER of actions all the way up
const scaling = await page.evaluate(() => {
  const out = [];
  for (const startLevel of [0, 5, 10, 15]) {
    // put the skill exactly at that level, then count 20-XP actions to the next
    window.__kk.setState({ xp: { ...window.__kk.getState().xp, woodcutting: 50 * startLevel * startLevel } });
    const target = startLevel + 1;
    let acts = 0;
    while (acts < 500) {
      const before = window.__kk.getState().xp.woodcutting;
      window.__kk.getState().addXp('woodcutting', 20);
      acts++;
      if (Math.floor(Math.sqrt(window.__kk.getState().xp.woodcutting / 50)) >= target) break;
      if (window.__kk.getState().xp.woodcutting === before) break;
    }
    out.push({ from: startLevel, actions: acts });
  }
  return out;
});
console.log('actions to gain one level:');
for (const r of scaling) console.log(`  level ${String(r.from).padStart(2)} -> ${r.from + 1}: ${r.actions} chops`);

// I44 · vitals grow with total level
const vitals = await page.evaluate(() => {
  const zero = { woodcutting: 0, mining: 0, building: 0, combat: 0, farming: 0, smithing: 0, fishing: 0 };
  window.__kk.setState({ xp: { ...zero } });
  const low = { hp: window.__kkc.maxHp, stam: window.__kkc.maxStamina };
  const hi = 50 * 9 * 9; // level 9 in each
  window.__kk.setState({ xp: Object.fromEntries(Object.keys(zero).map((k) => [k, hi])) });
  return { low, high: { hp: window.__kkc.maxHp, stam: window.__kkc.maxStamina } };
});
console.log('vitals    :', JSON.stringify(vitals),
  vitals.high.hp > vitals.low.hp && vitals.high.stam > vitals.low.stam ? 'GREW WITH LEVEL' : 'no growth');

// I42 · the misattributed line now sits with King Leo
const lines = await page.evaluate(() => {
  const has = (id, frag) => {
    const n = window.__kk.getState();
    return null; // read from the module instead
  };
  return null;
});
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
