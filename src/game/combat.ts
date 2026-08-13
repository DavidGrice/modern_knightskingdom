'use client';
// Combat state: player vitals as a mutable module (HUD polls at low frequency),
// enemies in a small zustand store (list changes re-render; positions are
// mutated in place by each enemy's frame loop).
import { create } from 'zustand';
import { audio } from '@/lib/audio';
import { useGameStore } from './store/gameStore';
import { playerState } from './playerState';
import { ridingState } from './riding';
import { damageRaiderRam, raiderRamState, RAM_RADIUS } from './raiderRam';
import { hitTestCharacter, PART_DAMAGE, PART_LABEL, type PartHit } from './hitbox';
import type { RigJoint } from '@/lib/minifigRig';
import { EYE_HEIGHT } from './data/world';
import { SKILLS, levelFromXp } from './data/ranks';
import { resetDungeon } from './dungeon';
import { ITEMS } from './data/items';
import { bestChestplateOwned } from './data/armor';
import type { ItemId } from './types';
import { raidStrength } from './difficulty';
import { worldEnv } from './env';
import { arenaState } from './arena';
import { fortDamageReduction } from './fort';
// NPC_AI_SPEC §6.2 — the AI's world-sound emitter. Both modules are
// deliberately import-light leaves of the perception layer (sounds.ts pulls
// only playerState + the config JSON; Belief.ts owns the entity-id scheme),
// so pushing sounds from here adds no edge to the AI system's already
// carefully-managed import graph — the same "dependency-free leaf both sides
// import" role game/carts.ts plays (PROJECT_CONTEXT §2). Nothing here READS
// the AI: this file stays the mechanics layer (PROJECT_CONTEXT §8's own
// boundary statement), it just says out loud what it did.
import { emitSound, SOUND_LOUDNESS } from '@/ai/perception/sounds';
import { enemyBeliefId, noiseBeliefId } from '@/ai/perception/Belief';

/** true while standing on a wall/tower top rather than the ground — height
 *  earns a real mechanical edge for ranged combat, not just a viewpoint. */
function onBattlement(): boolean {
  return playerState.y > EYE_HEIGHT + 0.15;
}

/** `Target.kind` values (PlayerController.tsx) driven by holding the attack
 *  button (`combatState.lmbDown`) instead of firing a normal swing/shot —
 *  construction sites originally, gathering ('tree'/'rock'/'fishing'/'herb')
 *  added 2026-07-30 for mechanical consistency with how attacking already
 *  works. The single source both `CombatController`'s mousedown guard (don't
 *  ALSO swing/fire when the hold is meant for the tool in hand) and
 *  `PlayerController`'s own prompt/held-input logic read from. */
export const CLICK_HELD_TARGET_KINDS = new Set(['construct', 'tree', 'rock', 'fishing', 'herb']);

/** Wave 7 · melee is no longer just "the sword or your fists". Mirrors the
 *  existing `rangedWeapon` sub-selector's shape exactly rather than inventing
 *  a second convention for the same job. */
export type MeleeWeaponId = 'sword' | 'halberd' | 'spear';

/** Every weapon the player can ready, melee and ranged in ONE list, in the
 *  order Q cycles them. Both switch points (the equip panel's tile row and
 *  GameScreen's swapWeapon) walk this, so a future weapon reaches both by
 *  being added here once instead of by editing two hardcoded arrays that
 *  already drifted apart before. */
export const WEAPON_SLOTS = ['sword', 'halberd', 'spear', 'crossbow', 'longbow'] as const;
export type WeaponSlot = (typeof WEAPON_SLOTS)[number];

/** which sub-selector a slot writes: `meleeWeapon` or `rangedWeapon` */
export function isMeleeSlot(k: WeaponSlot): k is MeleeWeaponId {
  return k === 'sword' || k === 'halberd' || k === 'spear';
}

export const combatState = {
  hp: 10,
  maxHp: 10,
  stamina: 100,
  maxStamina: 100,
  blocking: false,
  galloping: false,
  /** on-foot sprinting (Shift + moving) — spends stamina the same way galloping does */
  sprinting: false,
  /** LMB currently held (2026-07-20) — set by CombatController's own mousedown/
   *  mouseup listeners, read by PlayerController's hold-to-act loop so
   *  construction can be driven by holding the attack button instead of E */
  lmbDown: false,
  weapon: 'melee' as 'melee' | 'ranged',
  /** which ranged weapon is readied when weapon === 'ranged' */
  rangedWeapon: 'crossbow' as 'crossbow' | 'longbow',
  /** which melee weapon is readied when weapon === 'melee'. 'sword' doubles
   *  as the bare-fisted default (see activeMelee) — nothing is ever guaranteed
   *  to be owned, so this is a PREFERENCE, not a claim of ownership. */
  meleeWeapon: 'sword' as MeleeWeaponId,
  /** performance.now() the longbow draw started, 0 = not drawing */
  drawStart: 0,
  aiming: false,
  /** seconds of remaining hurt-vignette */
  flash: 0,
  /** performance.now() of the last attack swing (viewmodel animation) */
  attackAt: 0,
  /** set by damage logic; PlayerController teleports and clears it */
  teleportTo: null as [number, number] | null,
};

