'use client';
// CLN-11 · split out of game/combat.ts unchanged: the player's melee — which weapon is readied, the dodge-roll,
// the swing itself and what one landed blow does.
import { audio } from '@/lib/audio';
import { atGuildMaxRank, useGameStore } from '../store/gameStore';
import { callingSignature } from '../data/classes';
import { playerState } from '../playerState';
import { ridingState } from '../riding';
import { raiderRamState, RAM_RADIUS } from '../raiderRam';
import { raiderLadderState, LADDER_RADIUS } from '../raiderLadder';
import { emitSound, SOUND_LOUDNESS } from '@/ai/perception/sounds';
import { enemyBeliefId } from '@/ai/perception/Belief';
import { WEAPON_SLOTS, isMeleeSlot, type MeleeWeaponId, type WeaponSlot } from '../data/weapons';
import {
  COMBO_CHAIN_LENGTH, COMBO_FINISHER_MULT, COMBO_WINDOW_MS, DODGE_COOLDOWN_MS, DODGE_DURATION_MS, DODGE_IFRAME_MS,
  DODGE_STAMINA_COST, FINISHER_STAGGER_S, meleeStatsFor, ownsMeleeSlot,
} from '../data/melee';
import { combatState } from './state';
import { useEnemyStore, type EnemyData } from './enemyStore';
import { resolveEnemyKill } from './kill';
import { SHIELD_REDUCTION, isFrontalHit } from './shield';
import { hitRaiderLadder, hitRaiderRam } from './structures';

/**
 * One stamina-costed burst of displacement + i-frames. Decides WHETHER a
 * roll starts and which way it points; the actual movement is applied by
 * PlayerController's on-foot branch (the same collision-clamped nx/nz code
 * every ordinary step already resolves through, so a roll can't clip through
 * a wall — it's a bigger step, not a teleport). No fabricated animation: the
 * visible cue is a forced `playerState.speed` bump that the EXISTING
 * run-cycle (third person) and speed-driven bob/sway (first-person
 * viewmodel) already react to, plus the existing FOV smoother widening a
 * touch further — see PlayerController's own dodge wiring.
 */
export function tryDodge(dirX: number, dirZ: number): boolean {
  const now = performance.now();
  if (now < combatState.dodgeReadyAt || combatState.stamina < DODGE_STAMINA_COST) return false;
  const len = Math.hypot(dirX, dirZ) || 1;
  combatState.dodgeDir = { x: dirX / len, z: dirZ / len };
  combatState.dodgeUntil = now + DODGE_DURATION_MS;
  combatState.dodgeReadyAt = now + DODGE_COOLDOWN_MS;
  combatState.iframeUntil = Math.max(combatState.iframeUntil, now + DODGE_IFRAME_MS);
  combatState.stamina -= DODGE_STAMINA_COST;
  combatState.comboCount = 0; // a roll breaks a melee chain, same as a miss
  audio.play('wind1', 0.55); // no dedicated whoosh sample exists — closest honest reuse in the bank
  return true;
}

/** Which melee weapon is actually in hand. The readied one only counts while
 *  it is still OWNED — selling or losing a halberd has to fall back to the
 *  sword (and the sword to bare fists, which is what 'sword' means when
 *  `inventory.sword` is 0), the same ownership check `rangedMode` has always
 *  made before showing a crossbow. */
export function activeMelee(): MeleeWeaponId {
  const mw = combatState.meleeWeapon;
  // Wave 49 (C1) fix: ownsMeleeSlot recognizes ANY owned tier, not just the
  // base item — readying a halberd while owning only a Forged/Crested one
  // used to silently fall back to bare-fisted 'sword' every frame.
  if (mw !== 'sword' && ownsMeleeSlot(mw, useGameStore.getState().inventory)) return mw;
  return 'sword';
}

/** what Q (keyboard) or Y (gamepad) says when a weapon is readied. Each line
 *  names the thing THIS weapon does DIFFERENTLY from the last one, since
 *  that is the only part a player can't see from the viewmodel itself. */
