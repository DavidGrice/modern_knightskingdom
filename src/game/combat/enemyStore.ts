'use client';
// CLN-11 · split out of game/combat.ts unchanged: the enemies themselves — one small zustand store (list changes
// re-render; each enemy's position is mutated in place by its own frame loop).
import { create } from 'zustand';
import type { ItemId } from '../types';
import { useGameStore } from '../store/gameStore';
import { raidStrength } from '../difficulty';
import { bossTierScale } from '../bossEncounter';
import { KIND_HP, type EnemyKind } from '../data/enemies';
import { rollLoot } from './loot';
import { addGoods, standingHauls } from '../plunder';

interface EnemyMob {
  x: number; z: number; yaw: number;
  state: 'wander' | 'chase' | 'attack' | 'dying' | 'climbing';
  attackCd: number;
  /** G-10 · swings begun (enemyAi/engage.ts's swingAt): his figure plays its attack clip again on each */
  swings?: number;
  /** G-10 · his swings begun when he last came into the attack stance (swingAt): till one more is — his next swing, at
   *  the least closeIn's 0.4 s hold, at most the rest of his cooldown — his figure stands at rest (engage.ts's
   *  swungInStance) */
  stanceSwings?: number;
  /** G-10 · a shot drawn and not yet loosed: the mark it is drawn at, the seconds left to its release, and whether he
   *  swung on at it this frame (engage.ts's swingAt, dropStaleDraw) */
  draw?: { mark: string; t: number; held: boolean };
  /** G-11 · knocked flat (game/combat/knockdown.ts) — beside `state`, which goes on saying what he was doing: how he
   *  went down, the seconds since, and a blast's throw (m/s, through his flight) */
  knock?: { how: 'backward' | 'forward' | 'flyingbackward' | 'flyingforward'; t: number; vx: number; vz: number };
  /** G-11 · knockdowns taken: his figure plays its fall from its start on each */
  knocks?: number;
  /** G-11 · the seconds left in which, just up from a knockdown, nothing knocks him down again */
  knockGuardT?: number;
  wanderT: number;
  homeX: number; homeZ: number;
  dieT: number;
  /** broken morale (advanced AI): running for the world edge, despawns there — G-06: a raider at home, by the road
   *  (game/enemyAi/movement.ts's escape) */
  fleeing?: boolean;
  /** G-06 · a raider running for the road has come to its entry, and runs on along it off the map */
  pastEntry?: boolean;
  /** rallied by an ally being struck (AI wave 2): chases regardless of the
   *  normal 26m aggro leash while > 0, ticking down each frame */
  alertT?: number;
  /** N79 (requested 2026-07-28): spawned at the road's entry point rather
   *  than popping into existence, and still walking in toward the
   *  homestead — game/enemyAi/movement.ts's walkIn routes this via the nav grid instead of the
   *  normal wander/chase FSM until it clears itself close to home. */
  approaching?: boolean;
  /** G-03 · a raider's own point to walk in to, on his raid's side of home (game/directors/approach.ts) — absent, home's
   *  middle, to within 30 m (a skeleton walking in, a raider with no point open to him) */
  approachX?: number;
  approachZ?: number;
  /** Wave 58 (H4): mid-ascent progress on a siege ladder, seconds since this
   *  raider claimed a climb slot — negative while staggered-queued behind
   *  another climber (game/raiderLadder.ts's own CLIMBER_STAGGER), then
   *  counts up through the two-stage climb (game/raiderLadder.ts's own
   *  CLIMB_STAGE1_S/CLIMB_STAGE2_S, by its climbPose). Meaningless once
   *  `state` leaves 'climbing'. */
  climbT?: number;
  /** Wave 58 (H4): true once this raider has hauled itself onto a keep
   *  wall-walk via the siege ladder. Recomputed live every frame from
   *  `ladderSocketId` against the real, current keep (game/enemyAi/climb.ts's
   *  walkwayStands, the addendum-#3 recheck), so a wall knocked down by an UNRELATED siege hit
   *  drops this raider too, not just a defender. */
  elevated?: boolean;
  /** Wave 58 (H4): the wall-walk's own real height once elevated — the same
   *  role `DefenderState.postY` (game/defenders.ts) plays for a defender,
   *  just carried on the mob itself since EnemyMob has no separate live
   *  position record the way a defender does. */
  postY?: number;
  /** Wave 58 (H4): which keep socket this raider climbed — set the moment it
   *  claims a climb slot, from `raiderLadderState.targetSocketId`
   *  (game/raiderLadder.ts). Drives the "same wall-walk" defender match and
   *  the live wall-still-standing recheck above. */
  ladderSocketId?: string;
}

