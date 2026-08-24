'use client';
// Requested 2026-08-03: spawns the real, catalog-resolvable content the
// Grok map-classification pass found in each template world (`reports/maps/
// template_0N_layout.json`, distilled at build time into
// `src/game/data/mapPopulation.generated.json` by `scripts/prepare-assets.mjs`
// — see that script's own header comment for the coordinate-transform
// derivation and its caveats). Same mount pattern as `CourtDressing.tsx`
// (a top-level sibling in `GameWorld.tsx`, absolute world coordinates, only
// active while actually visiting the destination) — this is meant to grow
// into that file's data-driven successor, not compete with it.
//
// The coordinate transform is VERIFIED (2026-08-03, see prepare-assets.mjs's
// own comment for the proof) and content now actually spawns (real content
// spawning was blocked earlier the same day on a DIFFERENT question — see
// below — now resolved).
//
// Two kinds of content, resolved differently:
// - `kind: 'set'` (props/scenery — resolves to a real GLB via `resolvedUrl`,
//   built at prepare time by scanning whatever this repo's own extraction
//   already copied into public/assets/, since there's no single "id ->
//   folder" rule to hand-derive) — a plain PropModel instance.
// - `kind: 'actor'` / `'cast'` (minifig characters — these ship as raw
//   OBJ+MTL like every other minifig in this game, not GLB, so they have no
//   `resolvedUrl` at all; that's expected, not a resolution failure) — a
//   RiggedFigure, same component the player/NPCs/villagers all render
//   through, playing a plain idle pose. Colors aren't in the lab data (only
//   the geometry id is), so a fuzzy family match against this game's own
//   hand-tuned NpcDefs (npcs.ts) supplies them — "minifigkingleo01" isn't
//   in npcs.ts, but stripping its trailing digits matches King Leo's own
//   "minifigkingleo00" donor family, and costume/pose variants of the same
//   character don't change its brick colors. Falls back to a plain
//   villager scheme if no family matches at all (villains like Cedric/
//   Weezil/Gilbert have no NpcDef to match against yet).
//
// DISTANT CONTENT IS SPAWNED TOO, DELIBERATELY — this was the real blocker,
// not the transform. A live photo-mode fly-out (2026-08-03) found King
// Leo's own procession-figure marker sitting ~1740 world units from
// template-01's origin — deep in the diorama's distant hillside, far
// outside `dest.radius`, nowhere near `NPC_KING`'s hand-placed spawn-
// adjacent position (game/data/world.ts) despite sharing the exact asset
// id `minifigkingleo00`. That is NOT the same entity as the interactive
// quest NPC — it's the "marching procession" the destination's own blurb
// already describes ("a road still lined with a marching procession"),
// meant to be seen as backdrop even though it's unreachable on foot. So:
// spawn everything the lab classified, regardless of distance from origin,
// but never let it stand in for or auto-correct an existing hand-placed
// NpcDef. (No destination in the current data actually collides the two —
// checked directly — so no proximity-dedup guard was added; if a future
// map's data does collide, add one then rather than guess at the shape now.)
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { SCOPED_DESTINATIONS, WORLD_DESTINATION_BY_ID, type WorldDestination } from '@/game/data/worlds';
import { getBakeOffset, sampleTemplateGroundY, TEMPLATE_WORLD_SCALE } from './TemplateWorld';
import PropModel from './PropModel';
import RiggedFigure, { useIdleFidget } from '../character/RiggedFigure';
import type { CharacterConfig } from '@/game/types';
import mapPopulation from '@/game/data/mapPopulation.generated.json';

const DEBUG_MARKERS = false;

interface PopulationRow {
  groupId: string;
  kind: string;
  assetRef: string;
  resolvedUrl: string | null;
  position: number[];
  rotationY: number;
}

/** rides the bake's own recentring offset every frame (the offset is only
 *  final once the GLB has actually loaded — see TemplateWorld.tsx's
 *  getBakeOffset doc comment) rather than trusting a one-shot read. */
function Marker({ localX, localY, localZ, label }: { localX: number; localY: number; localZ: number; label: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const off = getBakeOffset();
    ref.current?.position.set(localX + off.x, localY + off.y + 0.6, localZ + off.z);
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshBasicMaterial color="#ff2244" toneMapped={false} />
      </mesh>
      <mesh position-y={0.7}>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshBasicMaterial color="#ffdd33" toneMapped={false} />
      </mesh>
      {/* label carried in userData for the console-driven verification
          pass rather than a DOM overlay — this is a throwaway debug view */}
      <primitive object={new THREE.Object3D()} userData={{ label }} />
    </group>
  );
}

/** brick colors for named-character donor families (npcs.ts) — costume/pose
 *  variants of the same character (00 vs 01 vs 02) share the same colors,
 *  so matching on the id with its trailing digits stripped is safe. Not
 *  imported from npcs.ts directly: those NpcDefs carry quest/dialogue
 *  wiring this file has no business depending on for a handful of color
 *  ints — hand-copied, matches npcs.ts exactly as of 2026-08-03. */
