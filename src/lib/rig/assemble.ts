'use client';
// CLN-29 · a rigged minifig assembled from a character's donors: parts classified, baked into normalised space,
// hung on pivoted joints, recoloured — cached per character, height and props — with its animator.
import * as THREE from 'three';
import { loadDonor, loadPalette, paletteColor } from '../minifig';
import { loadPartRoles } from '../rigParts';
import type { CharacterConfig } from '@/game/types';
import { MinifigAnimator } from './MinifigAnimator';
import { JOINT_PARTS, classifySided, type SidedPart } from './classify';
import { loadRest } from './clips';
import { JOINTS, JOINT_PARENT, type RigJoint } from './joints';
import { rehangArm } from './rehang';

export interface RiggedMinifig {
  group: THREE.Group;
  joints: Record<RigJoint, THREE.Group>;
  animator: MinifigAnimator;
  height: number;
  /** world units per animation position unit (for hip bobs) */
  unitScale: number;
}

function bakeMesh(src: THREE.Mesh, matrix: THREE.Matrix4, recolor?: THREE.Color): THREE.Mesh {
  const geo = src.geometry.clone();
  geo.applyMatrix4(matrix);
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  const mats = (Array.isArray(src.material) ? src.material : [src.material]).map((m) => {
    const c = (m as THREE.Material).clone() as THREE.MeshPhongMaterial;
    if (recolor && c.color && !c.map) c.color = recolor.clone();
    c.side = THREE.DoubleSide;
    return c;
  });
  const mesh = new THREE.Mesh(geo, Array.isArray(src.material) ? mats : mats[0]);
  mesh.name = src.name;
  mesh.castShadow = true;
  return mesh;
}

/** Requested 2026-08-04 (Beda investigation, Wave 2): the pre-animator
 *  assembled hierarchy (baked meshes + joint groups), keyed by the exact
 *  same config fields `RiggedFigure.tsx`'s own effect dependency list
 *  already re-assembles on — so two callers with an identical look (most
 *  concretely: the SAME villager id remounting fresh when their job flips
 *  to/from 'defender', since `Villagers.tsx`/`Defenders.tsx` use mutually
 *  exclusive `job` filters over two entirely separate component trees, so a
 *  job change is always a full unmount+remount, never a shared instance)
 *  skip both the async donor/palette fetches AND the expensive synchronous
 *  geometry work (classifySided, rehangArm's PCA analysis, alignLimb, the
 *  joint-hierarchy build) on every repeat. `THREE.Object3D.clone(true)`
 *  deep-clones the hierarchy/transforms but shares geometry/material
 *  references by default — safe here since colors are already baked into
 *  those materials per the SAME cache key, and nothing elsewhere in this
 *  codebase mutates a rig mesh's material after assembly (confirmed by
 *  search — no per-instance hit-flash/tint exists on rigged characters). */
interface AssembledRigBase {
  root: THREE.Group;
  unitScale: number;
}
const rigBaseCache = new Map<string, AssembledRigBase>();
function rigCacheKey(config: CharacterConfig, targetHeight: number, keepProps: boolean): string {
  return `${config.headDonor}|${config.bodyDonor}|${config.armColor}|${config.handColor}`
    + `|${config.legColor}|${config.hipColor}|${targetHeight}|${keepProps}`;
}

