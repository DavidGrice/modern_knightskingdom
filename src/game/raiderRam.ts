'use client';
// A raider-pushed battering ram: the AI-driven counterpart to the player's
// own pushable cart (see game/carts.ts's cartState, siege.ts's ramCheck).
// Spawned occasionally at the start of a raid, it trundles toward the
// nearest shut gate (or the homestead's center if there isn't one) and
// rams whatever it reaches — realizing Phase 4's raid description
// ("gates, walls and towers become functional defense") for the attacking
// side too, not just the player's own siege tools.
//
// It can be STOPPED: the ram carries its own HP and takes melee and ranged
// damage like anything else, so a defended homestead can break the thing
// before it reaches the gate instead of only watching it arrive.
export const RAM_MAX_HP = 30;
/** how close a swing or a shaft has to come to count as a hit */
export const RAM_RADIUS = 1.1;

export const raiderRamState = {
  active: false,
  x: 0,
  z: 0,
  hp: RAM_MAX_HP,
  /** metres rolled, so the wheels the rig lab labelled actually turn */
  travel: 0,
  /** set when HP runs out — the wreck sits a moment before despawning */
  wrecked: false,
  wreckT: 0,
};

export function resetRaiderRam(x: number, z: number) {
  raiderRamState.active = true;
  raiderRamState.x = x;
  raiderRamState.z = z;
  raiderRamState.hp = RAM_MAX_HP;
  raiderRamState.travel = 0;
  raiderRamState.wrecked = false;
  raiderRamState.wreckT = 0;
}

/** returns true if this blow finished it off */
export function damageRaiderRam(amount: number): boolean {
  if (!raiderRamState.active || raiderRamState.wrecked) return false;
  raiderRamState.hp -= amount;
  if (raiderRamState.hp > 0) return false;
  raiderRamState.hp = 0;
  raiderRamState.wrecked = true;
  raiderRamState.wreckT = 0;
  return true;
}

if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__kkRam = raiderRamState;
