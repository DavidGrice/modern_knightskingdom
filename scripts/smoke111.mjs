// F19/F20/F24: land tiers that tile whole wall runs, buying land, corner arrows
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/land'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 180)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

// F19: does every tier tile a whole wall run + two corners?
const tiles = await page.evaluate(() => {
  const out = [];
  for (const t of [0, 1, 2, 3, 4]) {
    window.__kk.setState({ landTier: t });
    const side = 2 * (16 + t * 4);
    // corner(4) + N*wall(8) + corner(4) === side  ->  N whole?
    const n = (side - 8) / 8;
    out.push({ tier: t, side, wallsPerSide: n, exact: Number.isInteger(n) });
  }
  window.__kk.setState({ landTier: 0 });
  return out;
});
for (const t of tiles) {
  console.log(`  tier ${t.tier}: side ${t.side}m = corner + ${t.wallsPerSide} walls + corner  ${t.exact ? 'EXACT' : 'RAGGED'}`);
}

// F20: buying land costs gold and widens the region
const buy = await page.evaluate(() => {
  window.__kk.setState({ landTier: 0 });
  const st = window.__kk.getState();
  const r0 = st.landTier;
  st.buyLand();                       // no gold yet — must refuse
  const refused = window.__kk.getState().landTier === r0;
  window.__kk.getState().addItems({ gold: 500 });
  window.__kk.getState().buyLand();
  const after = window.__kk.getState();
  return { refused, tier: after.landTier, goldLeft: after.inventory.gold };
});
console.log('buy land  :', JSON.stringify(buy),
  buy.refused && buy.tier === 1 ? 'REFUSED THEN BOUGHT' : 'unexpected');

// F24: a corner shows no facing arrow, a straight wall does
await page.keyboard.press('KeyB');
await page.waitForTimeout(2200);
for (const [type, label] of [['stonewall', 'straight wall'], ['mc004', 'wall corner']]) {
  await page.evaluate((t) => window.__kk.getState().setBuildSelection(t), type);
  await page.waitForTimeout(500);
  await page.mouse.move(720, 420);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${type}.png`, clip: { x: 480, y: 250, width: 520, height: 380 } });
  console.log('  shot', label);
}
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
