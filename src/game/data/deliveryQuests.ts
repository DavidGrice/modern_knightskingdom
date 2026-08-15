// Wave 13 · Delivery quests — the "haul goods by cart between instances" line.
//
// `carts.ts` turned out to be siege equipment (a battering ram and a
// blade-cart, both `category: 'defense'`), not a haulage mechanism — reusing
// it for a supply run would misuse a combat prop as a delivery vehicle, so
// this does NOT touch it. There is also no engine concept of an entity that
// survives a `travelTo()` scene-swap (confirmed: `travelTo` only moves the
// player and mutates `destination`/`visitedWorlds` — nothing else). What DOES
// already cross a scene-swap is the player's own inventory (`gameStore`'s
// `inventory` is one flat, global field, never reset or partitioned per
// world) — so "haul goods by cart between instances" is built the honest way
// that fact actually supports: gather the goods, carry them in your own
// pack, physically walk the road (or travel) to the other place, and hand
// them over there. The "cart" is flavor text on top of that, same as every
// other quest's label is flavor on top of a gather/kill/build check.
//
// New `SideQuestDef.kind: 'deliver'` (see npcs.ts's own doc comments on
// `kind`/`deliverTo`) makes this a real, distinct quest type rather than a
// relabeled 'gather': it is accepted from the ORIGIN npc (a homestead
// villager) but can only be turned in at the DESTINATION (`deliverTo`),
// which is a different `WorldDestination` entirely — turning in on the spot
// with the giver, the way every other side quest works, is the one thing a
// delivery quest cannot do by definition.
//
// The second endpoint is Fenwick's settlement at template-08 (The Old
// Ruins) — Wave 4's empire-arc prototype, and per this wave's own research
// the one real away-destination that already has resident villagers and a
// yield loop but wasn't otherwise a delivery target. Gated behind
// `settle_clear` (Fenwick's own founding errand, settlementQuests.ts) so the
// order reads right: clear the ruins out before anyone trusts a cart to
// come through them.
//
// Alric and Beda are the two always-present starter villagers — see
// npcs.ts's own note that their `EXTRA_SIDE_QUESTS` pool (allegianceQuests.ts)
// was, until this same wave's DialoguePanel fix, dead code no one could ever
// actually accept. These live directly in the NpcDef's own `sideQuests`
// instead (spread in from here), matching settlementQuests.ts's own
// precedent for "a new content module merged into a specific NPC" rather
// than the EXTRA_SIDE_QUESTS merge path.
import type { SideQuestDef } from './npcs';

const OLD_RUINS = 'template-08';

export const DELIVERY_QUESTS: Record<string, SideQuestDef[]> = {
  // Alric farms — provisions for Fenwick's new settlers are his to give.
  farmer_alric: [
    {
      id: 'al_haul_grain', kind: 'deliver', target: 'wheat', need: 10, deliverTo: OLD_RUINS,
      label: "Fenwick's settlers need feeding — cart 10 sheaves of wheat out to the Old Ruins",
      xpSkill: 'farming', xp: 55, rewardItems: { gold: 24 },
      requires: ['settle_clear'],
    },
  ],
  // Beda mills — timber for shoring up the ruins is hers.
  miller_beda: [
    {
      id: 'bd_haul_timber', kind: 'deliver', target: 'plank', need: 8, deliverTo: OLD_RUINS,
      label: 'The Old Ruins could use good timber — cart 8 planks out to Fenwick',
      xpSkill: 'building', xp: 50, rewardItems: { gold: 22 },
      requires: ['settle_clear'],
    },
  ],
};
