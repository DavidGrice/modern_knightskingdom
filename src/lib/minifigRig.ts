'use client';
// Rigged minifig assembly + animation playback for the original SMO tracks.
//
// The extracted animation JSONs carry 11 named tracks (head, body, hips,
// left/right arm/hand/leg/foot) with per-frame pos (VRT units, 100 = 1 OBJ mm)
// and rot (degrees, [bearing, pitch, roll] applied RY·RX·RZ — FORMAT_SPEC).
// We build a LEGO-faithful reduced rig (head, body, hips, arms, legs — hands
// ride with arms, feet with legs), derive joint pivots from part bounding
// boxes, and drive joints with rotation deltas relative to the rest pose.
import * as THREE from 'three';
import { loadDonor, loadPalette, paletteColor } from './minifig';
import { bodyKindOf, loadPartRoles, partRolesFor } from './rigParts';
import type { CharacterConfig } from '@/game/types';

export type RigJoint = 'head' | 'body' | 'hips' | 'leftarm' | 'rightarm' | 'leftleg' | 'rightleg';
const JOINTS: RigJoint[] = ['head', 'body', 'hips', 'leftarm', 'rightarm', 'leftleg', 'rightleg'];

// Axis mapping from anim rot triples to three.js euler (order YXZ), tuned
// against the walk/greet cycles: rot[0]→yaw, rot[1]→pitch, rot[2]→roll.
const SIGN_X = -1; // pitch (arm/leg swing)
const SIGN_Y = -1; // bearing (head turn)
const SIGN_Z = 1;  // roll

interface AnimFrame { pos: number[]; rot: number[] }
interface AnimTrack { name: string; frames: AnimFrame[] }
interface AnimClip { file: string; num_frames: number; tracks: AnimTrack[] }

const clipCache = new Map<string, Promise<AnimClip>>();

export function loadClip(name: string): Promise<AnimClip> {
  let p = clipCache.get(name);
  if (!p) {
    p = fetch(`/assets/anims/${name}.json`).then((r) => r.json());
    clipCache.set(name, p);
  }
  return p;
}

/** rest-pose reference rotations/positions per track (from anim_r_restpose frame 0) */
let restRef: Promise<Map<string, AnimFrame>> | null = null;
function loadRest(): Promise<Map<string, AnimFrame>> {
  if (!restRef) {
    restRef = loadClip('anim_r_restpose').then((clip) => {
      const m = new Map<string, AnimFrame>();
      for (const t of clip.tracks) m.set(t.name, t.frames[0]);
      return m;
    });
  }
  return restRef;
}

// ---------- part classification (sided) ----------

type SidedPart =
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

