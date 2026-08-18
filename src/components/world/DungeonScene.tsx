'use client';
// Renders the currently-generated dungeon layout (Phase 17, see game/dungeon.ts):
// stone walls (the same real stonewall model the build menu uses, just placed
// directly rather than through the player's build economy — this is
// environment generation, not a player-owned structure) plus a floor tile
// and a torch or two per room. Enemies aren't rendered here at all — they're
// just ordinary entries in useEnemyStore, already rendered by Enemies.tsx
// regardless of where in the world they are, exactly like every other
// location-agnostic list (buildings, blueprints) this project already relies on.
import { useMemo, useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { dungeonState, type DungeonRoom } from '@/game/dungeon';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { InstancedProp, type InstancedNode } from './InstancedProps';
import { Torch } from './Buildings';
import RealPropPart from '../character/RealPropPart';

const STONEWALL = BUILDABLE_BY_ID.stonewall;

// Wave 13 · the relic a 'retrieve' room asks the player to take (see
// dungeon.ts's DungeonRoom.objective doc). `relicTaken` is a plain mutation
// on the shared dungeonState object (PlayerController.tsx's 'dungeon_relic'
// interact flips it, the exact same "leaf module the frame loop reads"
// pattern Enemies.tsx already uses for `cleared`/`spawned`), so visibility
// is driven by useFrame reading it directly rather than React state —
// mirroring HealthBillboard.tsx's own `g.visible = ...` precedent instead of
// adding a polling re-render for something that changes once per pickup.
function RelicMarker({ room, ox, oz }: { room: DungeonRoom; ox: number; oz: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = !room.relicTaken;
  });
  return (
    <group ref={ref} position={[room.cx - ox, 0.05, room.cz - oz]}>
      <Suspense fallback={null}>
        <RealPropPart id="chest" height={0.55} />
      </Suspense>
      <pointLight intensity={0.7} distance={4.5} color="#e8c141" />
    </group>
  );
}

function FloorTile({ x, z, w, d, color }: { x: number; z: number; w: number; d: number; color: string }) {
  return (
    <mesh position={[x, 0, z]} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

export default function DungeonScene() {
  const layout = useMemo(() => dungeonState.layout, []);
  const ox = layout?.origin.x ?? 0;
  const oz = layout?.origin.z ?? 0;
  // Wave 13 · which real wall mesh this descent rolled (dungeon.ts's
  // WALL_STYLES) — falls back to the always-real 'stonewall' entry if an
  // older in-memory layout somehow lacks the field (defensive only; every
  // fresh generateDungeonLayout() call sets it).
  const wallDef = (layout && BUILDABLE_BY_ID[layout.wallStyle]) ?? STONEWALL;
  // Wave 16 · every wall in one descent shares this same wallDef url+height —
  // only position/yaw differ per segment — so this is the same
  // "many nodes, one url" shape InstancedProp already exists for (see
  // ResourceNodes.tsx's TreeGroup), rather than one PropModel-driven GLB
  // clone+draw-call per wall segment. Flagged for real by Wave 16's
  // profiling pass (dungeon.ts's own item (b) note). Collision is unaffected
  // — navgrid.ts/PlayerController.tsx read `layout.walls` directly, not the
  // rendered mesh. Real frustum culling stays ON (InstancedProp's default) —
  // a whole descent's walls span multiple rooms out to the 96-unit reach
  // limit, nothing like the small compact patches that opt out of it; see
  // InstancedSubMeshes' own doc.
  const wallNodes: InstancedNode[] = useMemo(
    () => (layout ? layout.walls.map((w, i) => ({
      key: `${i}`, x: w.x - ox, z: w.z - oz, yaw: w.rot === 1 ? Math.PI / 2 : 0, scale: 1,
    })) : []),
    [layout, ox, oz],
  );
  if (!layout) return null;

  return (
    <group>
      {/* dim, torch-lit mood — deliberately not the bright outdoor fill
          light every real template-world bake needs */}
      <ambientLight intensity={0.35} color="#4a5568" />
      <hemisphereLight args={['#38424f', '#0a0a0a', 0.4]} />

      {layout.rooms.map((room) => {
        // Wave 13 · a retrieve room reads warmer (a hint of gold) than a
        // plain combat chamber — a small, cheap "something's here" tell
        // that doesn't depend on the relic prop having streamed in yet.
        const color = room.isBoss ? '#5a2e2e' : room.isEntry ? '#6b5a3a'
          : room.objective === 'retrieve' ? '#4a4530' : '#3f3f45';
        return (
          <group key={room.index}>
            <FloorTile x={room.cx - ox} z={room.cz - oz} w={room.halfX * 2} d={room.halfZ * 2} color={color} />
            <Suspense fallback={null}>
              <group position={[room.cx - ox - room.halfX + 1.4, 0, room.cz - oz - room.halfZ + 1.4]}>
                <Torch />
              </group>
              <group position={[room.cx - ox + room.halfX - 1.4, 0, room.cz - oz + room.halfZ - 1.4]}>
                <Torch />
              </group>
            </Suspense>
            {room.objective === 'retrieve' && <RelicMarker room={room} ox={ox} oz={oz} />}
          </group>
        );
      })}

      {/* corridor floor strips — explicit connection data (Phase 2's
          iteration 2.6 nav-grid work is what caught the branching topology
          needing this: array adjacency stopped meaning "connected" the
          moment rooms could have more than one child) rather than inferred
          from array position */}
      {layout.corridors.map((c, i) => (
        <FloorTile
          key={`c${i}`}
          x={(c.x0 + c.x1) / 2 - ox}
          z={(c.z0 + c.z1) / 2 - oz}
          w={c.x1 - c.x0}
          d={c.z1 - c.z0}
          color="#3f3f45"
        />
      ))}

      <Suspense fallback={null}>
        <InstancedProp url={wallDef.model!} height={wallDef.size[1]} nodes={wallNodes} />
      </Suspense>
    </group>
  );
}