export interface EnemyData {
  id: number;
  kind: EnemyKind;
  hp: number;
  raid: boolean;
  /** Stage 0a (instance-separation doctrine, Phase 23): which world/
   *  destination this individual belongs to — null means home, otherwise a
   *  WORLD_DESTINATION_BY_ID id (e.g. CEDRIC_WORLD) or the fixed 'dungeon'/
   *  'arena' destinations. Stamped at spawn from whatever `destination` the
   *  player was actually standing in when spawn() ran (every spawn call site
   *  gates on being in the right place first) — UNLESS spawn()'s own
   *  `worldOverride` param is passed, which wins instead (Wave 18 #5
   *  bugfix: the raid trigger (game/directors/raidDirector.ts) fires even while the player is away
   *  at a destination, since every raid spawn position is anchored to
   *  roadEntry()/HOME_X/HOME_Z rather than the player's own live position —
   *  it passes `null` explicitly so a raider is still tagged home, not
   *  wherever the player happened to be standing when the raid started),
   *  mirroring PlacedBuilding.world / VillagerState.world / NpcDef.world /
   *  ResourceNodeState.world. Enemies.tsx filters both its render passes on
   *  this — EXCEPT a home (`null`) enemy, which stays mounted no matter
   *  what the player's own `destination` currently is (Wave 18 #5 bugfix:
   *  a raid must keep moving/fighting/resolving while the player is away,
   *  not freeze the instant they travel). A dungeon/arena/Cedric-camp
   *  spawn is unaffected by that exception and still stops rendering (and
   *  ticking) the moment the player leaves THAT world, same as before. */
  world: string | null;
  dungeonRoom?: number; // index of the dungeon room this enemy belongs to, if any
  /** spawned by the arena's tick — lets the central kill-resolution paths
   *  (melee.ts, projectiles.ts) credit game/arena.ts's run-local counter without a second
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
   *  Storm are excluded from `raidStrength()` — both are tuned, named
   *  set-piece encounters, not raid filler. Wave 38 (A1): Cedric instead
   *  reads his own `bossTierScale('cedric')` curve (game/bossEncounter.ts),
   *  a real but separately-tuned escalation; Storm stays flat 1 — she is a
   *  1-HP "first hit ends it" duel, and scaling her HP would break the
   *  mechanic outright, not generalize it.
   */
  scale: number;
  /** Cedric's Siege: true only for the sanctioned final-stand fight at his
   *  own camp — every OTHER spawn of kind 'cedric' (a raid-leader cameo, an
   *  ordinary early camp duel) defaults this false, which is what makes him
   *  flee rather than die for good outside that one fight (see the flee-guard
   *  in game/enemyAi/movement.ts). Meaningless for any other kind. */
  finalStand?: boolean;
  /** Requested 2026-07-30: raiders shouldn't ALL be melee-only. Rolled once
   *  at spawn for bandits (see spawn() below) — a ranged bandit holds at
   *  range and hit-scans instead of closing to melee (game/enemyAi/), and
   *  swaps its held prop from the halberd to the crossbow the same donor
   *  rig already carries. Meaningless for any other kind. */
  ranged?: boolean;
  /** Wave 36 (A3): which of Cedric's two chargers this mountedRaider rides —
   *  rolled once at spawn (see spawn() below), same "stable for the mob's
   *  whole life" shape as `ranged`. Meaningless for any other kind. */
  mountAsset?: 'l7339231' | 'l7339232';
  /** Wave 37 (A3 remainder) · which real Wave-35 turret asset this siegeCrew
   *  is manning — set once at spawn, same "stable for the mob's whole life"
   *  shape as `mountAsset`. A literal union of one value today (oc6098b1:
   *  the one manual turret with a real swinging-arm rig AND an explicit
   *  `isManualTurret` flag — see labCapabilities.ts's WALL_FIRE_OVERRIDES),
   *  designed to extend to oc6098b2/oc6032b1 later with no structural
   *  change (EnemyFigure.tsx and game/enemyAi/blows.ts already read this generically via
   *  labOccupyMode/labCanFire rather than branching on the id). Meaningless
   *  for any other kind. */
  siegeAsset?: 'oc6098b1';
  /** G-06 · a raider who comes to strip the homestead's stores rather than fight (game/directors/raidTiming.ts's
   *  thiefSlot) — false once he has given up on them: struck with nothing taken yet, or with no way to a store */
  thief?: boolean;
  /** G-06 · what a thief has taken from the stores (game/plunder.ts): dropped with his own purse when he falls
   *  (loot.ts's lootFor), the raid's loss if he gets away */
  carried?: Partial<Record<ItemId, number>>;
}

