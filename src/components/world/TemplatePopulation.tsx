'use client';
// Requested 2026-08-03: spawns the real, catalog-resolvable content the
// Grok map-classification pass found in each template world (`reports/maps/
// template_0N_layout.json`, distilled at build time into
// `src/game/data/mapPopulation.generated.json` by `scripts/prepare-assets.mjs`
// — see that script's own header comment for the coordinate-transform
// derivation and its caveats). Same mount pattern as `CourtDressing.tsx`
// (a top-level sibling in `GameWorld.tsx`, absolute world coordinates, only
// active while actually visiting the destination) — this is meant to grow
// into that file's data-driven successor, not compete with it.
//
// DEBUG MARKER MODE, DELIBERATELY DISABLED BY DEFAULT: the coordinate
// transform itself is now VERIFIED (2026-08-03) — prepare-assets.mjs's
// map-population step negates the up-axis term (see that file's own
// comment for the proof: the old unnegated formula placed King Leo's
// marker above the live bake's own bounding-box max, a geometric
// impossibility). Live confirmation: `DEBUG_MARKERS=true` + a photo-mode
// fly-out to King Leo's marker (script deleted after use) showed the
// marker sitting right on a rocky hillside surface with real terrain
// behind it — not floating in a void, not embedded past the mesh bounds.
//
// NOT yet safe to wire into real content spawning, for a DIFFERENT reason
// found during that same fly-out: the marker sits ~1740 world units from
// this destination's origin — deep inside the diorama's distant hillside,
// far outside `dest.radius` (224, PlayerController's own wander clamp) and
// nowhere near `NPC_KING`'s hand-placed position (game/data/world.ts,
// (1000, 962), a few dozen units from spawn). Despite sharing the exact
// asset id `minifigkingleo00`, this classified group is almost certainly a
// DISTANT BACKGROUND PROCESSION FIGURE baked into the scenic hillside —
// not the same entity as the interactive quest NPC. The original plan's
// assumption that `kind: 'actor'` + a name match is always safe to use for
// *correcting* an existing NpcDef's position (see the plan's Wave 3
// section) is now known to be WRONG at least for this case — doing that
// blindly would strand the quest-bearing King unreachably far from spawn.
// Any future real-content-spawning pass must resolve this ambiguity
// per-group (e.g. proximity to the existing hand-placed NPC as a gate)
// before matching by asset id alone. `DEBUG_MARKERS` stays `false` so this
// component is fully inert for real players; flip it locally to keep
// investigating. See ROADMAP.md's "Blocked on the Grok mapping" entry.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { getBakeOffset } from './TemplateWorld';
import mapPopulation from '@/game/data/mapPopulation.generated.json';

const DEBUG_MARKERS = false;

interface PopulationRow {
  groupId: string;
  kind: string;
  assetRef: string;
  position: number[];
  rotationY: number;
}

/** rides the bake's own recentring offset every frame (the offset is only
 *  final once the GLB has actually loaded — see TemplateWorld.tsx's
 *  getBakeOffset doc comment) rather than trusting a one-shot read. */
function Marker({ localX, localY, localZ, label }: { localX: number; localY: number; localZ: number; label: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const off = getBakeOffset();
    ref.current?.position.set(localX + off.x, localY + off.y + 0.6, localZ + off.z);
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshBasicMaterial color="#ff2244" toneMapped={false} />
      </mesh>
      <mesh position-y={0.7}>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshBasicMaterial color="#ffdd33" toneMapped={false} />
      </mesh>
      {/* label carried in userData for the console-driven verification
          pass rather than a DOM overlay — this is a throwaway debug view */}
      <primitive object={new THREE.Object3D()} userData={{ label }} />
    </group>
  );
}

export default function TemplatePopulation() {
  const destination = useGameStore((s) => s.destination);
  const dest = destination ? WORLD_DESTINATION_BY_ID[destination] : null;
  if (!dest || !destination) return null;
  const rows = (mapPopulation as Record<string, PopulationRow[]>)[destination];
  if (!rows) return null;

  if (DEBUG_MARKERS) {
    return (
      <>
        {rows.map((r) => (
          <Marker
            key={r.groupId}
            localX={dest.origin.x + r.position[0]}
            localY={r.position[1]}
            localZ={dest.origin.z + r.position[2]}
            label={`${r.groupId} (${r.assetRef})`}
          />
        ))}
      </>
    );
  }

  // real content spawning lands here once DEBUG_MARKERS' visual check passes
  return null;
}

if (typeof window !== 'undefined') {
  // debug/verification access only — see this file's own DEBUG_MARKERS note
  (window as unknown as Record<string, unknown>).__kkpop = mapPopulation;
}
