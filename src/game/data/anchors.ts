// CLN-22 · the away-destination points that more than one table stands on.
//
// Every hand-placed fixture at a destination is stored as a destination-LOCAL point and turned into a world point by
// resolveDestPoint (data/worlds.ts). That convention is what ended three rounds of coordinates broken by a change of
// scale. What it could not end is the same local pair being TYPED twice: the King's seat was written out in
// data/world.ts and again in his NpcDef, Cedric's camp in data/world.ts and again as the point a traveller arrives
// at, the Woodsmen's hall in data/guilds.ts and again as that destination's arrival point — and the three residents
// who stand due east of a guild hall each retyped that hall's z. Every pair agreed, and nothing but a "must stay in
// sync" comment made it agree. A point two tables share is written here, once, and each table resolves it for itself
// with `resolveWorldAnchor` (data/worlds.ts).
//
// (Not the AI's anchors. ai/core/AnchorResolution.ts's `resolveAnchor` finds where an agent stands to use a target,
// afresh each time it is asked; a WORLD anchor is a fixed place on a destination's map.)
//
// This file imports nothing, on purpose: data/worlds.ts reads it while it is still building its own tables, so
// anything imported here would be evaluated before the destinations exist.
//
// What does NOT belong here:
//   - a point only one table uses. It stays where it is used, beside the history of how it was placed (the Miners'
//     and Knights' halls, Fenwick, Storm, six of the eight arrival points).
//   - two points that are close but not the same. The Siege Camp's arrival point is local (2663.753, 10942.807) and
//     the Builders' hall is (2663.733, 10942.8): a millimetre and a half apart in the world, typed separately and
//     documented as "within rounding". Making them one point would move one of them, so they stay two.

/** A point at an away destination, in that destination's own local units — see resolveDestPoint (data/worlds.ts). */
export interface WorldAnchor {
  /** the destination's id (data/worlds.ts) */
  dest: string;
  x: number;
  z: number;
}

export const WORLD_ANCHOR = {
  /** Where King Leo holds court on The King's Approach: his NpcDef (data/cast/court.ts) and NPC_KING (data/world.ts),
   *  which the knighting ceremony and the court's dressing stand on. Derived from the pre-halving world position
   *  (1000, 962). */
  king: { dest: 'template-01', x: 0, z: -253.333 },
  /** Cedric's war camp: CEDRIC_CAMP (data/world.ts), and the point a traveller to template-05 arrives at
   *  (TEMPLATE_ARRIVAL_SPAWN, data/worlds.ts). */
  cedricCamp: { dest: 'template-05', x: 3760, z: 5793.333 },
  /** The Woodsmen's Lodge hall (data/guilds.ts), the point a traveller to The Frozen Pass arrives at, and the
   *  east-west line Torvald stands on (data/cast/settlements.ts). */
  woodsmenHall: { dest: 'template-07', x: 3666.667, z: 7053.333 },
  /** The Builders' Guild hall (data/guilds.ts), and the east-west line Garrick stands on. NOT the Siege Camp's
   *  arrival point — see the note on close points above. */
  buildersHall: { dest: 'template-04', x: 2663.733, z: 10942.8 },
  /** The Anglers' Circle hall (data/guilds.ts), and the east-west line Wyeth stands on. */
  anglersHall: { dest: 'template-03', x: -93.333, z: -733.333 },
} as const satisfies Record<string, WorldAnchor>;
