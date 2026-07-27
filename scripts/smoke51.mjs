// Continues Phase 17 verification: enemies actually spawn per room, killing
// them all clears the dungeon and pays the reward, and a knockout away from
// home correctly recovers (destination cleared, not stranded).
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
    completedQuests: ['first_steps', 'cozy_beginnings', 'stone_age', 'forge_ahead', 'gone_fishing', 'squires_errand', 'knights_arms'],
    unlocks: ['fishing', 'building2', 'mining', 'smithing', 'keep'],
    inventory: { axe: 1, plank: 999, stone: 999, iron_bar: 999, wood: 999, gold: 100 },
  });
  window.__kk.getState().enterDungeon();
});
await page.waitForTimeout(2500); // let the 1Hz Enemies.tsx tick spawn the rooms

const afterSpawn = await page.evaluate(() => {
  const enemies = window.__kke.getState().enemies;
  const layout = window.__kkdungeon.layout;
  return {
    totalEnemies: enemies.length,
    byRoom: layout.rooms.map((r) => ({
      index: r.index, isEntry: r.isEntry, isBoss: r.isBoss, enemyCount: r.enemyCount,
      spawned: r.spawned, cleared: r.cleared,
      actuallySpawned: enemies.filter((e) => e.dungeonRoom === r.index).length,
    })),
  };
});
console.log('enemies after the spawn tick:', JSON.stringify(afterSpawn, null, 1));

// simulate clearing every room by removing its enemies directly (combat
// itself — landing a hit, taking damage — is already covered by unrelated
// smoke tests; this checks the dungeon-specific clear-detection glue)
const goldBefore = await page.evaluate(() => window.__kk.getState().inventory.gold);
await page.evaluate(() => {
  const enemies = [...window.__kke.getState().enemies];
  for (const e of enemies) window.__kke.getState().remove(e.id);
});
await page.waitForTimeout(1500); // let the next 1Hz tick notice everything's dead
const cleared = await page.evaluate(() => {
  const layout = window.__kkdungeon.layout;
  return {
    allCleared: layout.rooms.every((r) => r.cleared),
    rewarded: layout.rewarded,
    gold: window.__kk.getState().inventory.gold,
  };
});
console.log('gold before clear:', goldBefore, '-> after full clear:', JSON.stringify(cleared));
await page.screenshot({ path: `${OUT}/671_dungeon_cleared.png` });

// ---- knockout away from home recovers correctly (a real enemy attack,
// not a re-implemented stand-in, to actually exercise damagePlayer's fix) ----
await page.evaluate(() => {
  window.__kk.getState().enterDungeon();
});
await page.waitForTimeout(1000);
const beforeKO = { dest: await page.evaluate(() => window.__kk.getState().destination) };
await page.evaluate(() => {
  window.__kkc.hp = 0.5; // one real hit will finish the player off
  const p = window.__kkp;
  window.__kke.getState().spawn('bandit', p.x + 0.6, p.z, false);
});
// give the bandit's AI real time to close the last half-meter and land a hit
await page.waitForTimeout(6000);
const koResult = await page.evaluate(() => ({
  destAfter: window.__kk.getState().destination,
  hp: window.__kkc.hp,
  playerPos: { x: window.__kkp.x, z: window.__kkp.z },
}));
console.log('before knockout:', JSON.stringify(beforeKO), '— after a real hostile hit:', JSON.stringify(koResult));
console.log('destination correctly cleared by a knockout away from home (expect true):', koResult.destAfter === null);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
