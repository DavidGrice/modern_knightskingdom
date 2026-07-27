// Phase 8 verification: merchant shop (sell/buy through the UI) + deeds.
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
await page.waitForTimeout(6500);

// daytime + goods, teleport near the merchant
await page.evaluate(() => {
  window.__kkenv.time = 0.5;
  window.__kk.getState().addItems({ wood: 10, fish: 4 });
  window.__kkc.teleportTo = [14, 23];
});
await page.waitForTimeout(800);
// face him (-Z) and approach
await page.keyboard.down('KeyW');
await page.waitForTimeout(400);
await page.keyboard.up('KeyW');
await page.waitForTimeout(300);
const prompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt near merchant:', prompt);
await page.keyboard.down('KeyE');
await page.waitForTimeout(500);
await page.keyboard.up('KeyE');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/97_shop.png` });

// sell all wood (10 x 1g), sell all fish (4 x 3g) => 22 gold
await page.locator('.recipe-row', { hasText: 'Wood Log' }).locator('button', { hasText: 'All' }).click();
await page.waitForTimeout(300);
await page.locator('.recipe-row', { hasText: 'Raw Fish' }).locator('button', { hasText: 'All' }).click();
await page.waitForTimeout(300);
let gold = await page.evaluate(() => window.__kk.getState().inventory.gold ?? 0);
console.log('gold after selling:', gold, '(expect 22)');

// buy bolts (6g) and planks (7g)
await page.locator('.recipe-row', { hasText: 'Crossbow Bolt' }).locator('button', { hasText: 'Buy' }).click();
await page.waitForTimeout(250);
await page.locator('.recipe-row', { hasText: 'Plank' }).locator('button', { hasText: 'Buy' }).click();
await page.waitForTimeout(300);
const after = await page.evaluate(() => ({
  gold: window.__kk.getState().inventory.gold,
  bolts: window.__kk.getState().inventory.bolt,
  planks: window.__kk.getState().inventory.plank,
}));
console.log('after buying:', JSON.stringify(after), '(expect gold 9, bolts 4, planks 2)');
await page.screenshot({ path: `${OUT}/98_shop_after.png` });
await page.keyboard.press('Escape');

// merchant leaves at night
await page.evaluate(() => { window.__kkenv.time = 0.9; });
await page.waitForTimeout(600);
const nightPrompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('merchant prompt at night:', nightPrompt, '(expect null/other)');

// deeds: chop-simulate + gold deed via state, wait for checker
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addXp('woodcutting', 10);
  st.addItems({ gold: 60 });
});
await page.waitForTimeout(5200);
const deeds = await page.evaluate(() => window.__kk.getState().deeds);
console.log('deeds earned:', JSON.stringify(deeds));
await page.keyboard.press('KeyK');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/99_deeds.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