const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
if (w) w.__kkc = combatState;
// debug handle: a smoke test cannot click through pointer lock
if (w) w.__kkfireBolt = () => fireBolt();

// the Iron Grip perk raises the stamina ceiling permanently — react to the
// store rather than gameStore importing combatState (which would create a
// cycle, since combat.ts already imports useGameStore the other way)
useGameStore.subscribe((s) => {
  // I44 · levelling up should be FELT, not just unlock things. Every general
  // level adds a little to both vitals — a point of vigour every three
  // levels, and a steady trickle of stamina — on top of the perk/talent/
  // attribute bonuses that were already here. (Vigour is one bar with a
  // numeric readout since the UI pack's HUD work; there are no hearts.)
  const total = SKILLS.reduce((t, sk) => t + levelFromXp(s.xp[sk.id] ?? 0), 0);
  combatState.maxStamina = Math.round((100
    + Math.round(total * 1.5)                     // general levels
    + (s.perks.includes('iron_grip') ? 15 : 0)
    + (s.skillTree.includes('combat2') ? 10 : 0)  // Second Wind talent
    + (s.attrSpent.courage ?? 0) * 5)             // Courage attribute
    * (s.perks.includes('berserker') ? 0.8 : 1)); // Berserker trade-off: −20%
  // the trade-off perks above are the first thing in this subscriber that
  // can ever make maxStamina go DOWN (every other term here only adds) — a
  // stamina value left above the new lower ceiling from a stale render would
  // read as a free bonus the perk description didn't promise
  combatState.stamina = Math.min(combatState.stamina, combatState.maxStamina);

  const hpBefore = combatState.maxHp;
  combatState.maxHp = 10 + Math.floor(total / 3);
  // new vigour arrives FULL — earning capacity and finding it empty reads as
  // a dilution of the health you had, which is the opposite of a reward
  if (combatState.maxHp > hpBefore) combatState.hp += combatState.maxHp - hpBefore;
});

// 'royal' = the crown's knights, raiding only players who pledged to Cedric
// (Phase 19's alliance branch) — sturdier than a bandit, softer than Gilbert
export type EnemyKind = 'skeleton' | 'bandit' | 'gilbert' | 'cedric' | 'storm' | 'royal';

/** max hp per enemy kind (storm is a duel — the very first landed hit ends it) */
const KIND_HP: Record<EnemyKind, number> = {
  skeleton: 5, bandit: 8, gilbert: 14, cedric: 45, storm: 1, royal: 12,
};
/** a kind's full health, for the aim readout's health bar */
export function maxHpOf(kind: EnemyKind): number {
  return KIND_HP[kind] ?? 1;
}

export const KIND_LABEL: Record<EnemyKind, string> = {
  skeleton: 'Skeleton', bandit: 'Bandit', gilbert: 'Gilbert the Bad', cedric: 'Cedric the Bull', storm: 'Princess Storm', royal: 'Royal Knight',
};
const KIND_XP: Record<EnemyKind, number> = {
  skeleton: 20, bandit: 30, gilbert: 45, cedric: 150, storm: 0, royal: 40,
};
/** ranged kills have always paid a small bonus over melee (see stepBolt) */
const KIND_XP_RANGED: Record<EnemyKind, number> = {
  skeleton: 24, bandit: 34, gilbert: 50, cedric: 165, storm: 0, royal: 45,
};
/** melee damage per hit and attack cooldown, by kind — moved here (were
 *  local to Enemies.tsx's own AI loop) so the Bestiary can surface the same
 *  real numbers the fight itself uses, instead of authoring a second,
 *  driftable copy just for display. */
export const ATTACK_DMG: Record<EnemyKind, number> = {
  skeleton: 1, bandit: 1.5, gilbert: 2, cedric: 3, storm: 0, royal: 2,
};
export const ATTACK_CD: Record<EnemyKind, number> = {
  skeleton: 1.6, bandit: 1.6, gilbert: 1.5, cedric: 1.3, storm: 1.1, royal: 1.4,
};
/** One possible item in an enemy's purse. `chance` is rolled independently per
 *  entry, then a quantity is picked in [min, max] — so a kill can turn up
 *  nothing, a scrap, or a genuinely good haul. */
export interface LootEntry { item: ItemId; min: number; max: number; chance: number }

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
  // Cedric's real reward is the one-time capstone payout in markCedricDefeated
  cedric: [],
  storm: [],
  // a fallen knight's purse and kit — a traitor takes what a traitor can
  royal: [
    { item: 'gold', min: 3, max: 9, chance: 0.9 },
    { item: 'iron_ore', min: 1, max: 2, chance: 0.6 },
    { item: 'iron_bar', min: 1, max: 1, chance: 0.3 },
    { item: 'chestplate', min: 1, max: 1, chance: 0.1 },
  ],
};

