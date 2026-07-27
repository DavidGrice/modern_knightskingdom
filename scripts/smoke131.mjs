// NPC AI phase 1 (NPC_AI_SPEC §10.1): the agent skeleton ticks, the scheduler
// respects its budget, LOD tiers react to the camera, and the ` overlay draws.
import { chromium } from 'playwright-core';
const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1000,640', '--window-position=-32000,-32000'],
});
const page = await (await b.newContext({ viewport: { width: 1000, height: 640 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 160)));
await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as guest');
await page.waitForSelector('text=New Journey'); await page.click('text=New Journey');
await page.waitForSelector('text=FORGE YOUR HERO'); await page.waitForTimeout(1200);
await page.click('text=Take up the road');
await page.waitForTimeout(6000);

const snap = () => page.evaluate(() => {
  const m = window.__kkai;
  if (!m) return null;
  const a = m.agents[0];
  return {
    now: m.now,
    count: m.agents.length,
    spent: m.thinksLastFrame,
    peak: m.peakThinksPerFrame,
    budget: m.thinkBudget,
    rate: m.thinksPerSec,
    id: a && a.id,
    tier: a && a.tier,
    thinkHz: a && a.thinkHz,
    measuredHz: a && a.measuredHz,
    thinks: a && a.thinkCount,
    needs: a && { ...a.bb.needs },
    lastScores: a && a.bb.lastScores.length,
  };
});

const first = await snap();
if (!first) { console.log('FAIL: window.__kkai missing'); await b.close(); process.exit(0); }
console.log('agents', first.count, '| id', first.id, '| tier', first.tier, '| thinks', first.thinks);

// 1 · it ticks. Budget must never be exceeded on any sampled frame.
let maxSpent = 0;
for (let i = 0; i < 8; i++) {
  const s = await snap();
  maxSpent = Math.max(maxSpent, s.spent, s.peak);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(4000);
const second = await snap();
maxSpent = Math.max(maxSpent, second.peak);
const dThinks = second.thinks - first.thinks;
const dNow = second.now - first.now;
console.log('clock advanced', dNow.toFixed(2), 's | thinks +' + dThinks,
  '| measured', second.measuredHz.toFixed(1), '/', second.thinkHz, 'Hz',
  '| dispatch', second.rate.toFixed(1), '/s | worst frame', maxSpent, 'of', second.budget);

// 2 · needs decay downward, at roughly the authored rate
const dBladder = first.needs.bladder - second.needs.bladder;
const expected = 0.0022 * dNow;
console.log('bladder', first.needs.bladder.toFixed(4), '->', second.needs.bladder.toFixed(4),
  '| drop', dBladder.toFixed(4), 'expected ~', expected.toFixed(4));

// 3 · pausing stops the AI clock
await page.evaluate(() => window.__kk.getState().setPaused(true));
const pa = await snap();
await page.waitForTimeout(1500);
const pb = await snap();
console.log('while paused: clock +' + (pb.now - pa.now).toFixed(3), 's, thinks +' + (pb.thinks - pa.thinks));
await page.evaluate(() => window.__kk.getState().setPaused(false));
await page.waitForTimeout(400);

// 4 · LOD tier follows the camera. The probe sits at (4, 22); teleport far
//     away in the same region and it must fall out of tier A.
const near = (await snap()).tier;
await page.evaluate(() => { window.__kkp.pendingTeleport = { x: 4, z: 150, yaw: Math.PI }; });
await page.waitForTimeout(1500);
const far = (await snap()).tier;
console.log('tier near probe:', near, '| tier from 128m away facing off:', far);

// 5 · the overlay draws
await page.keyboard.down('`'); await page.waitForTimeout(500); await page.keyboard.up('`');
await page.waitForTimeout(700);
const overlay = await page.evaluate(() => {
  const el = document.querySelector('.ai-debug');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), text: el.innerText.slice(0, 400) };
});
await page.screenshot({ path: 'scripts/shots/smoke131-overlay.png' });
console.log('overlay:', overlay ? `${overlay.w}x${overlay.h}` : 'NOT RENDERED');
if (overlay) console.log('---\n' + overlay.text + '\n---');

// 6 · §8's actual claim: 20 agents, a 3-thinks-per-frame cap, and nobody
//     starves. Round-robin is the only thing making those compatible.
await page.evaluate(() => {
  for (let i = 0; i < 19; i++) {
    const a = Math.random() * Math.PI * 2;
    window.__kkai.spawn(`bulk_${i}`, 'villager', Math.cos(a) * 60, Math.sin(a) * 60, null);
  }
});
await page.waitForTimeout(600);
const before = await page.evaluate(() => window.__kkai.agents.map((a) => a.thinkCount));
await page.waitForTimeout(5000);
const bulk = await page.evaluate(() => ({
  n: window.__kkai.agents.length,
  peak: window.__kkai.peakThinksPerFrame,
  budget: window.__kkai.thinkBudget,
  counts: window.__kkai.agents.map((a) => a.thinkCount),
  tiers: window.__kkai.agents.map((a) => a.tier).join(''),
}));
const gains = bulk.counts.map((c, i) => c - before[i]);
const starved = gains.filter((g) => g <= 0).length;
console.log('bulk:', bulk.n, 'agents | tiers', bulk.tiers, '| worst frame', bulk.peak, 'of', bulk.budget,
  '| thinks each min/max', Math.min(...gains), '/', Math.max(...gains), '| starved', starved);

const pass = first.count === 1 && dThinks > 0 && maxSpent <= 3 && dBladder > 0
  && Math.abs(dBladder - expected) < expected * 0.25
  && (pb.now - pa.now) < 0.05 && near === 'A' && far !== 'A' && !!overlay
  && bulk.n === 20 && bulk.peak <= bulk.budget && starved === 0;
console.log(pass ? 'PASS: phase 1 skeleton + overlay live' : 'FAIL: see readouts above');
console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 3) : 'none');
await b.close();