function classifySided(
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
const JOINT_PARTS: Record<RigJoint, SidedPart[]> = {
  head: ['head', 'accessory'],
  body: ['body', 'other'],
  hips: ['hips'],
  leftarm: ['leftarm', 'lefthand'],
  rightarm: ['rightarm', 'righthand'],
  leftleg: ['leftleg', 'leftfoot'],
  rightleg: ['rightleg', 'rightfoot'],
};

const JOINT_PARENT: Record<RigJoint, RigJoint | null> = {
  hips: null, body: 'hips', head: 'body',
  leftarm: 'body', rightarm: 'body', leftleg: 'hips', rightleg: 'hips',
};

// ---------- rig assembly ----------

/**
 * Re-hang a molded arm from a torso shoulder socket.
 * PCA over the vertices finds the mold's long axis; the end nearer the socket
 * is the shoulder. The piece is translated so that end sits on the socket,
 * rotated so the axis follows `hang`, and rolled so its bend bows forward.
 * Returns the arm's length along the hang direction (for hand placement).
 */
function rehangArm(meshes: THREE.Mesh[], socket: THREE.Vector3, hang: THREE.Vector3, riders: THREE.Mesh[] = []): number {
  // gather sample vertices
  const pts: THREE.Vector3[] = [];
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step) {
      pts.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
  }
  if (pts.length < 8) return 0.3;
  const mean = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length);
  // covariance
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (const p of pts) {
    const dx = p.x - mean.x, dy = p.y - mean.y, dz = p.z - mean.z;
    xx += dx * dx; xy += dx * dy; xz += dx * dz;
    yy += dy * dy; yz += dy * dz; zz += dz * dz;
  }
  const C = [[xx, xy, xz], [xy, yy, yz], [xz, yz, zz]];
  // principal axis via power iteration
  let a = new THREE.Vector3(0.3, 1, 0.2).normalize();
  for (let i = 0; i < 24; i++) {
    a = new THREE.Vector3(
      C[0][0] * a.x + C[0][1] * a.y + C[0][2] * a.z,
      C[1][0] * a.x + C[1][1] * a.y + C[1][2] * a.z,
      C[2][0] * a.x + C[2][1] * a.y + C[2][2] * a.z,
    ).normalize();
  }
  // extreme points along the axis
  let tMin = Infinity, tMax = -Infinity;
  for (const p of pts) {
    const t = p.clone().sub(mean).dot(a);
    if (t < tMin) tMin = t;
    if (t > tMax) tMax = t;
  }
  const end1 = mean.clone().addScaledVector(a, tMin);
  const end2 = mean.clone().addScaledVector(a, tMax);
  const shoulderEnd = end1.distanceTo(socket) <= end2.distanceTo(socket) ? end1 : end2;
  const axis = (shoulderEnd === end1 ? end2.clone().sub(end1) : end1.clone().sub(end2));
  const armLen = axis.length();
  axis.normalize();

  // 1) rotate the axis onto the hang direction about the shoulder end
  const q1 = new THREE.Quaternion().setFromUnitVectors(axis, hang);
  const m1 = new THREE.Matrix4()
    .makeTranslation(shoulderEnd.x, shoulderEnd.y, shoulderEnd.z)
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(q1))
    .multiply(new THREE.Matrix4().makeTranslation(-shoulderEnd.x, -shoulderEnd.y, -shoulderEnd.z));
  // 2) then translate the shoulder end into the socket
  const m2 = new THREE.Matrix4().makeTranslation(
    socket.x - shoulderEnd.x, socket.y - shoulderEnd.y, socket.z - shoulderEnd.z,
  ).multiply(m1);
  // riders (the hand) get the identical rigid motion so they stay seated
  // exactly where the donor baked them relative to this arm
  for (const mesh of [...meshes, ...riders]) mesh.geometry.applyMatrix4(m2);

  // 3) roll about the hang axis so the mold's bow (elbow) faces forward (+Z)
  const bow = new THREE.Vector3();
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const step = Math.max(1, Math.floor(pos.count / 300));
    for (let i = 0; i < pos.count; i += step) {
      const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(socket);
      bow.add(p.addScaledVector(hang, -p.dot(hang)));
    }
  }
  bow.addScaledVector(hang, -bow.dot(hang));
  if (bow.lengthSq() > 1e-6) {
    bow.normalize();
    const want = new THREE.Vector3(0, 0, 1).addScaledVector(hang, -hang.z).normalize();
    const cross = bow.clone().cross(want);
    const angle = Math.atan2(cross.dot(hang), bow.dot(want));
    const m3 = new THREE.Matrix4()
      .makeTranslation(socket.x, socket.y, socket.z)
      .multiply(new THREE.Matrix4().makeRotationAxis(hang, angle))
      .multiply(new THREE.Matrix4().makeTranslation(-socket.x, -socket.y, -socket.z));
    for (const mesh of [...meshes, ...riders]) mesh.geometry.applyMatrix4(m3);
  }
  return armLen;
}

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

// ---------- animator ----------

const FPS = 15;
const FADE = 0.18;

export class MinifigAnimator {
  private clip: AnimClip | null = null;
  private clipName = '';
  private time = 0;
  private loop = true;
  private fade = 0;
  private blendFrom = new Map<RigJoint, THREE.Euler>();
  private hipsBaseY: number;
  private hipsRefY = 0;
  private onEnd: (() => void) | null = null;
  timeScale = 1;

