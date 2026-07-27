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

// ---- character creator: pose toggle + drag-to-rotate ----
await page.screenshot({ path: `${OUT}/550_creator_running.png` });
await page.click('text=Standing');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/551_creator_standing.png` });

// drag the preview
const box = await page.locator('.creator-preview').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/552_creator_dragged.png` });

await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// grant equipment so all slots have something real to show
await page.evaluate(() => {
  window.__kk.getState().addItems({ sword: 1, shield: 1, crossbow: 1, longbow: 1, bolt: 5, arrow: 5 }, 'grant');
});
await page.waitForTimeout(300);

// ---- equipment paperdoll ----
await page.keyboard.down('KeyI');
await page.waitForTimeout(300);
await page.keyboard.up('KeyI');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/553_paperdoll.png` });

const beforeWeapon = await page.evaluate(() => window.__kkc.weapon + '/' + window.__kkc.rangedWeapon);
console.log('active weapon before click:', beforeWeapon);

await page.click('.equip-tile:has-text("Longbow")');
await page.waitForTimeout(300);
const afterLongbow = await page.evaluate(() => window.__kkc.weapon + '/' + window.__kkc.rangedWeapon);
console.log('active weapon after clicking Longbow:', afterLongbow);
await page.screenshot({ path: `${OUT}/554_paperdoll_longbow.png` });

await page.click('.equip-tile:has-text("Sword")');
await page.waitForTimeout(300);
const afterSword = await page.evaluate(() => window.__kkc.weapon + '/' + window.__kkc.rangedWeapon);
console.log('active weapon after clicking Sword:', afterSword);

// drag the paperdoll preview too
const pbox = await page.locator('.equip-preview').boundingBox();
await page.mouse.move(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2);
await page.mouse.down();
await page.mouse.move(pbox.x + pbox.width / 2 - 100, pbox.y + pbox.height / 2, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/555_paperdoll_dragged.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 12) : 'none');
await browser.close();
