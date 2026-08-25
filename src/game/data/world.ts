// Static world layout constants (meters).
// 2026-08-25: imports resolveDestPoint/WORLD_DESTINATION_BY_ID (worlds.ts)
// for the durable away-destination coordinates below (NPC_KING, CEDRIC_CAMP,
// BATTLE_DOME) — see worlds.ts's own 2026-08-25 comment for what that buys.
// This is a NEW edge (world.ts never imported worlds.ts before); it works
// only because buildables.ts stopped importing FROM world.ts the same day
// (see the dev-only BUILD_REGION guard below, moved here from buildables.ts
// for exactly this reason) — otherwise this line would complete the cycle
// worlds.ts -> dungeon.ts -> buildables.ts -> world.ts -> worlds.ts and crash
// on a TDZ access to WORLD_DESTINATION_BY_ID.
import { resolveDestPoint, WORLD_DESTINATION_BY_ID } from './worlds';
import { BUILD_REGION } from './buildables';

export const WORLD_HALF = 200;          // world spans ±200 on x/z
export const SPAWN: [number, number, number] = [0, 0, 26];
export const EYE_HEIGHT = 1.6;

export const POND = { x: 52, z: 42, radius: 8 };
// A short wooden dock from the old shore-side fishing sign running along
// the pond's edge, so fishing means standing at the water's edge looking
// out over it rather than interacting with a signpost on dry land (see
// ResourceNodes.tsx's FishingSpot and PlayerController's pond-collision
// corridor exception). Both ends sit at the same ~8.5m radius from POND's
// center (right at the bank) — a straight radial dock plunged toward the
// pond's middle instead (old endpoint sat at radius ~4, well inside the
// water), which is exactly the "goes into the pond" bug reported in
// Phase 18; this one runs tangentially alongside the shore instead.
export const FISHING_DOCK = {
  startX: 45.5, startZ: 36.5, // shore end (the old sign spot)
  // Requested 2026-07-30: shortened from the original (49.33, 33.91) — still
  // re-projected onto the same ~8.5m shore radius (not just interpolated
  // straight-line, which would have drifted a hair toward the water) so the
  // "goes into the pond" bug two comments up can't come back.
  endX: 47.44, endZ: 34.81,   // far end, along the bank, not toward the center
  yaw: 2.2874,                // recomputed to match the shortened endpoint's own direction
  halfWidth: 0.6,
};
// The brook, from the pond's northeast edge out to the spring mound. Was two
// local consts inside Terrain.tsx's Stream() until Wave 5 needed the same line
// outside a 'use client' component — filling a pail is an interaction, and
// PlayerController has to know where the water actually runs. Terrain.tsx
// draws from these exact values, so the strip and the interact can't drift.
export const BROOK = {
  startX: POND.x + 6.5, startZ: POND.z + 3, // pond-edge end
  endX: 140, endZ: 68,                      // spring end
};

