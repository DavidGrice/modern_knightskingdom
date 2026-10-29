// CLN-11 · split out of game/combat.ts unchanged: what an enemy kind IS — its health, label, the XP it is worth,
// how hard and how often it hits, and what it may be carrying. Pure data; combat.ts re-exports the public names.
// CLN-13 · and how hard it batters a wall, what it looks like, and its voice when it falls (were Enemies.tsx's).
import type { CharacterConfig, ItemId } from '../types';
import type { SoundName } from '@/lib/audioCatalog';

// 'royal' = the crown's knights, raiding only players who pledged to Cedric
// (Phase 19's alliance branch) — sturdier than a bandit, softer than Gilbert.
// 'mountedRaider' (Wave 36, A3) = Cedric's own war party riding his two
// tethered chargers (l7339231/l7339232, CedricCamp.tsx) — see EnemyFigure.tsx
// for the mount.
// Wave 37 (A3 remainder) · the last three of the roster's A3 item: 'caster'
// (a ranged spellcaster — see fireSpellBolt, combat/projectiles.ts), 'shieldedElite' (blocks
// most frontal damage — see isFrontalHit, combat/shield.ts), 'siegeCrew' (mans a real
// Wave-35 turret asset during Cedric's War Party — see EnemyData.siegeAsset).
export type EnemyKind = 'skeleton' | 'bandit' | 'gilbert' | 'cedric' | 'storm' | 'royal' | 'mountedRaider'
  | 'caster' | 'shieldedElite' | 'siegeCrew';

/** how high the saddle sits — Wave 36 (A3): the SAME lift Defenders.tsx's own
 *  SADDLE_Y already gives a mounted defender, so a mounted raider's hitbox
 *  (see MOUNT_SEAT_Y's use at the bolt-collision call in combat/projectiles.ts) matches where
 *  the rider is actually rendered rather than where a standing foe would be. */
export const MOUNT_SEAT_Y = 1.15;

/** max hp per enemy kind (storm is a duel — the very first landed hit ends it) */
export const KIND_HP: Record<EnemyKind, number> = {
  skeleton: 5, bandit: 8, gilbert: 14, cedric: 45, storm: 1, royal: 12, mountedRaider: 16,
  // Wave 37 · a glass cannon (dies in ~2 melee hits — closing the gap is the
  // real counter), a real tank, and a durable-enough gunner
  caster: 6, shieldedElite: 18, siegeCrew: 10,
};

/** a kind's full health, for the aim readout's health bar */
export function maxHpOf(kind: EnemyKind): number {
  return KIND_HP[kind] ?? 1;
}

export const KIND_LABEL: Record<EnemyKind, string> = {
  skeleton: 'Skeleton', bandit: 'Bandit', gilbert: 'Gilbert the Bad', cedric: 'Cedric the Bull', storm: 'Princess Storm', royal: 'Royal Knight',
  mountedRaider: 'Mounted Raider',
  caster: 'Hedge Witch', shieldedElite: 'Shieldbearer', siegeCrew: 'Siege Engineer',
};

export const KIND_XP: Record<EnemyKind, number> = {
  skeleton: 20, bandit: 30, gilbert: 45, cedric: 150, storm: 0, royal: 40, mountedRaider: 55,
  caster: 35, shieldedElite: 42, siegeCrew: 35,
};

/** ranged kills have always paid a small bonus over melee (see stepBolt) */
export const KIND_XP_RANGED: Record<EnemyKind, number> = {
  skeleton: 24, bandit: 34, gilbert: 50, cedric: 165, storm: 0, royal: 45, mountedRaider: 60,
  caster: 40, shieldedElite: 47, siegeCrew: 40,
};

/** melee damage per hit and attack cooldown, by kind — moved here (were
 *  local to Enemies.tsx's own AI loop) so the Bestiary can surface the same
 *  real numbers the fight itself uses, instead of authoring a second,
 *  driftable copy just for display. */
export const ATTACK_DMG: Record<EnemyKind, number> = {
  skeleton: 1, bandit: 1.5, gilbert: 2, cedric: 3, storm: 0, royal: 2, mountedRaider: 2.2,
  // Wave 37 · a caster's melee fallback is deliberately weak (its real
  // threat is fireSpellBolt, combat/projectiles.ts); a shielded elite hits like a veteran;
  // a siege crew's melee-defense is a middling last resort, not its job
  caster: 0.8, shieldedElite: 1.8, siegeCrew: 1.5,
};

export const ATTACK_CD: Record<EnemyKind, number> = {
  skeleton: 1.6, bandit: 1.6, gilbert: 1.5, cedric: 1.3, storm: 1.1, royal: 1.4, mountedRaider: 1.3,
  caster: 1.6, shieldedElite: 1.5, siegeCrew: 1.6,
};

/** J51 follow-up: structural damage per hit against a keep piece — a
 *  different scale from ATTACK_DMG (tuned against the PLAYER's small HP
 *  pool), closer to what the player's own ram/cannon already deal it (a kind
 *  with no entry deals 8 — enemyAi/blows.ts's batterKeep) */
