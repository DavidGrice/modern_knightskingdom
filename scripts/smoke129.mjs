// pointer lock must come BACK on its own after a panel closes
import { chromium } from 'playwright-core';
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=900,600', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 120)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey'); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO'); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(9000);
// headless has no real pointer lock, so watch the INTENT: the controller must
// keep asking while the game is in play, and stop while a panel is open
const trace = await page.evaluate(async () => {
  const log = [];
  const el = document.querySelector('canvas');
  const orig = el.requestPointerLock.bind(el);
  el.requestPointerLock = () => { log.push('request@' + Date.now()); return orig(); };
  const st = window.__kk.getState();
  st.setPanel('inventory');
  await new Promise((r) => setTimeout(r, 500));
  const during = log.length;
  st.setPanel('none');
  await new Promise((r) => setTimeout(r, 1200));
  return { during, after: log.length };
});
console.log('requests while panel open:', trace.during, '| after closing it:', trace.after);
console.log(trace.after > trace.during ? 'PASS: the lock is re-taken on its own' : 'FAIL: nothing asked for it back');
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 3) : 'none');
await b.close();
