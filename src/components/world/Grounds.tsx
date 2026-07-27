'use client';
// J46 · The boundary of each resource ground, on the ground itself.
//
// A ground you cannot work yet has to be VISIBLE, or the deed you are saving
// for is an abstraction. Each one draws a marker ring in its own colour —
// warm where the deed already covers it, cold and faint where it does not —
// and a boundary stone at the near edge carrying its name.
import { useMemo } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { GROUNDS, groundOpen, type Ground } from '@/game/data/grounds';
import { ROAD_TILE, routeCells } from '@/game/data/road';
import { useGameStore } from '@/game/store/gameStore';
import { deedName } from '@/game/data/grounds';
import { InstancedProp, type InstancedNode } from './InstancedProps';

// O8 · supersedes N75. The boundary used to be flat coloured plane strips —
// clear enough as a debug marker, but not something a holding would build.
// Real wooden fence (the existing buildable, same as the player places) run
// around each section instead, tinted with the same open/locked palette the
// strips used, so the state-legibility stays but the object reads as world
// content rather than a UI overlay drawn on the grass.
const FENCE_URL = '/assets/props/scenery/l607900.glb';
const FENCE_LENGTH = 2.4; // matches the fence buildable's own size[0]
const FENCE_HEIGHT = 1.1; // matches size[1]
const OPEN_TINT = '#ffffff';   // no tint — the piece's own real wood colour
const LOCKED_TINT = '#7e8ba0'; // multiply-darkened, cool slate — "not yet"

// A ground must never lie across the road. Trees growing through the highway
// was the first thing play showed, and both layouts move independently, so
// this is checked rather than remembered.
if (process.env.NODE_ENV !== 'production') {
  const half = ROAD_TILE / 2;
  for (const g of GROUNDS) {
    for (const [cx, cz] of routeCells()) {
      const rx = cx * ROAD_TILE;
      const rz = cz * ROAD_TILE;
      if (Math.abs(g.x - rx) < g.halfX + half && Math.abs(g.z - rz) < g.halfZ + half) {
        // eslint-disable-next-line no-console
        console.warn(`[grounds] ${g.id} lies across the road at tile ${cx},${cz}`);
      }
    }
  }
}

// One fence run around a ground's four edges, evenly spaced (the last
// segment on each edge stretches or squeezes slightly to fit — decorative
// only, nothing here collides, so an exact tile fit is not needed the way it
// is for player-placed pieces). Local to the ground's own centre; the caller
// adds g.x/g.z to land in world space, matching how the single shared
// <InstancedProp> below expects its node list.
function fencePosts(g: Ground): { x: number; z: number; yaw: number }[] {
  const posts: { x: number; z: number; yaw: number }[] = [];
  const addRun = (length: number, along: 'x' | 'z', offset: number, sign: 1 | -1) => {
    const count = Math.max(1, Math.round(length / FENCE_LENGTH));
    const step = length / count;
    for (let i = 0; i < count; i++) {
      const t = -length / 2 + step * (i + 0.5);
      // yaw=0 runs the piece's own length along X, matching sizeFor's
      // rot=0 convention for this same buildable elsewhere in the game
      if (along === 'x') posts.push({ x: t, z: sign * offset, yaw: 0 });
      else posts.push({ x: sign * offset, z: t, yaw: Math.PI / 2 });
    }
  };
  addRun(g.halfX * 2, 'x', g.halfZ, -1); // north edge
  addRun(g.halfX * 2, 'x', g.halfZ, 1);  // south edge
  addRun(g.halfZ * 2, 'z', g.halfX, -1); // west edge
  addRun(g.halfZ * 2, 'z', g.halfX, 1);  // east edge
  return posts;
}

export default function Grounds() {
  const landTier = useGameStore((s) => s.landTier);
  const destination = useGameStore((s) => s.destination);
  // grounds belong to the homestead map; a template world has its own country
  const rings = useMemo(() => GROUNDS.map((g) => ({ g, open: groundOpen(g, landTier) })), [landTier]);

  // one shared InstancedProp call for every ground's fence, rather than one
  // per ground — same reasoning as ResourceNodes.tsx's TreeGroup: a single
  // draw call per sub-mesh beats N separate ones once the count grows
  const fenceNodes: InstancedNode[] = useMemo(() => {
    const out: InstancedNode[] = [];
    for (const { g, open } of rings) {
      const tint = open ? OPEN_TINT : LOCKED_TINT;
      fencePosts(g).forEach((p, i) => {
        out.push({ key: `${g.id}_f${i}`, x: g.x + p.x, z: g.z + p.z, yaw: p.yaw, scale: 1, color: tint });
      });
    }
    return out;
  }, [rings]);

  if (destination) return null;

  return (
    <group>
      <InstancedProp url={FENCE_URL} height={FENCE_HEIGHT} nodes={fenceNodes} />
      {rings.map(({ g, open }) => (
        // a boundary stone on the homestead-facing edge, with the ground's
        // name and — while it is beyond your deed — what buys it
        <group key={g.id} position={[g.x, 0, g.z + (g.z > 0 ? -g.halfZ : g.halfZ)]}>
          <mesh position-y={0.6} castShadow>
            <boxGeometry args={[0.55, 1.2, 0.4]} />
            <meshStandardMaterial color={open ? '#9a9287' : '#6f747c'} roughness={0.95} />
          </mesh>
          <Billboard position={[0, 1.85, 0]}>
            <Text fontSize={0.34} color={open ? '#f4e6c0' : '#b9c2d0'} anchorX="center" outlineWidth={0.02} outlineColor="#1a1a1f">
              {g.name}
            </Text>
            {!open && (
              <Text position={[0, -0.38, 0]} fontSize={0.22} color="#8f9aab" anchorX="center" outlineWidth={0.015} outlineColor="#1a1a1f">
                {`${deedName(g.tier)} deed`}
              </Text>
            )}
          </Billboard>
        </group>
      ))}
    </group>
  );
}
