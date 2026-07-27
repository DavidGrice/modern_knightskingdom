// K53: all four legs must resolve, uppers AND lowers
import { chromium } from 'playwright-core';
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 160)));
page.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url().slice(-40)); });
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 }); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO', { timeout: 15000 }); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(11000);
// the rigged prop cache is module-level; read the horse's resolved roles
const roles = await page.evaluate(async () => {
  const m = await import('/_next/static/chunks/app/page.js').catch(() => null);
  return null;
});
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4) : 'none');
await b.close();
