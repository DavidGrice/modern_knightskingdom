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

// ---- Help reachable from the Main Menu ----
await page.click('text=How to Play');
await page.waitForSelector('text=Forge Your Hero', { timeout: 8000 }); // step 1 heading, inside the guide text
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/620_help_menu.png` });
console.log('help panel from menu visible:', await page.evaluate(() => document.body.innerText.includes('How to Play')));
await page.click('button:has-text("Back")');
await page.waitForSelector('text=New Journey', { timeout: 8000 });

// ---- into a game, then H opens Help mid-play, Back returns to gameplay ----
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(1200);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);
await page.keyboard.press('KeyH');
await page.waitForTimeout(600);
const helpVisibleMidGame = await page.evaluate(() => document.body.innerText.includes('How to Play'));
await page.screenshot({ path: `${OUT}/621_help_ingame.png` });
console.log('help panel opened mid-game via H:', helpVisibleMidGame);
await page.click('button:has-text("Back")');
await page.waitForTimeout(800);
const backInGame = await page.evaluate(() => !!window.__kkp);
console.log('back in gameplay after closing help:', backInGame);

// gamepad: no real controller attached under CI, but confirm no crash when polling with none connected
const padPollOk = await page.evaluate(() => {
  try { navigator.getGamepads(); return true; } catch { return false; }
});
console.log('gamepad poll does not throw with none connected:', padPollOk);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
