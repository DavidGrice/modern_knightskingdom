'use client';
// CLN-28 · worn armor (helmet and the chestplate tiers), moved verbatim out of Equipment.tsx (which re-exports them).
import RealHelmet from '../RealHelmet';
import type { ChestplateTier } from '@/game/types';

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
 *  pickaxe/campfire/forge/bed already follow.
 *
 *  Wave 9 · three tiers wear this one primitive (data/armor.ts explains why
 *  the tiers CAN'T be donor torso prints: a torso decal is baked into its
 *  donor's own material, and villagerLooks.ts's hard-won rule is that head and
 *  torso must come from the same donor — so swapping the print would swap the
 *  wearer's face too). The emblem is raised geometry rather than a texture,
 *  which is both what this pipeline supports and what actually reads at
 *  minifig scale. 'iron' is byte-for-byte the plate that shipped before this
 *  wave, so no existing figure changed appearance. */
const PLATE_LOOK: Record<ChestplateTier, { color: string; metalness: number; roughness: number }> = {
  iron: { color: '#9aa0aa', metalness: 0.65, roughness: 0.3 },
  forged: { color: '#7c828c', metalness: 0.82, roughness: 0.18 },
  crested: { color: '#b9c0cc', metalness: 0.88, roughness: 0.13 },
};

const GOLD = '#c8a43c';

export function Chestplate({ tier = 'iron' }: { tier?: ChestplateTier }) {
  const look = PLATE_LOOK[tier];
  return (
    <group position={[0, 0.16, 0.17]}>
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.34, 0.16]} />
        <meshStandardMaterial color={look.color} metalness={look.metalness} roughness={look.roughness} />
      </mesh>

      {/* iron — the single boss it always had */}
      {tier === 'iron' && (
        <mesh position={[0, 0.08, 0.09]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
        </mesh>
      )}

      {/* forged — a banded plate: one riveted band across the chest and a dark
          chevron beneath it, so it reads as re-worked rather than re-coloured */}
      {tier === 'forged' && (
        <>
          <mesh position={[0, 0.1, 0.085]} castShadow>
            <boxGeometry args={[0.4, 0.06, 0.025]} />
            <meshStandardMaterial color="#4a4f57" metalness={0.7} roughness={0.35} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.15, 0.1, 0.1]} castShadow>
              <boxGeometry args={[0.035, 0.035, 0.02]} />
              <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.09, -0.03, 0.085]} rotation={[0, 0, s * 0.7]} castShadow>
              <boxGeometry args={[0.055, 0.19, 0.022]} />
              <meshStandardMaterial color="#4a4f57" metalness={0.7} roughness={0.35} />
            </mesh>
          ))}
        </>
      )}

      {/* castle-crested — gold trim, gold shoulder caps, and the castle itself
          raised on a dark field: a wall of three merlons over a gate */}
      {tier === 'crested' && (
        <>
          <mesh position={[0, -0.15, 0.02]} castShadow>
            <boxGeometry args={[0.44, 0.05, 0.175]} />
            <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.25} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.21, 0.14, 0]} castShadow>
              <boxGeometry args={[0.06, 0.09, 0.19]} />
              <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.25} />
            </mesh>
          ))}
          {/* the crest field */}
          <mesh position={[0, 0.03, 0.085]} castShadow>
            <boxGeometry args={[0.2, 0.22, 0.02]} />
            <meshStandardMaterial color="#3a3f52" metalness={0.3} roughness={0.6} />
          </mesh>
          {/* castle wall + three merlons along its top */}
          <mesh position={[0, 0.0, 0.1]} castShadow>
            <boxGeometry args={[0.15, 0.08, 0.02]} />
            <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.25} />
          </mesh>
          {[-1, 0, 1].map((s) => (
            <mesh key={s} position={[s * 0.055, 0.07, 0.1]} castShadow>
              <boxGeometry args={[0.04, 0.055, 0.02]} />
              <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.25} />
            </mesh>
          ))}
          {/* the gate under the wall */}
          <mesh position={[0, -0.055, 0.1]} castShadow>
            <boxGeometry args={[0.05, 0.06, 0.02]} />
            <meshStandardMaterial color="#3a3f52" metalness={0.3} roughness={0.6} />
          </mesh>
        </>
      )}
    </group>
  );
}
