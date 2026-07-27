// Villager recruitment verification: arrival threshold, job assignment,
// passive production delivery, and the roster panel (N).
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

// no villagers yet, and requirement not met -> arrival check is a no-op
const before = await page.evaluate(() => {
  window.__kk.getState().checkVillagerArrival();
  return window.__kk.getState().villagers.length;
});
console.log('villagers before any beds/buildings:', before, '(expect 0)');

// build 1 bed + enough other structures to meet villagerRequirement(1) = {beds:1, buildings:5}
const setup = await page.evaluate(() => {
  const st = window.__kk.getState();
  st.addItems({ wood: 30, plank: 30, stone: 10, flowers: 5 });
  st.placeBuilding('bed', -10, 20, 0);
  st.placeBuilding('campfire', -6, 20, 0);
  st.placeBuilding('workbench', -2, 20, 0);
  st.placeBuilding('barrel', 2, 20, 0);
  st.placeBuilding('flowerbed', 6, 20, 0);
  return { buildings: window.__kk.getState().buildings.length };
});
console.log('buildings placed:', setup.buildings, '(expect 5)');

const arrival = await page.evaluate(() => {
  window.__kk.getState().checkVillagerArrival();
  return window.__kk.getState().villagers;
});
console.log('villagers after requirement met:', JSON.stringify(arrival));

// second call shouldn't double-spawn without a second bed
const noDouble = await page.evaluate(() => {
  window.__kk.getState().checkVillagerArrival();
  return window.__kk.getState().villagers.length;
});
console.log('villager count after repeat check (no 2nd bed):', noDouble, '(expect 1)');

// assign the villager to lumberjack, then fast-forward past one trip
const villagerId = arrival[0]?.id;
const assignResult = await page.evaluate((id) => {
  window.__kk.getState().assignJob(id, 'lumberjack');
  return window.__kk.getState().villagers.find((v) => v.id === id)?.job;
}, villagerId);
console.log('assigned job:', assignResult, '(expect lumberjack)');

const woodBefore = await page.evaluate(() => window.__kk.getState().inventory.wood ?? 0);
const delivery = await page.evaluate(() => {
  window.__kk.getState().tickVillagers(46); // lumberjack trip = 45s
  return window.__kk.getState().inventory.wood ?? 0;
});
console.log('wood before/after one delivery:', woodBefore, '->', delivery, '(expect +2)');

// second delivery after another full trip
const delivery2 = await page.evaluate(() => {
  window.__kk.getState().tickVillagers(45);
  return window.__kk.getState().inventory.wood ?? 0;
});
console.log('wood after second delivery:', delivery2, '(expect +2 more)');

// open the roster panel (N) and screenshot it
await page.keyboard.press('KeyN');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/130_villager_roster.png` });
const rosterText = await page.locator('.game-panel').innerText();
console.log('roster panel mentions job label:', rosterText.includes('Lumberjack'));
await page.keyboard.press('Escape');

// visual: walk to the homestead and see the villager wandering
await page.evaluate(() => { window.__kkc.teleportTo = [-4, 24]; });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/131_villager_in_world.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
