// Dialogue-tree verification: one-time voiced lore intro (Continue/Skip),
// falls back to the existing flavor-line/quest UI after, persists across
// re-opens, and NPCs without lore lines (John) are unaffected.
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

async function approach(tx, tz, arrive = 2.2, tries = 14) {
  for (let i = 0; i < tries; i++) {
    const p = await page.evaluate(() => ({ ...window.__kkp }));
    const dx = tx - p.x;
    const dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    if (d < arrive) break;
    const desired = Math.atan2(-dx, -dz);
    let diff = desired - p.yaw;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > 0.12) {
      const key = diff > 0 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(key);
      await page.waitForTimeout(Math.min(900, Math.abs(diff) * 950));
      await page.keyboard.up(key);
    }
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(Math.min(1400, d * 320));
    await page.keyboard.up('KeyW');
  }
  await page.waitForTimeout(300);
}

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(2500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// Richard now stays hidden until forge_ahead completes (the world opens as a
// plain village) — seed that progress so this lore-dialogue test can reach him.
await page.evaluate(() => {
  window.__kk.setState({ completedQuests: ['first_steps', 'cozy_beginnings', 'stone_age', 'forge_ahead'] });
});

// walk to Richard (14, 2) and talk to him for real, via the E prompt
await approach(14, 2, 2.0);
const prompt1 = await page.evaluate(() => window.__kk.getState().prompt);
console.log('prompt at Richard:', prompt1);
await page.keyboard.down('KeyE');
await page.waitForTimeout(300);
await page.keyboard.up('KeyE');
await page.waitForTimeout(600);
const opened = await page.evaluate(() => ({
  panel: window.__kk.getState().panel,
  loreSeen: window.__kk.getState().loreSeen,
}));
console.log('after talking to Richard:', JSON.stringify(opened));
await page.screenshot({ path: `${OUT}/180_richard_lore1.png` });

// step through all 5 lore lines via Continue
for (let i = 0; i < 5; i++) {
  const btn = page.locator('.game-panel button', { hasText: /Continue|Finish/ });
  const label = await btn.textContent();
  console.log(`step ${i}: button says "${label}"`);
  await btn.click();
  await page.waitForTimeout(400);
}
const afterLore = await page.evaluate(() => ({
  loreSeen: window.__kk.getState().loreSeen,
  panelHTML: document.querySelector('.game-panel')?.textContent?.slice(0, 200),
}));
console.log('after finishing Richard lore:', JSON.stringify(afterLore));
await page.screenshot({ path: `${OUT}/181_richard_normal.png` });

// close and re-open: should go straight to normal flavor-line UI, no lore replay
await page.click('.panel-close');
await page.waitForTimeout(300);
await page.evaluate(() => { window.__kk.getState().openDialogue('richard'); });
await page.waitForTimeout(400);
const reopened = await page.evaluate(() => ({
  hasContinueBtn: !!Array.from(document.querySelectorAll('.game-panel button')).find((b) => /Continue|Finish/.test(b.textContent || '')),
}));
console.log('re-opened Richard, still shows lore controls (expect false):', reopened.hasContinueBtn);
await page.evaluate(() => { window.__kk.getState().setPanel('none'); });

// King Leo: open via store, test Skip button
await page.evaluate(() => { window.__kk.getState().openDialogue('king'); });
await page.waitForTimeout(400);
const kingBefore = await page.evaluate(() => window.__kk.getState().loreSeen.includes('king'));
console.log('king loreSeen before skip (expect false):', kingBefore);
await page.click('.game-panel button:has-text("Skip")');
await page.waitForTimeout(300);
const kingAfter = await page.evaluate(() => window.__kk.getState().loreSeen.includes('king'));
console.log('king loreSeen after skip (expect true):', kingAfter);
await page.screenshot({ path: `${OUT}/182_king_after_skip.png` });
await page.evaluate(() => { window.__kk.getState().setPanel('none'); });

// John of Mayne has no loreLines — dialogue should show the normal UI immediately
await page.evaluate(() => { window.__kk.getState().openDialogue('john'); });
await page.waitForTimeout(400);
const johnHasLore = await page.evaluate(() => !!Array.from(document.querySelectorAll('.game-panel button')).find((b) => /Continue|Finish|^Skip$/.test(b.textContent || '')));
console.log('John shows lore controls (expect false, no loreLines defined):', johnHasLore);

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
