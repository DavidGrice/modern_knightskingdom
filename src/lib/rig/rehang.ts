'use client';
// CLN-29 · an arm (and what rides it) re-hung from its shoulder socket, the arm's own long axis found by PCA.
import * as THREE from 'three';

/**
 * Re-hang a molded arm from a torso shoulder socket.
 * PCA over the vertices finds the mold's long axis; the end nearer the socket
 * is the shoulder. The piece is translated so that end sits on the socket,
 * rotated so the axis follows `hang`, and rolled so its bend bows forward.
 * Returns the arm's length along the hang direction (for hand placement).
 */
export function rehangArm(meshes: THREE.Mesh[], socket: THREE.Vector3, hang: THREE.Vector3, riders: THREE.Mesh[] = []): number {
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
