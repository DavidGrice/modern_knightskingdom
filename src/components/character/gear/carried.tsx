'use client';
// CLN-28 · carried gear (carriers and hauled resources), moved verbatim out of Equipment.tsx (which re-exports them).
import type { CarrierTier, ItemId } from '@/game/types';

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
