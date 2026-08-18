'use client';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { InstancedProp, InstancedSubMeshes, type InstancedNode, type SubMesh } from './InstancedProps';
import { FISHING_DOCK } from '@/game/data/world';
import type { ResourceNodeState } from '@/game/types';

// A stopped/chopped tree just leaves a stump — rare and transient (respawns
// in ~35s), so it stays a plain individual mesh rather than instanced.
function TreeStump({ node }: { node: ResourceNodeState }) {
  return (
    <mesh position={[node.x, 0.2, node.z]} rotation-y={node.yaw} castShadow>
      <cylinderGeometry args={[0.28 * node.scale, 0.34 * node.scale, 0.4, 8]} />
      <meshStandardMaterial color="#6b4a2a" roughness={1} />
    </mesh>
  );
}

// Spring/Summer/Autumn/Winter tree tints, multiplied against the model's own
// baked foliage color. A multiply can only darken/shift hue, never brighten
// past the original — so "snow dusted" winter trees aren't achievable this
// way, but a clearly colder, darker slate tone reads as wintry well enough
// without needing new geometry for actual snow caps. Spring/summer stay at
// (or very near) neutral white, i.e. the model's own real baked color.
const SEASON_TREE_TINT = ['#ffffff', '#f2f5df', '#dc9a4d', '#93a8c0'];

// Every living tree sharing one model url renders as instances of that one
// normalized GLB (see InstancedProps.tsx) instead of its own PropModel — same
// look, a fraction of the draw calls once the forest count grows.
function TreeGroup({ url, nodes }: { url: string; nodes: ResourceNodeState[] }) {
  const season = useGameStore((s) => s.season);
  const tint = SEASON_TREE_TINT[season];
  const instances: InstancedNode[] = nodes.map((n) => {
    // shrink slightly as it takes damage
    const health = n.hitsLeft / 3;
    return {
      key: n.id, x: n.x, z: n.z, yaw: n.yaw, scale: n.scale * (0.7 + 0.3 * health), color: tint,
    };
  });
  // frustumCulled=false: one ground's living trees are a small, compact
  // cluster (see InstancedProp's own doc) — the historical case this
  // opt-out was validated for.
  return <InstancedProp url={url} height={4.8} nodes={instances} frustumCulled={false} />;
}

// Wave 16 · rocks were the one resource-node kind still built from inline
// JSX primitives (see InstancedProps.tsx's own comment for why that's fine
// for a one-off but adds up once there are dozens) instead of going through
// the same instancing path trees/herbs already use — flagged in ROADMAP.md's
// performance-pass item (b) and confirmed for real by Wave 16's profiling
// pass (13 rocks / ~26 of the 411 baseline draw calls at the homestead).
// There's no GLB here to hand InstancedProp (trees/herbs), so the two base
// shapes are baked into SubMesh geometries by hand — same idea as
// useInstancedSubMeshes in InstancedProps.tsx (each sub-part's local
// position/scale gets baked into its own geometry at "instance scale 1", so
// a single <Instance scale={n.scale}> at render time reproduces exactly what
// the old per-rock `s` multiplier did to every position and radius) — then
// handed to the same InstancedSubMeshes renderer GLB props use.
const ROCK_MAIN_GEO = new THREE.DodecahedronGeometry(0.9, 0);
const ROCK_CHIP_GEO = new THREE.DodecahedronGeometry(0.8, 0);

function bakedRockPart(base: THREE.BufferGeometry, position: [number, number, number], scale: number): THREE.BufferGeometry {
  const geometry = base.clone();
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion(),
    new THREE.Vector3(scale, scale, scale),
  );
  geometry.applyMatrix4(m);
  return geometry;
}

