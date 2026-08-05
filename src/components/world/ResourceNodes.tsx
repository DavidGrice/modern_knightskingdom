'use client';
import { Suspense, useMemo } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { InstancedProp, type InstancedNode } from './InstancedProps';
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
  return <InstancedProp url={url} height={4.8} nodes={instances} />;
}

function Rock({ node }: { node: ResourceNodeState }) {
  if (node.respawnAt !== null) return null;
  const s = node.scale * (0.7 + 0.3 * (node.hitsLeft / 4));
  const iron = node.variant === 'iron';
  return (
    <group position={[node.x, 0, node.z]} rotation-y={node.yaw}>
      <mesh position-y={0.55 * s} castShadow scale={s}>
        <dodecahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color={iron ? '#4c4a52' : '#8b8b90'} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.7 * s, 0.28 * s, 0.3 * s]} castShadow scale={s * 0.5}>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color={iron ? '#3f3d46' : '#77777c'} roughness={0.95} flatShading />
      </mesh>
      {iron && (
        <>
          {/* rust-colored ore flecks */}
          <mesh position={[0.35 * s, 0.75 * s, 0.4 * s]} scale={s * 0.22}>
            <dodecahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#b8622a" roughness={0.7} flatShading />
          </mesh>
          <mesh position={[-0.4 * s, 0.5 * s, -0.35 * s]} scale={s * 0.18}>
            <dodecahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#a5551f" roughness={0.7} flatShading />
          </mesh>
          <mesh position={[-0.1 * s, 0.95 * s, 0.15 * s]} scale={s * 0.14}>
            <dodecahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#c97434" roughness={0.7} flatShading />
          </mesh>
        </>
      )}
    </group>
  );
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
  return <InstancedProp url={HERB_URL} height={0.35} nodes={instances} selfLit />;
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
  const rocks = useMemo(() => nodes.filter((n) => n.kind === 'rock'), [nodes]);
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
      </Suspense>
      {stumps.map((n) => <TreeStump key={n.id} node={n} />)}
      {rocks.map((n) => <Rock key={n.id} node={n} />)}
      {fishing.map((n) => <FishingSpot key={n.id} node={n} />)}
    </group>
  );
}
