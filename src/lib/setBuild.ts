'use client';
// The workshop's loader: a set module, split into the individual parts you
// place one at a time.
//
// `propRig` already loads these OBJs, but it buckets meshes by the rig lab's
// ROLE — four legs become `leg_upper#0..3` and everything unlabelled collapses
// into one `body` group. That is right for animating a horse and wrong for
// building a castle, where the unit of work is the individual `o` object.
// This keeps every object separate and hands them back in the order the plan
// says to place them.
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import plans from '@/game/data/setPlans.generated.json';

const OBJ_BASE = '/assets/props/objrig';

export interface BuildPart {
  name: string;
  /** ready to add to a scene; already normalised and grounded */
  object: THREE.Object3D;
  /** the top of this part, for the "rises out of the ground" clip */
  topY: number;
  baseY: number;
  /** rough volume, used to price the step */
  vol: number;
}

export interface ModulePlan {
  asset: string;
  steps: { name: string; baseY: number; topY: number; cx: number; cz: number; vol: number }[];
}

export interface SetPlan {
  name: string;
  faction: string;
  modules: ModulePlan[];
}

export const SET_PLANS = (plans as { sets: Record<string, SetPlan> }).sets;

/** the height every module is measured and rendered at (matches gen-setplans) */
export const MODULE_HEIGHT = 2;

const cache = new Map<string, Promise<BuildPart[] | null>>();

/**
 * Load one module and return its parts IN BUILD ORDER.
 *
 * The normalisation matches `PropModel` exactly — flip upright, scale to a
 * target height, centre on X/Z, ground at y=0 — because the workshop's
 * finished model has to be the same object the world already renders.
 */
export function loadModuleParts(asset: string): Promise<BuildPart[] | null> {
  const hit = cache.get(asset);
  if (hit) return hit;

  const job = (async () => {
    const mtl = await new MTLLoader().setPath(`${OBJ_BASE}/`).loadAsync(`${asset}.mtl`).catch(() => null);
    if (mtl) { mtl.preload(); }
    const loader = new OBJLoader();
    if (mtl) loader.setMaterials(mtl);
    const root = await loader.setPath(`${OBJ_BASE}/`).loadAsync(`${asset}.obj`).catch(() => null);
    if (!root) return null;

    // upright and scaled, exactly as PropModel does it
    const holder = new THREE.Group();
    root.rotation.x = Math.PI;
    holder.add(root);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    const s = MODULE_HEIGHT / (size.y || 1);
    holder.scale.setScalar(s);
    holder.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(holder);
    const centre = box2.getCenter(new THREE.Vector3());
    root.position.set(
      root.position.x - centre.x / s,
      root.position.y - box2.min.y / s,
      root.position.z - centre.z / s,
    );
    holder.updateMatrixWorld(true);

    // MTLLoader hands back Phong; the scene's lighting is PBR, the same swap
    // propRig makes for the same reason
    const byName = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = list.map((m) => {
        const src = m as THREE.MeshPhongMaterial;
        return new THREE.MeshStandardMaterial({
          color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
          map: src.map ?? null,
          transparent: src.transparent,
          alphaTest: src.alphaTest,
          roughness: 0.86,
          metalness: 0,
          side: THREE.DoubleSide,
        });
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.name) byName.set(mesh.name, mesh);
    });

    // the plan holds the order; the OBJ holds the geometry
    const plan = Object.values(SET_PLANS)
      .flatMap((set) => set.modules)
      .find((m) => m.asset === asset);
    if (!plan) return null;

    const parts: BuildPart[] = [];
    for (const step of plan.steps) {
      const obj = byName.get(step.name);
      if (!obj) continue;
      // lift each part out into world-normalised space so it can be parented
      // anywhere and still land where the plan says
      obj.updateWorldMatrix(true, false);
      const lifted = obj.clone();
      lifted.applyMatrix4(obj.matrixWorld);
      lifted.matrixAutoUpdate = false;
      lifted.updateMatrix();
      parts.push({ name: step.name, object: lifted, topY: step.topY, baseY: step.baseY, vol: step.vol });
    }
    return parts.length ? parts : null;
  })();

  cache.set(asset, job);
  return job;
}

/** total steps in a set, across every module */
export function setStepCount(setNum: string): number {
  const p = SET_PLANS[setNum];
  if (!p) return 0;
  return p.modules.reduce((t, m) => t + m.steps.length, 0);
}

/** which module and step a flat step index lands on */
export function locateStep(setNum: string, index: number): { module: number; step: number } | null {
  const p = SET_PLANS[setNum];
  if (!p) return null;
  let i = index;
  for (let m = 0; m < p.modules.length; m++) {
    const n = p.modules[m].steps.length;
    if (i < n) return { module: m, step: i };
    i -= n;
  }
  return null;
}

/**
 * M · Which set a buildable belongs to, if any. A siege engine in the build
 * menu IS a module of a real set — `oc6096-4` is a piece of Bull's Attack —
 * so building the set is what puts it in your hands. Anything not part of a
 * set is unaffected.
 */
const OWNER: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [num, plan] of Object.entries(SET_PLANS)) {
    for (const m of plan.modules) out[m.asset] = num;
  }
  return out;
})();

export function setOwning(buildableId: string): string | null {
  return OWNER[buildableId] ?? null;
}
