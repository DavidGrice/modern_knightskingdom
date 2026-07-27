'use client';
// The Grand Keep's great hall: a permanent, sealed room furnished with
// original models (throne, crest banners, a banquet table with goblets) and
// the treasure chest extracted from the oc6095b3 jousting-set model. Always
// present in the world at a reserved, empty corner of the map — entering and
// leaving is a teleport (see gameStore enterKeep/exitKeep), so the room has
// no walk-in door and can't be stumbled into from outside.
import { Suspense } from 'react';
import * as THREE from 'three';
import { KEEP_CHEST_POS, KEEP_INTERIOR } from '@/game/data/world';
import { useGameStore } from '@/game/store/gameStore';
import PropModel from './PropModel';
import { Torch } from './Buildings';
import RealPropPart from '../character/RealPropPart';

const ROOM_HEIGHT = 5;
const WALL_T = 0.4;
const AC = '/assets/props/castle_accessories';

function Walls() {
  const { halfX, halfZ } = KEEP_INTERIOR;
  return (
    <group>
      {/* one sealed shell: double-sided so it reads as stone walls/ceiling
          from inside and a solid keep annex from outside */}
      <mesh position={[0, ROOM_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[halfX * 2 + WALL_T * 2, ROOM_HEIGHT, halfZ * 2 + WALL_T * 2]} />
        <meshStandardMaterial color="#6b6b72" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[halfX * 2, 0.06, halfZ * 2]} />
        <meshStandardMaterial color="#9a8a68" roughness={0.9} />
      </mesh>
      {/* a shut gate on the exterior face, hinting this is part of the keep */}
      <Suspense fallback={null}>
        <group position={[0, 0, -halfZ - WALL_T - 0.05]}>
          <PropModel url="/assets/props/windows_doors/06_l318500.glb" height={3} />
        </group>
      </Suspense>
      {/* torches flanking the throne */}
      <group position={[-halfX + 0.8, 0, halfZ - 1.2]}><Torch /></group>
      <group position={[halfX - 0.8, 0, halfZ - 1.2]}><Torch /></group>
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

export default function KeepInteriorRoom() {
  // manual occlusion (Phase 20 perf pass): the furnishings live inside a
  // sealed, windowless room — invisible from anywhere but inside, so they
  // only mount while the player actually is. The walls stay always-on (they
  // ARE the building's visible exterior). The warm ambient light especially
  // must be gated: three.js ambient lights are global, so it was quietly
  // over-lighting the entire outdoor world at all hours.
  const interior = useGameStore((s) => s.interior);
  return (
    <group position={[KEEP_INTERIOR.x, 0, KEEP_INTERIOR.z]}>
      <Walls />
      {interior && (
        <>
          <Throne />
          <Banners />
          <BanquetTable />
          <Chest />
          <ambientLight intensity={0.55} color="#ffd9a8" />
        </>
      )}
    </group>
  );
}
