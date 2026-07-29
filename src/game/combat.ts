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
import type { ItemId } from './types';
import { raidStrength } from './difficulty';

/** true while standing on a wall/tower top rather than the ground — height
 *  earns a real mechanical edge for ranged combat, not just a viewpoint. */
function onBattlement(): boolean {
  return playerState.y > EYE_HEIGHT + 0.15;
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
  combatState.maxStamina = 100
    + Math.round(total * 1.5)                     // general levels
    + (s.perks.includes('iron_grip') ? 15 : 0)
    + (s.skillTree.includes('combat2') ? 10 : 0)  // Second Wind talent
    + (s.attrSpent.courage ?? 0) * 5;             // Courage attribute

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
}

export interface EnemyData {
  id: number;
  kind: EnemyKind;
  hp: number;
  raid: boolean;
  dungeonRoom?: number; // index of the dungeon room this enemy belongs to, if any
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
}

let enemySeq = 1;

interface EnemyStore {
  enemies: EnemyData[];
  spawn: (kind: EnemyKind, x: number, z: number, raid?: boolean, dungeonRoom?: number) => void;
  remove: (id: number) => void;
  clear: () => void;
}

export const useEnemyStore = create<EnemyStore>((set, get) => ({
  enemies: [],
  spawn: (kind, x, z, raid = false, dungeonRoom) => {
    const scale = (kind === 'cedric' || kind === 'storm') ? 1 : raidStrength();
    const maxHp = Math.round(KIND_HP[kind] * scale);
    const e: EnemyData = {
      id: enemySeq++,
      kind,
      hp: maxHp,
      maxHp,
      scale,
      raid,
      dungeonRoom,
      inventory: rollLoot(kind),
      mob: {
        x, z, yaw: Math.random() * Math.PI * 2,
        state: 'wander', attackCd: 0, wanderT: 0,
        homeX: x, homeZ: z, dieT: 0,
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
  if ((inv.chestplate ?? 0) > 0) r += 0.2;
  if (perks.includes('ironclad')) r += 0.05;
  return Math.min(0.45, r);
}

export function damagePlayer(amount: number) {
  const st = useGameStore.getState();
  let dmg = amount * (1 - armorReduction(st.inventory, st.perks));
  if (combatState.blocking && (st.inventory.shield ?? 0) > 0 && combatState.stamina > 10) {
    dmg = Math.max(0, Math.round(dmg * 0.25 * 10) / 10);
    combatState.stamina = Math.max(0, combatState.stamina - 14);
    audio.play('brick_collide', 0.7);
  } else {
    audio.play('thud', 0.9);
  }
  combatState.hp = Math.max(0, combatState.hp - dmg);
  combatState.flash = 0.55;
  if (combatState.hp <= 0) {
    combatState.hp = combatState.maxHp;
    combatState.stamina = combatState.maxStamina;
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
    st.notify('You were knocked out and carried back to camp…', true);
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

/** player melee swing: hits the closest enemy in reach within the facing cone */
export function playerAttack(): boolean {
  const st = useGameStore.getState();
  if (combatState.stamina < 8) return false;
  combatState.stamina -= 8;
  combatState.attackAt = performance.now();
  const hasSword = (st.inventory.sword ?? 0) > 0;
  // a worn-out sword still swings, just softer — durability is a nudge
  // toward the workbench, not a hard block on fighting
  const swordWorn = (st.durability.sword ?? 100) <= 0;
  // Knights' Order passive + Heavy Hand talent: flat melee damage bonuses
  const orderBonus = (st.guild === 'knights' ? 1 : 0) + (st.skillTree.includes('combat3') ? 1 : 0)
    + Math.floor((st.attrSpent.might ?? 0) / 2); // Might attribute
  const dmg = (hasSword ? (swordWorn ? 1.5 : 3) : 1) + orderBonus;
  if (hasSword) st.useTool('sword');
  audio.play('sword_swish', hasSword ? 0.8 : 0.45);

  const fx = -Math.sin(playerState.yaw);
  const fz = -Math.cos(playerState.yaw);
  const { enemies } = useEnemyStore.getState();
  let best: EnemyData | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (e.mob.state === 'dying') continue;
    const dx = e.mob.x - playerState.x;
    const dz = e.mob.z - playerState.z;
    const d = Math.hypot(dx, dz);
    if (d > 2.5) continue;
    if ((dx * fx + dz * fz) / (d || 1) < 0.3) continue;
    if (d < bestD) { best = e; bestD = d; }
  }
  // nothing living in reach — but the raiders' ram is a legitimate target,
  // and breaking it before it reaches the gate is the whole point of having
  // defenders on the wall
  if (!best) {
    if (raiderRamState.active && !raiderRamState.wrecked) {
      const rdx = raiderRamState.x - playerState.x;
      const rdz = raiderRamState.z - playerState.z;
      const rd = Math.hypot(rdx, rdz);
      if (rd < 2.5 + RAM_RADIUS && (rdx * fx + rdz * fz) / (rd || 1) > 0.3) {
        hitRaiderRam(dmg);
      }
    }
    return true;
  }
  best.hp -= dmg;
  // the camp rallies (AI wave 2): striking one hostile alerts every fellow
  // within earshot, pulling them into the fight beyond the normal 26m leash
  for (const e of enemies) {
    if (e.id === best.id || e.mob.state === 'dying' || e.kind === 'storm') continue;
    if (Math.hypot(e.mob.x - best.mob.x, e.mob.z - best.mob.z) < 40) e.mob.alertT = 12;
  }
  // knockback
  const kb = 0.9;
  const d = bestD || 1;
  best.mob.x += ((best.mob.x - playerState.x) / d) * kb;
  best.mob.z += ((best.mob.z - playerState.z) / d) * kb;
  audio.play('brick_collide', 0.8);
  if (best.hp <= 0 && best.mob.state !== 'dying') {
    if (best.kind === 'storm') {
      resolveDuel(true, best.id);
      return true;
    }
    best.mob.state = 'dying';
    best.mob.dieT = 0;
    st.recordKill(best.kind);
    st.addXp('combat', KIND_XP[best.kind]);
    // hand over what this individual was actually carrying (rolled at spawn)
    const drop = lootFor(best);
    st.addItems(drop, 'grant');
    const haul = Object.entries(drop)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`)
      .join(', ');
    st.notify(haul ? `${KIND_LABEL[best.kind]} defeated! Looted ${haul}.` : `${KIND_LABEL[best.kind]} defeated!`);
    if (best.kind === 'cedric') st.markCedricDefeated();
  }
  return true;
}

if (w) w.__kkAttack = playerAttack;

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
        if (e.kind === 'cedric') st.markCedricDefeated();
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
