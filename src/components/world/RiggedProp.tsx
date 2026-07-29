'use client';
// Renders a prop with its lab-charted moving parts actually moving.
//
// Roles come from the rig lab (lib/propRig.ts); this file only decides what
// each role DOES. Everything is driven off one useFrame with no per-frame
// allocation and no React state, so a field full of siege engines costs the
// same as the static PropModel it replaces plus a few quaternion writes.
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loadRiggedProp, type RiggedProp as Rig } from '@/lib/propRig';
import { crewState } from '@/game/crew';

/** per-building fire impulses, written by the siege code, read here. A plain
 *  mutable module (the established leaf-module pattern) because the firing
 *  path is store/action code and the renderer is inside the R3F tree. */
export const propFire: Record<string, number> = {};

/** kick a prop's throwing arm — id is the placed building's id */
export function fireProp(buildingId: string) {
  propFire[buildingId] = performance.now();
}

/** metres travelled per prop, so anything the rig lab labelled `wheel_*`
 *  actually turns as the thing rolls instead of skating along frozen */
export const propTravel: Record<string, number> = {};

export function setPropTravel(id: string, metres: number) {
  propTravel[id] = metres;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkpropfire = propFire;
}

const THROW_ROLES = ['catapult_arm', 'thrower_arms', 'stone_thrower', 'arm'];
const THROW_FOLLOWERS = ['catapult_bucket', 'stone', 'catapult_stone', 'projectile_stone'];
const FLAG_ROLES = ['flag', 'flag_cloth', 'banner'];
/** the lab names cart/engine wheels wheel_0, wheel_1, … */
const WHEEL_RE = /^wheel(_\d+)?$/;
/** wheel radius in metres at the props' rendered scale; a wheel turns
 *  distance / radius radians, which is what makes rolling read as rolling
 *  rather than as a spin rate someone picked by eye */
const WHEEL_RADIUS = 0.34;
/** used only if a wheel group somehow arrived without a measured axle */
const WHEEL_FALLBACK_AXLE = new THREE.Vector3(1, 0, 0);
/** module-level scratch — a field of carts should not allocate per frame */
const spinQuat = new THREE.Quaternion();

