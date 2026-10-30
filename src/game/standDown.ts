// What the player is in the middle of, ended where he stands: the saddle, the crew position of a siege engine, a ram
// he is pushing or a cart he is towing. Each is a mutable leaf module the frame loop drives (riding.ts, crew.ts,
// carts.ts), and each normally ends with the interact key (game/interaction/performAction.ts).
//
// The knighting is the one thing that carries the player to another scene whatever he is doing (gameStore's
// beginCeremony travels him to The King's Approach when a rank is reached). The travel board and "Return Home" are not
// offered to a rider, and a crew, a ram or a cart can be taken up only at home, where neither is offered either.
// Nothing there ended any of it: a rider arrived in the saddle and, getting off, wrote his horse's home into that
// scene's coordinates, so the horse was lost to its own scene; a crew was held at the engine's spot at home — in The
// King's Approach's scene — until he chose "Return Home"; a ram's or a cart's live place followed him there
// (ROADMAP.md, "Bugfix: the knighting carried the player off in the saddle, at an engine, or with a ram or a cart").
// So the ceremony stands him down first, in the scene he is leaving: playerState still holds his place there, since a
// scene's arrival point reaches it only on the next frame.
import { cartState } from './carts';
import { crewState, leaveEngine } from './crew';
import { playerState } from './playerState';
import { dismountHorse, ridingState } from './riding';

/** Stand the player down. The horse is left where he is (its home with it, as at any dismount); the engine is left
 *  crewless; the ram or cart is let go. Returns the ids of the carts let go: their place lives outside the store until
 *  the store's settleCart commits it, which the caller does. */
export function standDown(): string[] {
  if (ridingState.active) dismountHorse(playerState.x, playerState.z, playerState.yaw);
  if (crewState.engineId) leaveEngine();
  const carts = [cartState.pushingId, cartState.hitchedId].filter((id): id is string => !!id);
  cartState.pushingId = null;
  cartState.hitchedId = null;
  return carts;
}
