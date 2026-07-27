'use client';
// M · The set you are building, standing on the bench.
//
// The parts already set are solid. The NEXT one is a gold wireframe hanging
// exactly where it will go — the same plan-then-substance language the
// construction sites use (J47/J48), because it is the same idea at a smaller
// scale: you can see the shape of what is coming before you commit to it.
// Everything after that is not drawn at all; a build you can already see the
// end of is not a build.
//
// Modules already finished stay standing beside the one in hand, so a
// ten-module castle accumulates in front of you rather than replacing itself.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { isBuilt, isHomeBuilding } from '@/game/types';
import { MODULE_HEIGHT, SET_PLANS, loadModuleParts, locateStep, type BuildPart } from '@/lib/setBuild';

/** how far in front of the workbench the assembly stands */
const BENCH_OFFSET = 1.9;
/** modules already finished line up beside the one being worked */
const MODULE_SPACING = 2.4;
const GHOST_COLOR = '#e8c141';

function ModuleView({ asset, upto, ghost }: { asset: string; upto: number; ghost: boolean }) {
  const [parts, setParts] = useState<BuildPart[] | null>(null);
  const wire = useRef<THREE.Group>(null);

  useEffect(() => {
    let alive = true;
    loadModuleParts(asset).then((p) => { if (alive) setParts(p); });
    return () => { alive = false; };
  }, [asset]);

  // the solid, already-set pieces
  const solid = useMemo(() => {
    if (!parts) return null;
    const g = new THREE.Group();
    for (let i = 0; i < Math.min(upto, parts.length); i++) g.add(parts[i].object.clone());
    return g;
  }, [parts, upto]);

  // the piece in hand, as a plan
  const next = useMemo(() => {
    if (!parts || !ghost || upto >= parts.length) return null;
    const g = parts[upto].object.clone();
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = new THREE.MeshStandardMaterial({
        color: GHOST_COLOR,
        emissive: GHOST_COLOR,
        emissiveIntensity: 0.55,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
      mesh.castShadow = false;
    });
    return g;
  }, [parts, upto, ghost]);

  // a slow pulse on the plan, so the eye finds the next piece straight away
  useFrame(({ clock }) => {
    const w = wire.current;
    if (!w) return;
    const t = clock.getElapsedTime();
    w.scale.setScalar(1 + Math.sin(t * 3) * 0.012);
  });

  if (!parts) return null;
  return (
    <group>
      {solid && <primitive object={solid} />}
      {next && <group ref={wire}><primitive object={next} /></group>}
    </group>
  );
}

export default function WorkshopBench() {
  const workshop = useGameStore((s) => s.workshop);
  const buildings = useGameStore((s) => s.buildings);
  const destination = useGameStore((s) => s.destination);

  const bench = useMemo(
    () => buildings.find((b) => b.type === 'workbench' && isBuilt(b) && isHomeBuilding(b)) ?? null,
    [buildings],
  );
  if (!workshop || !bench || destination) return null;
  const plan = SET_PLANS[workshop.setNum];
  const at = locateStep(workshop.setNum, workshop.step);
  if (!plan || !at) return null;

  // the bench faces its own rotation; the assembly stands off its front
  const yaw = (bench.rot * Math.PI) / 2;
  const fx = -Math.sin(yaw) * BENCH_OFFSET;
  const fz = -Math.cos(yaw) * BENCH_OFFSET;

  return (
    <group position={[bench.x + fx, bench.y ?? 0, bench.z + fz]} rotation-y={yaw}>
      {plan.modules.map((m, i) => {
        if (i > at.module) return null; // not started — nothing to show yet
        const done = i < at.module;
        // finished modules stand off to the side, oldest furthest out
        const x = done ? -(at.module - i) * MODULE_SPACING : 0;
        return (
          <group key={m.asset} position={[x, 0, 0]} scale={done ? 0.75 : 1}>
            <ModuleView
              asset={m.asset}
              upto={done ? m.steps.length : at.step}
              ghost={!done}
            />
          </group>
        );
      })}
      {/* the trestle the work stands on, so the model is at working height
          rather than lying on the grass */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[2.2, 0.12, 1.6]} />
        <meshStandardMaterial color="#6a4a2a" roughness={0.95} />
      </mesh>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <pointLight position={[0, MODULE_HEIGHT + 0.6, 0.8]} intensity={4} distance={5} color="#ffe6b0" />
    </group>
  );
}

/** the buildables a completed set unlocks, so finishing one is worth doing */
export function unlockedBy(setNum: string): string[] {
  const plan = SET_PLANS[setNum];
  if (!plan) return [];
  return plan.modules.map((m) => m.asset).filter((a) => !!BUILDABLE_BY_ID[a]);
}