// Same two colors (main body + chip) plain rocks always had; iron veins add
// three small rust-colored ore flecks — identical positions/scales to the
// original per-rock JSX, just baked once per variant instead of re-created
// (and re-allocated to the GPU) per rock.
function buildRockSubMeshes(iron: boolean): SubMesh[] {
  const subMeshes: SubMesh[] = [
    {
      geometry: bakedRockPart(ROCK_MAIN_GEO, [0, 0.55, 0], 1),
      material: new THREE.MeshStandardMaterial({ color: iron ? '#4c4a52' : '#8b8b90', roughness: 0.95, flatShading: true }),
    },
    {
      geometry: bakedRockPart(ROCK_CHIP_GEO, [0.7, 0.28, 0.3], 0.5),
      material: new THREE.MeshStandardMaterial({ color: iron ? '#3f3d46' : '#77777c', roughness: 0.95, flatShading: true }),
    },
  ];
  if (iron) {
    subMeshes.push(
      {
        geometry: bakedRockPart(ROCK_CHIP_GEO, [0.35, 0.75, 0.4], 0.22),
        material: new THREE.MeshStandardMaterial({ color: '#b8622a', roughness: 0.7, flatShading: true }),
      },
      {
        geometry: bakedRockPart(ROCK_CHIP_GEO, [-0.4, 0.5, -0.35], 0.18),
        material: new THREE.MeshStandardMaterial({ color: '#a5551f', roughness: 0.7, flatShading: true }),
      },
      {
        geometry: bakedRockPart(ROCK_CHIP_GEO, [-0.1, 0.95, 0.15], 0.14),
        material: new THREE.MeshStandardMaterial({ color: '#c97434', roughness: 0.7, flatShading: true }),
      },
    );
  }
  return subMeshes;
}

// One instanced batch per variant (plain vs iron): the two variants need
// different sub-mesh sets (iron adds ore flecks), but every rock within a
// variant shares the exact same shape, exactly like TreeGroup below shares
// one InstancedProp per model url.
function RockGroup({ nodes, iron }: { nodes: ResourceNodeState[]; iron: boolean }) {
  const subMeshes = useMemo(() => buildRockSubMeshes(iron), [iron]);
  const instances: InstancedNode[] = useMemo(
    () => nodes.map((n) => ({
      key: n.id, x: n.x, z: n.z, yaw: n.yaw, scale: n.scale * (0.7 + 0.3 * (n.hitsLeft / 4)),
    })),
    [nodes],
  );
  // frustumCulled=true (real culling): unlike TreeGroup/HerbGroup, a rock
  // ground sits at a fixed spot the player is very often nowhere near or
  // facing — this used to be individual per-mesh <Rock> meshes, each
  // properly culled when off-screen, before this wave's instancing pass.
  // See InstancedSubMeshes' own doc for why real culling is safe here too.
  return <InstancedSubMeshes subMeshes={subMeshes} nodes={instances} frustumCulled />;
}

const HERB_URL = '/assets/props/scenery/l374100.glb';

// O6 · they did not stop existing at night — they stopped being visible.
// respawnAt/hitsLeft (the actual persistence state) have no time-of-day
// component anywhere in the store; a 0.35m ground prop under night's 0.28
// ambient (vs 0.75 by day) is just genuinely hard to see. `selfLit` keeps it
// findable without changing what "persist" actually meant here — the data
// was always there.
function HerbGroup({ nodes }: { nodes: ResourceNodeState[] }) {
  const instances: InstancedNode[] = useMemo(
    () => nodes.map((n) => ({ key: n.id, x: n.x, z: n.z, yaw: n.yaw, scale: n.scale })),
    [nodes],
  );
  // frustumCulled=false: one meadow's herbs are a small, compact cluster —
  // see TreeGroup's identical note above.
  return <InstancedProp url={HERB_URL} height={0.35} nodes={instances} selfLit frustumCulled={false} />;
}

const DOCK_LENGTH = Math.hypot(
  FISHING_DOCK.endX - FISHING_DOCK.startX,
  FISHING_DOCK.endZ - FISHING_DOCK.startZ,
);

