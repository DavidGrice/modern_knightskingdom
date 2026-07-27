// Farming verification: build plot -> plant -> grow -> harvest -> bake -> eat.
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

// build a plot + campfire just ahead of spawn
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ wood: 20, stone: 5 });
  st.placeBuilding('farmplot', 0, 22, 0);
  st.placeBuilding('campfire', -3, 24, 0);
});
await page.waitForTimeout(600);
// walk up to the plot and plant via E
await page.keyboard.down('KeyW');
await page.waitForTimeout(700);
await page.keyboard.up('KeyW');
await page.waitForTimeout(300);
let prompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('plot prompt:', prompt);
await page.keyboard.down('KeyE');
await page.waitForTimeout(500);
await page.keyboard.up('KeyE');
await page.waitForTimeout(500);
let plots = await page.evaluate(() => window.__kk.getState().plots);
console.log('after planting:', JSON.stringify(plots));
await page.screenshot({ path: `${OUT}/100_planted.png` });

// fast-forward growth, then check prompt + visuals
await page.evaluate(() => {
  const st = window.__kk.getState();
  const id = Object.keys(st.plots)[0];
  window.__kk.setState({ plots: { [id]: 1 } });
});
await page.waitForTimeout(2500); // ticker takes it to 0 -> ready notification
prompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('ripe prompt:', prompt);
await page.screenshot({ path: `${OUT}/101_ripe.png` });

// harvest (hold E)
await page.keyboard.down('KeyE');
await page.waitForTimeout(2400);
await page.keyboard.up('KeyE');
await page.waitForTimeout(500);
const wheat = await page.evaluate(() => ({
  wheat: window.__kk.getState().inventory.wheat ?? 0,
  farmXp: window.__kk.getState().xp.farming,
  plots: window.__kk.getState().plots,
}));
console.log('after harvest:', JSON.stringify(wheat));

// bake bread at the campfire (crafting panel near it)
await page.evaluate(() => { window.__kk.getState().addItems({ wheat: 2 }); });
await page.keyboard.press('KeyC');
await page.waitForTimeout(500);
await page.locator('.recipe-row', { hasText: 'Bake Bread' }).locator('button').first().click();
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
const bread = await page.evaluate(() => window.__kk.getState().inventory.bread ?? 0);
console.log('bread baked:', bread);

// get hurt, then eat the bread from the satchel
await page.evaluate(() => { window.__kkc.hp = 4; });
await page.keyboard.press('KeyI');
await page.waitForTimeout(500);
await page.locator('.inv-slot', { hasText: 'Fresh Bread' }).click();
await page.waitForTimeout(400);
const hp = await page.evaluate(() => window.__kkc.hp);
console.log('hp after eating bread:', hp, '(expect 8)');
await page.screenshot({ path: `${OUT}/102_ate_bread.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
