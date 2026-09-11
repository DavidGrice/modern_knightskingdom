'use client';
// Wave 53 (E1) — a real Agent-driven wildlife population: a small flock of
// ground/perching songbirds roaming the home meadow, the first non-humanoid
// entity in this codebase ever driven by a genuine `agentManager`-spawned
// Agent (Companion.tsx is the template this follows: `agentManager.get(id)`
// -> `stepLocomotion` -> read `agent.position`/`agent.yaw`/`agent.bb`).
//
// ASSET — reuses the existing wild falcon's own donor mesh (l254600, the lab's
// "Parrot"), a SECOND instance at a smaller scale with grounded hop/roam
// behaviour instead of Wildlife.tsx's sky-circling loop: zero new asset
// dependency, zero 404 risk. Exhaustively verified this wave (a full-text
// scan of public/assets/rigs/capabilities.json's 264 entries) that no deer/
// rabbit/second-bird mesh exists anywhere in this project's extraction — see
// this wave's own research notes. Reusing the one real bird mesh a second
// time, honestly, beats inventing a placeholder primitive that would read as
// a visible downgrade next to this game's real-extracted-mesh standard.
//
// RENDERER — plain `useNormalizedProp` (PropModel.tsx), the SAME path
// Wildlife.tsx's own wild falcon already uses for this exact mesh, NOT
// RiggedProp (the renderer Wildlife.tsx's horses use, whose automatic
// gait/graze sway a prior draft of this wave's design assumed would cover
// this bird "for free"). Verified live and found wrong: RiggedProp's
// `loadRiggedProp` requires an OBJ+MTL export under
// public/assets/props/objrig/<id>.* (propRig.ts) — checked that directory's
// real contents (91 files) and confirmed there is no l254600.obj/.mtl pair,
// only the GLB at props/creatures/l254600.glb. `loadRiggedProp` fails open to
// `null` for a missing donor, and RiggedProp renders nothing at all when its
// own `rig` state stays null — so a `<RiggedProp assetId="l254600"/>` would
// have silently rendered an invisible bird, not an animated one. The plain
// GLB path (already proven live by the wild falcon) is what actually works
// for this mesh; the small hop/bob animation below is authored directly here
// instead, the same "manual useFrame sine loop on a raw model" shape
// Wildlife.tsx's own Falcon/Bat already use for the same donor family.
import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useNormalizedProp } from './PropModel';
import { liftBlackMaterials } from './Wildlife';
import { homeGroundY } from './TemplateWorld';
import { agentManager } from '@/ai/core/AgentManager';
import { stepLocomotion } from '@/ai/core/Locomotion';
import { WILDLIFE_POPULATION } from '@/ai/wildlifeSync';

const ASSET_URL = '/assets/props/creatures/l254600.glb';
// A small ground songbird, distinct from the wild falcon's own 0.9 m — the
// same donor mesh at a different scale, per this file's own header.
const HEIGHT = 0.26;

function Songbird({ id }: { id: string }) {
  const model = useNormalizedProp(ASSET_URL, HEIGHT);
  const instance = useMemo(() => {
    const c = model.clone(true);
    // a slightly different, warmer tone than the wild falcon's 0x5a4a38
    // raptor brown — a small, free visual distinction between the two roles
    // sharing one donor mesh
    liftBlackMaterials(c, 0x6b5636);
    return c;
  }, [model]);
  const group = useRef<THREE.Group>(null);
  // desync each bird's own hop clock, same convention as Wildlife.tsx's own
  // Bat `t` ref
  const hopT = useRef(Math.random() * 10);

  useFrame((_, dt) => {
    const g = group.current;
    const agent = agentManager.get(id);
    if (!g || !agent) return;
    stepLocomotion(agent, dt);

    // A small vertical hop/bob in place of RiggedProp's rig-driven idle sway
    // (this mesh has no such rig — see this file's own header). Faster and
    // taller mid-roam (a real hop cadence), a slow gentle bob while paused —
    // never fully static, which is what would otherwise read as a frozen
    // prop rather than a living bird. `gaitSpeed>0.01` is the same threshold
    // RiggedProp's own moving/standing split uses, kept here only as a
    // readable constant, not because anything shares that file's code path.
    const moving = agent.bb.movement.status === 'moving';
    hopT.current += dt * (moving ? 6.5 : 1.3);
    const bob = moving ? Math.abs(Math.sin(hopT.current)) * 0.07 : Math.sin(hopT.current) * 0.015;
    g.position.set(agent.position.x, homeGroundY(agent.position.x, agent.position.z) + bob, agent.position.z);
    g.rotation.y = agent.yaw;
  });

  return (
    <group ref={group}>
      <primitive object={instance} />
    </group>
  );
}

/** Home-meadow only — mounted at `{!destination && <AmbientWildlife/>}` in
 *  GameWorld.tsx, the same gate `Merchant`/`StarterVillage`/`MerchantCamp`
 *  already use, rather than a per-instance destination check the way
 *  Wildlife.tsx's own Horse component needs (every songbird here is
 *  authored home-only — see wildlifeSync.ts's own WILDLIFE_POPULATION). */
export default function AmbientWildlife() {
  return (
    <Suspense fallback={null}>
      {WILDLIFE_POPULATION.map((w) => <Songbird key={w.id} id={w.id} />)}
    </Suspense>
  );
}
