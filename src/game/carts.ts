'use client';

import { exposeDebug } from '@/lib/debugHooks';

// Shared cart state: a pushable battering ram (the "warcart" buildable) and
// a hitchable haulage cart (the "bladecart" buildable). A standalone leaf
// module (no store import) so both gameStore.ts and siege.ts can depend on
// it without a circular import.
//
// Live position while a cart is being pushed/hitched, keyed by building id
// — like siege.ts's quintainSpins, tracked outside the store while active
// so dragging one around doesn't spam zustand every frame; only committed
// back to the placed building's stored x/z once let go (gameStore's
// settleCart, invoked from PlayerController's push_cart/hitch_cart handling).
export const cartState = {
  pushingId: null as string | null,
  hitchedId: null as string | null,
};
export const cartLivePos: Record<string, { x: number; z: number }> = {};

/** CLN-04 · session start (newGame / new-game-plus / loadFromSave). A ram being
 *  pushed or a cart being hitched is session-tactical player state that is
 *  never saved: PlayerController re-reads `cartState` every frame and glues
 *  `cartLivePos[id]` to the player, so leaving it set kept the player holding
 *  the old session's cart after Save & Return + Continue (a ghost "Let go of the
 *  Ram" prompt, the cart drawn at the spawn point while its stored building sat
 *  elsewhere, and a later let-go committing that spawn position into the save).
 *  Both are exported objects other modules hold references to, so this clears
 *  them IN PLACE and never reassigns. */
export function resetCarts(): void {
  cartState.pushingId = null;
  cartState.hitchedId = null;
  for (const id of Object.keys(cartLivePos)) delete cartLivePos[id];
}

exposeDebug('__kkCart', cartState);
exposeDebug('__kkCartPos', cartLivePos);
