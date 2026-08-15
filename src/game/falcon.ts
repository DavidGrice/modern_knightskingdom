'use client';
// Wave 13 · the falcon companion.
//
// Before this the sky falcon (Wildlife.tsx's Falcon()) was pure decoration: a
// fixed parametric loop around the world origin, no id, no ground state, no
// way to be reached — confirmed by survey, not assumed. Taming it needed its
// own shape, not a rename of riding.ts's HorseMob: a horse is caught by
// walking up to a STATIONARY ground target and holding E (mountHorse, no
// skill check, always succeeds — the only precedent this project has for
// "claim a creature"), then stabled and assigned out to a defender, a whole
// roster with per-unit state. A falcon does none of that: there is exactly
// one, it never stops flying, and once tamed it is a single always-on
// companion, not a fleet — so `SaveGame.falconTamed` is one boolean
// (game/store/gameStore.ts), not a registry.
//
// What DOES carry over from riding.ts/waterworks.ts is the leaf-module split
// — but only for the one piece of state that actually needs it. The bird's
// live world position is computed fresh every frame inside Wildlife.tsx's
// own useFrame and normally would never leave that component; it has to
// leave it here because PlayerController's interact system needs to know
// where the (still-flying, never landing) bird currently is to offer "call
// it down" at all — a walk-up range check doesn't mean anything for a target
// that never stops moving and isn't reachable at ground level. `falconTamed`
// itself is deliberately NOT mirrored here the way `ridingState.active` is:
// nothing outside this module's one reader (PlayerController, which already
// has the real store state in hand via `st.falconTamed`) needs it on a given
// frame, and a second copy of a single boolean would only be one more place
// for the two to drift out of step.
import type { ResourceNodeState } from './types';

/** The bird's current rendered world position, written every frame by
 *  Wildlife.tsx's Falcon() whether it is still wild or already tamed. Read
 *  by PlayerController to score the "Whistle for the Falcon" interact — see
 *  FALCON_CALL_RANGE below. Never written to before the first frame renders;
 *  the values below are just a plausible starting guess (the wild loop's own
 *  centre) so nothing reads garbage in the one frame before that. */
export const falconPos = { x: 0, y: 24, z: 8 };

/** Horizontal metres the untamed bird has to be within, on its own flight
 *  path, before E offers to call it down. Wider than INTERACT_RANGE (3.4m,
 *  world.ts) on purpose — the bird is airborne and moving on its own
 *  schedule, not a thing you walk up to and stand beside, so the interact
 *  system's ordinary walk-up range would make it call-able for a fraction of
 *  a second per lap. */
export const FALCON_CALL_RANGE = 9;

/** How far a tamed companion's periodic resource ping can reach. Generous —
 *  it is a bird's-eye view, and away from home it is the only source of that
 *  view at all: Minimap.tsx draws resource nodes for the homestead only, not
 *  for any destination (see its own `dest ? … : …` branch). */
export const FALCON_SPOT_RANGE = 50;

/** What the falcon "found" reads as in a notification. Kept here rather than
 *  in Wildlife.tsx because it is a fact about the resource, not about
 *  rendering — the same reason data/villagers.ts and not a component owns
 *  JOB_NODE_KIND's own labels. */
export function falconSpotLabel(n: Pick<ResourceNodeState, 'kind' | 'variant'>): string {
  if (n.kind === 'rock') return n.variant === 'iron' ? 'an iron vein' : 'a boulder worth quarrying';
  if (n.kind === 'tree') return 'a stand of good timber';
  if (n.kind === 'herb') return 'a patch of herbs';
  return 'a good fishing spot';
}
