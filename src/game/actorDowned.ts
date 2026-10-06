// CLN-18 · the downed gate. A villager, a sworn defender and Tam each go
// down for a while when their hit points run out: the figure is hidden and
// frozen where it fell until the recovery time, then stands up at full
// health. Villagers.tsx, Defenders.tsx and Companion.tsx each carried the
// same few lines for it, near the top of their frame loops.

/** What the gate reads and restores: a DefenderState (game/defenders.ts), a
 *  villager's combat record (game/villagerCombat.ts), the companion's
 *  (game/companion.ts). */
export interface Downable {
  hp: number;
  maxHp: number;
  state: 'ok' | 'downed';
  /** Date.now() ms — stamped at the blow that downed them (Enemies.tsx) */
  downedUntil: number;
}

/**
 * Hide a downed figure until its recovery time, then stand it up at full
 * health. Returns true while it is down: the caller's frame ends there, so
 * nothing that follows the gate in it runs for as long as it lasts — the
 * figure in the scene neither moves nor acts. In the frame it recovers the
 * gate returns false and the rest of that frame runs.
 *
 * `downedUntil` is wall-clock, so `now` is too. It is read only when someone
 * is down, unless the caller hands in a reading of its own.
 */
export function applyDownedGate(who: Downable, figure: { visible: boolean }, now?: number): boolean {
  if (who.state === 'downed') {
    if ((now ?? Date.now()) >= who.downedUntil) { who.state = 'ok'; who.hp = who.maxHp; }
    else { figure.visible = false; return true; }
  }
  figure.visible = true;
  return false;
}
