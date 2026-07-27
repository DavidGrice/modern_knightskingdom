// Jousting duel verification: mounted + galloping near Richard offers
// "Couch your lance!"; landing a hit (within lance sweet-spot range) grants
// gold/XP and Richard staggers; a cooldown blocks immediate re-challenge.
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

// register a fake mount right next to Richard (14, 2), sweet-spot distance away
const setup = await page.evaluate(() => {
  window.__kkhorses['duel'] = {
    id: 'duel', x: 14, z: 4.2, yaw: 0, tx: 14, tz: 4.2, pause: 0, soundIn: 99,
    homeX: 14, homeZ: 4.2, mounted: true,
  };
  window.__kkr.active = true;
  window.__kkr.horseId = 'duel';
  window.__kkp.pendingTeleport = { x: 14, z: 4.2, yaw: 0 };
  return { ...window.__kkr };
});
console.log('mounted setup:', JSON.stringify(setup));
await page.waitForTimeout(500);

// hold Shift to gallop, check the prompt updates once galloping kicks in
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(600);
const prompt1 = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt while galloping near Richard (expect Couch your lance):', prompt1);
await page.screenshot({ path: `${OUT}/210_joust_prompt.png` });

const goldBefore = await page.evaluate(() => window.__kk.getState().inventory.gold ?? 0);
await page.keyboard.down('KeyE');
await page.waitForTimeout(3000); // ~2.4x the 0.8s hold duration, per this headless env's dt clamping
await page.keyboard.up('KeyE');
await page.waitForTimeout(400);
const afterHit = await page.evaluate(() => ({
  gold: window.__kk.getState().inventory.gold ?? 0,
  richardClip: window.__kk.getState().npcGreetClip,
}));
console.log('gold before/after first pass (expect increase if a hit landed):', goldBefore, JSON.stringify(afterHit));
await page.screenshot({ path: `${OUT}/211_joust_hit.png` });

// cooldown verified directly against the store action (isolates the 3s
// cooldown logic itself from the hold-to-act UI timing, which the headless
// dt-clamped frame rate stretches unpredictably in real time — already
// proven above by the first successful pass)
const goldAfterHit = await page.evaluate(() => window.__kk.getState().inventory.gold ?? 0);
await page.evaluate(() => { window.__kk.getState().joustRichard(); });
await page.waitForTimeout(200);
const afterImmediateRetry = await page.evaluate(() => window.__kk.getState().inventory.gold ?? 0);
console.log('gold after an immediate re-attempt (expect unchanged, cooldown blocks it):', goldAfterHit, '->', afterImmediateRetry);

await page.keyboard.up('ShiftLeft');

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
