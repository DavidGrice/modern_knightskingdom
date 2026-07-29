'use client';
// I39 · An enemy's health, floating above the enemy.
//
// Block D's aim card answers "who is that and what do I know about them",
// which is a readout you go looking for. This is the other half: the
// at-a-glance state of a thing you are currently fighting, sitting where the
// thing is.
//
// It is a real object in the scene — two small planes on a group that turns
// to face the camera every frame — not an HTML overlay. A DOM/CSS layer would
// need its own renderer, would not be occluded by the world, and would jitter
// against the canvas at anything below full framerate. A billboard is drawn
// with everything else, so it sits in the world properly and costs two
// triangles.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EnemyData } from '@/game/combat';

/** how high above the figure's feet the bar floats */
const LIFT = 2.15;
const WIDTH = 1.1;
const HEIGHT = 0.13;
/** beyond this the bar is unreadable anyway, so stop drawing it */
const FADE_START = 26;
const FADE_END = 34;

export default function HealthBillboard({ data }: { data: EnemyData }) {
  const group = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Mesh>(null);
  const backing = useRef<THREE.Mesh>(null);

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const m = data.mob;
    // a corpse mid-collapse should not still be advertising its health
    if (m.state === 'dying') { g.visible = false; return; }

    g.position.set(m.x, LIFT, m.z);
    // face the camera — yaw only, so the bar never tips as you look up or
    // down at it and always reads as a flat plate
    g.rotation.set(0, Math.atan2(camera.position.x - m.x, camera.position.z - m.z), 0);

    const d = Math.hypot(camera.position.x - m.x, camera.position.z - m.z);
    const fade = d <= FADE_START ? 1
      : d >= FADE_END ? 0
      : 1 - (d - FADE_START) / (FADE_END - FADE_START);
    // hide a full-health enemy you are not fighting: a field of untouched
    // bars is noise. It appears the moment one is hurt.
    // this instance's own (possibly raid-scaled) ceiling, not the flat
    // per-kind reference maxHpOf gives the Bestiary — see combat.ts's
    // EnemyData.maxHp
    const hurt = data.hp < data.maxHp;
    g.visible = fade > 0.02 && hurt;
    if (!g.visible) return;

    // hold a constant on-screen size rather than shrinking with distance,
    // so a wounded enemy across the field is still legible
    const s = 1 + d * 0.035;
    g.scale.setScalar(s);

    const frac = Math.max(0, Math.min(1, data.hp / data.maxHp));
    const f = fill.current;
    if (f) {
      f.scale.x = Math.max(0.001, frac);
      // anchored left: the bar drains toward the empty side
      f.position.x = -(WIDTH / 2) * (1 - frac);
      const mat = f.material as THREE.MeshBasicMaterial;
      // green while healthy, through amber, to red as it empties
      mat.color.setHSL(frac * 0.33, 0.85, 0.45);
      mat.opacity = fade;
    }
    const bk = backing.current;
    if (bk) (bk.material as THREE.MeshBasicMaterial).opacity = fade * 0.55;
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={backing}>
        <planeGeometry args={[WIDTH + 0.06, HEIGHT + 0.05]} />
        <meshBasicMaterial color="#08110c" transparent opacity={0.55} depthTest={false} />
      </mesh>
      <mesh ref={fill} position-z={0.001}>
        <planeGeometry args={[WIDTH, HEIGHT]} />
        <meshBasicMaterial color="#4ad06a" transparent depthTest={false} />
      </mesh>
    </group>
  );
}
