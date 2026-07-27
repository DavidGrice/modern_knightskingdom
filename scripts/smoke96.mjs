// A7: a villager must not arrive until the beds are actually BUILT
import { chromium } from 'playwright-core';
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(8000);

const mk = (id, type, built) => ({ id, type, x: 0, z: 0, rot: 0, y: 0, world: null, built });

// requirement for villager #1 is 1 bed + 5 structures. Place them ALL as
// unfinished construction sites first.
const unbuilt = await page.evaluate((mkSrc) => {
  const mk = eval(`(${mkSrc})`);
  window.__kk.setState({
    villagers: [],
    buildings: [mk('b1', 'bed', 0.2), mk('b2', 'torch', 0.2), mk('b3', 'barrel', 0.2), mk('b4', 'stockpile', 0.2), mk('b5', 'torch', 0.2)],
  });
  window.__kk.getState().checkVillagerArrival();
  return window.__kk.getState().villagers.length;
}, mk.toString());
console.log('villagers with only construction sites:', unbuilt, unbuilt === 0 ? 'OK' : 'BUG — arrived early');

const built = await page.evaluate((mkSrc) => {
  const mk = eval(`(${mkSrc})`);
  window.__kk.setState({
    villagers: [],
    buildings: [mk('b1', 'bed', 1), mk('b2', 'torch', 1), mk('b3', 'barrel', 1), mk('b4', 'stockpile', 1), mk('b5', 'torch', 1)],
  });
  window.__kk.getState().checkVillagerArrival();
  return window.__kk.getState().villagers.length;
}, mk.toString());
console.log('villagers once everything is built:  ', built, built === 1 ? 'OK' : 'BUG — did not arrive');

// and a finished bed that is still short on structures must not summon anyone
const partial = await page.evaluate((mkSrc) => {
  const mk = eval(`(${mkSrc})`);
  window.__kk.setState({ villagers: [], buildings: [mk('b1', 'bed', 1), mk('b2', 'torch', 0.5)] });
  window.__kk.getState().checkVillagerArrival();
  return window.__kk.getState().villagers.length;
}, mk.toString());
console.log('villagers with 1 bed, too few built: ', partial, partial === 0 ? 'OK' : 'BUG');
await b.close();