const SWAP_HINT: Record<WeaponSlot, string> = {
  sword: '⚔️ Sword readied',
  halberd: '🔱 Halberd readied (slow, long reach — one swing sweeps the whole line in front of you)',
  spear: '🗡️ Spear readied (longest reach; couch it at a gallop for a charging blow)',
  crossbow: '🏹 Crossbow readied (RMB to aim)',
  longbow: '🏹 Longbow readied (hold LMB to draw, release to loose)',
};

/** Cycle to the next OWNED weapon in WEAPON_SLOTS order and toast what
 *  changed. Wave 15 · moved here from GameScreen.tsx (verbatim logic) so it
 *  is the ONE place both the keyboard's Q switch (GameScreen.tsx) and the
 *  gamepad's Y edge (CombatController.tsx) call, instead of two copies
 *  drifting apart. Doesn't re-check paused/buildMode/panel itself — same
 *  contract as playerAttack() below and fireBolt() (projectiles.ts), the caller already knows its
 *  own gating. */
export function cycleWeapon(): void {
  const st = useGameStore.getState();
  // Wave 49 (C1) fix: 'sword' keeps its own long-standing special case — it
  // is the bare-fisted baseline, always a valid slot to cycle to whether or
  // not a real sword has ever been forged (activeMelee's own fallback is the
  // same rule) — but halberd now recognizes ANY owned tier via ownsMeleeSlot
  // instead of a flat base-item count, the same fix activeMelee/playerAttack
  // both needed.
  const ownsSlot = (k: WeaponSlot) => k === 'sword' || (isMeleeSlot(k) ? ownsMeleeSlot(k, st.inventory) : (st.inventory[k] ?? 0) > 0);
  if (!WEAPON_SLOTS.some((k) => k !== 'sword' && ownsSlot(k))) return;
  const current: WeaponSlot = combatState.weapon === 'melee' ? combatState.meleeWeapon : combatState.rangedWeapon;
  let idx = WEAPON_SLOTS.indexOf(current);
  let next: WeaponSlot = current;
  for (let i = 0; i < WEAPON_SLOTS.length; i++) {
    idx = (idx + 1) % WEAPON_SLOTS.length;
    if (ownsSlot(WEAPON_SLOTS[idx])) {
      next = WEAPON_SLOTS[idx];
      break;
    }
  }
  if (isMeleeSlot(next)) {
    combatState.weapon = 'melee';
    combatState.meleeWeapon = next;
  } else {
    combatState.weapon = 'ranged';
    combatState.rangedWeapon = next;
  }
  combatState.aiming = false;
  combatState.drawStart = 0;
  combatState.comboCount = 0; // Wave 40 (A6) · swapping weapons breaks a melee chain
  st.notify(SWAP_HINT[next]);
}

/** Resolve ONE landed melee blow: damage, the camp's rally, knockback, and
 *  the kill/loot/notify path if it fell (kill.ts's resolveEnemyKill). Split
 *  out of playerAttack when the halberd's sweep made "the single best
 *  target" no longer the only shape a swing can have — a swept kill has to
 *  loot, rally and credit the arena exactly like a thrust one, and that is
 *  not a rule worth keeping two copies of. */
