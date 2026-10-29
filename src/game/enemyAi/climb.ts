// CLN-13 · Wave 58 (H4), the raiders' siege ladder as a raider lives it (the ladder itself is game/raiderLadder.ts):
// whether he makes for it (ladderPull), takes a climb slot at its foot (takeTheLadder), climbs it — or falls, with the
// ladder or the wall it leans on (climb) — and, up on the wall-walk, holds it with nobody in reach (holdBattlement), as
// long as his piece of wall still carries a walk (walkwayStands).
import type { Group } from 'three';
import type { EnemyData } from '@/game/combat';
import type { GameState } from '@/game/store/gameStore';
import { raiderLadderState, MAX_CLIMBERS, CLIMBER_STAGGER, climbPose, ladderFoot, type ClimbPose } from '@/game/raiderLadder';
import { KEEP_PART_BY_ID } from '@/game/data/keep';
import { homeGroundY } from '@/components/world/TemplateWorld';
import { groundUnder, play, stand, type EnemyFrame, type Mob } from './frame';

/** Wave 58 (H4): the siege-ladder-assault raid mechanic's own AI tuning —
 *  see game/raiderLadder.ts for the ladder object itself. */
const LADDER_NOTICE_RADIUS = 24; // how far a raid mob will beeline for a planted ladder
export const CLIMB_RANGE = 1.3;  // close enough to the foot of its rungs to start climbing
// (how the climb itself goes — its two stages, the pull-up — is
// game/raiderLadder.ts's climbPose, and where the foot of the rungs is, its
// ladderFoot)
// scratch for both, so a raid's climbers allocate nothing per frame
const _ladderFoot = { x: 0, z: 0 };
const _climbPose: ClimbPose = { x: 0, y: 0, z: 0, over: false };
/** Where a raider is, `climbT` seconds into his climb of the raiders' ladder:
 *  waiting his turn at the foot of the rungs (addendum #8's staggered queue),
 *  up the rungs, hauled over onto the walk (addendum #5). The ground is taken
 *  where he stands, at the foot of the rungs; a home-only mechanic, same as
 *  raiderRam/raiderLadder themselves. Handed back in the shared scratch. */
export function poseOnLadder(climbT: number): ClimbPose {
  ladderFoot(_ladderFoot);
  return climbPose(climbT, homeGroundY(_ladderFoot.x, _ladderFoot.z), _climbPose);
}
/** kinds excluded from ever climbing: named leaders/specialists and anything
 *  that can't plausibly scale a ladder (a mount, a manned siege engine) —
 *  "a small number of RAIDERS", not the whole raid roster. */
function canClimbLadder(data: EnemyData): boolean {
  return data.raid && data.kind !== 'storm' && data.kind !== 'cedric'
    && data.kind !== 'siegeCrew' && data.kind !== 'caster' && !data.mountAsset;
}

/** Does the keep's piece at `sockId` still stand finished, with a wall-walk on it? — what a raider on the ladder leans
 *  on and one up on the walk stands on. Wave 58 (H4) addendum #3: a defender's own `elevated`/`postY` are recomputed
 *  live every frame from the real, current keep (Defenders.tsx ~109-123) — an elevated RAIDER does the same, not just
 *  once at climb completion. (Enemies.tsx wrote this out twice, the two ways round of the same test.) */
export function walkwayStands(st: GameState, sockId: string | undefined): boolean {
  const partId = sockId ? st.keep?.parts[sockId] : undefined;
  const part = partId ? KEEP_PART_BY_ID[partId] : undefined;
  return !!(sockId && st.keep && (st.keep.built[sockId] ?? 0) >= 1 && part?.walkway);
}

/** Does this raider have a live reason to make for the siege ladder right now? Gated the same way the keep and the
 *  guards are (raid, at home), plus the ladder's own lifecycle (planted, not wrecked, a free climb slot) and
 *  canClimbLadder's own kind exclusions. What he makes for is the foot of its rungs, on the face turned away from the
 *  wall (game/raiderLadder.ts) — not the middle of the prop. */
