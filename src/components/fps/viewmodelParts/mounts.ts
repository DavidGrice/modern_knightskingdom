// CLN-28 · the viewmodel's camera-space mount table and arm geometry, moved verbatim out of Viewmodel.tsx.
// First-person camera space only — not the same space as the third-person joint-local offsets in
// character/gear/held.tsx, so the two are deliberately not merged.
import * as THREE from 'three';

/**
 * Where each weapon POINTS once mounted. Every real mold now arrives grip-at-
 * origin with its length along +Y (see lib/weaponParts), so these are
 * statements of intent rather than per-weapon fudge factors:
 *   sword     — blade up and angled forward, carried at the ready
 *   crossbow  — levelled downrange, +Y turned a quarter onto -Z, plus a roll
 *               to square the bow-arms (see MOUNT's own comment)
 *   tool      — haft up and forward, the shared pose for the procedural set
 */
/** how high the hands sit in the frame, and how far out the off hand is.
 *  The weapon hand used to sit at -0.42, low enough that it read as hanging
 *  below the viewport rather than being carried. */
export const HAND_Y = -0.34;

export const OFFHAND_X = 0.36;

/** L73 · how far left the bow hand sits — inboard of the off hand, because a
 *  drawn bow is held toward the centre of the view, not out at the shoulder */
export const BOW_X = 0.2;

export const MOUNT = {
  sword: [-0.45, 0, -0.12] as [number, number, number],
  // Re-measured 2026-07-29: the pitch (x) was already right — levelled and
  // pointed downrange — but with zero roll the crossbow's own bow-arms sat
  // canted a good 25-30° off level rather than square to the view, which is
  // what actually read as "wrong" (the pitch alone looked plausible on
  // paper; only screenshotting it at scale made the roll obvious). +0.5 on
  // z squares the arms up without touching the pitch.
  crossbow: [-Math.PI / 2, 0, 0.5] as [number, number, number],
  // L62 (rest) · couched and levelled toward a target ahead of the horse,
  // rather than the sword's more upright ready stance — measured live the
  // same way as the crossbow's own roll, below. Wave 7: the player's OWN
  // spear borrows this exact pose once mounted (see `spear` below), because
  // couched is couched whether the point is aimed at Richard or at a raider.
  lance: [-Math.PI / 2, 0, 0] as [number, number, number],
  // Wave 7 · the two polearms, on foot. Both are far longer molds than the
  // sword (1.15m and 1.25m against 0.62m — lib/weaponParts), so the sword's
  // near-upright carry would put the head somewhere above the top of the
  // frame with the haft filling half the view. Both are pitched hard forward
  // instead, so what you see is the BUSINESS END leading out ahead of you,
  // which is also where the reach actually is:
  //   halberd — angled up off the shoulder, the way a heavy chopping polearm
  //             is carried between swings
  //   spear   — flatter and closer to level, because a thrust is delivered
  //             straight down the line of sight, not swung down onto it
  halberd: [-1.0, 0.14, -0.1] as [number, number, number],
  spear: [-1.28, 0.06, 0] as [number, number, number],
  //   tool — H34. There is no pickaxe or hammer mold anywhere in the
  //          extraction (the lab's only `pickaxe` is a trait on a defence
  //          tower, not a held part), so pickaxe/hammer/rod stay procedural
  //          (Wave 34: the axe moved off this shared rotation onto its own
  //          real mold, but reuses the exact same pitch below — both
  //          conventions carry the haft along +Y swung forward). What was
  //          wrong was the POSE: their hafts sat nearly upright while the
  //          hand angles in toward the camera, so the head pointed up and
  //          away instead of out in front where a swing starts. Pitched
  //          forward to lie along the forearm.
  tool: [-0.78, 0.12, -0.16] as [number, number, number],
};

/** the viewmodel is much smaller than a 1.75m figure */
export const ARM_SCALE = 0.62;

/** Where the arm should point in CAMERA space, from shoulder to hand: up,
 *  forward and inward, so the shoulder sits off the bottom-outer corner of
 *  the frame and the hand arrives at the tool mount. */
export const ARM_DIR = new THREE.Vector3(-0.39, 0.65, -0.65).normalize();

export const UP = new THREE.Vector3(0, 1, 0);
