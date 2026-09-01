'use client';
// J51 · The castle you laid out, standing where you laid it.
//
// The foundation is a stone plate with nine named sockets on it. An empty
// socket shows a low marker course — the outline of what could stand there —
// and reads its name when you look at it. A socket with a piece staked out
// renders that piece through the same construction path as any other site
// (J47/J48): wireframe plan, real stone rising out of the ground with the
// work. A finished piece is simply the piece.
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { useAppStore } from '@/game/store/appStore';
import { KEEP_PART_BY_ID, KEEP_SIZE, KEEP_SOCKETS } from '@/game/data/keep';
import PropModel from './PropModel';
import ConstructionSiteModel from './ConstructionSite';

/** the same trodden stone the road uses — this is a courtyard, not a lawn */
const PLATE_TEX = '/assets/textures/ground/spr177_128x128.png';

function Foundation() {
  const tex = useTexture(PLATE_TEX);
  const { gl } = useThree();
  // Requested 2026-07-31: a real Options setting (Settings.anisotropy,
  // default 8) instead of a bare literal — see Terrain.tsx for the same
  // change against its own hardcoded sites.
  const anisotropy = Math.min(useAppStore((s) => s.settings.anisotropy), gl.capabilities.getMaxAnisotropy());
  useMemo(() => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(KEEP_SIZE / 4, KEEP_SIZE / 4);
    tex.anisotropy = anisotropy;
  }, [tex, anisotropy]);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.05} receiveShadow>
      <planeGeometry args={[KEEP_SIZE, KEEP_SIZE]} />
      <meshStandardMaterial map={tex} roughness={0.98} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function KeepAssembly() {
  const keep = useGameStore((s) => s.keep);
  const destination = useGameStore((s) => s.destination);
  const buildings = useGameStore((s) => s.buildings);
  const openBuildingMenu = useGameStore((s) => s.openBuildingMenu);
  if (!keep || destination) return null;

  return (
    <group
      // Wave 31 · keep.y (was hardcoded 0 — see gameStore.ts's foundKeep for
      // where it's now actually threaded through). Always 0 in practice
      // today (see KeepState.y's own doc), real infrastructure regardless.
      position={[keep.x, keep.y ?? 0, keep.z]}
      // L72's click-to-open-menu, extended to the foundation itself — the
      // keep's own PlacedBuilding (game/store/gameStore.ts's foundKeep) is
      // deliberately not rendered by Buildings.tsx (KeepAssembly already
      // owns every visual here), so it needs its own click handler to reach
      // the same "Move the foundation" action BuildingMenuPanel offers it.
      onClick={(e: any) => {
        const st = useGameStore.getState();
        if (!st.buildMode || st.buildSelection || st.movingBuilding) return;
        const b = buildings.find((x) => x.type === 'keep');
        if (!b) return;
        e.stopPropagation();
        openBuildingMenu(b.id);
      }}
    >
      <Suspense fallback={null}>
        <Foundation />
      </Suspense>
      {KEEP_SOCKETS.map((sock) => {
        const partId = keep.parts[sock.id];
        const part = partId ? KEEP_PART_BY_ID[partId] : null;
        const built = keep.built[sock.id] ?? 0;
        if (!part) {
          // an empty socket: a low course of stone marking out the place, so
          // the shape of the castle-to-be is legible from the first day
          const wide = sock.kind === 'wall' ? 8 : sock.kind === 'corner' ? 4 : 6;
          const deep = sock.kind === 'wall' ? 2.4 : sock.kind === 'corner' ? 4 : 6;
          return (
            <group key={sock.id} position={[sock.x, 0, sock.z]} rotation-y={sock.yaw}>
              <mesh position-y={0.16} receiveShadow>
                <boxGeometry args={[wide, 0.22, deep]} />
                <meshStandardMaterial color="#8d8a80" roughness={0.98} />
              </mesh>
            </group>
          );
        }
        return (
          <group key={sock.id} position={[sock.x, 0, sock.z]} rotation-y={sock.yaw}>
            <Suspense fallback={null}>
              {built >= 1
                ? <PropModel url={part.model} height={part.height} />
                : (
                  // Wave 31 · worldY has to match the outer group's own
                  // elevation, not stay pinned at 0 — ConstructionSite.tsx's
                  // clip plane is a THREE.Plane.constant, evaluated in
                  // ABSOLUTE WORLD SPACE (see that file's own header comment),
                  // never transformed by this socket's parent group. Once
                  // the outer <group> above carries keep.y, the model mesh
                  // rises with it for free, but the clip plane would stay
                  // silently pinned to world Y=0 unless worldY is ALSO
                  // keep.y — the identical pattern Buildings.tsx already uses
                  // (`worldY={y}`, matching its own group's `position-y={y}`).
                  <ConstructionSiteModel
                    url={part.model}
                    size={[4, part.height, 4]}
                    progress={built}
                    worldY={keep.y ?? 0}
                  />
                )}
            </Suspense>
          </group>
        );
      })}
    </group>
  );
}
