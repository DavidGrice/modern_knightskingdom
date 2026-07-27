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

// push total skill level past Laborer's threshold (3) via a single addXp call
await page.evaluate(() => window.__kk.getState().addXp('woodcutting', 500));
await page.waitForTimeout(400);
const panelAfterRankUp = await page.evaluate(() => window.__kk.getState().panel);
console.log('panel after rank-up (expect perk):', panelAfterRankUp);
await page.screenshot({ path: `${OUT}/595_perk_choice.png` });

// pick Iron Grip and confirm the stamina ceiling actually rises
await page.evaluate(() => window.__kk.getState().choosePerk('iron_grip'));
await page.waitForTimeout(300);
const afterIronGrip = await page.evaluate(() => ({
  perks: window.__kk.getState().perks,
  maxStamina: window.__kkc.maxStamina,
}));
console.log('after choosing Iron Grip:', JSON.stringify(afterIronGrip));

// quick_study: +10% xp on every future gain
await page.evaluate(() => window.__kk.getState().choosePerk.__proto__); // no-op, just ensure no crash
const xpBefore = await page.evaluate(() => window.__kk.getState().xp.mining);
await page.evaluate(() => { window.__kk.setState({ perks: [...window.__kk.getState().perks, 'quick_study'] }); });
await page.evaluate(() => window.__kk.getState().addXp('mining', 100));
const xpAfter = await page.evaluate(() => window.__kk.getState().xp.mining);
console.log('mining xp before/after +100 with quick_study (expect +110):', xpBefore, '->', xpAfter);

// steady_hands: tool wear rate drops from 2 to 1.4 per use
await page.evaluate(() => { window.__kk.setState({ perks: [...window.__kk.getState().perks, 'steady_hands'], durability: {} }); });
await page.evaluate(() => window.__kk.getState().useTool('axe'));
const durAfterSteady = await page.evaluate(() => window.__kk.getState().durability.axe);
console.log('axe durability after 1 use with steady_hands (expect 98.6):', durAfterSteady);

// green_thumb: plant growth time drops by 15%
await page.evaluate(() => { window.__kk.setState({ perks: [...window.__kk.getState().perks, 'green_thumb'] }); });
await page.evaluate(() => {
  window.__kk.setState({ buildings: [{ id: 'fp1', type: 'farmplot', x: 5, z: 5, rot: 0 }] });
});
await page.evaluate(() => window.__kk.getState().plantPlot('fp1'));
const growTime = await page.evaluate(() => window.__kk.getState().plots.fp1);
console.log('grow time with green_thumb (expect 170 = 200*0.85):', growTime);

// ironclad: +5% damage reduction — verified end-to-end via a skeleton's real attack
async function hpLostToOneHit() {
  await page.evaluate(() => window.__kke.getState().clear());
  await page.evaluate(() => {
    window.__kkc.hp = window.__kkc.maxHp;
    window.__kke.getState().spawn('skeleton', window.__kkp.x, window.__kkp.z + 0.3, false);
    const s = window.__kke.getState().enemies[0];
    s.mob.state = 'attack';
    s.mob.attackCd = 0;
  });
  await page.waitForTimeout(300); // one enemy-frame tick lands the hit
  return page.evaluate(() => window.__kkc.maxHp - window.__kkc.hp);
}
await page.evaluate(() => { window.__kk.setState({ perks: window.__kk.getState().perks.filter((p) => p !== 'ironclad') }); });
const lossWithout = await hpLostToOneHit();
await page.evaluate(() => { window.__kk.setState({ perks: [...window.__kk.getState().perks, 'ironclad'] }); });
const lossWith = await hpLostToOneHit();
console.log('hp lost to a skeleton hit without/with Ironclad (expect ~5% less with):', lossWithout, lossWith);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