const FAMILY_COLORS: Record<string, { name: string; armColor: number; handColor: number; legColor: number; hipColor: number }> = {
  minifigkingleo: { name: 'King Leo', armColor: 26, handColor: 18, legColor: 38, hipColor: 38 },
  minifigqueenleonora: { name: 'Queen Leonora', armColor: 24, handColor: 18, legColor: 150, hipColor: 24 },
  minifigrichardstrong: { name: 'Richard', armColor: 34, handColor: 18, legColor: 38, hipColor: 34 },
  minifigjohnmayne: { name: 'John', armColor: 30, handColor: 18, legColor: 38, hipColor: 38 },
  minifigprincessstorm: { name: 'Princess Storm', armColor: 24, handColor: 18, legColor: 150, hipColor: 24 },
  minifiggenericgood: { name: 'Villager', armColor: 22, handColor: 18, legColor: 34, hipColor: 34 },
};
/** plain villager scheme — used whenever an assetRef's family (Cedric,
 *  Weezil, Gilbert, generic "bad" figures, …) has no NpcDef to match
 *  colors against yet; a background figure existing at all reads better
 *  than one silently skipped for lack of a hand-picked palette. */
const DEFAULT_FAMILY = FAMILY_COLORS.minifiggenericgood;

/** Wave 17 #5: the six named court NpcDefs (npcs.ts) each already render as
 *  a real, hand-placed, interactive figure near their destination's landing
 *  point (Npc.tsx) — this data's own `actor`/`cast` rows for the SAME
 *  donor family are a second, decorative, non-interactive copy of the same
 *  identity. Investigated moving the live NpcDef TO this data's position
 *  instead of deleting the copy (matching the plan's original ask more
 *  literally): every matched row for every one of these five characters, on
 *  every template it appears on, resolves (loaded the real .glb bakes and
 *  replicated normalizeTemplateBake's transform to check) to a world
 *  position thousands of units from `dest.origin` — deep in unreachable
 *  background terrain (see this file's own King Leo procession-figure note
 *  above), never a real "gameplay spot." Not usable for any of the six.
 *  So: skip spawning the decorative copy outright rather than relocate the
 *  live NPC to nowhere. `minifiggenericgood` is deliberately excluded — it's
 *  the shared fallback family for anonymous background villagers/Alric/
 *  Beda, not a specific named character, so it stays spawnable. Fenwick has
 *  no equivalent row to filter: `mapPopulation.generated.json` has no
 *  `template-08` key at all. */
const NAMED_COURT_FAMILIES = new Set(
  Object.keys(FAMILY_COLORS).filter((family) => family !== 'minifiggenericgood'),
);

function characterConfigFor(assetRef: string): CharacterConfig {
  const family = assetRef.replace(/\d+$/, '');
  const c = FAMILY_COLORS[family] ?? DEFAULT_FAMILY;
  return {
    name: c.name, headDonor: assetRef, bodyDonor: assetRef,
    armColor: c.armColor, handColor: c.handColor, legColor: c.legColor, hipColor: c.hipColor,
  };
}

/** approximate — no per-asset target height exists yet for this new
 *  content (the lab's own bbox.size is in a scale that doesn't obviously
 *  translate to a sane world height without further calibration; see this
 *  file's own header). Good enough for small/medium set dressing; large
 *  props may read undersized until someone hand-tunes real values the way
 *  CourtDressing.tsx's own props were tuned. */
const DEFAULT_PROP_HEIGHT = 0.8;

/** positions a spawned instance every frame from the bake's live recentring
 *  offset (X/Z) and a live ground raycast (Y) — never a one-shot read, for
 *  the same async-load race Marker above already guards against, and
 *  because it's more robust than trusting this data's own approximate
 *  vertical placement (verified close, not exact, during the transform
 *  fix — see prepare-assets.mjs). */
// origin-offset for an instance rendered inside DestinationScope.tsx's own
// group (already translated by dest.origin) — the default export below
// passes nothing and keeps every non-scoped destination's absolute-position
// behavior byte-for-byte. Used ONLY at the final g.position.set write — the
// sampleTemplateGroundY(wx, wz) argument stays the full absolute value, per
// the Stage 1 plan's §2 (a raycast against mountedRoot is nesting-agnostic
// and needs the real world coordinate regardless of where this group hangs
// in the React tree).
const ZERO_OFFSET = { x: 0, z: 0 };

function Grounded({ x, z, rotationY, originOffset = ZERO_OFFSET, children }: { x: number; z: number; rotationY: number; originOffset?: { x: number; z: number }; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const off = getBakeOffset();
    const wx = x + off.x;
    const wz = z + off.z;
    g.position.set(wx - originOffset.x, sampleTemplateGroundY(wx, wz), wz - originOffset.z);
  });
  return <group ref={group} rotation-y={rotationY}>{children}</group>;
}

/** the decorative-actor rows (Cedric's cameos, Weezil, Gilbert, generic-
 *  good/generic-bad troops) — no NpcDef/Agent exists for any of these (see
 *  NAMED_COURT_FAMILIES's own comment on why the same donor family can't be
 *  relocated to one), so they get RiggedFigure's local, non-Agent idle-clip
 *  cycle (useIdleFidget) instead of a permanent frozen anim_r_restpose. A
 *  separate component, not inlined in PopulationInstance below, so the
 *  timer/hook only runs for actual actor rows — the far more numerous prop
 *  rows never pay for it. */
