'use client';
// A raider-planted siege ladder: the AI-driven counterpart to the player's
// own placeable Siege Stair (`oc6096-5`, buildables.ts — see
// PlayerController's own `climbTargetFor` for the player's climb mechanic
// this mirrors). Spawned occasionally alongside a bandit/royal raid once the
// home keep has at least one finished wall-walk to put it against, it
// trundles in from outside the wall and plants itself there, then a small
// number of raiders (Enemies.tsx's own 'climbing' EnemyMob state) climb it to
// reach — and actually threaten — a battlement that was, until this wave,
// unconditional, permanent safety for a keep-stationed defender.
//
// Wave 58 (H4) design doc + addendum — decisions worth keeping visible here:
// - SINGLETON (addendum #7): raiderLadderState is one plain module-level
//   record, exactly like raiderRamState (game/raiderRam.ts) — only ONE
//   ladder/breach point can be active per raid, however many finished
//   wall-walk sockets the keep has. Deliberate, not an oversight.
// - ENEMY-ONLY SET DRESSING (addendum #9): rendered directly from this state
//   via RiggedProp (RaiderLadder.tsx), never registered as a PlacedBuilding —
//   the player's own `climbTargetFor` (which only scans `st.buildings`) will
//   never recognize or offer to climb this ladder, even though it renders
//   the very same `isLadder`-flagged `oc6096-5` asset the player can climb
//   elsewhere. Deliberate.
// - AWAY-RAID TRADE-OFF (addendum #10): `Defenders.tsx` never targets or
//   damages `raiderRamState` today, and this inherits the identical
//   limitation — a raid that resolves while the player is at a destination
//   cannot be contested by anything but the player. Bounded consequence: an
//   elevated defender who loses a fight is "downed" for `DOWNED_RECOVER_MS`
//   (game/defenders.ts), same as any other defender-downed cause, not
//   permanently lost.
//
// Can be STOPPED like the ram: real HP, takes melee/bolt damage
// (game/combat.ts's `hitRaiderLadder`), and tips over and burns out instead
// of vanishing the instant its HP hits zero.
import { useGameStore } from './store/gameStore';
import { KEEP_PART_BY_ID, SOCKET_BY_ID, WALK_CORNER_HALF, WALK_DEEP_HALF } from './data/keep';

const LADDER_MAX_HP = 22;
/** how close a swing or a shaft has to come to count as a hit — same shape
 *  as raiderRam's own RAM_RADIUS */
export const LADDER_RADIUS = 1.1;
/** addendum #8: at most this many raiders climbing at once */
export const MAX_CLIMBERS = 2;
/** addendum #8: a second, queued climber starts this many seconds after the
 *  first so they don't visually overlap on the same climb path */
export const CLIMBER_STAGGER = 0.6;
/** how far outside a wall-walk's own real footprint (WALK_CORNER_HALF /
 *  WALK_DEEP_HALF, keep.ts) the ladder plants itself — a little clearance
 *  past the edge for the ladder's own ~2m footprint depth (buildables.ts's
 *  oc6096-5 `size`) */
const LADDER_STANDOFF = 1.3;
/** it trundles in from this much further out along the same line, rather
 *  than simply appearing already planted — same "roll in, then hold" shape
 *  as raiderRam.ts */
const LADDER_APPROACH_DIST = 13;

export const raiderLadderState = {
  active: false,
  /** live position while trundling in; once `planted`, sits at baseX/baseZ */
  x: 0, z: 0,
  hp: LADDER_MAX_HP,
  wrecked: false,
  wreckT: 0,
  /** reached baseX/baseZ and stopped — Enemies.tsx's own cross-component
   *  signal (same pattern cedricSiege.ts's own header names) for "raiders
   *  may start climbing" */
  planted: false,
  targetSocketId: '',
  baseX: 0, baseZ: 0,
  /** which way a raider (and the ladder prop itself) faces while planted —
   *  straight into the wall it's leaning on */
  baseYaw: 0,
  /** where a climbing raider ends up: the wall-walk itself */
  topX: 0, topY: 0, topZ: 0,
  /** mob ids (as strings) currently assigned a climb slot (addendum #8),
   *  capped at MAX_CLIMBERS — Enemies.tsx prunes an entry once that raider
   *  dies, is removed, or finishes its climb. */
  climbers: [] as string[],
};

/** Plants a ladder against `socketId`'s own wall-walk — the caller (the raid
 *  trigger, Enemies.tsx) has already confirmed this socket is built and
 *  carries a walkway; this recomputes that same check defensively rather
 *  than trusting it, and is a no-op if it somehow no longer holds.
 *
 *  Deliberately takes only `socketId`, not a separate spawn position: the
 *  natural spawn point is ITSELF derived from the same socket geometry this
 *  function already needs for the planted base, so a caller-supplied
 *  spawnX/spawnZ would just duplicate that math for no benefit. */
export function resetRaiderLadder(socketId: string) {
  const st = useGameStore.getState();
  const keep = st.keep;
  const socket = SOCKET_BY_ID[socketId];
  const partId = keep?.parts[socketId];
  const part = partId ? KEEP_PART_BY_ID[partId] : null;
  if (!keep || !socket || !part?.walkway) return;

  const keepY = keep.y ?? 0;
  // outward normal for this socket — yaw 0 faces -Z, the SAME convention
  // KeepSocket's own doc comment and every atan2(-nx,-nz) yaw recovery in
  // this codebase already use (PlayerController.tsx, Enemies.tsx).
  const nx = -Math.sin(socket.yaw);
  const nz = -Math.cos(socket.yaw);
  const half = socket.kind === 'corner' ? WALK_CORNER_HALF : WALK_DEEP_HALF;
  const wx = keep.x + socket.x;
  const wz = keep.z + socket.z;

  raiderLadderState.targetSocketId = socketId;
  raiderLadderState.baseX = wx + nx * (half + LADDER_STANDOFF);
  raiderLadderState.baseZ = wz + nz * (half + LADDER_STANDOFF);
  raiderLadderState.baseYaw = socket.yaw + Math.PI; // faces back into the wall it leans on
  raiderLadderState.topX = wx;
  raiderLadderState.topZ = wz;
  raiderLadderState.topY = keepY + part.walkway;
  raiderLadderState.x = wx + nx * (half + LADDER_STANDOFF + LADDER_APPROACH_DIST);
  raiderLadderState.z = wz + nz * (half + LADDER_STANDOFF + LADDER_APPROACH_DIST);
  raiderLadderState.active = true;
  raiderLadderState.hp = LADDER_MAX_HP;
  raiderLadderState.wrecked = false;
  raiderLadderState.wreckT = 0;
  raiderLadderState.planted = false;
  raiderLadderState.climbers = [];
}

/** returns true if this blow finished it off */
export function damageRaiderLadder(amount: number): boolean {
  if (!raiderLadderState.active || raiderLadderState.wrecked) return false;
  raiderLadderState.hp -= amount;
  if (raiderLadderState.hp > 0) return false;
  raiderLadderState.hp = 0;
  raiderLadderState.wrecked = true;
  raiderLadderState.wreckT = 0;
  return true;
}

if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__kkLadder = raiderLadderState;
