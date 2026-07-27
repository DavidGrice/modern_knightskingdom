'use client';
// Animated props (2026-07-25). The rig lab charted moving parts for the
// castle/siege meshes — which shape is the catapult arm, which is the flag
// cloth, which is a flame — but that data could not be used against the GLB
// exports the game renders: those drop every node/mesh name AND merge
// primitives by material, so neither name- nor index-matching can recover a
// part. (Verified: oc6096-4 has 9 rig parts vs 11 unnamed GLB primitives.)
//
// The OBJ export of the same asset keeps its per-object `o` names, which is
// exactly what the lab's `orig` field records — the same reason minifigs
// already load from OBJ+MTL. So an animated prop loads the OBJ, groups its
// meshes by lab role, and hands back one pivoted THREE.Group per role for a
// renderer to drive.
//
// Normalization matches PropModel.useNormalizedProp exactly (upright flip,
// scale to a target height, re-ground at y=0) so a rigged prop drops into the
// same world coordinates as the static one it replaces.
import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { partRolesFor, loadPartRoles } from './rigParts';

const BASE = '/assets/props/objrig/';

export interface RiggedProp {
  /** the normalized root — drop this straight into the scene */
  group: THREE.Group;
  /** one pivoted group per lab role present on this asset */
  parts: Record<string, THREE.Group>;
}

/** roles that legitimately repeat across a model and must NOT be merged */
const SPLIT_MERGE = 0.25;
const SPLIT_ROLE_RE = /^(leg_upper|leg_lower|leg|wheel|arm|flag|flame|crossbow|halberd)$/;

/** Split a role's meshes into spatially separated clusters, ordered
 *  front-to-back (z) then left-to-right (x), so limb index 0 is always the
 *  same limb across every donor of the same rig class. */
function splitDisjoint(meshes: THREE.Mesh[]): THREE.Mesh[][] {
  const withCentre = meshes.map((m) => {
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox!;
    return { m, c: bb.getCenter(new THREE.Vector3()), r: bb.getSize(new THREE.Vector3()).length() / 2 };
  });
  // K53 · the merge radius has to come from the PARTS, not a constant. It was
  // a flat 8 units, which is wider than the gap between a horse's own lower
  // legs — so the four `leg_lower` parts collapsed into fewer clusters than
  // the four `leg_upper` ones, the indices stopped lining up, and only the
  // uppers ended up animating. Merging only things that genuinely overlap
  // (their bounding spheres well overlapped) keeps four legs four. Measured
  // against the real horse geometry: 0.6 and 0.45 both collapse the legs to
  // two clusters, 0.35 splits the lowers but not the uppers, and 0.25 is the
  // first value that resolves all four of BOTH — which is what the diagonal
  // gait needs.
  const clusters: { meshes: THREE.Mesh[]; c: THREE.Vector3; r: number }[] = [];
  for (const { m, c, r } of withCentre) {
    const near = clusters.find((cl) => cl.c.distanceTo(c) < (cl.r + r) * SPLIT_MERGE);
    if (near) { near.meshes.push(m); near.r = Math.max(near.r, r); }
    else { clusters.push({ meshes: [m], c: c.clone(), r }); }
  }
  clusters.sort((a, b) => (a.c.z - b.c.z) || (a.c.x - b.c.x));
  return clusters.map((cl) => cl.meshes);
}

const cache = new Map<string, Promise<RiggedProp | null>>();

function loadObj(id: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const mtl = new MTLLoader();
    mtl.setPath(BASE);
    mtl.setResourcePath(BASE);
    mtl.load(
      `${id}.mtl`,
      (materials) => {
        materials.preload();
        const obj = new OBJLoader();
        obj.setMaterials(materials);
        obj.setPath(BASE);
        obj.load(`${id}.obj`, resolve, undefined, reject);
      },
      undefined,
      reject,
    );
  });
}

/** the lab's `orig` names occasionally carry an export suffix the OBJ doesn't
 *  (`013_..._PART__6` vs `013_..._PART__6.2`), so fall back to the numeric
 *  prefix, which is stable across both */
function roleForMesh(name: string, roles: Record<string, string>): string | null {
  if (roles[name]) return roles[name];
  const prefix = name.match(/^(\d+)_/)?.[1];
  if (!prefix) return null;
  for (const [orig, role] of Object.entries(roles)) {
    if (orig.startsWith(`${prefix}_`)) return role;
  }
  return null;
}

/**
 * Load a prop as role-grouped, individually pivotable parts.
 * Each part group is pivoted at its own geometric centre so a renderer can
 * rotate it (a catapult arm about its axle, a flag about its pole) without
 * the mesh flying off across the model.
 */
