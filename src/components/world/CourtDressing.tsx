'use client';
// Phase 20 step 3 (dressing half): set-piece dressing for the court
// instances — a throne dais and crest banners behind King Leo & Queen
// Leonora at The King's Approach, tilt-barrier lists and pennants on
// Richard's Tourney Grounds, and dock cargo around John at The River
// Landing. Environment placement exactly like CedricCamp (mounted only
// while visiting, real catalog models), never player buildings. Every
// piece follows the bake's terrain at its OWN x/z (these sites sit on
// slopes — a single group-level height would float one end of the lists
// and bury the other).
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { sampleTemplateGroundY } from './TemplateWorld';
import { NPC_KING } from '@/game/data/world';
import { SCOPED_DESTINATIONS, type WorldDestination } from '@/game/data/worlds';
import PropModel from './PropModel';
import { Torch } from './Buildings';

const AC = '/assets/props/castle_accessories';
const SCEN = '/assets/props/scenery';

// origin-offset for a piece rendered inside DestinationScope.tsx's own
// group (already translated by dest.origin) — every existing call site
// (this file's own default export, GuildHalls.tsx's import of this same
// Grounded) passes nothing and keeps today's absolute-position behavior
// byte-for-byte.
const ZERO_OFFSET = { x: 0, z: 0 };

/** a child group that rides the bake terrain at its own spot, per frame
 *  (the bake streams in async, so a one-shot sample would race the load).
 *  `sampleTemplateGroundY(x, z)` stays the full absolute value regardless of
 *  `originOffset` — a raycast against mountedRoot is nesting-agnostic (see
 *  TemplateWorld.tsx); only the final position write below is local. */
export function Grounded({ x, z, lift = 0, originOffset = ZERO_OFFSET, children }: { x: number; z: number; lift?: number; originOffset?: { x: number; z: number }; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.position.y = sampleTemplateGroundY(x, z) + lift;
  });
  return <group ref={group} position={[x - originOffset.x, 0, z - originOffset.z]}>{children}</group>;
}

/** pennant pole — the same simple procedural flag treatment as ClaimFlag,
 *  in tourney colors */
export function Pennant({ color }: { color: string }) {
  return (
    <group>
      <mesh position-y={1.5} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 3, 6]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
      <mesh position={[0.4, 2.6, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[0.8, 0.5]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

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

/** Richard's lists: a tilt barrier running the joust line (his post toward
 *  the stabled steed) with pennants at either end. */
function TourneyLists({ originOffset = ZERO_OFFSET }: { originOffset?: { x: number; z: number } }) {
  const fenceX = 1292.5; // between Richard (1300, 888) and the steed (1285, 915)
  return (
    <Suspense fallback={null}>
      {[897, 902.5, 908].map((z) => (
        <Grounded key={z} x={fenceX} z={z} originOffset={originOffset}>
          <group rotation-y={Math.PI / 2}>
            <PropModel url={`${SCEN}/l607900.glb`} height={1.1} />
          </group>
        </Grounded>
      ))}
      <Grounded x={fenceX} z={893} originOffset={originOffset}><Pennant color="#b03a2e" /></Grounded>
      <Grounded x={fenceX} z={912} originOffset={originOffset}><Pennant color="#2e5fb0" /></Grounded>
    </Suspense>
  );
}

/** John's quartermaster stores: stacked cargo where the river trade lands. */
function RiverCargo({ originOffset = ZERO_OFFSET }: { originOffset?: { x: number; z: number } }) {
  return (
    <Suspense fallback={null}>
      <Grounded x={1597} z={893.5} originOffset={originOffset}>
        <PropModel url={`${SCEN}/l473800.glb`} height={0.6} yaw={0.4} />
      </Grounded>
      <Grounded x={1603.5} z={895} originOffset={originOffset}>
        <PropModel url={`${SCEN}/l301500.glb`} height={0.7} yaw={1.2} />
      </Grounded>
      <Grounded x={1602.5} z={898.5} originOffset={originOffset}>
        <PropModel url={`${SCEN}/l248900.glb`} height={0.6} />
      </Grounded>
      <Grounded x={1596.5} z={898} originOffset={originOffset}>
        <PropModel url={`${SCEN}/l248900.glb`} height={0.6} yaw={0.8} />
      </Grounded>
    </Suspense>
  );
}

// Stage 2 (2026-08-21): every destination that ever had dressing here
// (template-01/02/03) is now in SCOPED_DESTINATIONS, so this default export
// is permanently inert — the `destination === 'template-02'`/`'template-03'`
// branches it used to carry are gone, not just unreachable (same call the
// old 'template-01' branch got in Stage 1). Left mounted in GameWorld.tsx
// as a harmless no-op rather than pulled, since nothing depends on it being
// gone and removing it is a separate, unrelated cleanup.
export default function CourtDressing() {
  const destination = useGameStore((s) => s.destination);
  if (destination && SCOPED_DESTINATIONS.has(destination)) return null;
  return null;
}

/** Scene-isolation rearchitecture · renders whichever SCOPED_DESTINATIONS
 *  member's dressing exists, with `dest.origin` subtracted at each piece's
 *  final position write (via each function's own `originOffset` threading
 *  through Grounded above) — meant to be mounted inside DestinationScope.tsx's
 *  own origin-offset group. Stage 1 (2026-08-20) added template-01; Stage 2
 *  (2026-08-21) added template-02/template-03 (TourneyLists/RiverCargo,
 *  moved here from the default export above). Templates 04-08 have no
 *  dressing of their own. */
export function DestinationCourtDressing({ dest }: { dest: WorldDestination }) {
  if (dest.id === 'template-01') return <RoyalCourt originOffset={dest.origin} />;
  if (dest.id === 'template-02') return <TourneyLists originOffset={dest.origin} />;
  if (dest.id === 'template-03') return <RiverCargo originOffset={dest.origin} />;
  return null;
}
