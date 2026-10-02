// CLN-11 · split out of game/combat.ts unchanged. Shared by the melee and the projectile paths.

/**
 * Wave 37 (A3 remainder) · the shielded elite's whole mechanic. The player's
 * OWN block (see damagePlayer, playerDamage.ts) is not facing-based at all — unconditional
 * `dmg *= 0.25` whenever blocking+shield+stamina — so there is no existing
 * "reuse the player's own logic" path here; this is a real, small, new
 * mechanic rather than a reskin. The facing-cone MATH does have a real
 * precedent, though: playerAttack's own melee cone test (melee.ts)
 * ((dx*fx+dz*fz)/d < wp.cone) is the exact same forward-dot-product shape,
 * just evaluated from the DEFENDER's side instead of the attacker's.
 */
const SHIELD_FRONT_DOT = 0.3; // matches MELEE.sword.cone — a ~±72° frontal arc

export const SHIELD_REDUCTION = 0.3; // 70% reduction — same order as the player's own 75% block

/** true if `(atkX, atkZ)` sits within the defender's frontal arc, given the
 *  defender's own facing (`defYaw`) and position. Applied against
 *  `playerState.x/z` at both call sites (landMeleeHit and stepBolt) — melee
 *  AND ranged are blocked when frontal, deliberately: this forces an actual
 *  flank, not just "switch to a crossbow". */
export function isFrontalHit(defYaw: number, defX: number, defZ: number, atkX: number, atkZ: number): boolean {
  const fx = -Math.sin(defYaw);
  const fz = -Math.cos(defYaw);
  const dx = atkX - defX;
  const dz = atkZ - defZ;
  const d = Math.hypot(dx, dz) || 1;
  return (dx * fx + dz * fz) / d > SHIELD_FRONT_DOT;
}