export function loadRiggedProp(id: string, targetHeight: number): Promise<RiggedProp | null> {
  const key = `${id}@${targetHeight}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      await loadPartRoles();
      const roles = partRolesFor(id);
      if (!roles) return null;
      let src: THREE.Group;
      try { src = await loadObj(id); } catch { return null; }

      // bucket meshes by role, in raw OBJ space
      const byRole = new Map<string, THREE.Mesh[]>();
      src.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh) return;
        const role = roleForMesh(m.name || '', roles) ?? 'body';
        byRole.set(role, [...(byRole.get(role) ?? []), m]);
      });
      if (!byRole.size) return null;

      const inner = new THREE.Group();
      const parts: Record<string, THREE.Group> = {};
      // A rig can name the SAME role on several disjoint parts — a horse has
      // four legs and the lab calls all four uppers `leg_upper`. Bucketing
      // them together would swing the whole set as one lump, so any role that
      // repeats is split into spatially-separated clusters and re-keyed
      // `role#0`, `role#1`, … ordered front-to-back then left-to-right, which
      // is what lets a renderer phase a diagonal gait.
      for (const [role, meshes] of [...byRole]) {
        if (meshes.length < 2 || !SPLIT_ROLE_RE.test(role)) continue;
        const clusters = splitDisjoint(meshes);
        if (clusters.length < 2) continue;
        byRole.delete(role);
        clusters.forEach((cluster, i) => byRole.set(`${role}#${i}`, cluster));
      }

      for (const [role, meshes] of byRole) {
        const g = new THREE.Group();
        // pivot at the role cluster's own centre so rotations look hinged
        const box = new THREE.Box3();
        for (const m of meshes) {
          m.geometry.computeBoundingBox();
          box.union(m.geometry.boundingBox!);
        }
        const c = box.getCenter(new THREE.Vector3());
        for (const m of meshes) {
          const clone = m.clone();
          const geo = clone.geometry.clone();
          if (!geo.getAttribute('normal')) geo.computeVertexNormals();
          geo.translate(-c.x, -c.y, -c.z);
          clone.geometry = geo;
          // MTLLoader hands back MeshPhongMaterial, but every static prop in
          // the game comes from a GLB as MeshStandardMaterial and the scene
          // lighting is tuned for PBR — leaving these Phong made a rigged
          // catapult visibly darker than the identical static one beside it.
          // Colours are byte-identical between the two exports (verified: the
          // MTL's Kd set matches the GLB's baseColorFactor set exactly), so
          // this is purely a shading-model swap.
          const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mm) => {
            const src = mm as THREE.MeshPhongMaterial;
            // K52 · carry the MTL's TEXTURE across, not just its base colour.
            // This rebuild exists to swap Phong for Standard (the scene's
            // lighting is PBR), but it was reading `Kd` alone and dropping
            // `map_Kd` on the floor — fine for the siege engines, whose MTLs
            // are pure palette colours, and badly wrong for the horses, whose
            // hide and barding are printed. They came out as flat blocks.
            return new THREE.MeshStandardMaterial({
              color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
              map: src.map ?? null,
              transparent: src.transparent,
              opacity: src.opacity ?? 1,
              alphaTest: src.alphaTest ?? 0,
              roughness: 0.85,
              metalness: 0.05,
              side: THREE.DoubleSide,
            });
          });
          clone.material = Array.isArray(m.material) ? mats : mats[0];
          clone.castShadow = true;
          clone.receiveShadow = true;
          clone.position.set(0, 0, 0);
          g.add(clone);
        }
        g.position.copy(c);
        g.userData.role = role;
        // A wheel is a thin disc, and it must turn about its AXLE — which is
        // whichever of its own axes it is thinnest along, not a fixed X.
        // Spinning a Z-axled wheel about X is what made the raiders' cart
        // wobble instead of roll.
        const size = box.getSize(new THREE.Vector3());
        const min = Math.min(size.x, size.y, size.z);
        g.userData.axle = (min === size.x ? new THREE.Vector3(1, 0, 0)
          : min === size.y ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(0, 0, 1));
        inner.add(g);
        parts[role] = g;
      }

      // same normalization as PropModel: stand upright, scale to target
      // height, re-ground at y=0 and centre on x/z
      inner.rotation.x = Math.PI;
      const holder = new THREE.Group();
      holder.add(inner);
      holder.updateMatrixWorld(true);
      const b1 = new THREE.Box3().setFromObject(holder);
      const size = b1.getSize(new THREE.Vector3());
      holder.scale.setScalar(targetHeight / (size.y || 1));
      holder.updateMatrixWorld(true);
      const b2 = new THREE.Box3().setFromObject(holder);
      const centre = b2.getCenter(new THREE.Vector3());
      holder.position.set(-centre.x, -b2.min.y, -centre.z);

      const group = new THREE.Group();
      group.add(holder);
      return { group, parts };
    })();
    cache.set(key, p);
  }
  return p;
}

/** does this asset have any part the renderer knows how to animate? */
export const ANIMATED_ROLES = new Set([
  'catapult_arm', 'catapult_bucket', 'thrower_arms', 'stone_thrower',
  'thrower_mount', 'thrower_side_pivot', 'arm', 'counterweight',
  'flag', 'flag_cloth', 'banner', 'flame',
  'wheel_0', 'wheel_1', 'wheel_L', 'wheel_R',
]);

export function hasAnimatedRig(assetId: string | undefined): boolean {
  const roles = partRolesFor(assetId);
  if (!roles) return false;
  return Object.values(roles).some((r) => ANIMATED_ROLES.has(r));
}
