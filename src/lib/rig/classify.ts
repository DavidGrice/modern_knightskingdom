'use client';
// CLN-29 · a figure's meshes sorted into sided parts — by the donor's verified rig map where there is one, by where
// they sit otherwise — and the parts each joint carries.
import * as THREE from 'three';
import { bodyKindOf, partRolesFor } from '../rigParts';
import { type RigJoint } from './joints';

export type SidedPart =
  | 'head' | 'accessory' | 'body' | 'hips' | 'other'
  | 'leftarm' | 'rightarm' | 'lefthand' | 'righthand'
  | 'leftleg' | 'rightleg' | 'leftfoot' | 'rightfoot';

/**
 * Spatial fallback for donors with unnamed "shapeN" objects (e.g. the
 * skeleton, whose file order also contains LOD duplicates). Works in raw
 * donor OBJ space, where model-up is -Y: the head is the topmost cluster
 * (most negative y), legs the bottom, arms the widest mid-height meshes.
 */
function classifyBySpace(meshes: THREE.Mesh[]): Map<SidedPart, THREE.Mesh[]> {
  const map = new Map<SidedPart, THREE.Mesh[]>();
  const push = (k: SidedPart, m: THREE.Mesh) => map.set(k, [...(map.get(k) ?? []), m]);
  const info = meshes.map((mesh) => {
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox!;
    return { mesh, c: b.getCenter(new THREE.Vector3()), diag: b.getSize(new THREE.Vector3()).length() };
  });
  const all = new THREE.Box3();
  for (const { mesh } of info) all.union(mesh.geometry.boundingBox!);
  const range = Math.max(1e-6, all.max.y - all.min.y);
  const halfW = Math.max(1e-6, (all.max.x - all.min.x) / 2);
  const midX = (all.max.x + all.min.x) / 2;
  const sortedDiag = info.map((i) => i.diag).sort((a, b) => a - b);
  const medianDiag = sortedDiag[Math.floor(sortedDiag.length / 2)] || 1;
  for (const { mesh, c, diag } of info) {
    // model-up is -Y: t = 0 at the head end, 1 at the feet
    const t = (c.y - all.min.y) / range;
    const side = (c.x - midX) / halfW; // -1..1
    // Height alone isn't enough: a donor baked mid-gesture (e.g. the
    // skeleton's raised claws) can have a hand sitting as high as the skull.
    // The skull itself is centered; anything else up there is off to one
    // side, so only call the centered cluster "head" and treat a high but
    // off-center mesh as that side's arm instead (it'll get PCA-rehung).
    if (t < 0.22 && Math.abs(side) < 0.4) { push('head', mesh); continue; }
    const inLimbBand = t > 0.6 || Math.abs(side) > 0.45 || (t < 0.22 && Math.abs(side) >= 0.4);
    // A held prop (axe, tool) baked alongside a generic villager's actual
    // arm/leg mesh lands in the same limb band but is far bigger than any
    // real body part — folding it into the arm bucket lets its geometry
    // dominate rehangArm's PCA fit, swinging the whole cluster to a
    // nonsensical pose (hand-above-head, weapon-behind-back). Route any
    // such oversized limb-band shape to 'other' (rides along on the body
    // joint, no PCA rehang) instead.
    if (inLimbBand && diag > medianDiag * 1.8) { push('other', mesh); continue; }
    if (t > 0.6) push(Math.abs(side) < 0.1 ? 'hips' : side > 0 ? 'leftleg' : 'rightleg', mesh);
    else if (inLimbBand) push(side > 0 ? 'leftarm' : 'rightarm', mesh);
    else push('body', mesh);
  }
  // guarantee a head: steal the topmost mesh if the band was empty
  if (!map.get('head')?.length && info.length) {
    const top = info.reduce((a, b) => (a.c.y < b.c.y ? a : b));
    for (const [k, arr] of map) map.set(k, arr.filter((m) => m !== top.mesh));
    push('head', top.mesh);
  }
  return map;
}

/**
 * Preferred classifier: the rig lab's HUMAN-VERIFIED shape->role map for this
 * exact donor (lib/rigParts.ts). Removes all guessing about WHAT a mesh is —
 * including telling a molded-in halberd or shield apart from a real arm,
 * which no amount of spatial heuristics could do reliably.
 *
 * Side (left vs right) is still taken from the mesh's own X position rather
 * than the map's `_L`/`_R` suffix — see the note in rigParts.ts. So this
 * function decides what each mesh IS; the geometry still decides which side.
 *
 * `keepProps` controls molded weapons: villagers strip them (a farmer holding
 * a halberd looks like a bug), enemies and armed NPCs keep them (that IS
 * their weapon). Returns null if this donor has no verified map, so the
 * caller falls back to the old heuristics.
 */
