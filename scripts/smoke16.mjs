// LEGO-asset pass verification: torch/quintain use original models; new
// fence/plant/war-cart buildables place and render.
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

// place one of everything new/reskinned in a display row ahead of spawn
await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ wood: 40, plank: 40, stone: 40, iron_bar: 10, flowers: 4 });
  window.__kk.setState({ unlocks: ['building2', 'mining', 'smithing'] });
  window.__kkenv.time = 0.85; // dusk-night so the torch glows
  st.placeBuilding('torch', -6, 20, 0);
  st.placeBuilding('quintain', -3, 20, 0);
  st.placeBuilding('fence', 0, 20, 0);
  st.placeBuilding('plant', 3, 20, 0);
  st.placeBuilding('warcart', 7, 20, 0);
  st.placeBuilding('bladecart', 12, 20, 0);
});
await page.waitForTimeout(4500); // models stream in
const placed = await page.evaluate(() => window.__kk.getState().buildings.map((b) => b.type));
console.log('placed:', JSON.stringify(placed));
await page.screenshot({ path: `${OUT}/110_lego_props_night.png` });

// daylight view
await page.evaluate(() => { window.__kkenv.time = 0.45; });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/111_lego_props_day.png` });

// quintain still trains (E) — walk up to it
await page.evaluate(() => { window.__kkc.teleportTo = [-3, 23]; });
await page.waitForTimeout(800);
const prompt = await page.evaluate(() => window.__kk.getState().prompt);
console.log('quintain prompt:', prompt);
await page.keyboard.down('KeyE');
await page.waitForTimeout(2600);
await page.keyboard.up('KeyE');
const xp = await page.evaluate(() => window.__kk.getState().xp.combat);
console.log('combat xp from new quintain:', xp);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/112_quintain_spun.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