export const RAID_SIEGE_DMG: Partial<Record<EnemyKind, number>> = {
  bandit: 9, gilbert: 12, cedric: 18, royal: 12, mountedRaider: 11,
  caster: 6, shieldedElite: 14, siegeCrew: 12,
};

/** One possible item in an enemy's purse. `chance` is rolled independently per
 *  entry, then a quantity is picked in [min, max] — so a kill can turn up
 *  nothing, a scrap, or a genuinely good haul. */
interface LootEntry { item: ItemId; min: number; max: number; chance: number }

/** Per-kind loot tables (2026-07-20). Enemies used to drop a fixed payout —
 *  every skeleton exactly 1 stone, forever — so killing things stopped being
 *  interesting the moment you'd seen each kind once. Each enemy now rolls a
 *  REAL INVENTORY when it spawns (see `rollLoot`, stored on EnemyData), and
 *  that inventory is what drops when it falls. Rolling at spawn rather than at
 *  death means the thing you're fighting genuinely carries what you'll get. */
export const LOOT_TABLES: Record<EnemyKind, LootEntry[]> = {
  // grave-dirt and old bones: mostly stone, the odd forgotten coin
  skeleton: [
    { item: 'stone', min: 1, max: 3, chance: 0.85 },
    { item: 'iron_ore', min: 1, max: 1, chance: 0.15 },
    { item: 'gold', min: 1, max: 2, chance: 0.2 },
    { item: 'herb', min: 1, max: 1, chance: 0.1 },
  ],
  // a road robber carries what they've stolen
  bandit: [
    { item: 'plank', min: 1, max: 3, chance: 0.8 },
    { item: 'iron_ore', min: 1, max: 2, chance: 0.4 },
    { item: 'gold', min: 2, max: 6, chance: 0.5 },
    { item: 'bread', min: 1, max: 1, chance: 0.25 },
    { item: 'bolt', min: 2, max: 5, chance: 0.2 },
  ],
  // a raid captain: better kit, and sometimes a piece of real armor
  gilbert: [
    { item: 'iron_bar', min: 1, max: 2, chance: 0.9 },
    { item: 'plank', min: 2, max: 4, chance: 0.7 },
    { item: 'gold', min: 5, max: 14, chance: 0.8 },
    { item: 'helmet', min: 1, max: 1, chance: 0.15 },
  ],
  // Cedric's real reward is the capstone (or, after Wave 38's jailbreak
  // loop, rematch) payout in markCedricDefeated, not this table
  cedric: [],
  storm: [],
  // a fallen knight's purse and kit — a traitor takes what a traitor can
  royal: [
    { item: 'gold', min: 3, max: 9, chance: 0.9 },
    { item: 'iron_ore', min: 1, max: 2, chance: 0.6 },
    { item: 'iron_bar', min: 1, max: 1, chance: 0.3 },
    { item: 'chestplate', min: 1, max: 1, chance: 0.1 },
  ],
  // Wave 36 (A3): one of Cedric's own war party, riding his own tethered
  // chargers — a better kit than the men who walk, mirroring gilbert's table
  mountedRaider: [
    { item: 'iron_bar', min: 1, max: 2, chance: 0.9 },
    { item: 'plank', min: 2, max: 4, chance: 0.7 },
    { item: 'gold', min: 5, max: 14, chance: 0.8 },
    { item: 'helmet', min: 1, max: 1, chance: 0.15 },
  ],
  // Wave 37 · a hedge witch travels light — herbs and a little coin, the
  // occasional stray bolt off a raider she rode with
  caster: [
    { item: 'herb', min: 1, max: 3, chance: 0.7 },
    { item: 'gold', min: 3, max: 8, chance: 0.6 },
    { item: 'bolt', min: 1, max: 2, chance: 0.15 },
  ],
  // a veteran's kit — real armory pieces, not just scrap
  shieldedElite: [
    { item: 'iron_bar', min: 1, max: 2, chance: 0.85 },
    { item: 'gold', min: 4, max: 10, chance: 0.75 },
    { item: 'shield', min: 1, max: 1, chance: 0.12 },
    { item: 'chestplate', min: 1, max: 1, chance: 0.08 },
  ],
  // an engineer's tools and pay, mirroring gilbert/mountedRaider's own shape
  siegeCrew: [
    { item: 'iron_bar', min: 1, max: 2, chance: 0.8 },
    { item: 'plank', min: 2, max: 4, chance: 0.7 },
    { item: 'gold', min: 3, max: 8, chance: 0.6 },
  ],
};

/** what each kind looks like: the minifig donor its figure is built from and its colours (a RiggedFigure config) —
 *  drawn by EnemyFigure.tsx, named in the line a battered wall gives (enemyAi/blows.ts), warmed by preload.ts */
