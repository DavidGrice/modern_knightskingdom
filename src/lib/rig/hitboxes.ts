'use client';
// CLN-29 · a rigged figure's hit boxes, measured off its joints.
import * as THREE from 'three';
import { type RiggedMinifig } from './assemble';
import { JOINTS, type RigJoint } from './joints';

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
