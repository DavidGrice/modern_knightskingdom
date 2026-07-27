// Reputation & titles verification: turning in a side quest (or jousting,
// for Richard) raises standing with that NPC; crossing a tier threshold
// grants a bonus and the dialogue panel shows the new title + progress.
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

// starting title should be the base (untiered) one
await page.evaluate(() => { window.__kk.getState().openDialogue('queen'); });
await page.waitForTimeout(200);
const before = await page.evaluate(() => document.querySelector('.game-panel')?.textContent?.slice(0, 120));
console.log('queen dialogue before any reputation (expect base title "Patron of the Homestead"):', before);
await page.evaluate(() => { window.__kk.getState().setPanel('none'); });

// simulate two errand turn-ins worth of reputation directly (15 each = 30,
// exactly the first tier threshold)
const goldBefore = await page.evaluate(() => window.__kk.getState().inventory.gold ?? 0);
await page.evaluate(() => {
  window.__kk.getState().addReputation('queen', 15);
  window.__kk.getState().addReputation('queen', 15);
});
const afterRep = await page.evaluate(() => ({
  rep: window.__kk.getState().reputation.queen,
  gold: window.__kk.getState().inventory.gold ?? 0,
}));
console.log('queen reputation after 30 pts (expect 30, gold +10 bonus):', JSON.stringify(afterRep), 'goldBefore:', goldBefore);

await page.evaluate(() => { window.__kk.getState().openDialogue('queen'); });
await page.waitForTimeout(200);
const afterTitle = await page.evaluate(() => document.querySelector('.game-panel')?.textContent?.slice(0, 160));
console.log('queen dialogue after reaching 30 rep (expect "Friend of the Court"):', afterTitle);
await page.screenshot({ path: `${OUT}/230_queen_reputation.png` });
await page.evaluate(() => { window.__kk.getState().setPanel('none'); });

// turning in a real errand should also raise reputation by 15 — accept
// first, then "gather" the flowers (source: 'gather' is what actually bumps
// the quest's progress counter; pre-existing inventory does not)
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.acceptSideQuest('queen', 'q_flowers');
  st.addItems({ flowers: 2 }, 'gather');
});
await page.waitForTimeout(200);
const repBeforeTurnIn = await page.evaluate(() => window.__kk.getState().reputation.queen);
await page.evaluate(() => { window.__kk.getState().turnInSideQuest(); });
const repAfterTurnIn = await page.evaluate(() => window.__kk.getState().reputation.queen);
console.log('queen reputation before/after turning in an errand (expect +15):', repBeforeTurnIn, '->', repAfterTurnIn);

// jousting Richard should raise HIS reputation too
await page.evaluate(() => {
  window.__kkhorses['duel'] = {
    id: 'duel', x: 14, z: 4.2, yaw: 0, tx: 14, tz: 4.2, pause: 0, soundIn: 99,
    homeX: 14, homeZ: 4.2, mounted: true,
  };
  window.__kkr.active = true;
  window.__kkr.horseId = 'duel';
  window.__kkp.pendingTeleport = { x: 14, z: 4.2, yaw: 0 };
});
await page.waitForTimeout(400);
const richardRepBefore = await page.evaluate(() => window.__kk.getState().reputation.richard ?? 0);
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(600);
await page.keyboard.down('KeyE');
await page.waitForTimeout(3000);
await page.keyboard.up('KeyE');
await page.keyboard.up('ShiftLeft');
await page.waitForTimeout(300);
const richardRepAfter = await page.evaluate(() => window.__kk.getState().reputation.richard ?? 0);
console.log('richard reputation before/after a jousting pass (expect an increase):', richardRepBefore, '->', richardRepAfter);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
