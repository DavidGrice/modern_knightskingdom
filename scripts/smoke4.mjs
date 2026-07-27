// Verify Phase 1: walk animation in creator, third-person avatar, viewmodel,
// emote wheel, NPC greet.
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

await page.goto('http://localhost:3789', { waitUntil: 'networkidle' });
await page.click('text=Play as Guest');
await page.waitForSelector('text=New Journey', { timeout: 15000 });
await page.click('text=New Journey');
await page.waitForSelector('text=Forge Your Hero', { timeout: 15000 });
await page.waitForTimeout(5000);
// two shots ~0.5s apart: pose should differ if the walk cycle is playing
await page.screenshot({ path: `${OUT}/40_creator_walk_a.png`, clip: { x: 265, y: 155, width: 470, height: 590 } });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/41_creator_walk_b.png`, clip: { x: 265, y: 155, width: 470, height: 590 } });

await page.click('text=Begin the Journey');
await page.waitForTimeout(7000);
// FPS viewmodel (arm + axe should be bottom right)
await page.screenshot({ path: `${OUT}/42_fps_viewmodel.png` });

// third person
await page.keyboard.press('KeyV');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/43_third_person_idle.png` });
// walk in third person
await page.keyboard.down('KeyW');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/44_third_person_walk.png` });
await page.keyboard.up('KeyW');

// emote
await page.keyboard.press('KeyG');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/45_emote_wheel.png` });
await page.click('text=Regal Wave');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/46_emote_playing.png` });

// walk toward King Leo and greet him (turn around: avatar spawned facing -Z already)
await page.keyboard.press('KeyV'); // back to fps
await page.waitForTimeout(500);
await page.keyboard.down('KeyW');
await page.waitForTimeout(5600);
await page.keyboard.up('KeyW');
await page.keyboard.down('ArrowRight'); // face King Leo (he's slightly east)
await page.waitForTimeout(280);
await page.keyboard.up('ArrowRight');
await page.keyboard.down('KeyW');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyW');
// headless renders at low fps (dt clamp halves speed) — steer + walk until close
for (let i = 0; i < 12; i++) {
  const p = await page.evaluate(() => ({ ...window.__kkp }));
  const dx = 4 - p.x;
  const dz = -6 - p.z;
  const d = Math.hypot(dx, dz);
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
  if (d < 2.4) break;
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(Math.min(1400, d * 320));
  await page.keyboard.up('KeyW');
}
await page.waitForTimeout(300);
const dbg = await page.evaluate(() => ({
  prompt: window.__kk.getState().prompt,
  player: { ...window.__kkp },
}));
console.log('prompt near king:', dbg.prompt, 'player:', JSON.stringify(dbg.player));
await page.keyboard.down('KeyE');
await page.waitForTimeout(400);
await page.keyboard.up('KeyE');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/47_king_greet.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
