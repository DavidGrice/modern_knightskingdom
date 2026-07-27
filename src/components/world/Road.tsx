'use client';
// L71 · The road, laid from the game's own road plates.
//
// K59 threw these four pieces away on the strength of a green-percentage
// sample and replaced them with an invented ribbon. That sample was counting
// the GRASS SURROUND of each tile. They are road prints on a green baseplate,
// which is exactly what a LEGO road tile is, and the grok manifest names them
// as one family: four 256x256x1.6mm plates, 12.8m square at the family's
// k=0.05, differing only in what is printed on them.
//
//   l4109610 / spr162 — T-junction   (through road plus one branch)
//   l4109611 / spr163 — corner       (a quarter turn)
//   l4109612 / spr164 — straight     (a through road)
//   l4109613 / spr165 — crossroad    (all four ways)
//
// So the road is a TILE LAYOUT, not a mesh: name the cells the road runs
// through, and each cell works out which of the four pieces it is and which
// way it faces from the neighbours it has. Which is how the set works.
import { useMemo } from 'react';
import { PIECES, ROAD_TILE, rotMask, routeCells, N, E, So, W } from '@/game/data/road';
import PropModel from './PropModel';

const S = '/assets/props/scenery';

export default function Road() {
  const tiles = useMemo(() => {
    const cells = routeCells();
    const has = new Set(cells.map(([x, z]) => `${x},${z}`));
    return cells.map(([x, z]) => {
      // which ways does the road leave this cell?
      let want = 0;
      if (has.has(`${x},${z - 1}`)) want |= N;
      if (has.has(`${x + 1},${z}`)) want |= E;
      if (has.has(`${x},${z + 1}`)) want |= So;
      if (has.has(`${x - 1},${z}`)) want |= W;
      // a dead end still needs a road through it, or the tile reads as grass
      if (want === N || want === So) want = N | So;
      if (want === E || want === W) want = E | W;

      for (const piece of PIECES) {
        for (let q = 0; q < 4; q++) {
          if (rotMask(piece.mask, q) === want) {
            return { key: `${x},${z}`, url: `${S}/${piece.id}.glb`, x: x * ROAD_TILE, z: z * ROAD_TILE, yaw: (q * Math.PI) / 2 };
          }
        }
      }
      // nothing matches (an isolated cell): lay a straight rather than a hole
      return { key: `${x},${z}`, url: `${S}/${PIECES[0].id}.glb`, x: x * ROAD_TILE, z: z * ROAD_TILE, yaw: 0 };
    });
  }, []);

  return (
    <group>
      {tiles.map((t) => (
        // the plates are 1.6mm thick — rendered at a hair above the ground so
        // they never z-fight with the terrain they lie on
        <PropModel key={t.key} url={t.url} height={0.08} position={[t.x, 0.02, t.z]} yaw={t.yaw} />
      ))}
    </group>
  );
}