function landMeleeHit(e: EnemyData, d: number, dmg: number, finisher = false) {
  const st = useGameStore.getState();
  const { enemies } = useEnemyStore.getState();
  // Wave 37 (A3 remainder) · a shielded elite blocks most of a frontal blow
  // outright — see isFrontalHit's own comment (shield.ts)
  const applied = (e.kind === 'shieldedElite' && isFrontalHit(e.mob.yaw, e.mob.x, e.mob.z, playerState.x, playerState.z))
    ? dmg * SHIELD_REDUCTION : dmg;
  e.hp -= applied;
  // NPC_AI_SPEC §6.2 — steel on a raider gives that raider away by sound.
  // Keyed to `enemy:<id>` (not `noise:`) on purpose: this sound identifies a
  // specific mob, so it refreshes the SAME belief the vision sensor uses for
  // it, and a villager who only heard the clash ends up with a low-confidence,
  // deliberately fuzzed idea of where that particular raider is.
  emitSound(e.mob.x, e.mob.z, SOUND_LOUDNESS.meleeHit, 'combat',
    enemyBeliefId(e.id), st.destination ?? null);
  // the camp rallies (AI wave 2): striking one hostile alerts every fellow
  // within earshot, pulling them into the fight beyond the normal 26m leash
  for (const o of enemies) {
    if (o.id === e.id || o.mob.state === 'dying' || o.kind === 'storm') continue;
    if (Math.hypot(o.mob.x - e.mob.x, o.mob.z - e.mob.z) < 40) o.mob.alertT = 12;
  }
  // knockback — Wave 40 (A6): a finisher hits harder than a flat 0.9
  const kb = finisher ? 1.8 : 0.9;
  const dd = d || 1;
  e.mob.x += ((e.mob.x - playerState.x) / dd) * kb;
  e.mob.z += ((e.mob.z - playerState.z) / dd) * kb;
  // Wave 40 (A6) · a finisher staggers its target, same "force attackCd up"
  // trick the parry branch (damagePlayer) uses — no new AI-state machine.
  if (finisher) e.mob.attackCd = Math.max(e.mob.attackCd, FINISHER_STAGGER_S);
  if (e.hp <= 0 && e.mob.state !== 'dying') resolveEnemyKill(e, { by: 'melee' }); // or, for Storm, the duel won
}

/** player melee swing: the readied weapon's own reach/arc, resolved against
 *  the nearest foe in the facing cone — or, for a sweeping polearm, against
 *  every foe in it. Nothing here gates on `ridingState`: a swing from the
 *  saddle has always been the same swing, and the only mounted difference is
 *  the spear's couched-charge multiplier below. */
