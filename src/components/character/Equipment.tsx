'use client';
// Visible equipment for minifigs: the original extracted sword and an arm
// shield, attached to rig joints (positions are joint-local; the joint origin
// is the shoulder socket, so the hand sits along the arm's hang direction).
//
// HANDEDNESS IS VERIFIED, NOT ASSUMED (2026-07-25): the callers all portal
// weapons onto `rig.joints.rightarm` and shields onto `leftarm`. Checked
// against the rig lab's own `traits.minifig.swordHand` / `shieldHand` across
// all 15 donors that record it — every one is `swordHand: hand_R`,
// `shieldHand: hand_L`, `laterality: character_local`. There is no variation
// to drive, so routing this through `labHands()` (data/labCapabilities.ts,
// which exists and is typed if a future donor ever differs) would add a data
// dependency and change nothing. Left hardcoded deliberately.
import RealWeapon from './RealWeapon';
import RealShield from './RealShield';
import RealHelmet from './RealHelmet';

export function HeldSword({ side = -1 }: { side?: number }) {
  return (
    <group position={[side * 0.12, -0.5, 0.21]} rotation={[0.15, 0, side * -0.08]}>
      <RealWeapon
        id="sword"
        fallback={
          <mesh position-y={0.2}>
            <boxGeometry args={[0.05, 0.5, 0.016]} />
            <meshStandardMaterial color="#c9ccd4" metalness={0.75} roughness={0.25} />
          </mesh>
        }
      />
    </group>
  );
}

export function HeldHalberd({ side = -1 }: { side?: number }) {
  return (
    <group position={[side * 0.12, -0.48, 0.2]} rotation={[0.2, 0, side * -0.06]}>
      <RealWeapon id="halberd" />
    </group>
  );
}

export function HeldCrossbow({ side = -1 }: { side?: number }) {
  return (
    <group position={[side * 0.12, -0.48, 0.2]} rotation={[0.25, 0, side * -0.08]}>
      <RealWeapon
        id="crossbow"
        fallback={
          <mesh position-y={0.15}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshStandardMaterial color="#5d3d20" roughness={0.85} />
          </mesh>
        }
      />
    </group>
  );
}

export function HeldHelmet() {
  return (
    <group position={[0, 0.09, 0.01]}>
      <RealHelmet
        fallback={
          <mesh position-y={0.06}>
            <boxGeometry args={[0.22, 0.12, 0.24]} />
            <meshStandardMaterial color="#9aa0aa" metalness={0.6} roughness={0.35} />
          </mesh>
        }
      />
    </group>
  );
}

/** no separate chestplate model exists in the extraction (only a headgear
 *  accessory was found on the armed donors) — a simple procedural plate,
 *  same "procedural where the original has no equivalent" rule the axe/
 *  pickaxe/campfire/forge/bed already follow. */
export function Chestplate() {
  return (
    <group position={[0, 0.16, 0.17]}>
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.34, 0.16]} />
        <meshStandardMaterial color="#9aa0aa" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.08, 0.09]} castShadow>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
        <meshStandardMaterial color="#c8a43c" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function ArmShield({ side = 1 }: { side?: number }) {
  return (
    <group position={[side * 0.2, -0.32, 0.16]} rotation={[0, side * 0.35 + Math.PI / 2, 0]}>
      <RealShield
        fallback={
          <group rotation-y={-Math.PI / 2}>
            <mesh>
              <boxGeometry args={[0.05, 0.5, 0.4]} />
              <meshStandardMaterial color="#9aa0aa" metalness={0.4} roughness={0.45} />
            </mesh>
            <mesh position-x={side * 0.03}>
              <boxGeometry args={[0.02, 0.4, 0.3]} />
              <meshStandardMaterial color="#b03a2e" roughness={0.7} />
            </mesh>
            <mesh position-x={side * 0.05}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color="#c8a43c" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        }
      />
    </group>
  );
}
