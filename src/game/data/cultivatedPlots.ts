// Empire arc, Wave 5 · Cultivated plots.
//
// A resource ground (grounds.ts) is country you BUY: the deed ladder decides
// what you may work, and the land was always going to be there. A cultivated
// plot is the other half of that — ground you break yourself, plant nearly
// bare, and thicken by carrying water to it. Same rectangle, same scatter,
// same nodes; the only thing that changes is what earns it.
//
// Hand-authored on purpose. There is no world editor yet, and these two
// positions were picked and checked the same way every GROUNDS entry was —
// against the homestead's widest bought extent, the other sections, the road,
// the pond, the brook and the starter village (see each entry's own comment,
// and the dev assertion at the foot of this file).
import type { CultivatedPlot } from '../types';
import { GROUNDS, clearsHomestead, sectionsOverlap } from './grounds';

export interface CultivatedPlotDef extends CultivatedPlot {
  /** shown on the plot's own stake (Grounds.tsx) and in its interact prompt */
  name: string;
  /** what the stake says before anyone has broken the ground */
  plantHint: string;
}

/** how many waterings a plot takes to come in full */
export const MAX_PLOT_STAGE = 4;

// `stage`/`plantedAt`/`lastWateredAt` below are placeholders: a definition is
// not a planted plot. cultivatePlot() copies the definition into
// `st.cultivatedPlots` with the real values, and only that record is saved.
export const CULTIVATED_PLOTS: CultivatedPlotDef[] = [
  {
    // South-east of the holding, in the open grass south of the Home Grove
    // (its fence ends at z 72; this box starts at 81, nine metres clear).
    // Clear of the fully-bought homestead on both axes (its west edge sits
    // exactly on the 40m clearance line, its north edge 41m past it), 41m from
    // the pond's centre — comfortably outside the scatter's own shore ring
    // (POND.radius + 20), the gate that silently zeroed Old Quarry's seeding
    // twice — 35m off the brook's line and 23m clear of the Keep's interior
    // footprint at (85, 85).
    // `count` is 6, not more: herb patches hold each other 7m apart (see
    // scatterNodesInRect's `sep`), so a box this size physically cannot fit a
    // richer patch — asking for 8 here just made the retry budget run out and
    // the plot silently top out at three, the same failure class again. 6 is
    // what it actually fills to, verified by replaying the real scatter.
    id: 'physic_garden', name: 'The Physic Garden', kind: 'herb',
    x: 48, z: 90, halfX: 8, halfZ: 9, count: 6,
    plantHint: 'Break the ground and set herb cuttings',
    stage: 0, plantedAt: 0, lastWateredAt: null,
  },
  {
    // South-west, in the wedge between the road's northward branch (the
    // carriageway runs up x -12.8; this box stops at x -22, and Grounds.tsx's
    // own road assertion — halfX + ROAD_TILE/2 — clears it with 2.8m to
    // spare) and Northwood Stand (dx 40 vs a halfX sum of 26). Clears the
    // starter village by 7.5m at its nearest corner and the fully-bought
    // homestead on Z. Deliberately the plot you pass on the way in and out.
    id: 'orchard', name: 'The Orchard Rows', kind: 'tree',
    x: -30, z: 62, halfX: 8, halfZ: 6, count: 9,
    plantHint: 'Break the ground and set saplings',
    stage: 0, plantedAt: 0, lastWateredAt: null,
  },
];

export const PLOT_BY_ID: Record<string, CultivatedPlotDef> = Object.fromEntries(
  CULTIVATED_PLOTS.map((p) => [p.id, p]),
);

/**
 * How many nodes a plot carries at a given stage: sparse when it is first
 * planted, its full `count` once it has been watered through. Deliberately
 * derived from the stage alone rather than accumulated, so the live cluster
 * and the one seedNodes re-derives after a reload can never disagree.
 */
export function plotNodeCount(def: CultivatedPlot, stage: number): number {
  const s = Math.max(0, Math.min(MAX_PLOT_STAGE, stage));
  return Math.max(1, Math.round((def.count * (s + 1)) / (MAX_PLOT_STAGE + 1)));
}

/** the plot's homestead-facing edge — where its stake stands and where the
 *  plant/water interaction sits, same convention as a ground's boundary
 *  stone (Grounds.tsx) */
export function plotStakeAt(def: CultivatedPlot): { x: number; z: number } {
  return { x: def.x, z: def.z + (def.z > 0 ? -def.halfZ : def.halfZ) };
}

// Same discipline grounds.ts applies to itself, extended across both tables:
// a plot inside the fence (or inside a ground) would seed nodes on squares
// the player is meant to build on, and BUILD_REGION grows with the land tiers.
if (process.env.NODE_ENV !== 'production') {
  for (const p of CULTIVATED_PLOTS) {
    if (!clearsHomestead(p)) {
      // eslint-disable-next-line no-console
      console.warn(`[plots] ${p.id} overlaps the fully-bought homestead`);
    }
    for (const g of GROUNDS) {
      if (sectionsOverlap(p, g)) {
        // eslint-disable-next-line no-console
        console.warn(`[plots] ${p.id} overlaps the ground ${g.id}`);
      }
    }
    for (const o of CULTIVATED_PLOTS) {
      if (o.id === p.id) continue;
      if (sectionsOverlap(p, o)) {
        // eslint-disable-next-line no-console
        console.warn(`[plots] ${p.id} overlaps ${o.id}`);
      }
    }
  }
}
