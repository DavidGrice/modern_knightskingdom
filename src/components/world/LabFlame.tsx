'use client';
// J50 · Fire, played from the game's own flame animation.
//
// Every fire in the world used to be two cones and a point light — a wide
// orange cone with a narrow yellow one inside it — which read as "a lit
// shape" rather than as fire.
//
// The rig lab names `flame` on `oc6096-3`, `oc6098b1`/`b2` and `flame_0..3`
// on `oc4807`, and following those parts into the models shows what they
// actually ARE: not solid pieces but flat billboards, zero thickness, whose
// material is `tex010` → `spr010_1024x64.png`. That sprite is a strip of 32
// hand-drawn flame frames on black. The models hold ONE frame of it (their
// UVs span 0.02922, an inset thirty-second) because a static export cannot
// animate; the game plays the strip.
//
// So this is the shared fire, and it is the real one: the same strip, stepped
// frame by frame, on a billboard that turns to face you. Torches, campfires,
// the forge hearth and anything set alight all draw on it.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

const FLAME_TEX = '/assets/textures/fx/spr010_1024x64.png';
/** 1024 wide / 32px per frame */
const FRAMES = 32;
/** the models' own UV width — an inset thirty-second, which keeps the
 *  neighbouring frames from bleeding in at the edges */
const FRAME_U = 0.02922;
/** frames per second the strip is played at */
const FPS = 15;
/** each frame is 32x64, so the billboard is half as wide as it is tall */
const ASPECT = 0.5;

/** module scratch — a field of torches should not allocate a vector a frame */
const SCRATCH = new THREE.Vector3();

export default function LabFlame({
  height = 0.55,
  position = [0, 0, 0],
  light = true,
  intensity = 8,
  distance = 10,
}: {
  /** metres from the base of the flame to its tip */
  height?: number;
  position?: [number, number, number];
  light?: boolean;
  intensity?: number;
  distance?: number;
}) {
  const tex = useTexture(FLAME_TEX);
  const camera = useThree((s) => s.camera);
  const billboard = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const t = useRef(Math.random() * 10); // desync a row of torches

  // each fire steps its OWN copy of the strip — sharing one texture would
  // lock every flame in the world to the same frame
  const map = useMemo(() => {
    const m = tex.clone();
    m.needsUpdate = true;
    m.colorSpace = THREE.SRGBColorSpace;
    m.wrapS = THREE.RepeatWrapping;
    m.repeat.set(FRAME_U, 1);
    return m;
  }, [tex]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    t.current += dt;
    const frame = Math.floor(t.current * FPS) % FRAMES;
    // land inside the frame, matching the models' own inset
    map.offset.x = frame / FRAMES + (1 / FRAMES - FRAME_U) / 2;
    const g = billboard.current;
    if (g) {
      // turn to the viewer about Y only: a flame leaning back when you look
      // down at it would be worse than one that never turns at all
      g.getWorldPosition(SCRATCH);
      g.rotation.y = Math.atan2(camera.position.x - SCRATCH.x, camera.position.z - SCRATCH.z);
    }
    // the light breathes with the sprite so the ground flickers in step
    if (lamp.current) {
      lamp.current.intensity = intensity * (0.86 + Math.sin(t.current * 9) * 0.1
        + Math.sin(t.current * 5.1) * 0.06);
    }
  });

  return (
    <group position={position}>
      <group ref={billboard}>
        <mesh position-y={height / 2}>
          <planeGeometry args={[height * ASPECT, height]} />
          {/* additive: the strip is drawn on black, and black added to the
              scene is nothing — which is exactly how fire should composite */}
          <meshBasicMaterial
            map={map}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
      {light && (
        <pointLight
          ref={lamp}
          position={[0, height * 0.9, 0]}
          color="#ff9a3c"
          intensity={intensity}
          distance={distance}
          decay={2}
        />
      )}
    </group>
  );
}