function classifyByRigMap(
  meshes: THREE.Mesh[],
  roles: Record<string, string>,
  keepProps: boolean,
): Map<SidedPart, THREE.Mesh[]> | null {
  const map = new Map<SidedPart, THREE.Mesh[]>();
  const push = (k: SidedPart, m: THREE.Mesh) => map.set(k, [...(map.get(k) ?? []), m]);
  const known = meshes.filter((m) => roles[m.name || '']);
  // a map that only covers a fraction of the donor's meshes is worse than the
  // heuristics — bail rather than assemble a half-classified figure
  if (known.length < Math.max(5, meshes.length * 0.6)) return null;

  // side is decided geometrically, exactly as classifyBySpace does it
  const all = new THREE.Box3();
  for (const m of meshes) {
    m.geometry.computeBoundingBox();
    all.union(m.geometry.boundingBox!);
  }
  const midX = (all.max.x + all.min.x) / 2;
  const sideOf = (m: THREE.Mesh) => {
    const c = m.geometry.boundingBox!.getCenter(new THREE.Vector3());
    return c.x >= midX ? 'left' : 'right';
  };

  for (const m of meshes) {
    const role = roles[m.name || ''];
    if (!role) continue; // unlabelled stray in a mostly-labelled donor: drop
    const kind = bodyKindOf(role);
    if (kind === 'mount') continue;           // horse/rider halves are not this figure
    if (kind === 'prop' && !keepProps) continue;
    if (kind === 'prop') { push('other', m); continue; } // rides the body joint
    switch (kind) {
      case 'head': push('head', m); break;
      case 'accessory': push('accessory', m); break;
      case 'body': push('body', m); break;
      case 'hips': push('hips', m); break;
      case 'arm': push(sideOf(m) === 'left' ? 'leftarm' : 'rightarm', m); break;
      case 'hand': push(sideOf(m) === 'left' ? 'lefthand' : 'righthand', m); break;
      case 'leg': push(sideOf(m) === 'left' ? 'leftleg' : 'rightleg', m); break;
      case 'foot': push(sideOf(m) === 'left' ? 'leftfoot' : 'rightfoot', m); break;
      default: push('other', m); break;
    }
  }
  // sanity: a usable map must have produced a torso and SOMETHING on the head
  // joint. Headgear counts — a few donors (generic-bad is a hooded figure)
  // have no separate `head` mesh at all, only the thing covering it, and
  // demanding a literal `head` role silently kicked them back to the old
  // heuristics along with the molded weapons those heuristics keep.
  const hasHead = (map.get('head')?.length ?? 0) + (map.get('accessory')?.length ?? 0) > 0;
  if (!hasHead || !map.get('body')?.length) return null;
  return map;
}

export function classifySided(
  meshes: THREE.Mesh[],
  donorId?: string,
  keepProps = false,
): Map<SidedPart, THREE.Mesh[]> {
  const roles = partRolesFor(donorId);
  if (roles) {
    const mapped = classifyByRigMap(meshes, roles, keepProps);
    if (mapped) return mapped;
  }
  const map = new Map<SidedPart, THREE.Mesh[]>();
  const push = (k: SidedPart, m: THREE.Mesh) => map.set(k, [...(map.get(k) ?? []), m]);
  const named = meshes.some((m) => /head|body|arm|leg|hip/i.test(m.name || ''));
  if (!named && meshes.length >= 5) return classifyBySpace(meshes);
  let lastArm: 'left' | 'right' | null = null;
  let sawHead = false;
  for (const mesh of meshes) {
    const n = (mesh.name || '').toLowerCase();
    if (/head/.test(n)) { push('head', mesh); sawHead = true; continue; }
    if (/hat|crown|helmet|plume/.test(n) || (sawHead && /_l_?\d|^l\d/.test(n))) { push('accessory', mesh); continue; }
    if (/arm/.test(n)) {
      lastArm = /lt|left/.test(n) ? 'left' : 'right';
      push(lastArm === 'left' ? 'leftarm' : 'rightarm', mesh);
      continue;
    }
    if (/hand/.test(n)) { push(lastArm === 'left' ? 'lefthand' : 'righthand', mesh); continue; }
    if (/leg/.test(n)) { push(/lt|left/.test(n) ? 'leftleg' : 'rightleg', mesh); continue; }
    if (/foot/.test(n)) { push(/lt|left/.test(n) ? 'leftfoot' : 'rightfoot', mesh); continue; }
    if (/hip/.test(n)) { push('hips', mesh); continue; }
    if (/body|torso/.test(n)) { push('body', mesh); continue; }
    push('other', mesh);
  }
  return map;
}

// which sided parts ride under which rig joint
export const JOINT_PARTS: Record<RigJoint, SidedPart[]> = {
  head: ['head', 'accessory'],
  body: ['body', 'other'],
  hips: ['hips'],
  leftarm: ['leftarm', 'lefthand'],
  rightarm: ['rightarm', 'righthand'],
  leftleg: ['leftleg', 'leftfoot'],
  rightleg: ['rightleg', 'rightfoot'],
};