/** roll one enemy's carried inventory from its kind's table */
export function rollLoot(kind: EnemyKind): Partial<Record<ItemId, number>> {
  const out: Partial<Record<ItemId, number>> = {};
  for (const e of LOOT_TABLES[kind] ?? []) {
    if (Math.random() >= e.chance) continue;
    const n = e.min + Math.floor(Math.random() * (e.max - e.min + 1));
    if (n > 0) out[e.item] = (out[e.item] ?? 0) + n;
  }
  return out;
}

/** what a fallen enemy actually hands over: its own rolled inventory, falling
 *  back to a fresh roll for anything spawned before inventories existed */
export function lootFor(kindOrData: EnemyKind | EnemyData): Partial<Record<ItemId, number>> {
  if (typeof kindOrData === 'string') return rollLoot(kindOrData);
  return kindOrData.inventory ?? rollLoot(kindOrData.kind);
}

export interface EnemyMob {
  x: number; z: number; yaw: number;
  state: 'wander' | 'chase' | 'attack' | 'dying';
  attackCd: number;
  wanderT: number;
  homeX: number; homeZ: number;
  dieT: number;
  /** broken morale (advanced AI): running for the world edge, despawns there */
  fleeing?: boolean;
  /** rallied by an ally being struck (AI wave 2): chases regardless of the
   *  normal 26m aggro leash while > 0, ticking down each frame */
  alertT?: number;
  /** N79 (requested 2026-07-28): spawned at the road's entry point rather
   *  than popping into existence, and still walking in toward the
   *  homestead — Enemies.tsx routes this via the nav grid instead of the
   *  normal wander/chase FSM until it clears itself close to home. */
  approaching?: boolean;
}

export interface EnemyData {
  id: number;
  kind: EnemyKind;
  hp: number;
  raid: boolean;
  dungeonRoom?: number; // index of the dungeon room this enemy belongs to, if any
  /** spawned by ArenaSpawner.tsx — lets the central kill-resolution paths
   *  below credit game/arena.ts's run-local counter without a second
   *  registry (mirrors dungeonRoom's "which special context spawned this"
   *  role) */
  arena?: boolean;
  /** what this individual is carrying, rolled from its kind's LOOT_TABLE at
   *  spawn — this is what drops when it dies (session-only, never persisted:
   *  enemies don't survive a reload) */
  inventory?: Partial<Record<ItemId, number>>;
  mob: EnemyMob;
  /** this instance's own health ceiling, scaled at spawn (see `scale`) —
   *  `maxHpOf(kind)` stays the flat, unscaled reference value for anything
   *  that isn't a live instance (the Bestiary's "Vigour" entry, in
   *  particular, must keep reading the base number). */
  maxHp: number;
  /** requested 2026-07-28: raiders should scale with real progress, not
   *  spawn at the same fixed strength on day 1 and day 50. Reuses
   *  `difficulty.ts`'s already-exported, previously-unwired `raidStrength()`
   *  — ROADMAP's own O7 fix log already flagged this as the next step
   *  ("raidStrength() is exported and ready, but Enemies.tsx's raider
   *  spawning still uses its own gate"). Fixed at spawn, not re-read every
   *  frame, so a fight doesn't get harder out from under the player mid-
   *  raid if their tier ticks over while they're still fighting. Cedric and
   *  Storm are excluded — both are tuned, named set-piece encounters (Storm
   *  specifically is a 1-HP "first hit ends it" duel; scaling her HP would
   *  break the mechanic outright), not raid filler.
   */
  scale: number;
  /** Cedric's Siege: true only for the sanctioned final-stand fight at his
   *  own camp — every OTHER spawn of kind 'cedric' (a raid-leader cameo, an
   *  ordinary early camp duel) defaults this false, which is what makes him
   *  flee rather than die for good outside that one fight (see the flee-guard
   *  in Enemies.tsx). Meaningless for any other kind. */
  finalStand?: boolean;
  /** Requested 2026-07-30: raiders shouldn't ALL be melee-only. Rolled once
   *  at spawn for bandits (see spawn() below) — a ranged bandit holds at
   *  range and hit-scans instead of closing to melee (Enemies.tsx), and
   *  swaps its held prop from the halberd to the crossbow the same donor
   *  rig already carries. Meaningless for any other kind. */
  ranged?: boolean;
}

let enemySeq = 1;

interface EnemyStore {
  enemies: EnemyData[];
  spawn: (
    kind: EnemyKind, x: number, z: number, raid?: boolean, dungeonRoom?: number,
    approaching?: boolean, finalStand?: boolean, extraScale?: number, arena?: boolean,
  ) => void;
  remove: (id: number) => void;
  clear: () => void;
}

