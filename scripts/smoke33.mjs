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

// unlock both reveal gates directly (isolates content testing from the full quest grind)
await page.evaluate(() => {
  window.__kk.setState({
    completedQuests: ['first_steps', 'cozy_beginnings', 'stone_age', 'forge_ahead', 'gone_fishing', 'squires_errand', 'knights_arms'],
    unlocks: ['fishing', 'building2', 'mining', 'smithing', 'keep'],
  });
});

// ---- Cedric's Forest Camp ----
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -108, z: -68, yaw: 0 }; });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/533_cedric_camp.png` });

const promptBeforeFight = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt near camp (idle Cedric):', promptBeforeFight);

await page.keyboard.down('KeyE');
await page.waitForTimeout(300);
await page.keyboard.up('KeyE');
await page.waitForTimeout(500);

const midFight = await page.evaluate(() => ({
  enemies: window.__kke.getState().enemies.map((e) => ({ kind: e.kind, hp: e.hp, raid: e.raid })),
}));
console.log('after challenge:', JSON.stringify(midFight));

// finish Cedric off directly (bypasses the melee grind — just verifying the
// kill-branch's special-casing in combat.ts, not swing timing/reach)
await page.evaluate(() => {
  const cedric = window.__kke.getState().enemies.find((e) => e.kind === 'cedric');
  if (!cedric) return;
  cedric.hp = 1;
  // a real teleport (not a direct playerState mutation) — PlayerController's
  // own frame loop otherwise overwrites playerState.{x,z,yaw} right back
  // from its internal position ref before the attack call fires
  window.__kkp.pendingTeleport = { x: cedric.mob.x, z: cedric.mob.z + 1, yaw: 0 };
});
await page.waitForTimeout(300);
await page.evaluate(() => window.__kkAttack());
await page.waitForTimeout(1600);

const afterKill = await page.evaluate(() => {
  window.__kk.getState().checkDeeds(); // deed timer is 4s in-game; force it for the test
  return {
    defeatedCedric: window.__kk.getState().defeatedCedric,
    deeds: window.__kk.getState().deeds,
    gold: window.__kk.getState().inventory.gold,
  };
});
console.log('after Cedric kill:', JSON.stringify(afterKill));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/534_cedric_jailed.png` });

const campGuardsGone = await page.evaluate(() => ({
  prompt: window.__kk.getState().prompt,
}));
console.log('prompt at camp after defeat (should not offer challenge again):', JSON.stringify(campGuardsGone));

// ---- Princess Storm's Battle Dome ----
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 110, z: -60, yaw: 0 }; });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/535_battle_dome.png` });

await page.keyboard.down('KeyE');
await page.waitForTimeout(300);
await page.keyboard.up('KeyE');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/536_storm_dialogue.png` });

const dialoguePanel = await page.evaluate(() => window.__kk.getState().panel);
console.log('panel after E near Storm:', dialoguePanel);

const challengeBtn = await page.$('text=Challenge to a Duel');
console.log('challenge button found:', !!challengeBtn);
if (challengeBtn) await challengeBtn.click();
await page.waitForTimeout(500);

const duelState = await page.evaluate(() => ({
  enemies: window.__kke.getState().enemies.map((e) => ({ kind: e.kind, hp: e.hp })),
  panel: window.__kk.getState().panel,
}));
console.log('duel spawned:', JSON.stringify(duelState));

const beforeRep = await page.evaluate(() => window.__kk.getState().reputation.storm ?? 0);

// position the player right next to Storm's mob, facing her, then land the
// decisive first hit via the real playerAttack path
await page.evaluate(() => {
  const storm = window.__kke.getState().enemies.find((e) => e.kind === 'storm');
  if (!storm) return;
  window.__kkp.x = storm.mob.x;
  window.__kkp.z = storm.mob.z + 1;
  const dx = storm.mob.x - window.__kkp.x;
  const dz = storm.mob.z - window.__kkp.z;
  window.__kkp.yaw = Math.atan2(-dx, -dz);
});
await page.waitForTimeout(200);
await page.evaluate(() => window.__kkAttack());
await page.waitForTimeout(800);

const afterDuel = await page.evaluate(() => ({
  enemies: window.__kke.getState().enemies.map((e) => e.kind),
  reputation: window.__kk.getState().reputation.storm ?? 0,
}));
console.log('duel resolution: reputation', beforeRep, '->', afterDuel.reputation, '| remaining enemies:', JSON.stringify(afterDuel.enemies));

// ---- raid spawner: Gilbert should lead, alongside two generic bandits ----
await page.evaluate(() => window.__kke.getState().clear());
await page.evaluate(() => {
  window.__kk.setState({ buildings: [{ id: 'b1', type: 'campfire', x: 0, z: 0, rot: 0 }, { id: 'b2', type: 'workbench', x: 2, z: 0, rot: 0 }, { id: 'b3', type: 'forge', x: 4, z: 0, rot: 0 }, { id: 'b4', type: 'stonewall', x: 6, z: 0, rot: 0 }] });
  window.__kkenv.time = 0.73;
});
await page.waitForTimeout(2500);
const raidSpawn = await page.evaluate(() => window.__kke.getState().enemies.map((e) => ({ kind: e.kind, raid: e.raid })));
console.log('raid spawn (expect one gilbert + two bandit, raid:true):', JSON.stringify(raidSpawn));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
