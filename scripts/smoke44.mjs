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

// ---- horse seat position ----
await page.evaluate(() => {
  const h = window.__kkhorses.horse0;
  h.x = window.__kkp.x; h.z = window.__kkp.z - 2.5; h.tx = h.x; h.tz = h.z; h.pause = 30;
});
await page.waitForTimeout(600);
await page.keyboard.down('KeyE');
await page.waitForTimeout(450);
await page.keyboard.up('KeyE');
await page.waitForTimeout(500);
await page.keyboard.press('KeyV'); // third person to see the seat
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/610_horse_seat.png` });
console.log('riding:', await page.evaluate(() => window.__kkr.active));
await page.keyboard.down('KeyE');
await page.waitForTimeout(450);
await page.keyboard.up('KeyE');
await page.waitForTimeout(300);

// ---- on-foot sprint drains stamina ----
await page.evaluate(() => { window.__kkc.stamina = window.__kkc.maxStamina; });
const staminaBefore = await page.evaluate(() => window.__kkc.stamina);
await page.keyboard.down('KeyW');
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(1500);
const staminaDuring = await page.evaluate(() => ({ stamina: window.__kkc.stamina, sprinting: window.__kkc.sprinting }));
await page.keyboard.up('ShiftLeft');
await page.keyboard.up('KeyW');
console.log('stamina before/during a 1.5s on-foot sprint (expect a real drop):', staminaBefore, JSON.stringify(staminaDuring));

// holding shift while NOT moving should not drain stamina
await page.evaluate(() => { window.__kkc.stamina = window.__kkc.maxStamina; });
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(800);
const staminaStill = await page.evaluate(() => window.__kkc.stamina);
await page.keyboard.up('ShiftLeft');
console.log('stamina after holding Shift while stationary (expect ~unchanged, ~100):', staminaStill);

// ---- template-world edge doesn't drop the player ----
await page.evaluate(() => {
  window.__kk.getState().travelTo('template-05'); // "The Rival Castle" — a hillside with real vertical relief
});
await page.waitForTimeout(2000);
const beforeSprint = await page.evaluate(() => window.__kkp.y);
await page.keyboard.down('KeyW');
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(3000);
await page.keyboard.up('ShiftLeft');
await page.keyboard.up('KeyW');
const afterSprint = await page.evaluate(() => window.__kkp.y);
console.log('player world-Y before/after sprinting toward a template-world edge (expect no huge negative drop):', beforeSprint.toFixed(2), afterSprint.toFixed(2));
await page.screenshot({ path: `${OUT}/611_template_edge.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