export function ladderPull(data: EnemyData, enemyAtHome: boolean): { eligible: boolean; d: number; footX: number; footZ: number } {
  const m = data.mob;
  let ladderEligible = false;
  let ladderD = Infinity;
  let ladderFootX = 0;
  let ladderFootZ = 0;
  if (
    // (a climbing raider's frame is climb's, below — it never gets here)
    canClimbLadder(data) && enemyAtHome && !m.elevated
    && raiderLadderState.active && raiderLadderState.planted && !raiderLadderState.wrecked
    && raiderLadderState.climbers.length < MAX_CLIMBERS
  ) {
    ladderFoot(_ladderFoot);
    ladderFootX = _ladderFoot.x;
    ladderFootZ = _ladderFoot.z;
    const dd = Math.hypot(ladderFootX - m.x, ladderFootZ - m.z);
    if (dd < LADDER_NOTICE_RADIUS) { ladderEligible = true; ladderD = dd; }
  }
  return { eligible: ladderEligible, d: ladderD, footX: ladderFootX, footZ: ladderFootZ };
}

/** arrived at the ladder's foot — claim a climb slot (capped at MAX_CLIMBERS, checked by ladderPull) and hand off to
 *  climb from the next frame on */
export function takeTheLadder(data: EnemyData, footX: number, footZ: number): void {
  const m = data.mob;
  const myId = String(data.id);
  if (!raiderLadderState.climbers.includes(myId)) raiderLadderState.climbers.push(myId);
  const slot = raiderLadderState.climbers.indexOf(myId);
  m.state = 'climbing';
  m.ladderSocketId = raiderLadderState.targetSocketId;
  m.climbT = -CLIMBER_STAGGER * slot; // addendum #8: staggered queue
  m.x = footX;
  m.z = footZ;
  m.yaw = raiderLadderState.baseYaw;
}

/** A raider on the ladder ignores everything else until he either reaches the top or the ladder or its wall is pulled
 *  out from under him — a transient state that owns his place, his facing and his clip for as long as it lasts. */
export function climb(f: EnemyFrame, g: Group, st: GameState, dt: number): void {
  const { data } = f;
  const m = data.mob;
  const rl = raiderLadderState;
  if (!rl.active || rl.wrecked || !walkwayStands(st, m.ladderSocketId)) {
    // the ladder broke, or the wall it's leaning on came down under an
    // unrelated siege hit — either way this raider falls, reusing the
    // ordinary death pipeline unchanged (base design + addendum #3).
    rl.climbers = rl.climbers.filter((id) => id !== String(data.id));
    m.state = 'dying';
    m.dieT = 0;
    m.elevated = false;
    stand(g, m, groundUnder(f));
    return;
  }
  m.climbT = (m.climbT ?? 0) + dt;
  const pose = poseOnLadder(m.climbT);
  m.x = pose.x; m.z = pose.z;
  if (pose.over) {
    // over the top — a real combatant now, on the SAME wall-walk the
    // ladder climbed (m.ladderSocketId was set the moment this raider
    // claimed its climb slot, takeTheLadder) — the ordinary chain (now elevated)
    // takes over next frame, same "clears itself, the chain takes over"
    // handoff the walk in from the road uses.
    rl.climbers = rl.climbers.filter((id) => id !== String(data.id));
    m.elevated = true;
    m.postY = rl.topY;
    m.state = 'chase';
  }
  stand(g, m, pose.y);
  // addendum #5: no dedicated climb clip exists in this extraction —
  // reuse anim_c_walk throughout, the frame's own established
  // convention for exactly this situation (the walk in and the flight
  // reuse ordinary walk/run clips rather than inventing one).
  play(f, 'anim_c_walk');
}

/** up on the wall-walk with nobody left in reach — hold the battlement */
export function holdBattlement(m: Mob, dt: number): void {
  m.state = 'wander';
  m.attackCd = Math.max(0, m.attackCd - dt);
}
