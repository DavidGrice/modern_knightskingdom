// E18: locked errands must NAME their blocker in the journal
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/allegiance'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 200)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

// swear to Cedric so his region shows, and open the journal
await page.evaluate(() => {
  window.__kk.setState({ alliance: 'cedric', allegiance: -5, completedSideQuests: [], sideQuest: null });
  window.__kk.getState().setPanel('quests');
});
await page.waitForTimeout(1200);
// expand the Rival Castle region
await page.evaluate(() => {
  const hdr = [...document.querySelectorAll('.quest-region-header')]
    .find((h) => /rival castle/i.test(h.textContent));
  hdr?.click();
});
await page.waitForTimeout(1000);
const seen = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.quest-entry')].map((r) => ({
    cls: r.className.replace('quest-entry ', ''),
    name: r.querySelector('.quest-entry-name')?.textContent?.trim().slice(0, 46),
    hint: r.querySelector('.quest-entry-hint')?.textContent?.trim().slice(0, 70),
  }));
  return rows.filter((r) => r.name && !/first steps|cozy|word from|stone age|forge ahead|audience|gone fishing|squire|knight|royal summons|paladin/i.test(r.name));
});
for (const r of seen) console.log(`  [${r.cls}] ${r.name}\n        -> ${r.hint}`);
await page.screenshot({ path: `${OUT}/locks.png`, clip: { x: 340, y: 300, width: 780, height: 460 } });
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close();
