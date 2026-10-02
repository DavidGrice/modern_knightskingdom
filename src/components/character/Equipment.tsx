'use client';
// Visible equipment for minifigs: the original extracted sword and an arm
// shield, attached to rig joints (positions are joint-local; the joint origin
// is the shoulder socket, so the hand sits along the arm's hang direction).
//
// HANDEDNESS IS VERIFIED, NOT ASSUMED (2026-07-25): the callers all portal
// weapons onto `rig.joints.rightarm` and shields onto `leftarm`. Checked
// against the rig lab's own `traits.minifig.swordHand` / `shieldHand` across
// all 15 donors that record it — every one is `swordHand: hand_R`,
// `shieldHand: hand_L`, `laterality: character_local`. There is no variation
// to drive, so routing this through `labHands()` (data/labCapabilities.ts,
// which exists and is typed if a future donor ever differs) would add a data
// dependency and change nothing. Left hardcoded deliberately.
//
// CLN-28 · the components now live in ./gear/{held,armor,carried}.tsx; this file re-exports them so every
// `from '../character/Equipment'` import is unchanged. (The folder is `gear/`, not `equipment/`: on a
// case-insensitive filesystem `./equipment` would resolve to this file, on Linux to the folder.)
export { HeldSword, HeldHalberd, HeldSpear, HeldCrossbow, SpellHandGlow, ArmShield } from './gear/held';
export { HeldHelmet, Chestplate } from './gear/armor';
export { WornCarrier, ResourceProp } from './gear/carried';
