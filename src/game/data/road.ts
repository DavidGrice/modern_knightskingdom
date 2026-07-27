// The road's route, as data.
//
// Kept out of the component so the node seeder and the ground layout can both
// reason about where the road runs without pulling three.js into the store.
import { SIGNPOST } from './world';

/** 256mm at the wall family's unified k=0.05 */
export const ROAD_TILE = 12.8;


/** direction bits, in the order N, E, S, W */
const N = 1, E = 2, So = 4, W = 8;

/**
 * Which ways each piece runs when it is not rotated.
 *
 * The prints were SAMPLED rather than eyeballed — for each texture, what
 * fraction of the middle third of each edge is road-coloured:
 *
 *   spr162 (T)        top YES  bottom YES  left YES  right no
 *   spr163 (corner)   top no   bottom YES  left YES  right no
 *   spr164 (straight) top YES  bottom YES  left no   right no
 *   spr165 (cross)    all four YES
 *
 * Mapping image space to world: the plate's UVs put `u` along +x and `v` along
 * +z, and `PropModel` stands the model up with `rotation.x = π`, which negates
 * z — so image-left is WEST and image-top is NORTH.
 *
 * NOTE, and it needs another look: by that derivation the corner should join
 * SOUTH and WEST, but laid out that way its bends visibly turned the wrong
 * way in play, and SOUTH|EAST is what reads correctly. The T is back to the
 * derived SOUTH|WEST branch after its own report. The two therefore disagree
 * about the same plate family, which means the derivation is missing
 * something — most likely which FACE of the plate we end up looking at once
 * it is flipped, since these are two-sided and only 1.6mm thick. Both values
 * below are set to what LOOKS right, not to what the derivation says.
 */
export const PIECES: { id: string; mask: number }[] = [
  { id: 'l4109612', mask: N | So },        // straight
  { id: 'l4109611', mask: N | W },         // corner
  { id: 'l4109610', mask: N | So | W },    // T-junction
  { id: 'l4109613', mask: N | E | So | W },// crossroad
];

export { N, E, So, W };

/** how much of a plate's width the printed road takes — sampled off spr164,
 *  whose sand runs from 27% to 72% across the tile */
export const ROAD_HALF_WIDTH = ROAD_TILE * 0.45 / 2;

/**
 * Yaw +90° about Y sends a piece's local north to world west (rotate (0,-1)
 * by +90° and you land on (-1,0)), so one quarter turn moves every bit one
 * place BACK around the compass.
 */
export function rotMask(mask: number, quarters: number): number {
  let m = mask;
  for (let i = 0; i < ((quarters % 4) + 4) % 4; i++) {
    m = ((m >> 1) | (m << 3)) & 0b1111;
  }
  return m;
}

/** the cells the road runs through, in tile coordinates */
const CELLS: [number, number][] = (() => {
  const sx = Math.round(SIGNPOST.x / ROAD_TILE);
  const sz = Math.round(SIGNPOST.z / ROAD_TILE);
  return [
    // the run out of the homestead, north past the signpost
    [0, sz - 1],
    [0, sz],
    // west along the signpost's own row, to the edge of the map
    [sx, sz],
    [sx - 1, sz],
    [sx - 2, sz],
    // and a branch running north from the junction, so the T and the corner
    // both appear where the set intends them to
    [sx, sz + 1],
    [sx, sz + 2],
  ];
})();

/** de-duplicated, and filled in so a jump of more than one cell still joins up */
export function routeCells(): [number, number][] {
  const out: [number, number][] = [];
  const seen = new Set<string>();
  const push = (x: number, z: number) => {
    const k = `${x},${z}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push([x, z]);
  };
  for (let i = 0; i < CELLS.length; i++) {
    const [x, z] = CELLS[i];
    const prev = out.length ? out[out.length - 1] : null;
    if (prev && (prev[0] !== x || prev[1] !== z)) {
      // walk in a straight line from the last cell to this one, x first
      let [cx, cz] = prev;
      while (cx !== x) { cx += Math.sign(x - cx); push(cx, cz); }
      while (cz !== z) { cz += Math.sign(z - cz); push(cx, cz); }
    }
    push(x, z);
  }
  return out;
}

/**
 * Where someone coming to the homestead steps onto the map: the far end of
 * the road, the last cell the route reaches. Newcomers walk in from here
 * (see villagerMobs.arriveByRoad) rather than appearing on the doorstep.
 */
export function roadEntry(): { x: number; z: number } {
  const cells = routeCells();
  const [cx, cz] = cells[cells.length - 1] ?? [0, 0];
  return { x: cx * ROAD_TILE, z: cz * ROAD_TILE };
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkroadEntry = roadEntry;
}
