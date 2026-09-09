'use client';
// Original hand weapons, pulled at runtime from the armed minifig donors
// (the meshes are molded into those models; identified by object name).
// Normalized to weapon-local space: long axis up (+Y), grip near the origin.
import * as THREE from 'three';
import { loadDonor } from './minifig';
import { loadPartRoles, partRolesFor } from './rigParts';

export type WeaponId = 'sword' | 'halberd' | 'spear' | 'crossbow' | 'bow' | 'arrow' | 'bolt' | 'axe'
  // Wave 49 (C1) · the sword/halberd tiers above the base mold. Real,
  // distinct WeaponIds (not a `tier` param on the base one) because
  // loadWeapon's own cache is keyed one Promise per id, and its material
  // clone lives INSIDE that per-id cache — the only granularity a tint can be
  // applied at without ever risking the base mold's shared material (see the
  // tint application below for the full reasoning).
  | 'sword_forged' | 'sword_crested' | 'halberd_forged' | 'halberd_crested';

interface WeaponDef {
  donor: string;
  /** the rig lab's own role name for this mold on that donor
   *  (part_roles.json). Replaces the hand-picked OBJ object id: the lab
   *  verified these per donor, so "which mesh is the sword" is no longer a
   *  guess that has to be re-derived every time a donor changes. */
  role: string;
  length: number;   // world meters along the long axis
  gripAt?: number;  // fallback grip fraction if the donor has no hand mesh
  /** AMMUNITION rather than held gear. An arrow or a bolt is a straight
   *  shaft nobody is gripping, so deriving its direction from the nearest
   *  hand picks a hand that may be nowhere near it and skews the result —
   *  its own long axis is unambiguous, so use that instead. */
  straight?: boolean;
  /** Wave 49 (C1) · a hex color lerped into this mold's own material once,
   *  inside loadWeapon's per-id cache — see that function's own comment for
   *  why this is safe (isolated per WeaponId, never touches a different id's
   *  material, e.g. the base 'sword' mold a Forged/Crested tier is tinted
   *  FROM). Absent = untinted, the mold's original material verbatim. */
  tint?: string;
}

// Every one of these is a donor the rig lab VERIFIED as holding that weapon
// (part_roles.json), so both "which mesh" and "which way round" come from
// data rather than from picking a shape id by eye and guessing a sign.
const WEAPONS: Record<WeaponId, WeaponDef> = {
  sword: { donor: 'minifigrichardstrong03', role: 'sword', length: 0.62 },
  halberd: { donor: 'minifiggenericgood00', role: 'halberd', length: 1.15 },
  spear: { donor: 'minifigrichardstrong02', role: 'spear', length: 1.25 },
  crossbow: { donor: 'minifiggilbertbad03', role: 'crossbow', length: 0.5 },
  // the longbow finally has a real mold: John of Mayne carries one, along
  // with the arrow that goes on it — so the draw can nock a REAL arrow
  bow: { donor: 'minifigjohnmayne01', role: 'bow', length: 0.95 },
  arrow: { donor: 'minifigjohnmayne01', role: 'arrow', length: 0.72, straight: true },
  // and the crossbow donor carries its own bolt
  bolt: { donor: 'minifiggilbertbad03', role: 'crossbow_bolt', length: 0.34, straight: true },
  // Wave 34 · a real one-handed axe, held in a fist next to a shield —
  // part_roles.json charts this exact mold (byte-identical geometry and
  // material) on TWO minifig donors, minifiggilbertbad01 and
  // minifigcedricbull04. Picked Gilbert: his donor is already warmed by
  // preload.ts's ENEMY_DONORS (he's a live combat enemy), while Cedric's
  // `04` variant is not (only `minifigcedricbull00`, a different pose, is),
  // so this adds zero new asset fetches. Scaled toward the sword's own 0.62
  // rather than the mold's literal ~0.83m reading — this is a one-handed,
  // shield-paired weapon like the sword, not a two-handed haft.
  axe: { donor: 'minifiggilbertbad01', role: 'axe', length: 0.58 },
  // Wave 49 (C1) · the sword's Crested tier gets a REAL second donor rather
  // than a tint on the base mold. part_roles.json's full 'sword'-role scan
  // turned up 3 real minifig candidates beyond the base minifigrichardstrong03
  // (a 4th, oc4807, is a vehicle prop with no hand_L/hand_R — ruled out) —
  // minifigcedricbull01, minifigjohnmayne02, minifigprincessstorm01 — none
  // already warmed by preload.ts's ENEMY_DONORS, so tiebroken on real OBJ file
  // size the same way Wave 34's axe donor was: minifigjohnmayne02 (33,302 B)
  // is the smallest of the three, and John Mayne's donor family is already
  // proven-safe in this exact pipeline (his `01` variant is the longbow mold
  // above). Forged stays on the base mold with a dark steel tint — a real
  // donor swap for a MIDDLE tier would cost a second asset fetch for a rung
  // that's about to be re-forged again anyway.
  sword_forged: { donor: 'minifigrichardstrong03', role: 'sword', length: 0.62, tint: '#6f7480' },
  sword_crested: { donor: 'minifigjohnmayne02', role: 'sword', length: 0.62, tint: '#e7e2d0' },
  // Halberd has exactly ONE real 'halberd'-role donor in the whole rig lab
  // (minifiggenericgood00, the existing base mold) — no second candidate
  // exists to give its top tier a real mesh swap the way the sword's got one.
  // An honest, stated scope-down: both halberd tiers above base are tint-only
  // on the same mold, using the identical two tint colors the sword's own
  // middle/top tiers use, so the two weapon lines read as one shared "steel ->
  // dark forged -> pale crested" palette rather than two invented ones.
  halberd_forged: { donor: 'minifiggenericgood00', role: 'halberd', length: 1.15, tint: '#6f7480' },
  halberd_crested: { donor: 'minifiggenericgood00', role: 'halberd', length: 1.15, tint: '#e7e2d0' },
};