// A short dock from the old shore-side sign out over the pond, so fishing
// happens standing at the water's edge looking at it rather than at a
// signpost on dry land. `node` (the interactable) sits at the far end.
function FishingSpot({ node: _node }: { node: ResourceNodeState }) {
  const planks = Math.max(2, Math.round(DOCK_LENGTH / 0.9));
  return (
    <group position={[FISHING_DOCK.startX, 0, FISHING_DOCK.startZ]} rotation-y={FISHING_DOCK.yaw}>
      {/* shore sign, kept for flavor at the dock's start */}
      <mesh position-y={0.5} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 1, 8]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.95, 0.2]} rotation-y={-0.7} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.06]} />
        <meshStandardMaterial color="#8a6234" roughness={1} />
      </mesh>
      {/* deck planking, running the length of the dock */}
      <mesh position={[0, 0.42, DOCK_LENGTH / 2]} receiveShadow castShadow>
        <boxGeometry args={[1.1, 0.08, DOCK_LENGTH]} />
        <meshStandardMaterial color="#7a5a34" roughness={0.95} />
      </mesh>
      {/* support posts down to the waterline */}
      {Array.from({ length: planks + 1 }, (_, i) => (i / planks) * DOCK_LENGTH).map((pz, i) => (
        <group key={i}>
          <mesh position={[-0.45, 0.05, pz]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.75, 6]} />
            <meshStandardMaterial color="#5a3f22" roughness={1} />
          </mesh>
          <mesh position={[0.45, 0.05, pz]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.75, 6]} />
            <meshStandardMaterial color="#5a3f22" roughness={1} />
          </mesh>
        </group>
      ))}
      {/* low railing along the far half, over open water */}
      {[-0.5, 0.5].map((rx) => (
        <mesh key={rx} position={[rx, 0.72, DOCK_LENGTH * 0.6]} castShadow>
          <boxGeometry args={[0.05, 0.5, DOCK_LENGTH * 0.7]} />
          <meshStandardMaterial color="#6b4a2a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export default function ResourceNodes() {
  const allNodes = useGameStore((s) => s.nodes);
  const destination = useGameStore((s) => s.destination);
  // Wave 5 · instance-separation doctrine, the same filter Buildings.tsx
  // already applies: a node belongs to wherever it seeded
  // (ResourceNodeState.world, absent/null = home). Every node was being drawn
  // and instanced no matter which world the player stood in — and away from
  // home they were never even interactable (findTarget's destination branch
  // returns before the node loop), so it was pure cost. Home is unchanged:
  // nothing at the homestead sets `world`, so this stays true for all of it.
  const nodes = useMemo(
    () => allNodes.filter((n) => (n.world ?? null) === (destination ?? null)),
    [allNodes, destination],
  );
  // Split by variant (not just kind): plain and iron rocks bake different
  // sub-mesh sets (RockGroup), so each variant is its own instanced batch —
  // mirrors treesByUrl splitting by model below.
  const { regularRocks, ironRocks } = useMemo(() => {
    const regularRocks: ResourceNodeState[] = [];
    const ironRocks: ResourceNodeState[] = [];
    for (const n of nodes) {
      if (n.kind !== 'rock' || n.respawnAt !== null) continue;
      (n.variant === 'iron' ? ironRocks : regularRocks).push(n);
    }
    return { regularRocks, ironRocks };
  }, [nodes]);
  const fishing = useMemo(() => nodes.filter((n) => n.kind === 'fishing'), [nodes]);
  const { treesByUrl, stumps, herbs } = useMemo(() => {
    const byUrl = new Map<string, ResourceNodeState[]>();
    const stumps: ResourceNodeState[] = [];
    for (const n of nodes) {
      if (n.kind !== 'tree') continue;
      if (n.respawnAt !== null) { stumps.push(n); continue; }
      const list = byUrl.get(n.model!) ?? [];
      list.push(n);
      byUrl.set(n.model!, list);
    }
    return {
      treesByUrl: [...byUrl.entries()],
      stumps,
      herbs: nodes.filter((n) => n.kind === 'herb' && n.respawnAt === null),
    };
  }, [nodes]);
  return (
    <group>
      <Suspense fallback={null}>
        {treesByUrl.map(([url, list]) => <TreeGroup key={url} url={url} nodes={list} />)}
        <HerbGroup nodes={herbs} />
        <RockGroup nodes={regularRocks} iron={false} />
        <RockGroup nodes={ironRocks} iron />
      </Suspense>
      {stumps.map((n) => <TreeStump key={n.id} node={n} />)}
      {fishing.map((n) => <FishingSpot key={n.id} node={n} />)}
    </group>
  );
}
