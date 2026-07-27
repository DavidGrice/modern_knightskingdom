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

// ---- Options: keybind rebind + reset, graphics preset, colorblind toggle ----
await page.click('text=Options');
await page.waitForSelector('text=Keybinds', { timeout: 8000 });
console.log('default interact bind:', await page.evaluate(() => window.localStorage.getItem('kk_settings')));

// rebind "Interact / Hold to Gather" from E to F
const interactRow = page.locator('.opt-row', { hasText: 'Interact / Hold to Gather' });
await interactRow.locator('button').click();
await page.keyboard.press('KeyF');
await page.waitForTimeout(200);
const rebound = await page.evaluate(() => JSON.parse(window.localStorage.getItem('kk_settings')).keybinds.interact);
console.log('interact rebound to KeyF:', rebound === 'KeyF', rebound);

// reset to default restores it
await page.click('text=Reset to Default');
await page.waitForTimeout(200);
const resetBack = await page.evaluate(() => JSON.parse(window.localStorage.getItem('kk_settings')).keybinds.interact);
console.log('reset-to-default restores KeyE:', resetBack === 'KeyE', resetBack);

// graphics quality preset
await page.click('button:has-text("Low")');
await page.waitForTimeout(150);
const lowQ = await page.evaluate(() => JSON.parse(window.localStorage.getItem('kk_settings')).graphicsQuality);
console.log('graphics quality set to low:', lowQ === 'low', lowQ);
await page.click('button:has-text("High")');

// colorblind toggle
const cbRow = page.locator('.opt-row', { hasText: 'Colorblind' });
await cbRow.locator('input[type=checkbox]').click();
await page.waitForTimeout(150);
const cb = await page.evaluate(() => JSON.parse(window.localStorage.getItem('kk_settings')).colorblindMode);
console.log('colorblind mode toggled on:', cb === true, cb);
await cbRow.locator('input[type=checkbox]').click(); // leave it off again

await page.click('button:has-text("Back")');
await page.waitForSelector('text=New Journey', { timeout: 8000 });

// ---- into a game: stats counters + photo mode ----
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(1200);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

const statsBefore = await page.evaluate(() => window.__kk.getState().stats);
console.log('stats before any action:', JSON.stringify(statsBefore));

// confirm the hold-E gather actually makes progress in real time (the full
// 1.6s chop takes several real seconds under headless SwiftShader — already
// separately confirmed frame-by-frame; here just prove it starts moving)
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 7, z: 37, yaw: 0 }; });
await page.waitForTimeout(400);
await page.keyboard.down('KeyE');
await page.waitForTimeout(1200);
const progressMidHold = await page.evaluate(() => window.__kk.getState().actionProgress);
await page.keyboard.up('KeyE');
await page.waitForTimeout(300);
console.log('gather progress partway through a real hold (expect >0, <1):', progressMidHold);

// exercise harvestNode/addItems -> resourcesGathered directly (store logic,
// same call the completed hold above would have made) rather than waiting
// out several more real seconds of a slow headless hold to finish it
await page.evaluate(() => window.__kk.getState().harvestNode('grove0'));
const invAfterChop = await page.evaluate(() => window.__kk.getState().inventory);
console.log('inventory after a full chop (expect wood):', JSON.stringify(invAfterChop));

// walk briefly + let the 4s stats-flush interval fire so distance/playtime land
await page.keyboard.down('KeyW');
await page.waitForTimeout(1200);
await page.keyboard.up('KeyW');
await page.waitForTimeout(4500);
const statsAfter = await page.evaluate(() => window.__kk.getState().stats);
console.log('stats after gather+walk (expect resourcesGathered>0, distanceMeters>0, playtimeSec>0):', JSON.stringify(statsAfter));

// open the Stats page via the pause menu and confirm the numbers render
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.click('text=Stats');
await page.waitForTimeout(300);
const statsPageText = await page.evaluate(() => document.body.innerText);
console.log('Stats page shows "Resources Gathered":', statsPageText.includes('Resources Gathered'));
await page.screenshot({ path: `${OUT}/630_stats.png` });
await page.click('button:has-text("Back")');
await page.waitForTimeout(300);
await page.keyboard.press('Escape'); // unpause

// ---- photo mode: HUD hides, free-fly moves the camera ----
await page.waitForTimeout(300);
const yBefore = await page.evaluate(() => window.__kkp.y);
await page.keyboard.press('KeyP');
await page.waitForTimeout(300);
const hudHiddenCheck = await page.evaluate(() => !document.querySelector('.hud-topleft'));
console.log('HUD chrome hidden in photo mode:', hudHiddenCheck);
await page.keyboard.down('Space');
await page.waitForTimeout(1000);
await page.keyboard.up('Space');
const yAfterFly = await page.evaluate(() => window.__kkp.y);
console.log('photo mode free-fly moved camera upward (before/after):', yBefore.toFixed(2), yAfterFly.toFixed(2));
await page.screenshot({ path: `${OUT}/631_photomode.png` });
await page.keyboard.press('KeyP');
await page.waitForTimeout(200);
const hudBackCheck = await page.evaluate(() => !!document.querySelector('.hud-topleft'));
console.log('HUD chrome restored after exiting photo mode:', hudBackCheck);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