export const useEnemyStore = create<EnemyStore>((set, get) => ({
  enemies: [],
  spawn: (kind, x, z, raid = false, dungeonRoom, approaching = false, finalStand = false, extraScale = 1, arena = false) => {
    // requested 2026-08-03: ArenaSpawner.tsx's own run-local escalation
    // (game/arena.ts's arenaSpawnScale()) layers on top of the existing
    // game-progress curve rather than replacing it — extraScale defaults to
    // 1 so every pre-existing call site is unaffected
    const scale = ((kind === 'cedric' || kind === 'storm') ? 1 : raidStrength()) * extraScale;
    const maxHp = Math.round(KIND_HP[kind] * scale);
    const e: EnemyData = {
      id: enemySeq++,
      kind,
      hp: maxHp,
      maxHp,
      scale,
      raid,
      dungeonRoom,
      arena,
      finalStand,
      // rolled once here rather than threaded through every one of spawn()'s
      // many bandit call sites (the dusk raid, Cedric's war party, camp
      // guards, the Sealed Crypt) — variety everywhere a bandit can appear,
      // for free
      ranged: kind === 'bandit' && Math.random() < 0.4,
      inventory: rollLoot(kind),
      mob: {
        x, z, yaw: Math.random() * Math.PI * 2,
        state: 'wander', attackCd: 0, wanderT: 0,
        homeX: x, homeZ: z, dieT: 0,
        approaching,
      },
    };
    set({ enemies: [...get().enemies, e] });
  },
  remove: (id) => set({ enemies: get().enemies.filter((e) => e.id !== id) }),
  clear: () => set({ enemies: [] }),
}));

if (w) w.__kke = useEnemyStore;

/** passive reduction from worn armor (+ the Ironclad perk) — stacks
 *  additively but capped, so a shield block (75% reduction) stays the
 *  primary defense rather than armor alone making the player untouchable. */
export function armorReduction(inv: Partial<Record<ItemId, number>>, perks: string[] = []): number {
  let r = 0;
  if ((inv.helmet ?? 0) > 0) r += 0.1;
  // Wave 9 · the best plate you own, not just "a plate" (data/armor.ts). The
  // 0.45 ceiling below is untouched and still does its job — a Castle-Crested
  // plate plus helm plus Ironclad now runs into it, which is the point of
  // having it: a shield block stays the primary defense.
  r += bestChestplateOwned(inv)?.reduction ?? 0;
  if (perks.includes('ironclad')) r += 0.05;
  return Math.min(0.45, r);
}

export function damagePlayer(amount: number) {
  const st = useGameStore.getState();
  // Wave 8 · Sound Walls. A closed wall ring around the homestead takes a
  // fifth off every blow landed on you INSIDE it (game/fort.ts). Applied on
  // top of armour rather than into armorReduction's own capped pool, because
  // they are two different investments: plate is what you wear, the ring is
  // what you built, and a knight in full harness behind a finished wall should
  // feel both.
  let dmg = amount * (1 - armorReduction(st.inventory, st.perks)) * (1 - fortDamageReduction());
  if (combatState.blocking && (st.inventory.shield ?? 0) > 0 && combatState.stamina > 10) {
    dmg = Math.max(0, Math.round(dmg * 0.25 * 10) / 10);
    combatState.stamina = Math.max(0, combatState.stamina - 14);
    audio.play('brick_collide', 0.7);
  } else {
    audio.play('thud', 0.9);
  }
  combatState.hp = Math.max(0, combatState.hp - dmg);
  combatState.flash = 0.55;
  // NPC_AI_SPEC §6.2 — a blow landing on the player is the loudest thing that
  // happens in this game, and it is exactly the kind of event the spec wants
  // NPCs to hear rather than see. Emitted here, right beside the `audio.play`
  // above, so what an NPC hears and what the player hears cannot drift apart.
  // The source is `noise:combat`, not `player`: what carries is "a fight, over
  // there" — an unattributed hostile cue that raises threat and seeds a
  // fuzzed-position belief — not the player's own identity, who is never
  // hostile (see perception/Belief.ts's id scheme).
  emitSound(playerState.x, playerState.z, SOUND_LOUDNESS.playerStruck, 'combat',
    noiseBeliefId('combat'), st.destination ?? null);
  if (combatState.hp <= 0) {
    combatState.hp = combatState.maxHp;
    combatState.stamina = combatState.maxStamina;
    // requested 2026-08-03: the arena's own "respawn just outside, redo"
    // rule, checked and returned BEFORE the general path below — per this
    // function's own long-standing comment (just below) anticipating
    // exactly this. Reuses gameStore's leaveArena() (teleport + notify)
    // rather than duplicating it; deliberately no worldEnv.time jump — "a
    // redo, not a punishment" (ROADMAP), unlike the general knockout below.
    if (st.destination === 'arena') {
      st.leaveArena();
      audio.play('horn', 0.5);
      return;
    }
    combatState.teleportTo = [0, 26]; // back to the spawn meadow
    // a knockout away from home (the Sealed Crypt is the first destination
    // with real killable-by-the-player-taking-damage enemies) must also
    // clear `destination` — otherwise the player lands at home-world
    // coordinates while collision/ground-height code still thinks they're
    // at the (very distant) dungeon origin, and the next frame's circular
    // wander-bound clamp yanks them straight back toward it
    if (st.destination) {
      useGameStore.setState({ destination: null });
      resetDungeon();
    }
    // A real 0-HP state (requested 2026-07-28): explicitly not a game-over —
    // a forced recovery. Jumps to just-before-sunrise, the same dawn value
    // gameStore's own sleep() uses for a bed, and clears whatever was
    // pressuring the player. useEnemyStore holds both raid AND dungeon-room
    // enemies (spawn()'s own dungeonRoom param) in one flat array, so one
    // clear() here despawns both: the raid that knocked the player out is
    // called off, and any dungeon-room fight is abandoned along with the
    // layout reset above (an orphaned dungeon-room enemy surviving a
    // discarded layout was already a latent gap this incidentally closes).
    useEnemyStore.getState().clear();
    worldEnv.time = 0.27; // just before sunrise
    st.notify('You were knocked out and carried back to camp… you wake at dawn.', true);
    audio.play('horn', 0.5);
  }
}