export const KIND_FIGURE: Record<EnemyKind, CharacterConfig> = {
  skeleton: {
    name: 'Skeleton', headDonor: 'minifigskeleton00', bodyDonor: 'minifigskeleton00',
    armColor: 150, handColor: 150, legColor: 150, hipColor: 150,
  },
  bandit: {
    name: 'Bandit', headDonor: 'minifigweezil00', bodyDonor: 'minifigweezil00',
    armColor: 38, handColor: 18, legColor: 38, hipColor: 24,
  },
  // Gilbert the Bad: the raid leader — his own donor carries the halberd
  // mold (see lib/weaponParts.ts), and he's stationed at Cedric's camp too.
  gilbert: {
    name: 'Gilbert the Bad', headDonor: 'minifiggilbertbad01', bodyDonor: 'minifiggilbertbad01',
    armColor: 38, handColor: 18, legColor: 38, hipColor: 24,
  },
  cedric: {
    name: 'Cedric the Bull', headDonor: 'minifigcedricbull00', bodyDonor: 'minifigcedricbull00',
    armColor: 34, handColor: 18, legColor: 38, hipColor: 34,
  },
  storm: {
    name: 'Princess Storm', headDonor: 'minifigprincessstorm00', bodyDonor: 'minifigprincessstorm00',
    armColor: 24, handColor: 18, legColor: 150, hipColor: 24,
  },
  // the crown's anonymous knights (Phase 19 alliance raids on a Cedric-sworn
  // player) — a Richard donor variant OTHER than 00 (the named NPC's own),
  // in King Leo's own royal blue/white/yellow, so the wave unmistakably
  // reads as "the King's men", not another bandit pack. Was '01' — found
  // investigating the Gilbert floating-hand report and checking every
  // donor's rig data here fresh: '01' is a MOUNTED-COMBAT export (every
  // one of its part_roles.json entries is prefixed `rider_`/`horse_`,
  // meaning classifyByRigMap correctly refuses all of them as "not this
  // figure's own body" per its own mount-exclusion rule), so royal knights
  // silently fell back to the old spatial-guessing classifier the verified
  // rig maps exist specifically to replace — the exact failure mode behind
  // Gilbert's own bug, just from a donor mismatch instead of a kept prop.
  // '02' is a real standing-minifig rig (verified, no mount prefixes) and a
  // different face from Richard's own '00', so the "not Richard" intent
  // still holds.
  royal: {
    name: 'Royal Knight', headDonor: 'minifigrichardstrong02', bodyDonor: 'minifigrichardstrong02',
    armColor: 26, handColor: 18, legColor: 150, hipColor: 26,
  },
  // Wave 36 (A3): one of Cedric's own war party, riding his tethered chargers
  // (see EnemyFigure.tsx's mount). minifiggilbertbad02 is a real,
  // verified, previously-unused donor variant that molds a spear+shield —
  // fitting for couched-lance cavalry — though the mold itself is never kept
  // (keepProps={false} in EnemyFigure.tsx, same as every other enemy): the rider carries
  // a real, separately-portalled HeldSpear/ArmShield instead.
  mountedRaider: {
    name: 'Mounted Raider', headDonor: 'minifiggilbertbad02', bodyDonor: 'minifiggilbertbad02',
    armColor: 38, handColor: 18, legColor: 38, hipColor: 24,
  },
  // Wave 37 (A3 remainder) · minifigweezil01 is a real, verified, previously-
  // unused donor variant (crossbow+bolt mold, never kept — keepProps={false},
  // EnemyFigure.tsx) — not a creator option (FACE_OPTIONS/CREST_OPTIONS only offer the
  // '00' variant of each named family) and not a villager look (VILLAGER_LOOKS
  // never uses it either). A violet family from the real runtime palette
  // (indices 80-83, not the [255,0,255] filler padding the rest of the array)
  // is what reads as "not a mundane fighter" without inventing a new asset.
  caster: {
    name: 'Hedge Witch', headDonor: 'minifigweezil01', bodyDonor: 'minifigweezil01',
    armColor: 82, handColor: 18, legColor: 83, hipColor: 38,
  },
  // minifigcedricbull04 (battle axe+shield mold) — real, verified, unused by
  // any other entry here, not a creator option, not a villager look. A
  // dark maroon/near-black "veteran" scheme distinct from every other kind's
  // palette in this table.
  shieldedElite: {
    name: 'Shieldbearer', headDonor: 'minifigcedricbull04', bodyDonor: 'minifigcedricbull04',
    armColor: 23, handColor: 18, legColor: 38, hipColor: 23,
  },
  // minifiggilbertbad03 (crossbow+bolt+shield mold) — real, verified, unused,
  // not a creator option, not a villager look. Rides along inside Cedric's
  // War Party (CedricSiege.tsx) — "one of Gilbert's own veterans assigned to
  // the gun." A leather/soot engineer palette, all real indices.
  siegeCrew: {
    name: 'Siege Engineer', headDonor: 'minifiggilbertbad03', bodyDonor: 'minifiggilbertbad03',
    armColor: 74, handColor: 18, legColor: 75, hipColor: 46,
  },
};

/** a distinct voice bark on defeat, where the original bank has one (Deed-worthy antagonists only) */
export const DEATH_BARK: Partial<Record<EnemyKind, SoundName>> = {
  bandit: 'random_weezil', gilbert: 'random_gilbert', cedric: 'random_cedric',
};