  constructor(
    private joints: Record<RigJoint, THREE.Group>,
    private unitScale: number,
    private rest: Map<string, AnimFrame>,
  ) {
    this.hipsBaseY = joints.hips.position.y;
  }

  get current() { return this.clipName; }

  async play(name: string, opts: { loop?: boolean; timeScale?: number; onEnd?: () => void } = {}) {
    if (this.clipName === name && (opts.loop ?? true) === this.loop) return;
    const clip = await loadClip(name);
    // snapshot current pose for crossfade
    this.blendFrom.clear();
    for (const j of JOINTS) this.blendFrom.set(j, this.joints[j].rotation.clone());
    this.clip = clip;
    this.clipName = name;
    this.time = 0;
    this.fade = FADE;
    this.loop = opts.loop ?? true;
    this.timeScale = opts.timeScale ?? 1;
    this.onEnd = opts.onEnd ?? null;
    const hipsTrack = clip.tracks.find((t) => t.name === 'hips');
    const frame0Y = hipsTrack?.frames[0].pos[1] ?? 0;
    if (this.loop && hipsTrack) {
      // a looping clip's frame 0 is just an arbitrary point in the repeating
      // cycle, not a neutral reference -- anim_c_run's frame 0 happens to sit
      // at the stride's highest point, so anchoring to it (as one-shot clips
      // correctly do below) pulled the hips down for nearly the whole run
      // cycle instead of bobbing evenly, reading as the character sinking
      // into the ground while running. Anchor loops to the cycle's midpoint
      // instead, so the bob is symmetric around the normal stance height.
      const ys = hipsTrack.frames.map((f) => f.pos[1]);
      this.hipsRefY = (Math.min(...ys) + Math.max(...ys)) / 2;
    } else {
      // one-shot reactions (jump, fall, emotes) should animate away from
      // whatever pose the character is actually in when they start playing.
      this.hipsRefY = frame0Y;
    }
  }

  stop() {
    this.clip = null;
    this.clipName = '';
    for (const j of JOINTS) this.joints[j].rotation.set(0, 0, 0);
    this.joints.hips.position.y = this.hipsBaseY;
  }

  update(dt: number) {
    if (!this.clip) return;
    this.time += dt * this.timeScale;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt);
    const frames = this.clip.num_frames;
    let ft = this.time * FPS;
    if (this.loop) {
      ft %= frames;
    } else if (ft >= frames - 1) {
      ft = frames - 1;
      const done = this.onEnd;
      this.onEnd = null;
      if (done) done();
    }
    const i0 = Math.floor(ft) % frames;
    const i1 = (i0 + 1) % frames;
    const a = ft - Math.floor(ft);
    const blend = this.fade > 0 ? 1 - this.fade / FADE : 1;

    for (const track of this.clip.tracks) {
      const j = track.name as RigJoint;
      const joint = this.joints[j];
      if (!joint || !JOINTS.includes(j)) continue;
      const rest = this.rest.get(track.name);
      if (!rest) continue;
      const f0 = track.frames[i0];
      const f1 = track.frames[i1];
      const rot = (k: number) => {
        const v = f0.rot[k] + (f1.rot[k] - f0.rot[k]) * a - rest.rot[k];
        return (v * Math.PI) / 180;
      };
      const target = new THREE.Euler(SIGN_X * rot(1), SIGN_Y * rot(0), SIGN_Z * rot(2), 'YXZ');
      if (blend < 1) {
        const from = this.blendFrom.get(j)!;
        joint.rotation.set(
          from.x + (target.x - from.x) * blend,
          from.y + (target.y - from.y) * blend,
          from.z + (target.z - from.z) * blend,
        );
        joint.rotation.order = 'YXZ';
      } else {
        joint.rotation.copy(target);
      }
      // hips vertical bob (walk bounce, jumps) — relative to hipsRefY (the
      // loop's own midpoint for cyclic clips, or frame 0 for one-shots; see
      // play()) so stance-height offsets between clips don't float the rig
      if (j === 'hips') {
        const dy = f0.pos[1] + (f1.pos[1] - f0.pos[1]) * a - this.hipsRefY;
        joint.position.y = this.hipsBaseY + dy * this.unitScale * blend;
      }
    }
  }
}