// Phase 20: the King holds court at his own castle (template-01, The King's
// Approach) — must match his NpcDef in data/npcs.ts; the knighting ceremony
// teleports the player before him here.
// 2026-08-25: converted to the same durable local point as King Leo's own
// NpcDef (npcs.ts, local (0, -253.333)) via resolveDestPoint — sharing the
// exact call means these two can never drift apart again, which a second
// hand-typed literal here always risked (this constant was NOT in the
// research spike's own migration table, but it's the identical class of
// bug — a hand-typed world x/z, only correct at one scale — found by
// checking this file directly while implementing that table).
export const NPC_KING = { ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-01'], 0, -253.333), yaw: Math.PI };

export const INTERACT_RANGE = 3.4;
export const STATION_RANGE = 4.5;
// Wave 17 #2 · fishing needs a tighter bubble than the general INTERACT_RANGE.
// The pond's south shore sits only ~2m past the east road's rendered tile
// footprint (Road.tsx's 12.8m baseplate squares, not the narrower logical
// ROAD_HALF_WIDTH corridor), and the one fishspot node is only 2.81m from
// that tile's own edge — under the full 3.4m range, so "Cast your line" was
// winning while standing on the road. 1.5m keeps both the dock's fixed point
// and the shoreline ring check (below) short of that gap on both sides while
// still reaching the real bank right next to the dock.
export const FISH_CAST_RANGE = 1.5;

// The Grand Keep's great hall: a fixed, always-present interior fixture
// tucked in an empty corner of the map (outside the tree ring, mining field,
// pond and homestead). Entering/exiting is a teleport (see gameStore
// enterKeep/exitKeep), not a walk-through door, so the room stays fully
// sealed and can't be stumbled into from outside.
export const KEEP_INTERIOR = { x: 85, z: 85, halfX: 6, halfZ: 5 };
export const KEEP_ENTER_SPAWN = {
  x: KEEP_INTERIOR.x, z: KEEP_INTERIOR.z - (KEEP_INTERIOR.halfZ - 2), yaw: Math.PI,
};
export const KEEP_CHEST_POS = { x: KEEP_INTERIOR.x + 3.3, z: KEEP_INTERIOR.z + 2.6 };
// beside the throne (see KeepInteriorRoom.tsx's Throne(), at local (0, halfZ-1.2))
export const KEEP_THRONE_POS = { x: KEEP_INTERIOR.x + 1.6, z: KEEP_INTERIOR.z + (KEEP_INTERIOR.halfZ - 1.2) };
export const KEEP_ENTER_RANGE = 6; // the keep footprint is large; allow reaching it from its base
// where the court NPCs (Phase 15's day/night schedule) gather at night —
// clear of the exterior entrance (KEEP_ENTER_SPAWN) so they don't block it
export const NIGHT_GATHER_SPOT = { x: KEEP_INTERIOR.x, z: KEEP_INTERIOR.z - 14 };

// A travel signpost near spawn opens the map of the nine original template
// worlds (see game/data/worlds.ts) as visitable destinations.
// Deliberately OUTSIDE the homestead build region (BUILD_REGION spans
// x/z ±30 — see data/buildables.ts): it used to stand at (-14, 18), inside
// the grid, occupying a build square the player could never clear. Kept a
// short walk from SPAWN (0, 26) so it is still the first thing you meet.
// FIXED_WORLD_PROPS below asserts this stays true.
export const SIGNPOST = { x: -16, z: 36 };

// O3 · Alric and Beda's home corner (their StarterVillage.tsx hut props, and
// their own standing spot from data/npcs.ts) is neither in BUILD_REGION nor
// in any GROUNDS section, so neither of seedNodes' two scatter passes ever
// knew it existed. The general scatter can land anywhere outside the build
// grid, and the road's own verge-tree pass places trunks in a band 4.4-6.0m
// off the carriageway with no idea what already stands there — the western
// leg of the road happens to run right past this corner (SIGNPOST is at
// (-16, 36), and the road's westward cells put a verge band within a couple
// of metres of Beda's hut). A tree landing on a hut is what a coding agent
// would call a footprint-collision test that was simply never asked for.
// Kept as plain data (not read from StarterVillage.tsx, a 'use client'
// component) for the same reason road.ts keeps its own route data out of the
// road renderer: the store's seedNodes must not pull React/three.js in.
export const STARTER_VILLAGE_CLEAR: { x: number; z: number; r: number }[] = [
  { x: -41.5, z: 36.5, r: 4.5 }, // Alric's hut (mc001.glb)
  { x: -40, z: 38, r: 3 },       // Alric himself (data/npcs.ts)
  { x: -34, z: 44, r: 4.5 },     // Beda's hut (mc001.glb)
  { x: -35, z: 42, r: 3 },       // Beda herself (data/npcs.ts)
];

// Cedric the Bull's camp (Phase 20: relocated to The Rival Castle,
// template-05 — the rebellion's seat, pitched on the terrain-probed flat
// ground at the foot of his castle). See CedricCamp.tsx; still the game's
// capstone boss encounter, now reached by actually traveling there.
// 2026-08-21: repositioned from (2185, 945) after DEST_WORLD_SCALE's
// research-spike halving (worlds.ts) left the old spot 329 units outside the
// real walkable rect union (templateWalkableFootprint.ts) — already 603
// units outside pre-halving, a pre-existing bug this pass also fixes. The
// nearest-point-in-union nudge lands in a real but generic corner of the
// bake's walkable area; hand-picked this spot instead via a live
// walk-around (same approach worlds.ts's own template-03 river-landing
// spawn used) — open grass with the diorama's own hills on the skyline,
// confirmed clean from multiple facings, real ground height.
// 2026-08-25: converted to a durable LOCAL point via resolveDestPoint (see
// worlds.ts's 2026-08-25 comment) — local (3760, 5793.333), derived from
// the 2026-08-21 world position above run backward through the same
// invariant TEMPLATE_ARRIVAL_SPAWN's template-05 entry uses (it's the same
// point).
export const CEDRIC_CAMP = resolveDestPoint(WORLD_DESTINATION_BY_ID['template-05'], 3760, 5793.333);
export const CEDRIC_WORLD = 'template-05';
export const CEDRIC_REVEAL_QUEST = 'knights_arms';
export const CEDRIC_INTERACT_RANGE = 5;

// Princess Storm's Battle Dome (Phase 20: relocated to The Sister Keep,
// template-06, on its terrain-probed flat ground), grounded in Queen
// Leonora's own line about her daughter's swordsmanship (see game/data/
// npcs.ts's 'storm' NpcDef).
// 2026-08-25: x/z converted to a durable LOCAL point via resolveDestPoint
// (local (0, -300), derived from the pre-halving (2500, 955) via this same
// file's own invariant — see worlds.ts's 2026-08-25 comment). `radius`
// stays a plain constant, NOT a resolved local value: it's the fixed
// world-unit size of a hand-authored flat arena disc (BattleDome.tsx),
// unrelated to the diorama bake's own scale, so it doesn't shrink alongside
// DEST_WORLD_SCALE the way a bake-relative position does.
export const BATTLE_DOME = { ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-06'], 0, -300), radius: 9 };
export const STORM_WORLD = 'template-06';

/** Fixed world props that must never stand inside the buildable region.
 *  Checked once in development — a prop inside the grid silently eats a
 *  build square the player has no way to clear, and the region is due to
 *  grow, so this needs to fail loudly rather than be re-found by eye. */
export const FIXED_WORLD_PROPS: { name: string; x: number; z: number }[] = [
  { name: 'SIGNPOST', x: SIGNPOST.x, z: SIGNPOST.z },
  { name: 'POND', x: POND.x, z: POND.z },
  { name: 'FISHING_DOCK', x: FISHING_DOCK.startX, z: FISHING_DOCK.startZ },
];

// Dev-only guard for the rule above: nothing fixed in the world may stand
// inside the buildable region. The signpost did for a long while, silently
// eating a grid square, and the region is due to grow — so this fails loudly
// at import time in development rather than being re-discovered by eye.
// Relocated here from buildables.ts (2026-08-25): this file now needs
// worlds.ts (for the durable NPC_KING/CEDRIC_CAMP/BATTLE_DOME coordinates
// above), and worlds.ts -> dungeon.ts -> buildables.ts is already a real
// runtime chain — so buildables.ts importing FIXED_WORLD_PROPS FROM here
// would complete a cycle and crash on a TDZ access. Importing BUILD_REGION
// the other way instead (this file from buildables.ts, above) breaks that
// cycle rather than completing it; buildables.ts no longer imports
// anything from world.ts at all.
if (process.env.NODE_ENV !== 'production') {
  const bad = FIXED_WORLD_PROPS.filter(
    (p) => p.x >= BUILD_REGION.minX && p.x <= BUILD_REGION.maxX
      && p.z >= BUILD_REGION.minZ && p.z <= BUILD_REGION.maxZ,
  );
  if (bad.length) {
    console.warn(
      '[buildables] fixed world prop(s) inside BUILD_REGION — they will occupy '
      + 'build squares the player cannot clear: '
      + bad.map((p) => `${p.name} (${p.x}, ${p.z})`).join(', '),
    );
  }
}