// King Leo's shield. `022_shape10` (the old pick) sits dead-center over the
// hips at torso height/width, matching his chest block, not a held item —
// exactly the "that's Leo's body part" bug reported in Phase 18. Mapping out
// every named shape in his donor by real-world altitude and left/right
// offset (model-up is -Y) shows a clean bilateral rig: sword arm/hand/blade
// cluster on one side (031_shape15/038_shape19/037_shape18, all offset to
// -X), and a lone bulky shape on the mirrored +X side (044_shape22, similar
// overall size to his head) with no arm/hand shape of its own paired to it
// otherwise — the off-hand's shield.
const SHIELD_DONOR = 'minifigkingleo01';
const SHIELD_OBJECT = '044_shape22';
const SHIELD_TARGET_HEIGHT = 0.5; // matches the old procedural shield's height

let shieldPromise: Promise<THREE.Group | null> | null = null;

export function loadShield(): Promise<THREE.Group | null> {
  if (!shieldPromise) {
    shieldPromise = loadDonor(SHIELD_DONOR).then((donor) => {
      // this object has two materials (a plain palette color plus a
      // textured face), so OBJLoader represents it as a Group named
      // "022_shape10" wrapping multiple unnamed child meshes — not a
      // single named Mesh like the single-material sword/halberd — so
      // find the named node at any type, then normalize the whole subtree
      // the same way PropModel.tsx normalizes multi-mesh GLB props.
      let src: THREE.Object3D | null = null;
      donor.traverse((c) => { if (c.name === SHIELD_OBJECT) src = c; });
      if (!src) return null;
      const inner = (src as THREE.Object3D).clone(true);
      inner.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const mesh = c as THREE.Mesh;
          if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
          const srcMat = mesh.material;
          const mats = (Array.isArray(srcMat) ? srcMat : [srcMat]).map((m) => {
            const c2 = (m as THREE.Material).clone();
            (c2 as THREE.MeshPhongMaterial).side = THREE.DoubleSide;
            return c2;
          });
          mesh.material = Array.isArray(srcMat) ? mats : mats[0];
          mesh.castShadow = true;
        }
      });
      inner.rotation.x = Math.PI; // standard prop upright-flip (model-up is -Y)
      const holder = new THREE.Group();
      holder.add(inner);
      holder.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(holder);
      const size = box.getSize(new THREE.Vector3());
      holder.scale.setScalar(SHIELD_TARGET_HEIGHT / Math.max(1e-6, size.y));
      holder.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(holder);
      const center = box2.getCenter(new THREE.Vector3());
      holder.position.set(-center.x, -center.y, -center.z);
      const g = new THREE.Group();
      g.add(holder);
      return g;
    });
  }
  return shieldPromise;
}

// Cedric the Bull's horned helm: a single-material shape sitting directly
// above his head object in Y (raw OBJ space) — a real helmet mold, not a
// crown or cape. Almost 3x wider than tall (the horns sweep sideways), so
// it's normalized by width, not height, unlike every other accessory here.
// Single material like the sword/halberd: plain flip+scale+center, no PCA
// long-axis alignment (that's only for elongated hand weapons).
const HELMET_DONOR = 'minifigcedricbull00';
const HELMET_OBJECT = '022_L_602900_D2';
const HELMET_TARGET_WIDTH = 0.34;

let helmetPromise: Promise<THREE.Group | null> | null = null;

export function loadHelmet(): Promise<THREE.Group | null> {
  if (!helmetPromise) {
    helmetPromise = loadDonor(HELMET_DONOR).then((donor) => {
      let src: THREE.Mesh | null = null;
      donor.traverse((c) => { if ((c as THREE.Mesh).isMesh && c.name === HELMET_OBJECT) src = c as THREE.Mesh; });
      if (!src) return null;
      const mesh = src as THREE.Mesh;
      const geo = mesh.geometry.clone();
      if (!geo.getAttribute('normal')) geo.computeVertexNormals();
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const center = bb.getCenter(new THREE.Vector3());
      geo.translate(-center.x, -center.y, -center.z);
      const size = bb.getSize(new THREE.Vector3());
      const s = HELMET_TARGET_WIDTH / Math.max(1e-6, size.x);
      geo.scale(s, s, s);
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const c = (m as THREE.Material).clone();
        (c as THREE.MeshPhongMaterial).side = THREE.DoubleSide;
        return c;
      });
      const out = new THREE.Mesh(geo, Array.isArray(mesh.material) ? mats : mats[0]);
      out.castShadow = true;
      const g = new THREE.Group();
      g.add(out);
      g.rotation.x = Math.PI; // standard prop upright-flip (model-up is -Y)
      return g;
    });
  }
  return helmetPromise;
}

