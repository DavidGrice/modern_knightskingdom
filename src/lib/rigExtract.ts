'use client';
// Pulling individual body parts out of an assembled minifig rig, for places
// that want a limb or a head on its own rather than a whole figure — the
// first-person viewmodel's arms and the HUD's character portrait.
//
// Assembling a rig is not cheap (donor OBJs, PCA re-hang, palette recolour),
// and two callers wanting two different parts of the SAME character must not
// pay for it twice, so assembly is cached per appearance. The cache key is
// the appearance itself: change a sleeve colour and it re-assembles, which
// is exactly what makes the viewmodel and the portrait follow the character
// editor without any explicit invalidation.
import * as THREE from 'three';
import { assembleRiggedMinifig, type RiggedMinifig } from './minifigRig';
import type { CharacterConfig } from '@/game/types';

/** figure height parts are assembled at; callers scale from here */
const RIG_HEIGHT = 1.75;

export interface FpsArm {
  /** arm + hand meshes, shoulder at the group origin, hanging -Y */
  group: THREE.Group;
  /** wrist/hand centre in the group's local space — where gear mounts */
  hand: THREE.Vector3;
  /** shoulder-to-hand distance, for scaling a held item sensibly */
  length: number;
}

export interface FpsArms {
  right: FpsArm;
  left: FpsArm;
}

/** everything that changes how a character looks; anything else (their name,
 *  their calling) must NOT bust the cache */
function appearanceKey(c: CharacterConfig): string {
  return [c.headDonor, c.bodyDonor, c.armColor, c.handColor, c.legColor, c.hipColor].join('|');
}

const cache = new Map<string, Promise<RiggedMinifig>>();

function rigFor(config: CharacterConfig): Promise<RiggedMinifig> {
  const key = appearanceKey(config);
  let p = cache.get(key);
  if (!p) {
    // keepProps false: a donor's molded weapon must not tag along into a
    // viewmodel hand or a portrait
    p = assembleRiggedMinifig(config, RIG_HEIGHT, false);
    cache.set(key, p);
    // one appearance at a time is the normal case (the player's own); keep a
    // couple around for the editor's rapid switching, then let go
    if (cache.size > 4) cache.delete(cache.keys().next().value as string);
  }
  return p;
}

function extractArm(joint: THREE.Group | undefined): FpsArm | null {
  if (!joint || !joint.children.length) return null;
  const group = joint.clone(true);
  // the joint group is positioned at its shoulder socket RELATIVE to the
  // torso; standing alone, the shoulder belongs at the origin
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);
  group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return null;
  const centre = box.getCenter(new THREE.Vector3());
  // The arm hangs from the origin down -Y, so the hand is the far end. Take
  // a point just inside the bottom of the bounds rather than the exact
  // extremum, which would sit on the fingertip surface.
  const hand = new THREE.Vector3(centre.x, box.min.y + (box.max.y - box.min.y) * 0.08, centre.z);
  return { group, hand, length: hand.length() };
}

/**
 * This character's arms. Returns null if the donor produced no usable arm
 * meshes, so the caller can keep its procedural fallback rather than
 * rendering an empty hand.
 */
export async function loadFpsArms(config: CharacterConfig): Promise<FpsArms | null> {
  const rig = await rigFor(config);
  const right = extractArm(rig.joints.rightarm);
  const left = extractArm(rig.joints.leftarm);
  if (!right || !left) return null;
  return { right, left };
}

/**
 * This character's head, re-centred on its own bounds so a portrait camera
 * can simply look at the origin. Includes headgear (helm, crown, hood) —
 * those are part of the `head` joint and part of how the character reads.
 */
export async function loadHeadGroup(config: CharacterConfig): Promise<THREE.Group | null> {
  const rig = await rigFor(config);
  const joint = rig.joints.head;
  if (!joint || !joint.children.length) return null;
  const group = joint.clone(true);
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return null;
  const centre = box.getCenter(new THREE.Vector3());
  // re-seat on the origin, and report the size so the caller can frame it
  const holder = new THREE.Group();
  group.position.sub(centre);
  holder.add(group);
  holder.userData.size = box.getSize(new THREE.Vector3());
  return holder;
}
