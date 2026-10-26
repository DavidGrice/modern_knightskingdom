'use client';
// Rigged minifig assembly + animation playback for the original SMO tracks.
//
// The extracted animation JSONs carry 11 named tracks (head, body, hips,
// left/right arm/hand/leg/foot) with per-frame pos (VRT units, 100 = 1 OBJ mm)
// and rot (degrees, [bearing, pitch, roll] applied RY·RX·RZ — FORMAT_SPEC).
// We build a LEGO-faithful reduced rig (head, body, hips, arms, legs — hands
// ride with arms, feet with legs), derive joint pivots from part bounding
// boxes, and drive joints with rotation deltas relative to the rest pose.
//
// CLN-29 · a barrel over lib/rig/: joints.ts (the reduced rig's joints), clips.ts (the clips and the rest pose),
// classify.ts (a figure's meshes sorted into sided parts, and each joint's parts), rehang.ts (an arm re-hung on its
// shoulder), assemble.ts (assembleRiggedMinifig), MinifigAnimator.ts, hitboxes.ts. The emote wheel's list moved to
// game/data/emotes.ts.
export type { RigJoint } from './rig/joints';
export { MinifigAnimator } from './rig/MinifigAnimator';
export { preloadClip } from './rig/clips';
export { assembleRiggedMinifig } from './rig/assemble';
export type { RiggedMinifig } from './rig/assemble';
export { measureHitBoxes } from './rig/hitboxes';
