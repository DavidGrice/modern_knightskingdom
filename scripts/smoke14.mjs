// Verify: locked recipes visible (iron chain), sword/shield on the avatar,
// blocking shield in first person.
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

// fresh character: crafting panel must show the whole iron chain as locked
await page.keyboard.press('KeyC');
await page.waitForTimeout(600);
const rows = await page.locator('.recipe-row').count();
const ironVisible = await page.locator('.recipe-row', { hasText: 'Smelt Iron Bar' }).count();
const swordVisible = await page.locator('.recipe-row', { hasText: 'Knight Sword' }).count();
console.log('recipe rows:', rows, '| iron bar visible:', ironVisible, '| sword visible:', swordVisible);
await page.screenshot({ path: `${OUT}/103_locked_recipes.png` });
await page.keyboard.press('Escape');

// equip sword + shield, check the third-person knight
await page.evaluate(() => window.__kk.getState().addItems({ sword: 1, shield: 1 }));
await page.keyboard.press('KeyV');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/104_armed_avatar.png` });

// back to fps, hold RMB to raise the shield
await page.keyboard.press('KeyV');
await page.waitForTimeout(600);
await page.mouse.move(720, 450);
await page.mouse.down({ button: 'right' });
await page.waitForTimeout(700);
const blocking = await page.evaluate(() => window.__kkc.blocking);
console.log('blocking:', blocking);
await page.screenshot({ path: `${OUT}/105_block_shield.png` });
await page.mouse.up({ button: 'right' });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
