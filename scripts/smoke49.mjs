// Verifies Phase 15 (World life & atmosphere): NPC day/night schedules
// (court retreat + villager bed-seeking), seasons (grass/tree tint, winter
// crop slowdown, longer winter nights), and weather (snow variant + mist).
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
await page.waitForTimeout(1200);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

await page.evaluate(() => {
  window.__kk.setState({
    unlocks: ['fishing', 'building2', 'mining', 'smithing', 'keep'],
    completedQuests: ['first_steps', 'cozy_beginnings', 'stone_age', 'forge_ahead', 'gone_fishing', 'squires_errand', 'knights_arms'],
    inventory: { axe: 1, plank: 999, stone: 999, iron_bar: 999, wood: 999, flowers: 999, gold: 500 },
  });
});

// ---- Seasons: grass/tree tint ----
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 0, z: 45, yaw: 0 }; });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/660_season_spring.png` });
console.log('season at start (expect 0, spring):', await page.evaluate(() => window.__kk.getState().season));

// jump straight to winter (dayCount 10 -> floor(10/3)%4 = 3)
await page.evaluate(() => { window.__kkenv.dayCount = 10; window.__kkenv.time = 0.35; });
await page.waitForTimeout(2600); // let DayNight's low-freq sync pick it up
console.log('season after jumping dayCount=10 (expect 3, winter):', await page.evaluate(() => window.__kk.getState().season));
await page.waitForTimeout(3000); // let the grass/tree tint lerp settle visually
await page.screenshot({ path: `${OUT}/661_season_winter.png` });

// ---- Winter crop growth is slower ----
await page.evaluate(() => {
  window.__kk.getState().placeBuilding('farmplot', -10, -10, 0);
  const plot = window.__kk.getState().buildings.find((b) => b.type === 'farmplot');
  window.__kk.getState().plantPlot(plot.id);
});
const plotsBefore = await page.evaluate(() => ({ ...window.__kk.getState().plots }));
await page.evaluate(() => window.__kk.getState().tickPlots(10)); // 10 simulated seconds
const plotsAfterWinter = await page.evaluate(() => ({ ...window.__kk.getState().plots }));
const key = Object.keys(plotsBefore)[0];
console.log('winter: 10s of growth ticked (expect ~5.5s used, not 10):', plotsBefore[key], '->', plotsAfterWinter[key]);

// back to spring (dayCount 0) and compare the same 10s tick
await page.evaluate(() => { window.__kkenv.dayCount = 0; });
await page.waitForTimeout(2600);
console.log('season back to spring:', await page.evaluate(() => window.__kk.getState().season));
const plotsBeforeSpring = { ...plotsAfterWinter };
await page.evaluate(() => window.__kk.getState().tickPlots(10));
const plotsAfterSpring = await page.evaluate(() => ({ ...window.__kk.getState().plots }));
console.log('spring: 10s of growth ticked (expect full 10s used):', plotsBeforeSpring[key], '->', plotsAfterSpring[key]);

// ---- NPC night schedule ----
await page.evaluate(() => { window.__kkenv.time = 0.5; }); // noon, daytime
await page.waitForTimeout(500);
// king/queen/richard/john cluster near (-14..14, -8..6) by day
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 0, z: -20, yaw: Math.PI }; });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/662_npc_day.png` });
await page.evaluate(() => { window.__kkenv.time = 0.02; }); // deep night
await page.waitForTimeout(15000); // the walk to NIGHT_GATHER_SPOT is ~110 units away — under
// headless SwiftShader's slow simulated dt, this is enough to leave their
// exact day spot even though they won't have fully arrived yet
await page.screenshot({ path: `${OUT}/663_npc_day_spot_at_night.png` }); // same camera angle as 662 — should now be empty/different
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 85, z: 60, yaw: Math.PI }; });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/663_npc_night.png` });

// ---- Villager night schedule: heads for the nearest bed ----
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.placeBuilding('bed', 20, -20, 0);
  window.__kk.setState((s) => ({ villagers: [...s.villagers, { id: 'vNight', name: 'NightTest', job: 'idle' }] }));
});
await page.evaluate(() => { window.__kkenv.time = 0.5; }); // reset to day first so the villager starts wandering near home
await page.waitForTimeout(1000);
const villagerDay = await page.evaluate(() => ({ ...window.__kkvillagers.vNight }));
await page.evaluate(() => { window.__kkenv.time = 0.02; }); // night
await page.waitForTimeout(6000); // real seconds of walk-toward-bed time
const villagerNight = await page.evaluate(() => ({ ...window.__kkvillagers.vNight }));
const distToBedBefore = Math.hypot(villagerDay.x - 20, villagerDay.z - (-20));
const distToBedAfter = Math.hypot(villagerNight.x - 20, villagerNight.z - (-20));
console.log('villager distance to the bed, day vs after dark (expect after < before):', distToBedBefore.toFixed(2), distToBedAfter.toFixed(2));

// ---- Weather: force a snow spell (winter) and a mist spell ----
await page.evaluate(() => { window.__kkenv.dayCount = 10; window.__kkenv.raining = true; window.__kkenv.rain = 1; });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/664_snow.png` });
await page.evaluate(() => { window.__kkenv.raining = false; window.__kkenv.rain = 0; window.__kkenv.misting = true; window.__kkenv.mist = 1; });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/665_mist.png` });
const fogNearFar = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  return { mist: window.__kkenv.mist, rain: window.__kkenv.rain };
});
console.log('mist weather state active:', JSON.stringify(fogNearFar));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
