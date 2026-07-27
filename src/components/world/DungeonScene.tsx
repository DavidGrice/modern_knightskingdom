'use client';
// Renders the currently-generated dungeon layout (Phase 17, see game/dungeon.ts):
// stone walls (the same real stonewall model the build menu uses, just placed
// directly rather than through the player's build economy — this is
// environment generation, not a player-owned structure) plus a floor tile
// and a torch or two per room. Enemies aren't rendered here at all — they're
// just ordinary entries in useEnemyStore, already rendered by Enemies.tsx
// regardless of where in the world they are, exactly like every other
// location-agnostic list (buildings, blueprints) this project already relies on.
import { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { dungeonState, ROOM_SIZE, CORRIDOR_LENGTH } from '@/game/dungeon';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import PropModel from './PropModel';
import { Torch } from './Buildings';

const STONEWALL = BUILDABLE_BY_ID.stonewall;

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
  if (!layout) return null;
  const ox = layout.origin.x;
  const oz = layout.origin.z;

  return (
    <group>
      {/* dim, torch-lit mood — deliberately not the bright outdoor fill
          light every real template-world bake needs */}
      <ambientLight intensity={0.35} color="#4a5568" />
      <hemisphereLight args={['#38424f', '#0a0a0a', 0.4]} />

      {layout.rooms.map((room) => {
        const color = room.isBoss ? '#5a2e2e' : room.isEntry ? '#6b5a3a' : '#3f3f45';
        return (
          <group key={room.index}>
            <FloorTile x={room.cx - ox} z={room.cz - oz} w={ROOM_SIZE} d={ROOM_SIZE} color={color} />
            <Suspense fallback={null}>
              <group position={[room.cx - ox - ROOM_SIZE / 2 + 1.4, 0, room.cz - oz - ROOM_SIZE / 2 + 1.4]}>
                <Torch />
              </group>
              <group position={[room.cx - ox + ROOM_SIZE / 2 - 1.4, 0, room.cz - oz + ROOM_SIZE / 2 - 1.4]}>
                <Torch />
              </group>
            </Suspense>
          </group>
        );
      })}

      {/* corridor floor strips between consecutive rooms */}
      {layout.rooms.slice(0, -1).map((room, i) => (
        <FloorTile
          key={`c${i}`}
          x={room.cx - ox + ROOM_SIZE / 2 + CORRIDOR_LENGTH / 2}
          z={room.cz - oz}
          w={CORRIDOR_LENGTH}
          d={4}
          color="#3f3f45"
        />
      ))}

      <Suspense fallback={null}>
        {layout.walls.map((w, i) => (
          <PropModel
            key={i}
            url={STONEWALL.model!}
            height={STONEWALL.size[1]}
            position={[w.x - ox, 0, w.z - oz]}
            yaw={w.rot === 1 ? Math.PI / 2 : 0}
          />
        ))}
      </Suspense>
    </group>
  );
}
