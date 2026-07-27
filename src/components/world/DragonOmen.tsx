'use client';
// The Dragon (AI wave 2): a rare scripted night flyover — the realm's oldest
// terror crossing the moon high above the homestead, with REAL articulated
// wings. The GLB export is one merged unnamed mesh, so we load the OBJ
// (which keeps per-part `o` names) and slice it by the HUMAN-VERIFIED
// shape→bone map from the Grok rig lab (reports/rigs/l7517400_rig.json):
// wings hinge at their body-side roots and beat, the tail sways, the head
// scans. Pure atmosphere plus its own Deed ("The Omen"); the
// defend-the-keep fire event stays a future stage.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { useGameStore } from '@/game/store/gameStore';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';

const C = '/assets/props/creatures/';
const FLIGHT_SECONDS = 26;
const ALTITUDE = 42;
const WINGSPAN = 11; // world meters across the beat

// l7517400_rig.json (verified 2026-07-18): orig shape -> bone. Hands are the
// wing claws and ride their wing; legs/feet tuck rigid under the body.
const BONE_OF: Record<string, 'body' | 'wing_L' | 'wing_R' | 'tail' | 'head'> = {
  '011_shape2': 'body', '016_shape6': 'body', '019_shape8': 'body',
  '022_shape10': 'body', '026_shape13': 'body', '028_shape14': 'tail',
  '032_shape17': 'wing_R', '036_shape17': 'wing_L',
  '040_shape20': 'wing_R', '044_shape23': 'wing_L',
  '066_shape26': 'head',
};

export interface DragonRig {
  root: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
  tail: THREE.Group;
  head: THREE.Group;
}

/** One dragon in the air at a time — the omen and the siege both check this.
 *  G26 · the siege also publishes WHERE it is each frame, so defenders on the
 *  ground can look up and shoot at it instead of ignoring a target simply
 *  because it is not standing on the floor. */
export const dragonAir = {
  busy: false,
  /** true while the siege dragon is circling and can be shot at */
  hostile: false,
  x: 0, y: 0, z: 0,
  /** the siege owns the hit count; this is how anything else lands one */
  hit: null as null | ((source: string) => void),
};
if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__kkdragonAir = dragonAir;

let rigPromise: Promise<DragonRig> | null = null;

/** Load the OBJ once and re-hang wings/tail/head as pivoted sub-groups.
 *  All slicing math happens in raw OBJ space (model-up is -Y); the returned
 *  root carries the usual upright flip + wingspan normalization. */
export function loadDragonRig(): Promise<DragonRig> {
  if (rigPromise) return rigPromise;
  rigPromise = new Promise((resolve, reject) => {
    const mtl = new MTLLoader();
    mtl.setPath(C);
    mtl.setResourcePath(C);
    mtl.load(
      'l7517400.mtl',
      (materials) => {
        materials.preload();
        const obj = new OBJLoader();
        obj.setMaterials(materials);
        obj.setPath(C);
        obj.load('l7517400.obj', (group) => {
          const byBone = new Map<string, THREE.Mesh[]>();
          group.traverse((c) => {
            const mesh = c as THREE.Mesh;
            if (!mesh.isMesh) return;
            const bone = BONE_OF[mesh.name] ?? 'body';
            byBone.set(bone, [...(byBone.get(bone) ?? []), mesh]);
          });
          const boundsOf = (meshes: THREE.Mesh[]) => {
            const b = new THREE.Box3();
            for (const m of meshes) {
              m.geometry.computeBoundingBox();
              b.union(m.geometry.boundingBox!);
            }
            return b;
          };
          const all = boundsOf([...byBone.values()].flat());
          const center = all.getCenter(new THREE.Vector3());
          const inner = new THREE.Group(); // raw OBJ space
          const hang = (meshes: THREE.Mesh[], pivot: THREE.Vector3) => {
            const g = new THREE.Group();
            g.position.copy(pivot);
            for (const m of meshes) {
              const mm = new THREE.Mesh(m.geometry, m.material);
              mm.position.copy(pivot).negate();
              g.add(mm);
            }
            inner.add(g);
            return g;
          };
          // wings hinge along the forward (z) axis at their body-side root
          const wingsR = byBone.get('wing_R') ?? [];
          const wingsL = byBone.get('wing_L') ?? [];
          const bR = boundsOf(wingsR);
          const bL = boundsOf(wingsL);
          const rootR = new THREE.Vector3(
            Math.abs(bR.min.x - center.x) < Math.abs(bR.max.x - center.x) ? bR.min.x : bR.max.x,
            bR.getCenter(new THREE.Vector3()).y, bR.getCenter(new THREE.Vector3()).z);
          const rootL = new THREE.Vector3(
            Math.abs(bL.min.x - center.x) < Math.abs(bL.max.x - center.x) ? bL.min.x : bL.max.x,
            bL.getCenter(new THREE.Vector3()).y, bL.getCenter(new THREE.Vector3()).z);
          const wingR = hang(wingsR, rootR);
          const wingL = hang(wingsL, rootL);
          // tail pivots where it meets the body; head at its body-side edge
          const tails = byBone.get('tail') ?? [];
          const bT = boundsOf(tails);
          const tailRoot = new THREE.Vector3(
            bT.getCenter(new THREE.Vector3()).x,
            bT.getCenter(new THREE.Vector3()).y,
            Math.abs(bT.min.z - center.z) < Math.abs(bT.max.z - center.z) ? bT.min.z : bT.max.z);
          const tail = hang(tails, tailRoot);
          const heads = byBone.get('head') ?? [];
          const bH = boundsOf(heads);
          const headRoot = new THREE.Vector3(
            bH.getCenter(new THREE.Vector3()).x,
            bH.getCenter(new THREE.Vector3()).y,
            Math.abs(bH.min.z - center.z) < Math.abs(bH.max.z - center.z) ? bH.min.z : bH.max.z);
          const head = hang(heads, headRoot);
          for (const m of byBone.get('body') ?? []) inner.add(m.clone());

          // upright + wingspan normalization + center (model-up is -Y)
          const root = new THREE.Group();
          inner.position.copy(center).negate();
          const holder = new THREE.Group();
          holder.add(inner);
          holder.rotation.x = Math.PI;
          const span = all.max.x - all.min.x || 1;
          const s = WINGSPAN / span;
          holder.scale.setScalar(s);
          root.add(holder);
          resolve({ root, wingL, wingR, tail, head });
        }, undefined, reject);
      },
      undefined,
      reject,
    );
  });
  return rigPromise;
}

