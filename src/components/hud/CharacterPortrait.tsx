'use client';
// The player's actual head, rendered live in the HUD's vitals crest.
//
// The crest used to be a generic helm glyph, which told you nothing about
// the character you spent time building. This is the real head joint from
// the same assembled rig the viewmodel takes its arms from (lib/rigExtract
// caches the assembly, so the two together cost one figure, not two) —
// headgear included, because a helm or a crown is part of how a character
// reads at a glance.
//
// It is its own tiny <Canvas>: the HUD is a DOM overlay, not part of the
// world's R3F tree, so there is no scene here to portal into. 58×58 with
// `frameloop="demand"` — it renders when the appearance changes and when the
// idle turn advances, not 60 times a second beside the game's own canvas.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { loadHeadGroup } from '@/lib/rigExtract';
import KkIcon from '../ui/KkIcon';

/** how far the head turns either side of centre, and how fast */
const SWAY = 0.42;
const SWAY_RATE = 0.55;

function Head({ group }: { group: THREE.Group }) {
  const holder = useRef<THREE.Group>(null);
  const t = useRef(0);
  const instance = useMemo(() => group.clone(true), [group]);
  const invalidate = useThree((s) => s.invalidate);

  useFrame((_, dt) => {
    const g = holder.current;
    if (!g) return;
    t.current += dt;
    // a slow look left and right — enough to read the sculpt, not enough to
    // be a distraction sitting in the corner of the screen all game
    g.rotation.y = Math.sin(t.current * SWAY_RATE) * SWAY;
    invalidate();
  });

  return <group ref={holder}><primitive object={instance} /></group>;
}

function Rig({ group, size }: { group: THREE.Group; size: THREE.Vector3 }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useEffect(() => {
    // frame the head on its own bounds so every donor fills the crest the
    // same amount, whatever its helm adds
    const extent = Math.max(size.x, size.y) || 0.3;
    camera.position.set(0, 0, extent * 2.6);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 3, 4]} intensity={2.2} />
      <directionalLight position={[-3, 1, 2]} intensity={0.8} />
      <Head group={group} />
    </>
  );
}

/** an event manager that binds nothing — see the Canvas below */
const NO_EVENTS = () => ({
  enabled: false,
  priority: 0,
  connected: false,
  handlers: {} as Record<string, never>,
  connect: () => {},
  disconnect: () => {},
} as never);

export default function CharacterPortrait({ size = 58 }: { size?: number }) {
  const character = useGameStore((s) => s.character);
  const [head, setHead] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (!character) { setHead(null); return; }
    let alive = true;
    loadHeadGroup(character).then((g) => { if (alive) setHead(g); }).catch(() => {});
    return () => { alive = false; };
    // appearance only — renaming the character must not rebuild the portrait
  }, [character?.headDonor, character?.bodyDonor, character?.armColor,
    character?.handColor, character?.legColor, character?.hipColor]);

  // the helm glyph stays as the fallback: a donor whose head could not be
  // classified should still show something rather than an empty hole
  if (!head) return <KkIcon name="k-helm" size={Math.round(size * 0.52)} />;

  const dims = (head.userData.size as THREE.Vector3) ?? new THREE.Vector3(0.3, 0.3, 0.3);
  return (
    <div style={{ width: size, height: size, pointerEvents: 'none' }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 30, near: 0.01, far: 10 }}
        style={{ width: '100%', height: '100%' }}
        /* This portrait is decoration inside a DOM panel — its wrapper is
           already `pointerEvents: none`. Left with the default event manager
           it still tries to bind listeners to the canvas's parent as the
           panel mounts, and when the panel is opened and closed quickly that
           parent is gone by the time the effect runs, which threw
           "addEventListener of null" (and lit the dev error badge). A portrait
           has nothing to click, so it gets no event manager at all. */
        events={NO_EVENTS}
      >
        <Rig group={head} size={dims} />
      </Canvas>
    </div>
  );
}
