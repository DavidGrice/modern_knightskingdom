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
import type { CarrierTier, ChestplateTier, ItemId } from '@/game/types';

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

/** Wave 9 · the worn carrier (basket or hand cart), portaled onto
 *  `rig.joints.hips` — the ONE free joint on this rig. Verified rather than
 *  assumed: `rightarm` already carries weapons AND `ResourceProp` (the load
 *  itself), `leftarm` is the shield's, `head` the helmet's and `body` the
 *  chestplate's, and `hips` is read nowhere but minifigRig's own walk-bob
 *  animator — never portaled to. A hip/back-slung pack is also the one place
 *  a carrier can hang without colliding with the resource cube in the hand,
 *  which is exactly when it will most often be on screen.
 *
 *  Procedural, like `Chestplate` and `ResourceProp` above and for the same
 *  reason: the extraction has no basket or cart mold. Same silhouette family
 *  for both tiers so they read as one upgrade path — a slung box, plus a pair
 *  of wheels and a haul-handle at cart size. */
export function WornCarrier({ tier }: { tier: CarrierTier }) {
  const cart = tier === 'cart';
  const w = cart ? 0.4 : 0.28;
  const h = cart ? 0.26 : 0.22;
  const d = cart ? 0.24 : 0.18;
  return (
    // behind the hips, riding just below the belt line
    <group position={[0, -0.06, -0.19]}>
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={cart ? '#8a6134' : '#b98a4b'} roughness={0.9} />
      </mesh>
      {/* rim/binding, so a plain box reads as woven-or-planked at a glance */}
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w * 1.08, 0.035, d * 1.08]} />
        <meshStandardMaterial color={cart ? '#5c5850' : '#8a6134'} metalness={cart ? 0.55 : 0} roughness={cart ? 0.45 : 0.85} />
      </mesh>
      {cart && (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 + 0.03), -h / 2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 0.035, 10]} />
              <meshStandardMaterial color="#4a4640" roughness={0.7} metalness={0.35} />
            </mesh>
          ))}
          {/* the haul-handle, angled forward past the hip */}
          <mesh position={[0, 0.02, d / 2 + 0.09]} rotation={[0.55, 0, 0]} castShadow>
            <boxGeometry args={[w * 0.85, 0.03, 0.2]} />
            <meshStandardMaterial color="#8a6134" roughness={0.9} />
          </mesh>
        </>
      )}
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

/** One small procedural shape per resource kind — no extraction model to draw
 *  on for any of these (they're all economy items, not minifig gear), so
 *  every case follows Chestplate's "procedural where the original has no
 *  equivalent" rule. Unlisted ids (tools, weapons, potions — nothing a
 *  gather/haul trip ever carries) fall back to a generic sack. */
const RESOURCE_LOOK: Partial<Record<ItemId, { color: string; roughness: number; metalness?: number }>> = {
  wood: { color: '#7a5230', roughness: 0.85 },
  plank: { color: '#a87b45', roughness: 0.7 },
  stone: { color: '#8b8d92', roughness: 0.9 },
  iron_ore: { color: '#5c5850', roughness: 0.8 },
  iron_bar: { color: '#c9ccd4', roughness: 0.35, metalness: 0.7 },
  wheat: { color: '#d9b23c', roughness: 0.8 },
  fish: { color: '#7fa7c9', roughness: 0.5 },
  gold: { color: '#e8c750', roughness: 0.25, metalness: 0.85 },
};
const DEFAULT_RESOURCE_LOOK: { color: string; roughness: number; metalness?: number } = { color: '#8a6a42', roughness: 0.85 };

/** §3.3/§4.1's carried-item attach point: portals onto `rig.joints.rightarm`,
 *  same joint (and the same hand-local offset family) `HeldHalberd`/
 *  `HeldCrossbow` above already use for a held object, not re-derived. Own
 *  internal offset for the same reason `HeldHelmet`/`Chestplate` carry one —
 *  a portaled child inherits the joint's pivot, not the hand itself. */
export function ResourceProp({ resource, side = -1 }: { resource: ItemId; side?: number }) {
  const look = RESOURCE_LOOK[resource] ?? DEFAULT_RESOURCE_LOOK;
  return (
    <group position={[side * 0.12, -0.48, 0.2]}>
      <mesh castShadow>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshStandardMaterial color={look.color} roughness={look.roughness} metalness={look.metalness ?? 0} />
      </mesh>
    </group>
  );
}
