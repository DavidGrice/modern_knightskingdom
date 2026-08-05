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
import CULTIVATED_PLOTS_DATA from './cultivatedPlots.generated.json';

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
//
// Wave 6 · entries edited live at /secret/worldeditor, source in
// cultivatedPlots.generated.json — the siting rationale each entry used to
// carry inline (clearance off the homestead/other sections/road/pond/brook/
// starter village, and the physic_garden `count` bug this comment used to
// describe) is preserved in git history rather than JSON, which has no
// comment syntax; the editor's own live checks are the replacement.
export const CULTIVATED_PLOTS = CULTIVATED_PLOTS_DATA as unknown as CultivatedPlotDef[];

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