export function playerAttack(): boolean {
  const st = useGameStore.getState();
  const kind = activeMelee();
  // Wave 49 (C1): tier-aware dmg/wornDmg, every other field still MELEE[kind]
  const wp = meleeStatsFor(kind, st.inventory);
  // Wave 32 · Page calling's small Battle-Ready passive: swings cost a touch
  // less stamina, armed or not — a training-economy nudge, deliberately NOT
  // more flat damage (Knights' Order and Heavy Hand already own that slot).
  const staminaCost = callingSignature(st.character?.classId, 'combat')
    ? Math.max(1, wp.stamina - 1) : wp.stamina;
  if (combatState.stamina < staminaCost) return false;
  combatState.stamina -= staminaCost;
  combatState.attackAt = performance.now();
  // Wave 49 (C1) fix: ownsMeleeSlot recognizes ANY owned tier — without this,
  // forging a tier (which consumes the item below it) drops inventory[kind]
  // to 0 and the player would be scored as bare-fisted despite visibly
  // wielding a Forged/Crested weapon.
  const held = ownsMeleeSlot(kind, st.inventory);
  // a worn-out weapon still swings, just softer — durability is a nudge
  // toward the workbench, not a hard block on fighting
  const worn = (st.durability[kind] ?? 100) <= 0;
  // Knights' Order passive + Heavy Hand talent: flat melee damage bonuses.
  // Wave 22: Champion of the Order (max guild rank) sharpens the base
  // passive itself, +1 -> +2.
  const orderBonus = (st.guild === 'knights' ? (atGuildMaxRank(st.guild, st.guildRanks, 'knights') ? 2 : 1) : 0)
    + (st.skillTree.includes('combat3') ? 1 : 0)
    + (st.skillTree.includes('combat4') ? 1 : 0) // Master-at-Arms mastery talent (Wave 52)
    + Math.floor((st.attrSpent.might ?? 0) / 2); // Might attribute
  const baseDmg = held ? (worn ? wp.wornDmg : wp.dmg) : 1; // nothing held = bare fists
  // Berserker trade-off: +30% damage with a weapon in hand specifically (its
  // own downside is the −20% max stamina above) — unarmed swings don't benefit
  const berserkerMult = held && st.perks.includes('berserker') ? 1.3 : 1;
  // the couched charge, applied to the finished figure the way the ranged
  // weapons' battlement bonus is: it scales the WHOLE blow, guild bonuses and
  // all, because it is momentum behind the point, not a better point
  const charge = wp.charge > 1 && ridingState.active && combatState.galloping ? wp.charge : 1;
  const dmg = (baseDmg * berserkerMult + orderBonus) * charge;
  if (held) st.useTool(kind);
  audio.play('sword_swish', held ? 0.8 : 0.45);

  const fx = -Math.sin(playerState.yaw);
  const fz = -Math.cos(playerState.yaw);
  const { enemies } = useEnemyStore.getState();
  const landed: { e: EnemyData; d: number }[] = [];
  let best: EnemyData | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (e.mob.state === 'dying') continue;
    const dx = e.mob.x - playerState.x;
    const dz = e.mob.z - playerState.z;
    const d = Math.hypot(dx, dz);
    if (d > wp.reach) continue;
    if ((dx * fx + dz * fz) / (d || 1) < wp.cone) continue;
    if (wp.sweep) landed.push({ e, d });
    else if (d < bestD) { best = e; bestD = d; }
  }
  if (best) landed.push({ e: best, d: bestD });
  // nothing living in reach — but the raiders' ram is a legitimate target,
  // and breaking it before it reaches the gate is the whole point of having
  // defenders on the wall
  if (!landed.length) {
    combatState.comboCount = 0; // Wave 40 (A6) · a whiff breaks the chain
    if (raiderRamState.active && !raiderRamState.wrecked) {
      const rdx = raiderRamState.x - playerState.x;
      const rdz = raiderRamState.z - playerState.z;
      const rd = Math.hypot(rdx, rdz);
      if (rd < wp.reach + RAM_RADIUS && (rdx * fx + rdz * fz) / (rd || 1) > wp.cone) {
        hitRaiderRam(dmg);
      }
    }
    // Wave 58 (H4) · the raiders' own siege ladder is the same kind of
    // legitimate no-living-target fallback the ram is just above — breaking
    // it before anyone finishes the climb is a real counter, not something
    // only bolts can do. Independent of the ram check (not `else if`): a
    // swing out of the ram's own range can still land on the ladder.
    if (raiderLadderState.active && !raiderLadderState.wrecked) {
      const ldx = raiderLadderState.x - playerState.x;
      const ldz = raiderLadderState.z - playerState.z;
      const ld = Math.hypot(ldx, ldz);
      if (ld < wp.reach + LADDER_RADIUS && (ldx * fx + ldz * fz) / (ld || 1) > wp.cone) {
        hitRaiderLadder(dmg);
      }
    }
    return true;
  }
  // Wave 40 (A6) · combo chain: consecutive landed swings within
  // COMBO_WINDOW_MS build toward a finisher. The window lapsing is just a
  // timestamp check — self-resetting the moment real time exceeds it, which
  // also covers pausing the game for a while, since performance.now() keeps
  // advancing regardless.
  const nowT = performance.now();
  if (combatState.comboCount > 0 && nowT > combatState.comboWindowUntil) combatState.comboCount = 0;
  combatState.comboCount++;
  combatState.comboWindowUntil = nowT + COMBO_WINDOW_MS;
  const finisher = combatState.comboCount >= COMBO_CHAIN_LENGTH;
  if (finisher) combatState.comboCount = 0; // chain completes and restarts
  const swingDmg = finisher ? dmg * COMBO_FINISHER_MULT : dmg; // reuses this swing's own `dmg`, already computed above from MELEE[kind]
  // one impact sound per SWING, not per body a sweep passes through
  audio.play('brick_collide', 0.8);
  if (finisher) { audio.play('thud', 0.9); st.notify('Finishing blow!', true); }
  for (const h of landed) landMeleeHit(h.e, h.d, swingDmg, finisher);
  return true;
}
