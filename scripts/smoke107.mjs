// Block E: the allegiance axis, its gates, and the house-banner meter
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

// --- the axis itself -------------------------------------------------------
const tiers = await page.evaluate(() => {
  const st = window.__kk.getState();
  const out = [];
  for (const v of [-100, -70, -40, -15, 0, 15, 40, 70, 100]) {
    window.__kk.setState({ allegiance: v });
    out.push(v);
  }
  window.__kk.setState({ allegiance: 0 });
  return { start: st.allegiance, probed: out };
});
console.log('axis probe:', JSON.stringify(tiers));

// --- deltas apply on turn-in, and gates hold -------------------------------
const gate = await page.evaluate(() => {
  const st = window.__kk.getState();
  window.__kk.setState({ allegiance: 0, completedSideQuests: [], sideQuest: null });
  const r = {};
  // a gated errand refuses while unsworn…
  window.__kk.getState().acceptSideQuest('cedric', 'ced_banner');
  r.gatedWhileUnsworn = window.__kk.getState().sideQuest === null;
  // …and a chained errand refuses before its precursor
  window.__kk.getState().acceptSideQuest('cedric', 'ced_road');
  r.chainedBeforePrecursor = window.__kk.getState().sideQuest === null;
  // the opener is available
  window.__kk.getState().acceptSideQuest('cedric', 'ced_iron');
  r.openerAccepted = window.__kk.getState().sideQuest?.questId === 'ced_iron';
  return r;
});
console.log('gates     :', JSON.stringify(gate));

// --- finishing an errand moves the axis ------------------------------------
const shift = await page.evaluate(() => {
  const before = window.__kk.getState().allegiance;
  window.__kk.getState().addItems({ iron_bar: 4 });
  window.__kk.setState({ sideQuest: { npcId: 'cedric', questId: 'ced_iron', have: 99 } });
  window.__kk.getState().turnInSideQuest();
  const st = window.__kk.getState();
  return { before, after: st.allegiance, recorded: st.completedSideQuests.includes('ced_iron') };
});
console.log('turn-in   :', JSON.stringify(shift),
  shift.after < shift.before ? 'MOVED TOWARD THE BULL' : 'no shift');

// --- neutral village work must NOT move it ---------------------------------
const neutral = await page.evaluate(() => {
  const before = window.__kk.getState().allegiance;
  window.__kk.getState().addItems({ plank: 9 });
  window.__kk.setState({ sideQuest: { npcId: 'miller_beda', questId: 'bd_timber', have: 99 } });
  window.__kk.getState().turnInSideQuest();
  return { before, after: window.__kk.getState().allegiance };
});
console.log('neutral   :', JSON.stringify(neutral),
  neutral.after === neutral.before ? 'UNCHANGED (correct)' : 'moved — should not have');

// --- the meter, at three standings -----------------------------------------
for (const [v, tag] of [[-75, 'bull'], [0, 'unsworn'], [80, 'crown']]) {
  await page.evaluate((n) => {
    window.__kk.setState({ allegiance: n });
    window.__kk.getState().setPanel('quests');
  }, v);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/meter_${tag}.png`, clip: { x: 340, y: 200, width: 780, height: 240 } });
}
await page.evaluate(() => window.__kk.getState().setPanel('quests'));
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/journal.png` });
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
