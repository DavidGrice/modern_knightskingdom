// NPC progressive-reveal verification: at game start only the two starter
// villagers are findable; the royal court appears one at a time as their
// gating quest completes (John -> Richard -> Queen -> King).
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
await page.waitForTimeout(2500);
await page.click('text=Begin the Journey');
await page.waitForTimeout(6000);

// at start: no quests done, only the two starter villagers should be revealed
const atStart = await page.evaluate(() => {
  // reach into the module via a temp global the game already exposes: NPCS
  // isn't on window, so just check via findTarget indirectly — walk near
  // each fixed NPC position and see if a target resolves. Simpler: use the
  // exposed store + a quick helper that mirrors isNpcRevealed's logic.
  const completed = window.__kk.getState().completedQuests;
  return { completed };
});
console.log('completedQuests at start (expect empty):', JSON.stringify(atStart.completed));

async function npcPromptAt(x, z, yaw = 0) {
  await page.evaluate(([x, z, yaw]) => {
    window.__kkp.pendingTeleport = { x, z, yaw };
  }, [x, z, yaw]);
  await page.waitForTimeout(400);
  return page.evaluate(() => window.__kk.getState().prompt);
}

// king (4,-6), queen (-6,-8), richard (14,2), john (-14,6), alric (-40,38)
console.log('--- at start ---');
console.log('near king:', await npcPromptAt(4, -4.5));
console.log('near john:', await npcPromptAt(-14, 7.8));
console.log('near alric (starter villager, expect Talk to Alric):', await npcPromptAt(-40, 39.2));

// complete cozy_beginnings -> John should appear
await page.evaluate(() => { window.__kk.setState({ completedQuests: ['first_steps', 'cozy_beginnings'] }); });
await page.waitForTimeout(300);
console.log('--- after cozy_beginnings ---');
console.log('near john (expect Talk to John):', await npcPromptAt(-14, 7.8));
console.log('near richard (expect still hidden):', await npcPromptAt(14, 3.2));

// complete forge_ahead -> Richard should appear
await page.evaluate(() => { window.__kk.setState({ completedQuests: ['first_steps', 'cozy_beginnings', 'stone_age', 'forge_ahead'] }); });
await page.waitForTimeout(300);
console.log('--- after forge_ahead ---');
console.log('near richard (expect Talk to Richard):', await npcPromptAt(14, 3.2));
console.log('near queen (expect still hidden):', await npcPromptAt(-6, -6.8));

// complete squires_errand -> Queen appears
await page.evaluate(() => {
  window.__kk.setState({ completedQuests: ['first_steps', 'cozy_beginnings', 'stone_age', 'forge_ahead', 'gone_fishing', 'squires_errand'] });
});
await page.waitForTimeout(300);
console.log('--- after squires_errand ---');
console.log('near queen (expect Talk to Queen):', await npcPromptAt(-6, -6.8));
console.log('near king (expect still hidden):', await npcPromptAt(4, -4.5));
await page.screenshot({ path: `${OUT}/260_reveal_pre_king.png` });

// complete knights_arms -> King appears
await page.evaluate(() => {
  window.__kk.setState({
    completedQuests: ['first_steps', 'cozy_beginnings', 'stone_age', 'forge_ahead', 'gone_fishing', 'squires_errand', 'knights_arms'],
  });
});
await page.waitForTimeout(300);
console.log('--- after knights_arms ---');
console.log('near king (expect Talk to King Leo):', await npcPromptAt(4, -4.5));
await page.screenshot({ path: `${OUT}/261_king_revealed.png` });

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