// ---- Princess Storm's Battle Dome: a duel-to-first-hit, not a fight to the
// death — whoever lands the first blow ends it (see resolveDuel below). ----
let lastDuelAt = 0;

/** whether enough time has passed since the last duel to challenge her again */
export function canChallengeStorm(): boolean {
  return performance.now() - lastDuelAt > 4000;
}

/** ends an active duel with Storm: reputation/reward on a win, just a
 *  consolation note on a loss — either way she's removed immediately rather
 *  than popping apart like a monster, since she's a recurring character. */
export function resolveDuel(won: boolean, mobId: number) {
  const st = useGameStore.getState();
  lastDuelAt = performance.now();
  useEnemyStore.getState().remove(mobId);
  audio.playVoice('collision_storm', 0.9);
  if (won) {
    st.addReputation('storm', 10);
    st.addXp('combat', 40);
    st.addItems({ gold: 20 }, 'grant');
    st.bumpErrand('duel', 'any', 1); // her first-blood errand counts wins
    audio.playVoice('random_storm', 0.8);
    st.notify('You land the first blow — Storm grins: "Not bad. Care to go again sometime?"', true);
  } else {
    st.notify('Storm’s blade finds you first! "Better luck next time."');
  }
}

if (w) w.__kkResolveDuel = resolveDuel;

export interface MeleeStats {
  /** damage at full condition, and once fully worn */
  dmg: number;
  wornDmg: number;
  /** metres of reach, and the MINIMUM facing dot a target must be within —
   *  1 = dead ahead, 0 = anywhere in the 180° frontal arc */
  reach: number;
  cone: number;
  /** seconds between swings (CombatController's own cooldown) and stamina spent */
  cd: number;
  stamina: number;
  /** true = the swing lands on EVERY foe in the arc, not just the nearest */
  sweep: boolean;
  /** damage multiplier for a couched charge — only ever applied while mounted
   *  AND galloping. 1 = this weapon has no charge. */
  charge: number;
}

/**
 * Wave 7 · the player's melee weapons in one table, instead of the sword's
 * numbers inlined in playerAttack(). The `sword` row is EXACTLY what the game
 * already did (3 / 1.5 worn / 2.5m / 0.55s / 8 stamina / dot > 0.3), so
 * nothing about swinging a sword changed; the other two are deliberate steps
 * off it rather than invented numbers:
 *
 *   halberd — slower and costlier per swing, and its single-target DPS
 *             (4.5/0.95 ≈ 4.7) is deliberately BELOW the sword's (3/0.55 ≈
 *             5.5). What it buys instead is reach and a sweep across the
 *             whole frontal arc, which is what makes it worth carrying into
 *             a raid and pointless in a duel.
 *   spear   — the longest reach in the game and a quicker jab than the
 *             halberd, paid for with the narrowest cone (you must actually be
 *             pointed at what you are stabbing) and less per hit. Its `charge`
 *             is the mounted twin of the ranged weapons' existing battlement
 *             bonus (see onBattlement): momentum earning a real mechanical
 *             edge, not just a posture — a couched lance at a gallop is the
 *             hardest single melee blow in the game, and the only one you
 *             cannot land on foot.
 *
 * Stamina is derived, not guessed: each weapon's cost/cd lands within a
 * whisker of the 14/s regen rate (8/0.55, 14/0.95, 10/0.7 ≈ 14.5, 14.7,
 * 14.3), so no polearm is quietly cheaper to spam than the sword already is.
 */
export const MELEE: Record<MeleeWeaponId, MeleeStats> = {
  sword: { dmg: 3, wornDmg: 1.5, reach: 2.5, cone: 0.3, cd: 0.55, stamina: 8, sweep: false, charge: 1 },
  halberd: { dmg: 4.5, wornDmg: 2.2, reach: 3.3, cone: 0, cd: 0.95, stamina: 14, sweep: true, charge: 1 },
  spear: { dmg: 3.5, wornDmg: 1.8, reach: 3.9, cone: 0.6, cd: 0.7, stamina: 10, sweep: false, charge: 2.2 },
};

/** Which melee weapon is actually in hand. The readied one only counts while
 *  it is still OWNED — selling or losing a halberd has to fall back to the
 *  sword (and the sword to bare fists, which is what 'sword' means when
 *  `inventory.sword` is 0), the same ownership check `rangedMode` has always
 *  made before showing a crossbow. */
