// final regression sweep: every panel the emoji→icon pass touched still
// renders, including the two sites that were inside template literals
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/sweep'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 200)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Begin the Journey'); await page.waitForTimeout(7000);

// a villager with real trade mastery exercises the Mastery line that used to
// be a broken template literal
await page.evaluate(() => {
  window.__kk.setState({
    villagers: [{ id: 'v1', name: 'Wilda', job: 'lumberjack', xp: 260, tradeXp: { lumberjack: 400, miner: 120 }, traits: [], gear: {} }],
    inventory: { ...window.__kk.getState().inventory, wood: 12, stone: 9, plank: 4 },
  });
});
for (const panel of ['villagers', 'crafting', 'quests', 'inventory']) {
  await page.evaluate((p) => window.__kk.getState().setPanel(p), panel);
  await page.waitForTimeout(1200);
  const bad = await page.evaluate(() => {
    const t = document.body.innerText;
    return { rawJsx: t.includes('<Ico') || t.includes('$<'), len: t.length };
  });
  console.log(panel, JSON.stringify(bad));
  await page.screenshot({ path: `${OUT}/${panel}.png` });
}
await page.evaluate(() => window.__kk.getState().setPanel('none'));
console.log('page errors:', errs.length ? errs : 'none');
await b.close();
