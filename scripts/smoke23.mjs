// Knight/Paladin ceremony verification: triggers on rank-up (not lower
// ranks), freezes movement, teleports to King Leo, plays his gesture clips
// and the player's regal wave, shows the banner, then cleanly ends with the
// capstone notification — and does NOT re-trigger for a later rank-up in
// the same session once already knighted.
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

// set up: one level short of Knight (total 15), knights_arms already "done"
const before = await page.evaluate(() => {
  const st = window.__kk.getState();
  window.__kk.setState({
    xp: { ...st.xp, building: 50 * 15 * 15 },
    completedQuests: ['knights_arms'],
  });
  return { total: 15, ceremony: window.__kk.getState().ceremony };
});
console.log('setup:', JSON.stringify(before));

// push over the threshold — should trigger the Knight ceremony
await page.evaluate(() => { window.__kk.getState().addXp('combat', 60); });
await page.waitForTimeout(200);
const justAfter = await page.evaluate(() => ({
  ceremony: window.__kk.getState().ceremony,
  panel: window.__kk.getState().panel,
  cameraMode: window.__kk.getState().cameraMode,
  p: { ...window.__kkp },
}));
console.log('immediately after crossing threshold:', JSON.stringify(justAfter));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/190_ceremony_start.png` });

// mid-sequence: King should be mid-gesture
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/191_ceremony_gesture.png` });

// after the gesture window, player's own regal wave should have fired
await page.waitForTimeout(700);
const midEmote = await page.evaluate(() => window.__kk.getState().emote);
console.log('player emote after ~3.1s (expect regalwave):', JSON.stringify(midEmote));
await page.screenshot({ path: `${OUT}/192_ceremony_playerwave.png` });

// wait for the ceremony to fully end
await page.waitForTimeout(2600);
const ended = await page.evaluate(() => ({
  ceremony: window.__kk.getState().ceremony,
  rank: (() => {
    const s = window.__kk.getState();
    return s.completedQuests.includes('knights_arms') ? 'has knights_arms' : 'missing';
  })(),
}));
console.log('after ~5.9s total, ceremony should be null:', JSON.stringify(ended));
await page.screenshot({ path: `${OUT}/193_ceremony_end.png` });

// verify movement was frozen during the ceremony: re-run the whole thing and
// try to walk during it, confirm position barely changes
// building=26 + combat=1 (from the first ceremony's addXp) = total 27, one short of Paladin's 28
await page.evaluate(() => {
  const st = window.__kk.getState();
  window.__kk.setState({ xp: { ...st.xp, building: 50 * 26 * 26 }, completedQuests: ['knights_arms', 'paladins_keep'] });
});
const posBefore = await page.evaluate(() => ({ ...window.__kkp }));
await page.evaluate(() => { window.__kk.getState().addXp('mining', 200); });
await page.waitForTimeout(300);
const rankNow = await page.evaluate(() => window.__kk.getState().ceremony);
console.log('second ceremony (Paladin) started:', JSON.stringify(rankNow));
await page.keyboard.down('KeyW');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyW');
const posDuring = await page.evaluate(() => ({ ...window.__kkp }));
const moved = Math.hypot(posDuring.x - posBefore.x, posDuring.z - posBefore.z);
console.log('moved while frozen (expect near 0, well under normal ~4-6m for 1.5s of W):', moved.toFixed(2));
await page.waitForTimeout(4500);
const doneAll = await page.evaluate(() => window.__kk.getState().ceremony);
console.log('paladin ceremony ended:', JSON.stringify(doneAll));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
