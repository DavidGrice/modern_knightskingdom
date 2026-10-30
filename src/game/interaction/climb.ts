// CLN-26 · where a ladder gets you: the highest thing standing within reach of its top that a person could stand on —
// findTarget's prompt for a ladder and performAction's climb both ask climbTargetFor.
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLE_BY_ID, heightOf, labAssetId, sizeFor } from '@/game/data/buildables';
import { isBuilt, type PlacedBuilding } from '@/game/types';
import { labCanStandOn, labIsLadder } from '@/game/data/labCapabilities';
import { keepWalkwayAt } from '@/game/data/keep';

/** where a ladder gets you, if anywhere: the highest thing standing within
 *  reach of its top that a person could stand on. Null when it is leaning
 *  against nothing — a ladder in open ground is just a ladder. */
interface ClimbTarget { x: number; z: number; y: number; what: string }

/** how far above a ladder's own top you can haul yourself over a parapet */
const PULL_UP = 1.4;
/** where to look for a surface around a ladder's foot: eight compass points at
 *  two ranges, plus the ladder's own cell (a ladder set INTO a wall walk's
 *  footprint is the common case for the keep's 2.4m-deep runs) */
const CLIMB_PROBES: [number, number][] = [[0, 0]];
for (const r of [1.6, 3]) {
  for (let a = 0; a < 8; a++) {
    CLIMB_PROBES.push([Math.cos((a * Math.PI) / 4) * r, Math.sin((a * Math.PI) / 4) * r]);
  }
}


export function climbTargetFor(
  st: ReturnType<typeof useGameStore.getState>,
  ladder: PlacedBuilding,
  // Wave 8 fix (2026-08-06) · live verification found the non-actionable
  // prompt always said "lean this against a wall," even when it plainly WAS
  // leaning and the real problem was reach — one ladder (3.2m) clears a keep
  // walkway (3.6/4.2) but not a placed Castle Wall (5.28m), and the message
  // sent the player back to re-placing instead of stacking a second one. An
  // optional out-param (rather than changing the return type every call site
  // has to handle) lets the label-only caller learn "something real was in
  // range, just too tall" without the other two callers caring.
  info?: { nearAnything?: boolean },
): ClimbTarget | null {
  const base = ladder.y ?? 0;
  // a stacked column of ladders climbs as ONE ladder — that is what makes
  // `stackable: true` on the piece a real answer to a wall too tall for one
  let top = base + heightOf(ladder.type);
  for (const b of st.buildings) {
    if (b.id === ladder.id || !isBuilt(b)) continue;
    if (!labIsLadder(labAssetId(b.type))) continue;
    if (Math.hypot(b.x - ladder.x, b.z - ladder.z) > 2) continue;
    top = Math.max(top, (b.y ?? 0) + heightOf(b.type));
  }
  const reach = top + PULL_UP;
  let best: ClimbTarget | null = null;
  const take = (t: ClimbTarget) => {
    if (t.y <= base + 1) return; // not worth a climb regardless of reach
    if (info) info.nearAnything = true;
    if (t.y > reach) return; // real support, just out of this ladder's reach
    if (!best || t.y > best.y) best = t;
  };
  // the keep's wall walk, sampled through the same footprint rule the floor
  // itself uses, so a climb can never put you down where there is no floor
  for (const [ox, oz] of CLIMB_PROBES) {
    const wx = ladder.x + ox;
    const wz = ladder.z + oz;
    const y = keepWalkwayAt(st.keep, wx, wz);
    if (y > 0) take({ x: wx, z: wz, y, what: 'wall walk' });
  }
  // …and the top of anything placed that a person can stand on
  const [lsx, lsz] = sizeFor(ladder.type, ladder.rot);
  for (const b of st.buildings) {
    if (b.id === ladder.id || !isBuilt(b)) continue;
    // a ladder is a way UP, never the destination — without this a stacked
    // column would always beat the wall it is leaning on, and the climb would
    // put you on top of your own ladder instead of the parapet beside it
    if (labIsLadder(labAssetId(b.type))) continue;
    if (!labCanStandOn(labAssetId(b.type), true)) continue;
    const [sx, sz] = sizeFor(b.type, b.rot);
    // the ladder has to actually be LEANING on it
    const gapX = Math.max(0, Math.abs(b.x - ladder.x) - sx / 2 - lsx / 2);
    const gapZ = Math.max(0, Math.abs(b.z - ladder.z) - sz / 2 - lsz / 2);
    if (Math.hypot(gapX, gapZ) > 1.2) continue;
    take({
      x: b.x, z: b.z, y: (b.y ?? 0) + heightOf(b.type),
      what: BUILDABLE_BY_ID[b.type]?.name ?? 'wall',
    });
  }
  return best;
}