function DragonFlight({ onDone }: { onDone: () => void }) {
  const [rig, setRig] = useState<DragonRig | null>(null);
  useEffect(() => {
    let live = true;
    loadDragonRig().then((r) => { if (live) setRig(r); });
    return () => { live = false; };
  }, []);
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);

  // a long diagonal pass over the homestead, moon-high
  const from = useMemo(() => new THREE.Vector3(-160, ALTITUDE, -110), []);
  const to = useMemo(() => new THREE.Vector3(160, ALTITUDE + 10, 120), []);
  const yaw = Math.atan2(-(to.x - from.x), -(to.z - from.z));

  useFrame((_, dt) => {
    const g = group.current;
    if (!g || !rig) return;
    t.current += dt;
    const k = t.current / FLIGHT_SECONDS;
    if (k >= 1) { onDone(); return; }
    g.position.lerpVectors(from, to, k);
    g.position.y += Math.sin(t.current * 1.4) * 2.5; // slow soar-bob
    g.rotation.y = yaw + Math.PI; // model faces +Z; flight forward is the path
    // the beat: wings hinge at their roots, deep and slow like something
    // that has flown for centuries; tail trails the beat, head scans
    const beat = Math.sin(t.current * 3.2);
    rig.wingL.rotation.z = beat * 0.5;
    rig.wingR.rotation.z = -beat * 0.5;
    rig.tail.rotation.x = Math.sin(t.current * 3.2 - 0.9) * 0.14;
    rig.head.rotation.y = Math.sin(t.current * 0.55) * 0.3;
  });

  if (!rig) return null;
  return (
    <group ref={group} position={from.toArray()}>
      <primitive object={rig.root} />
    </group>
  );
}

export default function DragonOmen() {
  const destination = useGameStore((s) => s.destination);
  const [active, setActive] = useState(false);
  const lastNightChecked = useRef(-1);

  useFrame(() => {
    if (destination || active) return;
    // one roll per night, deep in the dark hours
    if (worldEnv.night > 0.85 && worldEnv.dayCount !== lastNightChecked.current && !dragonAir.busy) {
      lastNightChecked.current = worldEnv.dayCount;
      if (Math.random() < 0.4) {
        const st = useGameStore.getState();
        st.notify('🐉 A vast shadow crosses the moon…', true);
        audio.play('horn', 0.35);
        st.markDragonSeen();
        dragonAir.busy = true;
        setActive(true);
      }
    }
  });

  if (!active || destination) return null;
  return (
    <Suspense fallback={null}>
      <DragonFlight onDone={() => { dragonAir.busy = false; setActive(false); }} />
    </Suspense>
  );
}