function DecorativeActor({ config }: { config: CharacterConfig }) {
  const { clip, loop, onClipEnd } = useIdleFidget();
  return <RiggedFigure config={config} height={1.75} clip={clip} loop={loop} onClipEnd={onClipEnd} />;
}

function PopulationInstance({ row, dest, scaleCompensation, originOffset = ZERO_OFFSET }: { row: PopulationRow; dest: WorldDestination; scaleCompensation: number; originOffset?: { x: number; z: number } }) {
  const x = dest.origin.x + row.position[0] * scaleCompensation;
  const z = dest.origin.z + row.position[2] * scaleCompensation;
  const isActor = row.kind === 'actor' || row.kind === 'cast';
  if (isActor) {
    // Wave 17 #5: don't render a decorative duplicate of a named court NPC
    // that already has a real, interactive figure elsewhere — see
    // NAMED_COURT_FAMILIES's own comment for why this is a skip, not a
    // reposition.
    const family = row.assetRef.replace(/\d+$/, '');
    if (NAMED_COURT_FAMILIES.has(family)) return null;
    return (
      <Grounded x={x} z={z} rotationY={row.rotationY} originOffset={originOffset}>
        <DecorativeActor config={characterConfigFor(row.assetRef)} />
      </Grounded>
    );
  }
  if (!row.resolvedUrl) return null; // logged at build time (prepare-assets.mjs) — not silently dropped
  return (
    <Grounded x={x} z={z} rotationY={row.rotationY} originOffset={originOffset}>
      <PropModel url={row.resolvedUrl} height={DEFAULT_PROP_HEIGHT} />
    </Grounded>
  );
}

export default function TemplatePopulation() {
  const destination = useGameStore((s) => s.destination);
  const dest = destination ? WORLD_DESTINATION_BY_ID[destination] : null;
  if (!dest || !destination) return null;
  // Stage 1 (2026-08-20): a SCOPED_DESTINATIONS member's population now
  // renders through DestinationPopulation below instead, mounted inside
  // DestinationScope.tsx's own origin-offset group — this component never
  // mixes destinations in one render pass, so a single early return is the
  // whole carve-out. Every other destination (including "no destination" =
  // home, where dest is already null above) is completely unaffected.
  if (SCOPED_DESTINATIONS.has(destination)) return null;
  const rows = (mapPopulation as Record<string, PopulationRow[]>)[destination];
  if (!rows) return null;

  if (DEBUG_MARKERS) {
    return (
      <>
        {rows.map((r) => (
          <Marker
            key={r.groupId}
            localX={dest.origin.x + r.position[0]}
            localY={r.position[1]}
            localZ={dest.origin.z + r.position[2]}
            label={`${r.groupId} (${r.assetRef})`}
          />
        ))}
      </>
    );
  }

  // the stored position assumes TEMPLATE_WORLD_SCALE (prepare-assets.mjs
  // hardcodes it — that script has no access to worlds.ts's per-destination
  // `worldScale` override); a destination rendered bigger/smaller than that
  // base needs its stored X/Z scaled by the same ratio the bake itself was,
  // or content lands as if the bake were still base-sized. Y doesn't need
  // this: Grounded above gets it from a live raycast against whatever the
  // bake actually rendered at, not from stored data.
  const scaleCompensation = (dest.worldScale ?? TEMPLATE_WORLD_SCALE) / TEMPLATE_WORLD_SCALE;

  return (
    <>
      {rows.map((r) => (
        <PopulationInstance key={r.groupId} row={r} dest={dest} scaleCompensation={scaleCompensation} />
      ))}
    </>
  );
}

/** Stage 1 (scene-isolation rearchitecture, 2026-08-20) · identical body to
 *  the default export above minus the dest/destination derivation (takes
 *  `dest` as a prop instead, since DestinationScope.tsx already resolved
 *  it), passing `originOffset={dest.origin}` down to PopulationInstance so
 *  the same absolute stored positions land in the right local spot inside
 *  DestinationScope's own origin-offset group. DEBUG_MARKERS' raw-marker
 *  path is deliberately not reproduced here — it's a throwaway debug view of
 *  the default export, not part of the real render this component owns. */
export function DestinationPopulation({ dest }: { dest: WorldDestination }) {
  const rows = (mapPopulation as Record<string, PopulationRow[]>)[dest.id];
  if (!rows) return null;
  const scaleCompensation = (dest.worldScale ?? TEMPLATE_WORLD_SCALE) / TEMPLATE_WORLD_SCALE;
  return (
    <>
      {rows.map((r) => (
        <PopulationInstance key={r.groupId} row={r} dest={dest} scaleCompensation={scaleCompensation} originOffset={dest.origin} />
      ))}
    </>
  );
}

if (typeof window !== 'undefined') {
  // debug/verification access only — see this file's own DEBUG_MARKERS note
  (window as unknown as Record<string, unknown>).__kkpop = mapPopulation;
}