const cache = new Map<WeaponId, Promise<THREE.Group | null>>();

export function loadWeapon(id: WeaponId): Promise<THREE.Group | null> {
  let p = cache.get(id);
  if (!p) {
    const def = WEAPONS[id];
    p = (async () => {
      await loadPartRoles();
      const donor = await loadDonor(def.donor);
      const roles = partRolesFor(def.donor);
      if (!roles) return null;

      // find the mesh the lab named for this role, plus both hands
      const byRole = new Map<string, THREE.Mesh>();
      donor.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh) return;
        const role = roles[m.name];
        if (role) byRole.set(role, m);
      });
      const mesh = byRole.get(def.role);
      if (!mesh) return null;

      const geo = mesh.geometry.clone();
      if (!geo.getAttribute('normal')) geo.computeVertexNormals();
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const centre = bb.getCenter(new THREE.Vector3());

      // ---- pose from the DONOR'S OWN GRIP -------------------------------
      // The old approach ran PCA over the vertices to find a long axis, but
      // an eigenvector is an undirected line: its sign is arbitrary, which is
      // why the sword and then the crossbow both had to be corrected by hand
      // with a `flip` flag, and why every new weapon was a coin toss.
      //
      // The donor is HOLDING the thing. Take whichever hand mesh is nearer
      // the weapon as the grip, and point the weapon from that grip toward
      // its own far end. Direction and grip both come out of the pose, so
      // there is no sign left to get wrong.
      const handOf = (r: string) => {
        const h = byRole.get(r);
        if (!h) return null;
        h.geometry.computeBoundingBox();
        return h.geometry.boundingBox!.getCenter(new THREE.Vector3());
      };
      const hands = def.straight ? [] : [handOf('hand_R'), handOf('hand_L')].filter(Boolean) as THREE.Vector3[];
      const grip = hands.length
        ? hands.reduce((a, b) => (a.distanceTo(centre) <= b.distanceTo(centre) ? a : b))
        : null;

      const pos = geo.getAttribute('position') as THREE.BufferAttribute;
      let dir: THREE.Vector3;
      let gripLocal: THREE.Vector3;
      if (grip) {
        // the far end is the vertex furthest from the hand
        let best = -1;
        const far = new THREE.Vector3();
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          const d = v.distanceToSquared(grip);
          if (d > best) { best = d; far.copy(v); }
        }
        dir = far.clone().sub(grip).normalize();
        gripLocal = grip.clone();
      } else {
        // no hand on this donor (a rack or a mount) — fall back to the bbox
        // long axis, which is unambiguous for those because they are not
        // baked into a gesture
        const size = bb.getSize(new THREE.Vector3());
        dir = size.x > size.y && size.x > size.z ? new THREE.Vector3(1, 0, 0)
          : size.z > size.y ? new THREE.Vector3(0, 0, 1)
          : new THREE.Vector3(0, 1, 0);
        gripLocal = centre.clone().addScaledVector(dir, -Math.max(size.x, size.y, size.z) * (0.5 - (def.gripAt ?? 0.15)));
      }

      // grip to the origin, weapon pointing +Y, scaled to its target length
      geo.translate(-gripLocal.x, -gripLocal.y, -gripLocal.z);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(dir, new THREE.Vector3(0, 1, 0)));
      geo.computeBoundingBox();
      const bb2 = geo.boundingBox!;
      const len = Math.max(1e-6, bb2.max.y - bb2.min.y);
      const s = def.length / len;
      geo.scale(s, s, s);

      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const c = (m as THREE.Material).clone();
        (c as THREE.MeshPhongMaterial).side = THREE.DoubleSide;
        // Wave 49 (C1) · tier tint, applied HERE — inside this id's own
        // once-per-WeaponId cache, on a material this call just cloned. Safe
        // and isolated: this Promise (and this clone) is never shared with a
        // different WeaponId's own cache entry, so tinting 'sword_forged'
        // here can never bleed onto the base 'sword' mold even though both
        // read the same donor. Lerped rather than replaced so the mold's own
        // texture/shading still shows through, just recolored.
        if (def.tint && (c as THREE.MeshPhongMaterial).color) {
          (c as THREE.MeshPhongMaterial).color.lerp(new THREE.Color(def.tint), 0.375);
        }
        return c;
      });
      const out = new THREE.Mesh(geo, Array.isArray(mesh.material) ? mats : mats[0]);
      out.castShadow = true;
      const g = new THREE.Group();
      g.add(out);
      return g;
    })();
    cache.set(id, p);
  }
  return p;
}
