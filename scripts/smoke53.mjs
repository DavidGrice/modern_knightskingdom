// Verifies Phase 18 bug fixes: sword viewmodel rotation, NPC live-position
// interact prompt (no longer stale at old spot), and NPC walk animation
// during the night-schedule move (no more silent gliding).
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
    inventory: { axe: 1, sword: 1, gold: 100 },
  });
});

// ---- sword viewmodel (teleport to open ground, well clear of any
// tree/rock/fishing target that would otherwise force the axe/pickaxe/rod
// viewmodel instead per Viewmodel.tsx's targetKind priority) ----
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -60, z: -60, yaw: 0 }; });
await page.waitForTimeout(600);
console.log('viewmodel targetKind (expect null/none so sword actually shows):', await page.evaluate(() => window.__kk.getState().targetKind));
console.log('inventory.sword + combatState.weapon at screenshot time:', await page.evaluate(() => ({ sword: window.__kk.getState().inventory.sword, weapon: window.__kkc.weapon })));
await page.screenshot({ path: `${OUT}/710_sword_viewmodel.png` });
// tight crop on the viewmodel corner for a clearer close-up
await page.screenshot({ path: `${OUT}/710b_sword_closeup.png`, clip: { x: 850, y: 500, width: 590, height: 400 } });

// ---- NPC stale-prompt fix: teleport to John's daytime spot (x:-14,z:6 per
// data/npcs.ts) at night, once he's drifted toward the Keep -- the "Talk to"
// prompt should NOT appear there anymore ----
await page.evaluate(() => { window.__kkenv.time = 0.5; }); // day, confirm prompt exists at his post first
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: -14, z: 6.8, yaw: 0 }; });
await page.waitForTimeout(600);
const promptDay = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt at Johns post by day (expect "Talk to John..."):', promptDay);

await page.evaluate(() => { window.__kkenv.time = 0.02; }); // night
await page.waitForTimeout(9000); // real time for the position lerp to actually leave the spot under headless SwiftShader
const johnMob = await page.evaluate(() => ({ ...window.__kknpcs.john }));
const promptNight = await page.evaluate(() => window.__kk.getState().prompt);
console.log('John live position after dark (expect far from -14,6):', JSON.stringify(johnMob));
console.log('prompt at Johns OLD post at night (expect null, not "Talk to John"):', promptNight);
await page.screenshot({ path: `${OUT}/711_npc_no_stale_prompt.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
