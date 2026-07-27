// NPC_AI_SPEC §8 — round-robin think budget.
//
// Two jobs, and they pull in opposite directions: every agent must think at
// its tier's rate, and no frame may pay for more than `budget` thinks. The
// round-robin cursor is what reconciles them — it persists across frames, so
// an agent skipped because the budget ran out is the next one considered,
// rather than the list always being walked from index 0 and the tail starving.
//
// §0.4: no allocation in here. Index loops, no closures, no array methods.

import type { Agent } from './Agent';

export class Scheduler {
  budget: number;
  private cursor = 0;
  /** thinks dispatched on the most recent update, for the debug overlay */
  lastSpent = 0;
  /** agents that were due but got bumped past the budget, for the overlay */
  lastDeferred = 0;
  // A per-frame count is useless to read: at 2 Hz almost every frame is 0.
  // What tuning the budget actually needs is the RATE and the worst frame,
  // both over a 1s window (§9 — the numbers have to be legible or nobody,
  // human or agent, can tell a saturated budget from a quiet one).
  thinksPerSec = 0;
  peakPerFrame = 0;
  private winStart = 0;
  private winTotal = 0;
  private winPeak = 0;

  constructor(budget: number) {
    this.budget = budget;
  }

  update(dt: number, now: number, agents: Agent[]) {
    const n = agents.length;
    this.lastSpent = 0;
    this.lastDeferred = 0;
    if (n === 0) {
      this.sampleWindow(now);
      return;
    }

    for (let i = 0; i < n; i++) agents[i].thinkTimer += dt;

    if (this.cursor >= n) this.cursor = 0;
    const start = this.cursor;
    for (let scanned = 0; scanned < n; scanned++) {
      const idx = (start + scanned) % n;
      const a = agents[idx];
      const period = 1 / a.thinkHz;
      if (a.thinkTimer < period) continue;
      if (this.lastSpent >= this.budget) {
        // Due, but out of budget. The cursor is left just past the last agent
        // actually served, so a deferred agent is ahead of everyone already
        // served and gets first refusal next frame rather than starving.
        this.lastDeferred++;
        continue;
      }
      this.cursor = idx + 1 >= n ? 0 : idx + 1;
      a.thinkTimer -= period;
      // Never bank more than one pending think. Without this an agent that
      // fell behind (tab backgrounded, a long frame, a tier promotion) would
      // spend the next several frames catching up, which is exactly the
      // multi-think spike the budget exists to prevent.
      if (a.thinkTimer > period) a.thinkTimer = period;
      a.think(now);
      this.lastSpent++;
    }

    this.sampleWindow(now);
  }

  private sampleWindow(now: number) {
    this.winTotal += this.lastSpent;
    if (this.lastSpent > this.winPeak) this.winPeak = this.lastSpent;
    const span = now - this.winStart;
    if (span < 1) return;
    this.thinksPerSec = this.winTotal / span;
    this.peakPerFrame = this.winPeak;
    this.winStart = now;
    this.winTotal = 0;
    this.winPeak = 0;
  }
}
