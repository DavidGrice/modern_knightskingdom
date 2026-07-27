// J45/J46: the parts bin shows real catalogue pieces, build costs are a bill
// of those pieces, and resource grounds are bounded and gated by the deed
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const OUT = 'scripts/shots/econ'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=d3d11', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 110) + ' :: ' + String(e.stack).split(String.fromCharCode(10)).slice(1, 4).join(' | ')));
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-46)); });
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);

// nodes must all sit inside a named ground now
const nodes = await page.evaluate(() => {
  const ns = window.__kk.getState().nodes;
  const byGround = {};
  for (const n of ns) byGround[n.ground ?? '(none)'] = (byGround[n.ground ?? '(none)'] ?? 0) + 1;
  return { total: ns.length, byGround };
});

// give some materials, then open the satchel: it should show brick thumbs
await page.evaluate(() => {
  window.__kk.getState().addItems({ wood: 12, stone: 7, iron_ore: 3, fish: 2 }, 'grant');
});
await page.waitForTimeout(600);
await page.keyboard.press('KeyI');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/partsbin.png` });
const bin = await page.evaluate(() => ({
  bricks: document.querySelectorAll('.inv-slot.brick').length,
  thumbs: [...document.querySelectorAll('.brick-thumb')].map((i) => i.getAttribute('src')?.split('/').pop()),
  names: [...document.querySelectorAll('.inv-slot.brick .iname')].map((n) => n.textContent),
}));
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

// build view: the cost lines should carry piece thumbs
await page.keyboard.press('KeyB');
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/bill.png` });
const bill = await page.evaluate(() => ({
  costThumbs: document.querySelectorAll('.b-cost-thumb').length,
  costParts: document.querySelectorAll('.b-cost-part').length,
}));

// and a locked ground refuses to be worked
await page.keyboard.press('KeyB');
await page.waitForTimeout(900);
const locked = await page.evaluate(() => {
  const st = window.__kk.getState();
  const q = st.nodes.find((n) => n.ground === 'quarry');
  if (!q) return null;
  window.__kkp.pendingTeleport = { x: q.x + 1.2, z: q.z + 1.2, yaw: Math.atan2(1.2, 1.2) };
  return { tier: st.landTier, x: q.x, z: q.z };
});
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/locked_ground.png` });
const prompt = await page.evaluate(() => document.querySelector('.kk-prompt, .prompt, .interact-prompt')?.textContent ?? null);
console.log('nodes:', JSON.stringify(nodes));
console.log('bin:', JSON.stringify(bin));
console.log('bill:', JSON.stringify(bill), 'locked:', JSON.stringify(locked), 'prompt:', prompt);
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 5) : 'none');
await b.close();
