'use client';
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

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkCart = cartState;
  (window as unknown as Record<string, unknown>).__kkCartPos = cartLivePos;
}
