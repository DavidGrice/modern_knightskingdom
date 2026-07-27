import { chromium } from 'playwright-core';
const OUT = 'scripts/shots';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(1500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// before meeting anyone: all entries should be locked
await page.keyboard.down('KeyL');
await page.waitForTimeout(300);
await page.keyboard.up('KeyL');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/540_chronicle_locked.png` });
const lockedText = await page.evaluate(() => document.body.innerText.includes('Not yet recorded'));
console.log('shows locked placeholder before meeting anyone:', lockedText);

const panelOpen1 = await page.evaluate(() => window.__kk.getState().panel);
console.log('panel after L:', panelOpen1);
await page.keyboard.down('KeyL');
await page.waitForTimeout(200);
await page.keyboard.up('KeyL');
await page.waitForTimeout(300);
const panelClosed = await page.evaluate(() => window.__kk.getState().panel);
console.log('panel after L again (toggle closed):', panelClosed);

// unlock Leo's lore directly (bypasses the quest grind — isolates the Chronicle UI)
await page.evaluate(() => {
  window.__kk.setState({ loreSeen: ['king'] });
});
await page.keyboard.down('KeyL');
await page.waitForTimeout(300);
await page.keyboard.up('KeyL');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/541_chronicle_leo_recorded.png` });

const summary = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    hasLeoLine: text.includes('Do you like my castle'),
    hasLockedForOthers: text.includes('Not yet recorded'),
    recordedCounter: (text.match(/Recorded: \d+ \/ \d+ lines/) || [])[0],
  };
});
console.log('after unlocking Leo:', JSON.stringify(summary));

// click a replay button — just verify no crash / page error, audio itself
// isn't asserted in headless (no reliable way to sample output here)
const replayBtn = await page.$('text=▶');
console.log('replay button found:', !!replayBtn);
if (replayBtn) await replayBtn.click();
await page.waitForTimeout(300);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
