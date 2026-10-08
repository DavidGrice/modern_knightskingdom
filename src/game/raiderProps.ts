// CLN-19 · what the raiders' two siege props have in common. A battering ram
// (raiderRam.ts) and a siege ladder (raiderLadder.ts) are each one
// module-level record that a raid sets rolling, and both can be STOPPED:
// they carry hit points, take melee and ranged damage like anything else,
// and when those run out the thing tips over and lies there a while before
// the field is cleared. That much was written out twice. What each does on
// its way in — the ram steers for a shut gate and batters it, the ladder
// walks a line to a wall and plants itself — is its own, and stays in its
// own files. No imports: the two components and combat/structures.ts build
// on this, and the two state records fit `RaiderPropState` as they are.

/** the part of a raider prop's state the shared code reads and writes */
export interface RaiderPropState {
  active: boolean;
  x: number;
  z: number;
  hp: number;
  /** set when HP runs out — the wreck sits a moment before despawning */
  wrecked: boolean;
  wreckT: number;
}

/** A blow lands. Returns true if this one finished the prop off. */
export function damageRaiderProp(prop: RaiderPropState, amount: number): boolean {
  if (!prop.active || prop.wrecked) return false;
  prop.hp -= amount;
  if (prop.hp > 0) return false;
  prop.hp = 0;
  prop.wrecked = true;
  prop.wreckT = 0;
  return true;
}

/** how long a wreck lies there before the field is cleared */
export const WRECK_SECONDS = 6;

/** One frame of a wreck: tipped over, settling — then gone. Returns how far
 *  it has tipped (0 to 1, over its first 0.9 s), or null once its time is
 *  up, when the prop is no longer active. */
export function settleWreck(prop: RaiderPropState, dt: number): number | null {
  prop.wreckT += dt;
  if (prop.wreckT > WRECK_SECONDS) {
    prop.active = false;
    return null;
  }
  return Math.min(1, prop.wreckT / 0.9);
}
