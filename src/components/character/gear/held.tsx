'use client';
// CLN-28 · held weapons and the arm shield, moved verbatim out of Equipment.tsx (which re-exports them).
// Joint-local offsets: see Equipment.tsx's header for the joint conventions and the verified handedness.
import RealWeapon from '../RealWeapon';
import RealShield from '../RealShield';
import type { MeleeTier } from '@/game/combat';
import { SWORD_WEAPON_ID, HALBERD_WEAPON_ID } from '../weaponIds';

export function HeldSword({ side = -1, tier = 'base' }: { side?: number; tier?: MeleeTier }) {
  return (
    <group position={[side * 0.12, -0.5, 0.21]} rotation={[0.15, 0, side * -0.08]}>
      <RealWeapon
        id={SWORD_WEAPON_ID[tier]}
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

export function HeldHalberd({ side = -1, tier = 'base' }: { side?: number; tier?: MeleeTier }) {
  return (
    <group position={[side * 0.12, -0.48, 0.2]} rotation={[0.2, 0, side * -0.06]}>
      <RealWeapon id={HALBERD_WEAPON_ID[tier]} />
    </group>
  );
}

/** Wave 7 · the spear, held. Same joint-local offset family as the halberd
 *  above (it is the same gesture — a polearm gripped mid-haft), just a
 *  fraction more upright: the spear mold is the longer of the two, so the
 *  butt end grounds sooner if it leans back as far. */
export function HeldSpear({ side = -1 }: { side?: number }) {
  return (
    <group position={[side * 0.12, -0.48, 0.2]} rotation={[0.12, 0, side * -0.06]}>
      <RealWeapon id="spear" />
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

/** Wave 37 (A3 remainder) · the caster carries no weapon at all — this is
 *  the one held-slot "prop" it gets instead: a small self-lit glow at the
 *  casting hand, so it reads as a spellcaster rather than simply unarmed.
 *  Same joint-local offset family as HeldSword/HeldCrossbow above (this
 *  project's one attach-point convention for anything portaled onto
 *  rightarm) — reused rather than re-derived. */
export function SpellHandGlow({ side = -1 }: { side?: number }) {
  return (
    <group position={[side * 0.12, -0.5, 0.21]}>
      <pointLight color="#a855f7" intensity={1.2} distance={2.5} decay={2} />
      <mesh>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2.2} />
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
