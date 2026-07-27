// L67: a defender told to patrol must stand down by day
import { chromium } from 'playwright-core';
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=900,600', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 140)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
await page.evaluate(() => {
  window.__kk.setState({ villagers: [{ id: 'g1', name: 'Watchman', job: 'defender', level: 2 }] });
  window.__kkorders.order = 'patrol';
});
await page.waitForTimeout(3000);
async function sample(label, time) {
  await page.evaluate((t) => { window.__kkenv.time = t; window.__kk.getState().setTimeOfDay(t); }, time);
  await page.waitForTimeout(2500);
  const a = await page.evaluate(() => { const d = window.__kkdefenders.g1; return [d.x, d.z]; });
  await page.waitForTimeout(4000);
  const c = await page.evaluate(() => { const d = window.__kkdefenders.g1; return [d.x, d.z]; });
  const moved = Math.hypot(c[0] - a[0], c[1] - a[1]);
  console.log(label, 'moved', moved.toFixed(2), 'm in 4s');
  return moved;
}
const day = await sample('DAY 09:00 patrol', 9 / 24);
await page.evaluate(() => { window.__kkorders.order = 'attack'; });
const dayAttack = await sample('DAY 09:00 attack', 9 / 24);
await page.evaluate(() => { window.__kkorders.order = 'patrol'; });
const night = await sample('NIGHT 23:00', 23 / 24);
console.log(day < 1 ? 'PASS: patrol stands down by day' : 'FAIL: still patrolling by day');
console.log(dayAttack < 1 ? 'PASS: attack order also stands down by day' : 'FAIL: attack order patrols by day');
console.log(night > 1 ? 'PASS: walks the rounds at night' : 'FAIL: idle at night');
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 3) : 'none');
await b.close();