export function activeMelee(): MeleeWeaponId {
  const mw = combatState.meleeWeapon;
  if (mw !== 'sword' && (useGameStore.getState().inventory[mw] ?? 0) > 0) return mw;
  return 'sword';
}

/** Resolve ONE landed melee blow: damage, the camp's rally, knockback, and
 *  the kill/loot/notify path if it fell. Split out of playerAttack when the
 *  halberd's sweep made "the single best target" no longer the only shape a
 *  swing can have — a swept kill has to loot, rally and credit the arena
 *  exactly like a thrust one, and that is not a rule worth keeping two
 *  copies of. */
function landMeleeHit(e: EnemyData, d: number, dmg: number) {
  const st = useGameStore.getState();
  const { enemies } = useEnemyStore.getState();
  e.hp -= dmg;
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
  // knockback
  const kb = 0.9;
  const dd = d || 1;
  e.mob.x += ((e.mob.x - playerState.x) / dd) * kb;
  e.mob.z += ((e.mob.z - playerState.z) / dd) * kb;
  if (e.hp <= 0 && e.mob.state !== 'dying') {
    if (e.kind === 'storm') {
      resolveDuel(true, e.id);
      return;
    }
    e.mob.state = 'dying';
    e.mob.dieT = 0;
    st.recordKill(e.kind);
    if (e.arena) arenaState.kills++;
    st.addXp('combat', KIND_XP[e.kind]);
    // hand over what this individual was actually carrying (rolled at spawn)
    const drop = lootFor(e);
    st.addItems(drop, 'grant');
    const haul = Object.entries(drop)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`)
      .join(', ');
    st.notify(haul ? `${KIND_LABEL[e.kind]} defeated! Looted ${haul}.` : `${KIND_LABEL[e.kind]} defeated!`);
    // Cedric's Siege: only the sanctioned final stand ever permanently
    // defeats him — every other spawn of his kind flees well before 0 HP
    // (see Enemies.tsx's flee-guard), so reaching this branch with
    // finalStand unset should be effectively unreachable, but the gate stays
    // as the deliberate second line of defense against that assumption.
    if (e.kind === 'cedric' && e.finalStand) st.markCedricDefeated();
  }
}

/** player melee swing: the readied weapon's own reach/arc, resolved against
 *  the nearest foe in the facing cone — or, for a sweeping polearm, against
 *  every foe in it. Nothing here gates on `ridingState`: a swing from the
 *  saddle has always been the same swing, and the only mounted difference is
 *  the spear's couched-charge multiplier below. */
export function playerAttack(): boolean {
  const st = useGameStore.getState();
  const kind = activeMelee();
  // deliberately not named `w` — that is this module's window handle
  const wp = MELEE[kind];
  if (combatState.stamina < wp.stamina) return false;
  combatState.stamina -= wp.stamina;
  combatState.attackAt = performance.now();
  const held = (st.inventory[kind] ?? 0) > 0;
  // a worn-out weapon still swings, just softer — durability is a nudge
  // toward the workbench, not a hard block on fighting
  const worn = (st.durability[kind] ?? 100) <= 0;
  // Knights' Order passive + Heavy Hand talent: flat melee damage bonuses
  const orderBonus = (st.guild === 'knights' ? 1 : 0) + (st.skillTree.includes('combat3') ? 1 : 0)
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
    if (raiderRamState.active && !raiderRamState.wrecked) {
      const rdx = raiderRamState.x - playerState.x;
      const rdz = raiderRamState.z - playerState.z;
      const rd = Math.hypot(rdx, rdz);
      if (rd < wp.reach + RAM_RADIUS && (rdx * fx + rdz * fz) / (rd || 1) > wp.cone) {
        hitRaiderRam(dmg);
      }
    }
    return true;
  }
  // one impact sound per SWING, not per body a sweep passes through
  audio.play('brick_collide', 0.8);
  for (const h of landed) landMeleeHit(h.e, h.d, dmg);
  return true;
}

if (w) w.__kkAttack = playerAttack;
if (w) w.__kkDamagePlayer = damagePlayer;

// ---- crossbow bolts ----

export interface Bolt {
  id: number;
  kind: 'bolt' | 'arrow';
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  age: number;
  damage: number;
  /** age at which the shaft lodged, so a corpse's bolts linger briefly
   *  rather than vanishing the instant the mob starts its death animation */
  stuckAt?: number;
  /** set on impact: the shaft stops dead and rides the struck character.
   *  `local` is the impact point in that figure's own frame, so the bolt
   *  follows the limb it hit without re-solving anything per frame. */
  stuck?: {
    mobId: number;
    part: RigJoint;
    local: { x: number; y: number; z: number };
    /** flight direction at impact, kept so the shaft still points the way
     *  it was travelling instead of snapping to the mob's facing */
    dir: { x: number; y: number; z: number };
  };
}

let boltSeq = 1;

interface BoltStore {
  bolts: Bolt[];
  add: (b: Bolt) => void;
  remove: (id: number) => void;
}

export const useBoltStore = create<BoltStore>((set, get) => ({
  bolts: [],
  add: (b) => set({ bolts: [...get().bolts, b] }),
  remove: (id) => set({ bolts: get().bolts.filter((x) => x.id !== id) }),
}));

/** fire a crossbow bolt along the camera direction; consumes one bolt item */
/**
 * L62 · How high above the ground a shot leaves your hands. Mounted, that is
 * the saddle plus your own height, not the 1.45m of a man standing — bolts
 * and arrows used to leave from the horse's shoulder while you aimed from a
 * metre higher, so a level shot from the saddle went into the ground.
 */
function muzzleHeight(): number {
  return ridingState.active ? 2.35 : 1.45;
}

export function fireBolt(): boolean {
  const st = useGameStore.getState();
  if ((st.inventory.crossbow ?? 0) < 1) return false;
  if ((st.inventory.bolt ?? 0) < 1) {
    st.notify('Out of bolts! Craft more at the workbench.');
    audio.play('brick_collide', 0.4);
    return false;
  }
  st.addItems({ bolt: -1 });
  const cp = Math.cos(playerState.pitch);
  const dir = {
    x: -Math.sin(playerState.yaw) * cp,
    y: Math.sin(playerState.pitch),
    z: -Math.cos(playerState.yaw) * cp,
  };
  const speed = 30;
  useBoltStore.getState().add({
    id: boltSeq++,
    kind: 'bolt',
    pos: {
      x: playerState.x + dir.x * 0.6,
      y: playerState.y + muzzleHeight() + dir.y * 0.6,
      z: playerState.z + dir.z * 0.6,
    },
    vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    age: 0,
    // A bolt is a spent crafted item fired from a slow, single-shot weapon,
    // so it should hit meaningfully harder than a free sword swing (3): one
    // shot drops a skeleton, two drop a bandit. The battlement bonus stays
    // proportional rather than a flat +1.
    damage: 7 * (onBattlement() ? 1.25 : 1),
  });
  combatState.attackAt = performance.now();
  audio.play('crossbow', 0.8);
  return true;
}

/** min fraction of a full draw needed for the longbow to loose at all */
const MIN_DRAW = 0.18;
/** seconds of holding LMB for a 100%-power longbow draw */
const FULL_DRAW_TIME = 1.1;

/** fire a longbow arrow; power in [0,1] scales speed, range and damage.
 *  consumes one arrow item. Returns false (no shot, no consumption) if the
 *  draw was released too early or ammo is out. */
export function fireArrow(power: number): boolean {
  const st = useGameStore.getState();
  if ((st.inventory.longbow ?? 0) < 1) return false;
  if (power < MIN_DRAW) return false;
  if ((st.inventory.arrow ?? 0) < 1) {
    st.notify('Out of arrows! Craft more at the workbench.');
    audio.play('brick_collide', 0.4);
    return false;
  }
  st.addItems({ arrow: -1 });
  const cp = Math.cos(playerState.pitch);
  const dir = {
    x: -Math.sin(playerState.yaw) * cp,
    y: Math.sin(playerState.pitch),
    z: -Math.cos(playerState.yaw) * cp,
  };
  const speed = 26 + power * 20; // 26..46, faster than a bolt at full draw
  useBoltStore.getState().add({
    id: boltSeq++,
    kind: 'arrow',
    pos: {
      x: playerState.x + dir.x * 0.6,
      y: playerState.y + muzzleHeight() + dir.y * 0.6,
      z: playerState.z + dir.z * 0.6,
    },
    vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    age: 0,
    // 6..16 across the draw: a snap shot is worse than a bolt, a full draw
    // is the strongest single hit in the game — which is the point of a
    // weapon that makes you stand still to use it. +25% from a battlement.
    damage: (6 + power * 10) * (onBattlement() ? 1.25 : 1),
  });
  combatState.attackAt = performance.now();
  audio.play('longbow', 0.85);
  return true;
}

export { MIN_DRAW, FULL_DRAW_TIME };

/** advance one bolt; returns true when it should despawn */
export function stepBolt(b: Bolt, dt: number): boolean {
  const st = useGameStore.getState();
  b.age += dt;
  // Already lodged in someone: stop simulating flight entirely. Bolts.tsx
  // drives its transform from the mob it hit. It clears when that mob is
  // gone, or after a while if the corpse has already been cleaned up.
  if (b.stuck) {
    const owner = useEnemyStore.getState().enemies.find((e) => e.id === b.stuck!.mobId);
    return !owner || owner.mob.state === 'dying' ? b.age > (b.stuckAt ?? 0) + 2.5 : false;
  }
  b.vel.y -= 4.5 * dt; // gentle drop
  const nx = b.pos.x + b.vel.x * dt;
  const ny = b.pos.y + b.vel.y * dt;
  const nz = b.pos.z + b.vel.z * dt;
  // Segment-vs-enemy, tested against that donor's REAL per-part volumes
  // (game/hitbox.ts, measured from the assembled rig). This replaces a
  // single 0.55m sphere parked at a fixed chest height, which both let a
  // shot that visibly missed still connect and made a head shot worth
  // exactly as much as a shin.
  const { enemies } = useEnemyStore.getState();
  let nearest: { e: typeof enemies[number]; hit: PartHit } | null = null;
  for (const e of enemies) {
    if (e.mob.state === 'dying') continue;
    // a duel with Storm is settled sword-to-sword, not from range
    if (e.kind === 'storm') continue;
    const hit = hitTestCharacter(
      String(e.id), e.mob.x, e.mob.z, e.mob.yaw, 0,
      b.pos.x, b.pos.y, b.pos.z, nx, ny, nz,
    );
    if (!hit) continue;
    if (!nearest || hit.t < nearest.hit.t) nearest = { e, hit };
  }
  {
    const e = nearest?.e;
    const hit = nearest?.hit;
    if (e && hit) {
      const mult = PART_DAMAGE[hit.part] ?? 1;
      const dealt = b.damage * mult;
      e.hp -= dealt;
      audio.play('thud', 0.7);
      // NPC_AI_SPEC §6.2 — the ranged counterpart of landMeleeHit's own
      // emission. Quieter than a melee exchange (a shaft landing is one thud,
      // not a running fight), but it still gives the struck mob away.
      emitSound(e.mob.x, e.mob.z, SOUND_LOUDNESS.boltHit, 'combat',
        enemyBeliefId(e.id), st.destination ?? null);
      // the shaft stops in the wound and rides the body from here on
      const inv = 1 / (Math.hypot(b.vel.x, b.vel.y, b.vel.z) || 1);
      b.stuckAt = b.age;
      b.stuck = {
        mobId: e.id,
        part: hit.part,
        local: hit.local,
        dir: { x: b.vel.x * inv, y: b.vel.y * inv, z: b.vel.z * inv },
      };
      if (hit.part === 'head' && e.hp > 0) {
        useGameStore.getState().notify(`${PART_LABEL[hit.part]} shot! ×${mult}`);
      }
      if (e.hp <= 0) {
        e.mob.state = 'dying';
        e.mob.dieT = 0;
        st.recordKill(e.kind);
        if (e.arena) arenaState.kills++;
        st.addXp('combat', KIND_XP_RANGED[e.kind]);
        // a ranged kill dropped NOTHING before 2026-07-20 — only the melee
        // path ever granted loot, so bow/crossbow play quietly paid less
        const rDrop = lootFor(e);
        st.addItems(rDrop, 'grant');
        const rHaul = Object.entries(rDrop)
          .filter(([, n]) => (n ?? 0) > 0)
          .map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`)
          .join(', ');
        st.notify(rHaul ? `${KIND_LABEL[e.kind]} shot down! Looted ${rHaul}.` : `${KIND_LABEL[e.kind]} shot down!`, true);
        // Cedric's Siege: see playerAttack's matching gate above for why.
        if (e.kind === 'cedric' && e.finalStand) st.markCedricDefeated();
      }
      // NOT removed: a stuck bolt stays in the world (Bolts.tsx parents it to
      // the struck mob). It expires with the corpse, not on contact.
      return false;
    }
  }
  // the raiders' ram, tested after the mobs so a raider standing in front of
  // it still soaks the shaft first
  if (raiderRamState.active && !raiderRamState.wrecked) {
    const dx = nx - b.pos.x, dy = ny - b.pos.y, dz = nz - b.pos.z;
    const len2 = dx * dx + dy * dy + dz * dz || 1;
    let t = ((raiderRamState.x - b.pos.x) * dx + (0.9 - b.pos.y) * dy + (raiderRamState.z - b.pos.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = b.pos.x + dx * t, py = b.pos.y + dy * t, pz = b.pos.z + dz * t;
    const d2 = (px - raiderRamState.x) ** 2 + (py - 0.9) ** 2 + (pz - raiderRamState.z) ** 2;
    if (d2 < RAM_RADIUS * RAM_RADIUS) {
      hitRaiderRam(b.damage);
      audio.play('thud', 0.7);
      return true;   // a shaft in timber does not ride along, it drops
    }
  }
  b.pos.x = nx; b.pos.y = ny; b.pos.z = nz;
  return b.pos.y <= 0.05 || b.age > 3;
}

/** shared damage path for the ram: melee and ranged both land here so the
 *  kill notification, sound and salvage happen exactly once */
function hitRaiderRam(amount: number) {
  const broke = damageRaiderRam(amount);
  const st = useGameStore.getState();
  if (!broke) {
    audio.play('brick_collide', 0.5);
    return;
  }
  audio.play('explosion', 0.7);
  // the wreck is worth stripping — it is a cart full of timber and iron
  const salvage = { wood: 4, plank: 2, iron_bar: 1 } as Partial<Record<ItemId, number>>;
  st.addItems(salvage, 'grant');
  st.addXp('combat', 60);
  st.notify("The raiders' ram is wrecked! Salvaged 4× Wood Log, 2× Plank, 1× Iron Bar.", true);
}

if (w) w.__kkBolt = fireBolt;
if (w) w.__kkArrow = fireArrow;
if (w) w.__kkBolts = useBoltStore;
