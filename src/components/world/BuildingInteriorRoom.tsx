'use client';
// Generalised interiors (2026-07-30), replacing the old KeepInteriorRoom.tsx.
// Any building with an entry in data/interiors.ts gets a sealed room here,
// rendered at its own pocket position (data/interiors.ts's pocketFor) while
// `st.interior` names it — same shape the Grand Keep's great hall always
// used: teleport in/out, no walk-in door, invisible from anywhere but
// inside. The Keep keeps its own bespoke furniture (throne, banners,
// banquet table, chest) as extra dressing layered on the same generic
// shell every other interior uses; the room shell itself is the reusable
// part now, not a copy of the Keep's one-off geometry.
import { Suspense } from 'react';
import * as THREE from 'three';
import { KEEP_CHEST_POS, KEEP_INTERIOR } from '@/game/data/world';
import { INTERIORS, pocketFor, type InteriorDef } from '@/game/data/interiors';
import { useGameStore } from '@/game/store/gameStore';
import PropModel from './PropModel';
import { Torch } from './Buildings';
import RealPropPart from '../character/RealPropPart';

const WALL_T = 0.4;
const AC = '/assets/props/castle_accessories';

function Walls({ def }: { def: InteriorDef }) {
  const { halfX, halfZ, height } = def;
  return (
    <group>
      {/* one sealed shell: double-sided so it reads as stone walls/ceiling
          from inside and a solid annex from outside */}
      <mesh position={[0, height / 2, 0]} receiveShadow>
        <boxGeometry args={[halfX * 2 + WALL_T * 2, height, halfZ * 2 + WALL_T * 2]} />
        <meshStandardMaterial color="#6b6b72" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[halfX * 2, 0.06, halfZ * 2]} />
        <meshStandardMaterial color="#9a8a68" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Throne() {
  const { halfZ } = KEEP_INTERIOR;
  return (
    <Suspense fallback={null}>
      <group position={[0, 0, halfZ - 1.2]} rotation-y={Math.PI}>
        <PropModel url={`${AC}/10_l407900.glb`} height={1.3} />
      </group>
    </Suspense>
  );
}

function Banners() {
  const { halfX, halfZ } = KEEP_INTERIOR;
  return (
    <Suspense fallback={null}>
      {/* this asset's baked-in lion artwork comes out upside down after
          PropModel's shared upright flip (it doesn't share the rest of the
          catalog's up-axis convention) — the mount position/facing above is
          correct, so just spin the model 180° about its own depth axis */}
      <group position={[-halfX + 0.35, 0, halfZ - 2.2]} rotation-y={Math.PI / 2}>
        <group rotation-z={Math.PI}>
          <PropModel url={`${AC}/18_l7196300.glb`} height={1.6} />
        </group>
      </group>
      <group position={[halfX - 0.35, 0, halfZ - 2.2]} rotation-y={-Math.PI / 2}>
        <group rotation-z={Math.PI}>
          <PropModel url={`${AC}/18_l7196300.glb`} height={1.6} />
        </group>
      </group>
    </Suspense>
  );
}

function BanquetTable() {
  const { halfX } = KEEP_INTERIOR;
  return (
    <group position={[halfX - 2.2, 0, 0]}>
      <mesh position-y={0.55} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.08, 0.9]} />
        <meshStandardMaterial color="#6b4526" roughness={0.85} />
      </mesh>
      {/* tabletop spans |x|<0.8, |z|<0.45 (boxGeometry above) — keep goblets
          within that and clear of the four leg positions below */}
      {[[-0.5, 0.25], [0, -0.28], [0.5, 0.25]].map(([ox, oz], i) => (
        <Suspense key={i} fallback={null}>
          <group position={[ox, 0.6, oz]}>
            <PropModel url={`${AC}/02_l626900.glb`} height={0.22} />
          </group>
        </Suspense>
      ))}
      {[[-0.7, 0.35], [0.7, 0.35], [-0.7, -0.35], [0.7, -0.35]].map(([ox, oz], i) => (
        <mesh key={i} position={[ox, 0.28, oz]} castShadow>
          <boxGeometry args={[0.08, 0.55, 0.08]} />
          <meshStandardMaterial color="#4a2f1b" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Chest() {
  return (
    <group position={[KEEP_CHEST_POS.x - KEEP_INTERIOR.x, 0, KEEP_CHEST_POS.z - KEEP_INTERIOR.z]}>
      <Suspense
        fallback={
          <mesh position-y={0.25} castShadow>
            <boxGeometry args={[0.6, 0.5, 0.4]} />
            <meshStandardMaterial color="#6b4526" roughness={0.9} />
          </mesh>
        }
      >
        <RealPropPart id="chest" height={0.55} />
      </Suspense>
    </group>
  );
}

function KeepDressing() {
  const { halfX, halfZ } = KEEP_INTERIOR;
  return (
    <>
      {/* a shut gate on the exterior face, hinting this is part of the keep */}
      <Suspense fallback={null}>
        <group position={[0, 0, -halfZ - WALL_T - 0.05]}>
          <PropModel url="/assets/props/windows_doors/06_l318500.glb" height={3} />
        </group>
      </Suspense>
      {/* torches flanking the throne */}
      <group position={[-halfX + 0.8, 0, halfZ - 1.2]}><Torch /></group>
      <group position={[halfX - 0.8, 0, halfZ - 1.2]}><Torch /></group>
      <Throne />
      <Banners />
      <BanquetTable />
      <Chest />
      <ambientLight intensity={0.55} color="#ffd9a8" />
    </>
  );
}

// the Stable's own dressing: hay and a tool rack — plain procedural shapes,
// same "no mold exists for this, keep it simple" rule the barn's own
// exterior already follows (see buildables.ts's 'stable' entry). No
// occupant yet — the first generalised interior with nobody living in it,
// which is honest: real NPC-quest content is its own separate piece of work.
function StableDressing({ def }: { def: InteriorDef }) {
  const { halfX, halfZ } = def;
  return (
    <>
      <group position={[-halfX + 0.9, 0, halfZ - 0.9]}>
        <mesh position-y={0.3} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.6, 1]} />
          <meshStandardMaterial color="#c9a544" roughness={1} />
        </mesh>
      </group>
      <group position={[halfX - 0.3, 0, -halfZ + 0.5]} rotation-y={Math.PI / 2}>
        <mesh position-y={0.9} castShadow>
          <boxGeometry args={[0.08, 1.6, 0.5]} />
          <meshStandardMaterial color="#5d3d20" roughness={0.9} />
        </mesh>
      </group>
      <ambientLight intensity={0.4} color="#fff2d8" />
    </>
  );
}

export default function BuildingInteriorRoom() {
  const interior = useGameStore((s) => s.interior);
  const buildings = useGameStore((s) => s.buildings);
  const building = interior ? buildings.find((b) => b.id === interior) ?? null : null;
  const def = building ? INTERIORS[building.type] : null;
  // manual occlusion: a sealed, windowless pocket room is invisible from
  // anywhere but inside it, so the whole thing — shell included — only
  // mounts while the player actually is (see this file's own header for why
  // that's a safe simplification of the Keep's old "walls always on" rule)
  if (!building || !def) return null;
  const pocket = pocketFor(building.type, building.id);
  return (
    <group position={[pocket.x, 0, pocket.z]}>
      <Walls def={def} />
      {building.type === 'keep' && <KeepDressing />}
      {building.type === 'stable' && <StableDressing def={def} />}
    </group>
  );
}
