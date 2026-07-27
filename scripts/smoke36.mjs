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

await page.evaluate(() => {
  window.__kk.getState().addItems({ fishing_rod: 1 }, 'grant');
  window.__kk.setState({ unlocks: ['fishing'] });
});

// Stand a step back from the dock's exact end (48.95, 39.42), still inside its
// narrow corridor (halfWidth 0.6) so the pond push-back doesn't shove us off,
// facing the fishing node itself (atan2(-dx,-dz) — this codebase's yaw=0 faces -Z).
await page.evaluate(() => {
  const start = { x: 45.5, z: 36.5 };
  const end = { x: 48.95, z: 39.42 };
  const t = 0.9;
  const x = start.x + (end.x - start.x) * t;
  const z = start.z + (end.z - start.z) * t;
  const dx = end.x - x, dz = end.z - z;
  window.__kkp.pendingTeleport = { x, z, yaw: Math.atan2(-dx, -dz) };
});
await page.waitForTimeout(1200);

const promptBeforeCast = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt before casting:', promptBeforeCast);

// cast (0.8s nominal duration — headless SwiftShader runs far under 60fps and
// dt clamps to 0.05/frame, so a real hold needs roughly 2.4x the nominal time)
await page.keyboard.down('KeyE');
await page.waitForTimeout(2200);
await page.keyboard.up('KeyE');
await page.waitForTimeout(300);
const afterCast = await page.evaluate(() => ({ phase: window.__kkfish.phase, nodeId: window.__kkfish.nodeId, prompt: window.__kk.getState().prompt }));
console.log('after cast:', JSON.stringify(afterCast));

// press E again immediately (should do nothing — still waiting)
await page.keyboard.down('KeyE');
await page.waitForTimeout(200);
await page.keyboard.up('KeyE');
const stillWaiting = await page.evaluate(() => ({ phase: window.__kkfish.phase, fish: window.__kk.getState().inventory.fish ?? 0 }));
console.log('still waiting, no fish granted early:', JSON.stringify(stillWaiting));

// force the bite (skip the random wait for a deterministic test) and react
// immediately — BITE_WINDOW is only 900ms of real wall-clock time, so every
// extra round-trip before pressing E eats into the budget
await page.evaluate(() => { window.__kkfish.nextEventAt = performance.now() - 1; });
await page.keyboard.down('KeyE');
await page.waitForTimeout(400);
await page.keyboard.up('KeyE');
await page.waitForTimeout(150);
const caught = await page.evaluate(() => ({
  phase: window.__kkfish.phase,
  fish: window.__kk.getState().inventory.fish ?? 0,
  fishingXp: window.__kk.getState().xp.fishing,
}));
console.log('after reacting to the bite:', JSON.stringify(caught));

// second cycle: this time let the window expire (miss) — screenshot the
// bite meter mid-window first
await page.evaluate(() => { window.__kkfish.nextEventAt = performance.now() - 1; });
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/560_fishing_bite.png` });
await page.evaluate(() => { window.__kkfish.biteDeadline = performance.now() - 1; });
await page.waitForTimeout(300);
const missed = await page.evaluate(() => ({
  phase: window.__kkfish.phase,
  fish: window.__kk.getState().inventory.fish ?? 0,
}));
console.log('after missing the window (fish count should be unchanged):', JSON.stringify(missed));

// walk far away — the line should reset
await page.evaluate(() => { window.__kkfish.nextEventAt = performance.now() - 1; });
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 0, z: 0, yaw: 0 }; });
await page.waitForTimeout(500);
const walkedAway = await page.evaluate(() => ({ phase: window.__kkfish.phase, nodeId: window.__kkfish.nodeId }));
console.log('after walking away (should reset to idle):', JSON.stringify(walkedAway));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
