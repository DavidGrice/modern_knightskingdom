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
// DEBUG MARKER MODE, DELIBERATELY DISABLED BY DEFAULT (2026-08-03): the
// coordinate transform (scripts/prepare-assets.mjs's map-population step)
// is NOT yet verified — a live calibration pass found the lab applies a
// real -90°-about-X rotation to reach its own SW-corner/Z-up frame
// (confirmed via PAK_ORIENTATION_CATALOG.json's final_root_euler_deg), and
// a hand-derived inverse for the vertical axis produced an even WORSE
// result (computed marker ~1200 world units up on a diorama only ~680
// units tall) than the simpler direct-mapping fallback currently shipped.
// Neither is trusted. `DEBUG_MARKERS` stays `false` so this component is
// fully inert for real players — set it `true` locally to keep iterating:
// every asset_ref group renders as a bright sphere, cheap to eyeball
// against a known-correct reference (King Leo's own hand-placed NPC
// position, `NPC_KING`, game/data/world.ts) before trusting this for real
// spawns. See ROADMAP.md's "Blocked on the Grok mapping" entry.
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