// convenience emote map (clip + optional chatter sound)
export const EMOTES: { id: string; label: string; icon: string; clip: string }[] = [
  { id: 'wave', label: 'Wave', icon: '👋', clip: 'anim_r_greet1' },
  { id: 'regal', label: 'Regal Wave', icon: '👑', clip: 'anim_r_regalwave' },
  { id: 'pleased', label: 'Cheer', icon: '😄', clip: 'anim_c_pleased' },
  { id: 'angry', label: 'Grr!', icon: '😠', clip: 'anim_c_angry' },
  { id: 'think', label: 'Ponder', icon: '🤔', clip: 'anim_c_think' },
  { id: 'jump', label: 'Startle', icon: '😲', clip: 'anim_c_surprisejump' },
];

/**
 * Measure a loaded rig's joint groups into hit volumes, in the figure's own
 * local frame (origin at the feet, +Y up). Called once when a character
 * finishes loading — the result feeds game/hitbox.ts, so ranged combat tests
 * the shape the donor actually has instead of one sphere at a guessed
 * chest height.
 *
 * A joint's own bbox is measured with the rig posed at rest; limbs swing
 * during animation, so each box is padded slightly to cover the swing rather
 * than re-measured per frame (which would cost a full traverse per mob).
 */
export function measureHitBoxes(rig: RiggedMinifig): {
  part: RigJoint; cx: number; cy: number; cz: number; hx: number; hy: number; hz: number;
}[] {
  const out: {
    part: RigJoint; cx: number; cy: number; cz: number; hx: number; hy: number; hz: number;
  }[] = [];
  rig.group.updateMatrixWorld(true);
  // the rig group's own world matrix maps joint space -> figure local space
  const inv = new THREE.Matrix4().copy(rig.group.matrixWorld).invert();
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  // The joints are a PARENT CHAIN (hips -> body -> head/arms, see
  // JOINT_PARENT), so a plain traverse of `hips` walks the entire figure and
  // every parent joint measures as the whole character — which made the hips
  // box 1.74m tall and swallowed every limb hit. Descend into a joint's own
  // meshes only, stopping at any other joint group.
  const jointGroups = new Set(JOINTS.map((j) => rig.joints[j]).filter(Boolean));
  for (const j of JOINTS) {
    const g = rig.joints[j];
    if (!g) continue;
    box.makeEmpty();
    g.updateMatrixWorld(true);
    const walk = (node: THREE.Object3D) => {
      const m = node as THREE.Mesh;
      if (m.isMesh && m.geometry) {
        // held props (a halberd, a shield) are parented to the arm joints and
        // would balloon that limb's box far past the body — the hit volume is
        // the CHARACTER, not their kit
        if (!m.userData?.heldProp) {
          m.geometry.computeBoundingBox();
          const bb = m.geometry.boundingBox;
          if (bb) {
            box.union(bb.clone().applyMatrix4(
              new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld),
            ));
          }
        }
      }
      for (const c of node.children) {
        if (jointGroups.has(c as THREE.Group)) continue; // belongs to another joint
        walk(c);
      }
    };
    walk(g);
    if (box.isEmpty()) continue;
    box.getSize(size);
    box.getCenter(centre);
    // limbs swing; a little padding beats re-measuring every frame
    const pad = j === 'head' || j === 'body' || j === 'hips' ? 0.01 : 0.045;
    out.push({
      part: j,
      cx: centre.x, cy: centre.y, cz: centre.z,
      hx: size.x / 2 + pad, hy: size.y / 2 + pad, hz: size.z / 2 + pad,
    });
  }
  return out;
}
