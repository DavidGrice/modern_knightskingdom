// Drives the game in headless Chrome: auth -> menu -> character creator -> world -> build mode.
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
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/01_auth.png` });

// register a fresh user
const user = 'sir' + Math.floor(Math.random() * 100000);
await page.click('text=Create Account');
await page.fill('input:not([type=password])', user);
await page.fill('input[type=password]', 'squire1');
await page.click('text=Swear the Oath');
await page.waitForSelector('text=New Journey', { timeout: 10000 });
await page.screenshot({ path: `${OUT}/02_menu.png` });

// options stack
await page.click('text=⚙ Options');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/03_options.png` });
await page.click('text=Back');

// credits stack
await page.click('text=📜 Credits');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04_credits.png` });
await page.click('text=Back');

// character creator
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 10000 });
await page.waitForTimeout(4000); // minifig OBJ + palette load
await page.screenshot({ path: `${OUT}/05_creator.png` });
// cycle head, pick some colors
await page.locator('.arrow-btn').nth(1).click();
await page.locator('.swatch').nth(6).click();
await page.fill('input[placeholder=Wanderer]', 'Galahad');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/06_creator_custom.png` });

// enter the world
await page.click('text=Begin the Journey');
await page.waitForTimeout(8000); // world assets
await page.screenshot({ path: `${OUT}/07_world.png` });

// panels
await page.keyboard.press('KeyJ');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/08_quests.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('KeyC');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/09_crafting.png` });
await page.keyboard.press('Escape');

// build mode
await page.keyboard.press('KeyB');
await page.waitForTimeout(2500);
await page.mouse.move(720, 420);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/10_build.png` });

// look around + walk forward a bit in fps (after leaving build mode)
await page.keyboard.press('KeyB');
await page.waitForTimeout(800);
await page.keyboard.down('KeyW');
await page.waitForTimeout(1600);
await page.keyboard.up('KeyW');
await page.screenshot({ path: `${OUT}/11_world_walked.png` });

console.log('CONSOLE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
