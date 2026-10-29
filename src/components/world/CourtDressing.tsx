'use client';
// Phase 20 step 3 (dressing half): set-piece dressing for the court
// instances — a throne dais and crest banners behind King Leo & Queen
// Leonora and stacked quartermaster's stores near John of Mayne, all at
// The King's Approach, plus tilt-barrier lists and pennants on Richard's
// Tourney Grounds. Environment placement exactly like CedricCamp (mounted
// only while visiting, real catalog models), never player buildings. Every
// piece follows the bake's terrain at its OWN x/z (these sites sit on
// slopes — a single group-level height would float one end of the lists
// and bury the other).
// 2026-08-25: John's stores used to sit at The River Landing (template-03,
// hence the old function name `RiverCargo`) — moved here alongside him when
// his NpcDef relocated to The King's Approach (see npcs.ts's own comment on
// why). The crate/barrel models were never actually river-themed (generic
// storage props, same molds reused elsewhere as Workbench/Stockpile/Barrel),
// so only the anchor point and the doc comments needed to move, not the
// dressing itself.
import { Suspense } from 'react';
import { NPC_KING } from '@/game/data/world';
import { NPC_BY_ID } from '@/game/data/npcs';
import { TOURNEY_LISTS } from '@/game/data/tourney';
import { type WorldDestination } from '@/game/data/worlds';
import PropModel from './PropModel';
import { Torch } from './Buildings';
import { Grounded, Pennant, ZERO_OFFSET } from './SceneDressing';

const AC = '/assets/props/castle_accessories';
const SCEN = '/assets/props/scenery';

/** King Leo & Leonora's open-air court: a stone dais bearing the real
 *  throne mold, flanked by the Keep interior's mirrored crest banners and
 *  a pair of standing torches — set just behind where the pair stand. */
function RoyalCourt({ originOffset = ZERO_OFFSET }: { originOffset?: { x: number; z: number } }) {
  const cx = NPC_KING.x;
  const cz = NPC_KING.z + 3.2; // behind the royal pair (they face -Z)
  return (
    <Suspense fallback={null}>
      <Grounded x={cx} z={cz} originOffset={originOffset}>
        <mesh position-y={0.2} castShadow receiveShadow>
          <boxGeometry args={[7, 0.4, 3.4]} />
          <meshStandardMaterial color="#8b8b90" roughness={1} />
        </mesh>
        <group position={[0, 0.4, 0.4]}>
          <PropModel url={`${AC}/10_l407900.glb`} height={1.3} />
        </group>
        <group position={[-2.6, 0.4, 0]}>
          <PropModel url={`${AC}/18_l7196300.glb`} height={1.6} />
        </group>
        <group position={[2.6, 0.4, 0]} scale={[-1, 1, 1]}>
          <PropModel url={`${AC}/18_l7196300.glb`} height={1.6} />
        </group>
      </Grounded>
      <Grounded x={cx - 4.6} z={cz - 1.6} originOffset={originOffset}><Torch /></Grounded>
      <Grounded x={cx + 4.6} z={cz - 1.6} originOffset={originOffset}><Torch /></Grounded>
    </Suspense>
  );
}

/** Richard's lists: a tilt barrier running south from beside his post down
 *  to the tilt field, with a pennant beyond each end. WHERE each piece stands
 *  is data/tourney.ts's TOURNEY_LISTS, laid out from Richard's own post —
 *  this used to hold five world points of its own, typed round where he
 *  stood in the first build, and they stayed behind when he was moved. The
 *  rails are turned a quarter to run along the line, which runs north-south. */
function TourneyLists({ originOffset = ZERO_OFFSET }: { originOffset?: { x: number; z: number } }) {
  return (
    <Suspense fallback={null}>
      {TOURNEY_LISTS.rails.map((rail, i) => (
        <Grounded key={i} x={rail.x} z={rail.z} originOffset={originOffset}>
          <group rotation-y={Math.PI / 2}>
            <PropModel url={`${SCEN}/l607900.glb`} height={1.1} />
          </group>
        </Grounded>
      ))}
      {TOURNEY_LISTS.pennants.map((pennant) => (
        <Grounded key={pennant.color} x={pennant.x} z={pennant.z} originOffset={originOffset}><Pennant color={pennant.color} /></Grounded>
      ))}
    </Suspense>
  );
}

/** John's quartermaster stores: stacked crates and barrels scattered around
 *  wherever he actually stands (see npcs.ts's own NpcDef — never a second
 *  hand-typed literal here, so this can't drift out of sync with him the
 *  way the old river-landing version implicitly could have). Offsets are
 *  unchanged from the original River Landing layout (2026-08-21 and
 *  earlier) — just re-anchored to his current position; the props
 *  themselves were always generic storage molds, never river-specific. */
function QuartermasterStores({ originOffset = ZERO_OFFSET }: { originOffset?: { x: number; z: number } }) {
  const jx = NPC_BY_ID['john'].x;
  const jz = NPC_BY_ID['john'].z;
  return (
    <Suspense fallback={null}>
      <Grounded x={jx - 3} z={jz - 2.5} originOffset={originOffset}>
        <PropModel url={`${SCEN}/l473800.glb`} height={0.6} yaw={0.4} />
      </Grounded>
      <Grounded x={jx + 3.5} z={jz - 1} originOffset={originOffset}>
        <PropModel url={`${SCEN}/l301500.glb`} height={0.7} yaw={1.2} />
      </Grounded>
      <Grounded x={jx + 2.5} z={jz + 2.5} originOffset={originOffset}>
        <PropModel url={`${SCEN}/l248900.glb`} height={0.6} />
      </Grounded>
      <Grounded x={jx - 3.5} z={jz + 2} originOffset={originOffset}>
        <PropModel url={`${SCEN}/l248900.glb`} height={0.6} yaw={0.8} />
      </Grounded>
    </Suspense>
  );
}

/** Scene-isolation rearchitecture · renders whichever SCOPED_DESTINATIONS
 *  member's dressing exists, with `dest.origin` subtracted at each piece's
 *  final position write (via each function's own `originOffset` threading
 *  through Grounded, SceneDressing.tsx) — meant to be mounted inside DestinationScope.tsx's
 *  own origin-offset group. Stage 1 (2026-08-20) added template-01; Stage 2
 *  (2026-08-21) added template-02/template-03 (TourneyLists/RiverCargo, moved
 *  here from this file's old default export, since deleted — CLN-25). template-01 grew a second piece
 *  (2026-08-25): John's stores followed him here from template-03 (see
 *  QuartermasterStores's own comment), which is why that destination's own
 *  case below dropped — nobody lives at The River Landing anymore for it to
 *  dress. Templates 04-08 have no dressing of their own. */
export function DestinationCourtDressing({ dest }: { dest: WorldDestination }) {
  if (dest.id === 'template-01') {
    return (
      <>
        <RoyalCourt originOffset={dest.origin} />
        <QuartermasterStores originOffset={dest.origin} />
      </>
    );
  }
  if (dest.id === 'template-02') return <TourneyLists originOffset={dest.origin} />;
  return null;
}