export async function assembleRiggedMinifig(
  config: CharacterConfig,
  targetHeight = 1.75,
  /** keep weapons that are molded into the donor mesh (a halberd, shield,
   *  crossbow…). Off for villagers and the player — whose gear is attached
   *  separately from the Armory — on for enemies and armed NPCs, where the
   *  molded weapon IS the character's weapon. */
  keepProps = false,
): Promise<RiggedMinifig> {
  const cacheKey = rigCacheKey(config, targetHeight, keepProps);
  const cachedBase = rigBaseCache.get(cacheKey);
  if (cachedBase) {
    const clonedRoot = cachedBase.root.clone(true);
    const joints = {} as Record<RigJoint, THREE.Group>;
    for (const j of JOINTS) joints[j] = clonedRoot.getObjectByName(`joint_${j}`) as THREE.Group;
    const animator = new MinifigAnimator(joints, cachedBase.unitScale, await loadRest());
    return { group: clonedRoot, joints, animator, height: targetHeight, unitScale: cachedBase.unitScale };
  }

  const [headDonor, bodyDonor, colors] = await Promise.all([
    loadDonor(config.headDonor), loadDonor(config.bodyDonor), loadPalette(),
  ]);
  await Promise.all([loadRest(), loadPartRoles()]);

  const donorMeshes = (g: THREE.Group) => {
    const out: THREE.Mesh[] = [];
    g.traverse((c) => { if ((c as THREE.Mesh).isMesh) out.push(c as THREE.Mesh); });
    return out;
  };
  const headParts = classifySided(donorMeshes(headDonor), headDonor.userData.donorId, keepProps);
  const bodyParts = classifySided(donorMeshes(bodyDonor), bodyDonor.userData.donorId, keepProps);
  const pick = (p: SidedPart) => (p === 'head' || p === 'accessory' ? headParts : bodyParts).get(p) ?? [];

  const recolorFor = (p: SidedPart): THREE.Color | undefined => {
    if (p === 'leftarm' || p === 'rightarm') return paletteColor(colors, config.armColor);
    if (p === 'lefthand' || p === 'righthand') return paletteColor(colors, config.handColor);
    if (p === 'leftleg' || p === 'rightleg' || p === 'leftfoot' || p === 'rightfoot')
      return paletteColor(colors, config.legColor);
    if (p === 'hips') return paletteColor(colors, config.hipColor);
    return undefined;
  };

  // measure the raw assembly to compute one normalization matrix:
  // upright (rotX π), scaled to targetHeight, feet on y=0, centered on x/z
  const measure = new THREE.Group();
  for (const j of JOINTS) for (const p of JOINT_PARTS[j]) for (const m of pick(p)) {
    const c = m.clone();
    measure.add(c);
  }
  measure.rotation.x = Math.PI;
  measure.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(measure);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeight / (size.y || 1);
  const center = box.getCenter(new THREE.Vector3());
  const N = new THREE.Matrix4()
    .makeTranslation(-center.x * scale, -box.min.y * scale, -center.z * scale)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI));

  // bake every part mesh into normalized space, tracked per sided part so
  // limbs and their hands can be corrected independently
  const sidedBaked = new Map<SidedPart, THREE.Mesh[]>();
  const allSided: SidedPart[] = [
    'head', 'accessory', 'body', 'other', 'hips',
    'leftarm', 'rightarm', 'lefthand', 'righthand',
    'leftleg', 'rightleg', 'leftfoot', 'rightfoot',
  ];
  for (const p of allSided) {
    sidedBaked.set(p, pick(p).map((m) => bakeMesh(m, N, recolorFor(p))));
  }
  const jointMeshes = {} as Record<RigJoint, THREE.Mesh[]>;
  for (const j of JOINTS) {
    jointMeshes[j] = JOINT_PARTS[j].flatMap((p) => sidedBaked.get(p) ?? []);
  }
  // fallback for unnamed donors: everything under hips (static figure)
  if (JOINTS.every((j) => jointMeshes[j].length === 0)) {
    for (const m of donorMeshes(bodyDonor)) jointMeshes.hips.push(bakeMesh(m, N));
  }

  // joint pivots from part bounds (LEGO articulation points)
  const boundsOf = (meshes: THREE.Mesh[]) => {
    const b = new THREE.Box3();
    for (const m of meshes) b.expandByObject(m);
    return b;
  };
  const pivot = {} as Record<RigJoint, THREE.Vector3>;
  const bHips = boundsOf(jointMeshes.hips.length ? jointMeshes.hips : jointMeshes.body);
  const bBody = boundsOf(jointMeshes.body.length ? jointMeshes.body : jointMeshes.hips);
  const bodyC = bBody.getCenter(new THREE.Vector3());
  pivot.hips = bHips.getCenter(new THREE.Vector3());
  pivot.body = new THREE.Vector3(bodyC.x, bBody.min.y, bodyC.z);
  for (const [j, topFrac] of [['head', 0], ['leftleg', 0.06], ['rightleg', 0.06]] as [RigJoint, number][]) {
    const meshes = jointMeshes[j];
    if (!meshes.length) { pivot[j] = pivot.body.clone(); continue; }
    const b = boundsOf(meshes);
    const c = b.getCenter(new THREE.Vector3());
    pivot[j] = new THREE.Vector3(
      c.x,
      j === 'head' ? b.min.y : b.max.y - (b.max.y - b.min.y) * topFrac,
      c.z,
    );
  }
  // Arms anchor to the torso's shoulder sockets. The warehouse models bake
  // gesture poses directly into the arm mold's vertex data (the LCA carries
  // no per-part rotations), so we analyse each arm geometrically: PCA gives
  // the mold's long axis, the end nearest the torso is the shoulder, and the
  // piece is re-hung from the socket with its elbow bow rolled to the front.
  const shoulderY = bBody.max.y - (bBody.max.y - bBody.min.y) * 0.2;
  const bodyHalfW = (bBody.max.x - bBody.min.x) / 2;
  for (const [j, side] of [['leftarm', 1], ['rightarm', -1]] as [RigJoint, number][]) {
    const socket = new THREE.Vector3(bodyC.x + side * bodyHalfW * 0.98, shoulderY, bodyC.z);
    pivot[j] = socket;
    const armMeshes = sidedBaked.get(j as SidedPart)!;
    if (!armMeshes.length) continue;
    const hang = new THREE.Vector3(0.2 * side, -0.92, 0.33).normalize();
    // the hand rides the arm's rehang as a rigid passenger (Phase 22 fix) —
    // same rotation + translation, so it stays seated in the sleeve end at
    // the donor's own baked wrist relation. The old approach translated the
    // hand's center to a computed wrist point WITHOUT rotating it, leaving
    // it at the baked gesture's angle: visibly detached below the sleeve.
    const hands = sidedBaked.get(j === 'leftarm' ? 'lefthand' : 'righthand')!;
    rehangArm(armMeshes, socket, hang, hands);
  }

  // Un-pose limbs: some donors are baked mid-gesture (raised arm etc.).
  // Rotate each limb about its pivot so it hangs in a neutral LEGO stance;
  // animation deltas then swing around that consistent base.
  const rotateAbout = (meshes: THREE.Mesh[], p: THREE.Vector3, q: THREE.Quaternion) => {
    const m = new THREE.Matrix4()
      .makeTranslation(p.x, p.y, p.z)
      .multiply(new THREE.Matrix4().makeRotationFromQuaternion(q))
      .multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z));
    for (const mesh of meshes) mesh.geometry.applyMatrix4(m);
  };
  const alignLimb = (mainMeshes: THREE.Mesh[], j: RigJoint, desired: THREE.Vector3) => {
    if (!mainMeshes.length) return;
    const b = boundsOf(mainMeshes);
    const c = b.getCenter(new THREE.Vector3());
    const tip = new THREE.Vector3(c.x, b.min.y, c.z);
    const cur = tip.sub(pivot[j]);
    if (cur.lengthSq() < 1e-8) return;
    const q = new THREE.Quaternion().setFromUnitVectors(cur.normalize(), desired.clone().normalize());
    rotateAbout(mainMeshes, pivot[j], q);
  };
  // legs (feet ride along rigidly — they're straight in every donor)
  alignLimb([...sidedBaked.get('leftleg')!, ...sidedBaked.get('leftfoot')!], 'leftleg', new THREE.Vector3(0, -1, 0.03));
  alignLimb([...sidedBaked.get('rightleg')!, ...sidedBaked.get('rightfoot')!], 'rightleg', new THREE.Vector3(0, -1, 0.03));

  // build hierarchy: group positions are relative to parent pivots
  const root = new THREE.Group();
  const joints = {} as Record<RigJoint, THREE.Group>;
  for (const j of ['hips', 'body', 'head', 'leftarm', 'rightarm', 'leftleg', 'rightleg'] as RigJoint[]) {
    const g = new THREE.Group();
    g.name = `joint_${j}`;
    const parent = JOINT_PARENT[j];
    const parentPivot = parent ? pivot[parent] : new THREE.Vector3();
    g.position.copy(pivot[j]).sub(parentPivot);
    (parent ? joints[parent] : root).add(g);
    for (const m of jointMeshes[j]) {
      m.position.copy(pivot[j]).negate();
      g.add(m);
    }
    joints[j] = g;
  }

  const unitScale = (scale) / 100; // 100 anim units = 1 OBJ unit
  // cache a PRISTINE clone, never the live `root` itself — `root`'s own
  // joint groups get mutated in place every frame by this character's own
  // MinifigAnimator.update() once it starts playing a clip, so caching the
  // live reference would leak whatever pose THIS character is mid-animation
  // in in to every future cache hit instead of a clean rest state.
  rigBaseCache.set(cacheKey, { root: root.clone(true), unitScale });
  const animator = new MinifigAnimator(joints, unitScale, await loadRest());
  return { group: root, joints, animator, height: targetHeight, unitScale };
}
