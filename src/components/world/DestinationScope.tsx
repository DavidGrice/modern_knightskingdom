'use client';
// Stage 1 of the scene-isolation rearchitecture (2026-08-20): a PROOF OF
// CONCEPT, scoped to exactly one destination (SCOPED_DESTINATIONS,
// worlds.ts) — template-01, "The King's Approach". Every other destination
// (templates 02-08/09, dungeon, arena, all 6 challenges, and home/null) is
// completely unaffected: their content keeps rendering through the same
// flat, absolute-coordinate top-level components (Buildings, Npc,
// TemplatePopulation, CourtDressing) this file's own Destination* siblings
// were carved out of.
//
// Mounted as a sibling of <TemplateWorld /> in GameWorld.tsx, NOT nested
// inside TemplateWorld.tsx's own JSX — TemplateWorld.tsx already owns the
// exact origin-offset <group> this file wants, but Npc.tsx already imports
// destinationGroundY FROM TemplateWorld.tsx; nesting a court-NPC-rendering
// piece back inside TemplateWorld.tsx would create a circular import
// (TemplateWorld -> Npc -> TemplateWorld). Two sibling groups at an
// identical transform are functionally indistinguishable from one shared
// group — Three.js doesn't care which parent a child hangs off, only its
// resulting world matrix — so this keeps every import edge one-directional
// (GameWorld -> DestinationScope -> {Buildings, Npc, TemplatePopulation,
// CourtDressing, worlds.ts}), with TemplateWorld.tsx completely unmodified.
//
// Every child here receives ABSOLUTE stored coordinates (npcs.ts, worlds.ts
// POIs, mapPopulation.generated.json all stay unmigrated) and subtracts
// `dest.origin` only at the final Object3D position write — see each
// Destination* component's own doc comment for the specifics. Anything that
// goes through a live raycast against the mounted bake (sampleTemplateGroundY
// / destinationGroundY) or Three's matrixWorld stays fully absolute with no
// change at all, since those are already nesting-agnostic.
import { useGameStore } from '@/game/store/gameStore';
import { SCOPED_DESTINATIONS, WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { DestinationBuildings } from './Buildings';
import { DestinationCourtNpcs } from './Npc';
import { DestinationPopulation } from './TemplatePopulation';
import { DestinationCourtDressing } from './CourtDressing';

export default function DestinationScope() {
  const destination = useGameStore((s) => s.destination);
  if (!destination || !SCOPED_DESTINATIONS.has(destination)) return null;
  const dest = WORLD_DESTINATION_BY_ID[destination];
  if (!dest) return null;
  return (
    // `key={destination}` is a no-op today (only one value ever satisfies the
    // guard above in Stage 1) but is kept deliberately — it starts mattering
    // the moment Stage 2 lets direct destination->destination travel
    // (already supported by travelTo, which only no-ops on re-clicking the
    // SAME id) flip between two scoped destinations without an intervening
    // null, where a hard remount (not a soft prop update) is what's wanted.
    <group key={destination} position={[dest.origin.x, 0, dest.origin.z]}>
      <DestinationBuildings dest={dest} />
      <DestinationCourtNpcs dest={dest} />
      <DestinationPopulation dest={dest} />
      <DestinationCourtDressing dest={dest} />
    </group>
  );
}
