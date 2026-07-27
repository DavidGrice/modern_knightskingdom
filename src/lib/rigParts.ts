'use client';
// Verified rig part maps (2026-07-20), from the user's Grok/Blender rig lab
// (`reports/rigs/<id>_rig.json`, consolidated into public/assets/rigs/
// part_roles.json by scripts/prepare-assets.mjs).
//
// WHY THIS EXISTS: the donor OBJs name their objects `012_shape3`,
// `034_shape17`… — meaningless on their own — so the rig code had to GUESS
// what each mesh was from where it sat in space (minifigRig.ts's
// `classifyBySpace`: topmost centred cluster = head, widest mid-height =
// arms, oversized limb-band shape = "probably a held prop"). That guessing is
// the direct cause of two long-standing problems: donors whose weapon is
// MOLDED INTO THE MESH (generic-good carries a halberd + shield, generic-bad
// a crossbow + shield) drag it onto the figure, and it can misfile parts
// outright. The lab already answered this by hand for 26 minifig donors —
// every shape name mapped to a real role — so we look the answer up instead.
//
// Deliberately NOT used for left/right: the map does distinguish `arm_L` from
// `arm_R`, but which way that maps onto this game's own 'leftarm'/'rightarm'
// depends on a frame convention we'd have to re-derive, and getting it
// backwards would silently move every held weapon to the wrong hand. Side is
// still decided from the mesh's own X position exactly as before — so this
// module changes WHAT a mesh is, never WHICH SIDE it's on.

export type PartRole = string;

interface RigDoc { rigClass: string | null; status: string | null; parts: Record<string, PartRole> }

let cache: Promise<Record<string, RigDoc>> | null = null;

export function loadPartRoles(): Promise<Record<string, RigDoc>> {
  if (!cache) {
    cache = fetch('/assets/rigs/part_roles.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return cache;
}

/** roles that are a held/carried object rather than part of the body */
export const PROP_ROLES = new Set([
  'sword', 'shield', 'halberd', 'spear', 'lance', 'axe',
  'crossbow', 'crossbow_bolt', 'bow', 'arrow', 'quiver', 'goblet',
]);

/** roles worn on the head — kept with the head so a helm/crown rides along */
export const HEADGEAR_ROLES = new Set(['helmet', 'horn', 'crown', 'visor', 'hood']);

/** a mounted donor bakes a whole horse + rider; those roles are not this
 *  figure's own body and must never be assembled into a standing minifig */
export const MOUNT_ROLE_PREFIXES = ['horse_', 'rider_'];

export type BodyKind =
  | 'head' | 'accessory' | 'body' | 'hips'
  | 'arm' | 'hand' | 'leg' | 'foot'
  | 'prop' | 'mount' | 'other';

/** role -> what kind of thing it is, side-agnostic (see the header note) */
export function bodyKindOf(role: PartRole): BodyKind {
  if (MOUNT_ROLE_PREFIXES.some((p) => role.startsWith(p))) return 'mount';
  if (PROP_ROLES.has(role)) return 'prop';
  if (HEADGEAR_ROLES.has(role)) return 'accessory';
  if (role === 'head') return 'head';
  if (role === 'torso') return 'body';
  if (role === 'hips') return 'hips';
  if (role.startsWith('arm_')) return 'arm';
  if (role.startsWith('hand_')) return 'hand';
  if (role.startsWith('leg_')) return 'leg';
  if (role.startsWith('foot_')) return 'foot';
  // 'base' (Leonora's gown plinth) and anything unrecognised ride along on
  // the body rather than being dropped — an unknown role is far more likely
  // to be a real part of the silhouette than a stray
  return 'other';
}

/** synchronous accessor for an already-loaded map (assembly is async and
 *  awaits loadPartRoles() first, so this is always warm at the call site) */
let warm: Record<string, RigDoc> = {};
loadPartRoles().then((m) => { warm = m; });

export function partRolesFor(donorId: string | undefined): Record<string, PartRole> | null {
  if (!donorId) return null;
  return warm[donorId]?.parts ?? null;
}