export default function RiggedProp({
  assetId,
  height,
  position = [0, 0, 0],
  yaw = 0,
  buildingId,
  gaitSpeed = 0,
}: {
  assetId: string;
  height: number;
  position?: [number, number, number];
  yaw?: number;
  /** placed-building id, so this instance can respond to its own fire events */
  buildingId?: string;
  /** metres/second, for anything with a walk cycle (the horses). 0 means
   *  standing, which for a horse means grazing rather than frozen. */
  gaitSpeed?: number;
}) {
  const [rig, setRig] = useState<Rig | null>(null);
  const root = useRef<THREE.Group>(null);
  const t = useRef(Math.random() * 100); // desync identical props
  const rest = useRef<Map<THREE.Group, number>>(new Map());
  const gait = useRef(Math.random() * 10);
  const restQuat = useRef<Map<THREE.Group, THREE.Quaternion>>(new Map());

  useEffect(() => {
    let alive = true;
    loadRiggedProp(assetId, height).then((r) => {
      if (!alive || !r) return;
      // each instance needs its own copy — parts are mutated per frame
      const clone = r.group.clone(true);
      const parts: Record<string, THREE.Group> = {};
      clone.traverse((o) => {
        const role = o.userData?.role as string | undefined;
        if (role) parts[role] = o as THREE.Group;
      });
      setRig({ group: clone, parts });
    });
    return () => { alive = false; };
  }, [assetId, height]);

  useFrame((_, dt) => {
    if (!rig) return;
    t.current += dt;
    const now = performance.now();

    // --- crewed engines swing to follow their gunner's aim ---
    // A placed building's rot=0 points +Z while the player's look yaw=0
    // points -Z, hence the half turn (same flip as siege.fireCannon).
    if (root.current) {
      const crewed = !!buildingId && crewState.engineId === buildingId;
      const want = crewed ? crewState.yaw + Math.PI : yaw;
      const cur = root.current.rotation.y;
      let d = want - cur;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      // eased so a heavy engine traverses rather than snaps
      root.current.rotation.y = cur + d * Math.min(1, dt * 6);
    }

    // --- throwing arm: a sharp swing on fire, then an eased return ---
    const firedAt = buildingId ? propFire[buildingId] : undefined;
    const since = firedAt ? (now - firedAt) / 1000 : Infinity;
    // 0.18s of launch, ~1.4s of winding back down
    const throwAngle = since < 1.6
      ? (since < 0.18
        ? -1.5 * (since / 0.18)
        : -1.5 * (1 - (since - 0.18) / 1.42))
      : 0;
    for (const role of THROW_ROLES) {
      const g = rig.parts[role];
      if (!g) continue;
      if (!rest.current.has(g)) rest.current.set(g, g.rotation.x);
      g.rotation.x = rest.current.get(g)! + throwAngle;
    }
    for (const role of THROW_FOLLOWERS) {
      const g = rig.parts[role];
      if (!g) continue;
      // the payload rides the arm, and vanishes once it's away
      g.visible = since > 0.18;
      if (!rest.current.has(g)) rest.current.set(g, g.rotation.x);
      g.rotation.x = rest.current.get(g)! + throwAngle;
    }
    // a counterweight swings opposite the arm
    const cw = rig.parts.counterweight;
    if (cw) {
      if (!rest.current.has(cw)) rest.current.set(cw, cw.rotation.x);
      cw.rotation.x = rest.current.get(cw)! - throwAngle * 0.55;
    }

    // --- cloth: a lazy two-axis wave, so flags read as fabric not board ---
    for (const role of FLAG_ROLES) {
      const g = rig.parts[role];
      if (!g) continue;
      if (!rest.current.has(g)) rest.current.set(g, g.rotation.y);
      const base = rest.current.get(g)!;
      g.rotation.y = base + Math.sin(t.current * 1.7) * 0.22;
      g.rotation.z = Math.sin(t.current * 2.3 + 1.1) * 0.07;
    }

    // --- wheels: turn with distance travelled, not with time ---
    const travelled = buildingId ? propTravel[buildingId] : undefined;
    if (travelled !== undefined) {
      const spin = travelled / WHEEL_RADIUS;
      for (const [role, g] of Object.entries(rig.parts)) {
        if (!WHEEL_RE.test(role)) continue;
        // turn about the wheel's OWN axle (propRig measures it as the axis
        // the disc is thinnest along). Rotating every wheel about a fixed X
        // tumbled the ones whose axle runs along Z — the reported wobble.
        const axle = (g.userData.axle as THREE.Vector3 | undefined) ?? WHEEL_FALLBACK_AXLE;
        if (!restQuat.current.has(g)) restQuat.current.set(g, g.quaternion.clone());
        g.quaternion.copy(restQuat.current.get(g)!)
          .multiply(spinQuat.setFromAxisAngle(axle, spin));
      }
    }

    // --- four-legged gait ---
    // The lab charted `leg_upper`/`leg_lower` on all four legs of every
    // horse; propRig splits them into `leg_upper#0..3` ordered front-to-back
    // then left-to-right. A horse walks on DIAGONAL pairs, so legs 0 and 3
    // share a phase and 1 and 2 share the opposite one — that pairing is
    // what stops it looking like a pantomime hobby-horse.
    if (gaitSpeed > 0.01 || rig.parts['leg_upper#0']) {
      gait.current += dt * (2.2 + gaitSpeed * 1.8);
      const amp = gaitSpeed > 0.05 ? Math.min(0.55, 0.18 + gaitSpeed * 0.32) : 0.05;
      for (let i = 0; i < 4; i++) {
        const phase = gait.current + (i === 0 || i === 3 ? 0 : Math.PI);
        const swing = Math.sin(phase) * amp;
        const upper = rig.parts[`leg_upper#${i}`];
        if (upper) {
          if (!rest.current.has(upper)) rest.current.set(upper, upper.rotation.x);
          upper.rotation.x = rest.current.get(upper)! + swing;
        }
        const lower = rig.parts[`leg_lower#${i}`];
        if (lower) {
          if (!rest.current.has(lower)) rest.current.set(lower, lower.rotation.x);
          // the lower leg trails the upper and only ever folds one way
          lower.rotation.x = rest.current.get(lower)! + Math.max(0, Math.sin(phase - 0.7)) * amp * 0.8;
        }
      }
      // head dips while grazing, lifts while moving; tail always swishes
      const head = rig.parts.head;
      if (head) {
        if (!rest.current.has(head)) rest.current.set(head, head.rotation.x);
        const graze = gaitSpeed < 0.05 ? 0.45 + Math.sin(t.current * 0.6) * 0.2 : 0;
        head.rotation.x = rest.current.get(head)! + graze;
      }
      const tail = rig.parts.tail;
      if (tail) {
        if (!rest.current.has(tail)) rest.current.set(tail, tail.rotation.y);
        tail.rotation.y = rest.current.get(tail)! + Math.sin(t.current * 2.4) * 0.3;
      }
    }

    // --- two-horse cart team (oc6095b3, the merchant's yoked pair): the lab
    // named each leg explicitly per horse (horse_L_leg_FL_upper, …) instead
    // of the generic leg_upper/leg_lower a standalone horse rig collapses
    // into four numbered clusters, so the block above never matches it —
    // found investigating a reported "cart horses don't animate" bug.
    // Reuses the exact same diagonal-trot math (FL+BR share a phase, FR+BL
    // the opposite one), just addressed by name instead of index, and both
    // horses share ONE gait clock since they're yoked to the same tow-bar
    // and would look wrong stepping out of sync with each other.
    if (rig.parts['horse_L_leg_FL_upper']) {
      gait.current += dt * (2.2 + gaitSpeed * 1.8);
      const amp = gaitSpeed > 0.05 ? Math.min(0.55, 0.18 + gaitSpeed * 0.32) : 0.05;
      const DIAG: [string, number][] = [['FL', 0], ['BR', 0], ['FR', Math.PI], ['BL', Math.PI]];
      for (const side of ['horse_L', 'horse_R']) {
        for (const [leg, offset] of DIAG) {
          const phase = gait.current + offset;
          const swing = Math.sin(phase) * amp;
          const upper = rig.parts[`${side}_leg_${leg}_upper`];
          if (upper) {
            if (!rest.current.has(upper)) rest.current.set(upper, upper.rotation.x);
            upper.rotation.x = rest.current.get(upper)! + swing;
          }
          const lower = rig.parts[`${side}_leg_${leg}_lower`];
          if (lower) {
            if (!rest.current.has(lower)) rest.current.set(lower, lower.rotation.x);
            lower.rotation.x = rest.current.get(lower)! + Math.max(0, Math.sin(phase - 0.7)) * amp * 0.8;
          }
        }
        const head = rig.parts[`${side}_head`];
        if (head) {
          if (!rest.current.has(head)) rest.current.set(head, head.rotation.x);
          const graze = gaitSpeed < 0.05 ? 0.4 + Math.sin(t.current * 0.6 + (side === 'horse_R' ? 1.3 : 0)) * 0.18 : 0;
          head.rotation.x = rest.current.get(head)! + graze;
        }
      }
    }

    // --- flame: flicker in scale + a little vertical bob ---
    const flame = rig.parts.flame;
    if (flame) {
      const f = 1 + Math.sin(t.current * 11) * 0.09 + Math.sin(t.current * 17.3) * 0.05;
      flame.scale.set(f, 1 + (f - 1) * 1.8, f);
    }
  });

  if (!rig) return null;
  return (
    <group ref={root} position={position} rotation-y={yaw}>
      <primitive object={rig.group} />
    </group>
  );
}