let enemySeq = 1;

interface EnemyStore {
  enemies: EnemyData[];
  spawn: (
    kind: EnemyKind, x: number, z: number, raid?: boolean, dungeonRoom?: number,
    approaching?: boolean, finalStand?: boolean, extraScale?: number, arena?: boolean,
    worldOverride?: string | null,
  ) => void;
  remove: (id: number) => void;
  clear: () => void;
  /** Stage 3 (Wave 18 #5): drop every enemy stamped with this `world` (see
   *  EnemyData.world above) without touching anyone else's — the scoped
   *  counterpart to `clear()`'s full wipe, for a voluntary exit from a
   *  world-tagged space (dungeon/arena today) rather than a knockout. */
  removeByWorld: (world: string | null) => void;
}

export const useEnemyStore = create<EnemyStore>((set, get) => ({
  enemies: [],
  spawn: (kind, x, z, raid = false, dungeonRoom, approaching = false, finalStand = false, extraScale = 1, arena = false, worldOverride) => {
    // requested 2026-08-03: the arena's own run-local escalation
    // (game/arena.ts's arenaSpawnScale(), passed in by its tickArena) layers
    // on top of the existing game-progress curve rather than replacing it —
    // extraScale defaults to 1 so every pre-existing call site is unaffected
    // Wave 38 (A1): Cedric now reads the shared boss curve instead of a flat
    // 1 — applies to every 'cedric' spawn (final stand, the pre-final-stand
    // camp duel, the raid-leader cameo), harmless for the latter two since he
    // still flees at the same flat CEDRIC_FLEE_HP (game/data/enemies.ts), just takes a
    // few more hits to get there at high tier. Storm stays flat 1: a 1-HP
    // duel has nothing to scale (see bossEncounter.ts's own header comment).
    const scale = (kind === 'storm' ? 1 : kind === 'cedric' ? bossTierScale('cedric') : raidStrength()) * extraScale;
    const maxHp = Math.round(KIND_HP[kind] * scale);
    const e: EnemyData = {
      id: enemySeq++,
      kind,
      hp: maxHp,
      maxHp,
      scale,
      raid,
      // instance-separation doctrine: wherever the player actually is right
      // now IS this enemy's home world — true at every existing call site
      // (each already gates on the right destination before spawning: the
      // dungeon-room loop on destination === 'dungeon', the arena's tick on
      // 'arena', Cedric's camp guards/duel/reinforcements on being at his
      // camp, Storm's duel on her own NPC panel being open, and every raid/
      // night-skeleton spawn on destination being null/home).
      world: worldOverride !== undefined ? worldOverride : (useGameStore.getState().destination ?? null),
      dungeonRoom,
      arena,
      finalStand,
      // rolled once here rather than threaded through every one of spawn()'s
      // many bandit call sites (the dusk raid, Cedric's war party, camp
      // guards, the Sealed Crypt) — variety everywhere a bandit can appear,
      // for free
      ranged: kind === 'bandit' && Math.random() < 0.4,
      // Wave 36 (A3): one of Cedric's own two named chargers, picked once —
      // no reason to weight it, both are the same mechanical mount
      mountAsset: kind === 'mountedRaider' ? (Math.random() < 0.5 ? 'l7339231' : 'l7339232') : undefined,
      // Wave 37 (A3 remainder) · only one asset exists yet, so nothing to
      // roll — see EnemyData.siegeAsset's own comment for why this is
      // designed as a union rather than a fixed string anyway
      siegeAsset: kind === 'siegeCrew' ? 'oc6098b1' : undefined,
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
  removeByWorld: (world) => set({ enemies: get().enemies.filter((e) => (e.world ?? null) !== world) }),
}));

// Stage 3 (Wave 18 #5): dungeon-room and arena enemies were only ever
// dropped from this store on a knockout (damagePlayer's own general clear(),
// playerDamage.ts, which the arena's early-return death branch skips entirely) — never
// on the ordinary voluntary exit (Return Home, or a future exit path). Left uncleared, a partially-cleared dungeon descent's survivor
// re-appears frozen in the NEXT descent's differently-generated layout
// (rooms are numbered from 0 every time, so a stale `dungeonRoom` index
// collides) and permanently blocks that room from ever registering
// `cleared`; arena survivors accumulate release-over-release since the mode
// is explicitly endless, eventually starving game/arena.ts's global
// MAX_TARGET cap for every future session. React to the store here (a
// sibling to the maxStamina subscriber in vitals.ts) rather than gameStore
// importing this module back, which would create a fresh cycle — gameStore
// already imports nothing from the combat modules, and they already import
// useGameStore the other way. Tracking the previous value in a closure
// (rather than reading zustand's second `prevState` argument) mirrors
// the player's pointer-lock panel watcher (components/fps/input/usePointerLock.ts)
// for the same reason:
// simplest thing that works, one clear precedent in this codebase already.
let lastEnemyWorld: string | null = null;
// G-06 · a save counts the haul on every thief still on his feet into its plunder ledger (plunder.ts's standingHauls) —
// one falling has dropped his already (kill.ts), as at a knock-out (playerDamage.ts)
standingHauls.read = () => {
  const out: Partial<Record<ItemId, number>> = {};
  for (const e of useEnemyStore.getState().enemies) if (e.mob.state !== 'dying') addGoods(out, e.carried);
  return out;
};
useGameStore.subscribe((s) => {
  const world = s.destination ?? null;
  // Wave 43 (B6): the 5 newly-active challenge grounds spawn real hostiles
  // scoped to their own destination id exactly like a dungeon room or the
  // arena (EnemyData.world doctrine above) — an ordinary voluntary exit from
  // one needs the same scoped cleanup dungeon/arena already get, or a
  // Defend-the-Plot run left mid-fight would sit inert in the store and
  // reappear alive next visit (challengeModes.ts's own Defend branch also
  // does this cleanup immediately/explicitly on the same-ground-retry path
  // this subscriber alone can't catch, since `destination` never changes
  // there — this generic fix still matters for every OTHER way of leaving).
  if (world !== lastEnemyWorld && (lastEnemyWorld === 'dungeon' || lastEnemyWorld === 'arena' || lastEnemyWorld?.startsWith('challenge-'))) {
    useEnemyStore.getState().removeByWorld(lastEnemyWorld);
  }
  lastEnemyWorld = world;
});
