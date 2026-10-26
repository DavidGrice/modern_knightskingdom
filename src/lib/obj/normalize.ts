// CLN-29 · the normalisation the static props share — written out the same, line for line, in PropModel,
// InstancedProps, propParts and propRig before. (The shield, the workshop's set modules, the dragon, the helmet and the
// rig's own measure normalise differently — centred on Y, offset inside the holder, by wingspan, flipped only, baked
// into one matrix — and keep their own.)
import * as THREE from 'three';

/** Stands `inner` upright (an extracted model's up is −Y: rotation.x = π), puts it in a holder scaled to
 *  `targetHeight` and placed centred on X/Z with its base at y = 0, and returns the holder. */
export function normalizeUpright(inner: THREE.Object3D, targetHeight: number): THREE.Group {
  inner.rotation.x = Math.PI;
  const holder = new THREE.Group();
  holder.add(inner);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3());
  holder.scale.setScalar(targetHeight / (size.y || 1));
  holder.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(holder);
  const center = box2.getCenter(new THREE.Vector3());
  holder.position.set(-center.x, -box2.min.y, -center.z);
  return holder;
}
