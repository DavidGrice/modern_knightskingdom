// Richard's lists at The Tourney Grounds: the tilt barrier, its two pennants, and where his steed is stabled — each
// written as an offset from Richard's own post, in the destination's LOCAL units.
//
// They used to be world metres typed into two components: the barrier's five points in CourtDressing.tsx and the
// steed's home in Wildlife.tsx, both laid out round where Richard stood in the first build. He was moved twice after
// that, each time the destinations were halved in scale (and the ground a player can walk on shrank with them); they
// were not.
// They ended up on a hillside 54 to 74 m from him that no player can reach. And the steed is the only horse stabled
// at the Tourney Grounds, and a player cannot arrive on one of his own (the travel board is not offered from the
// saddle) — so the pass Richard asks for could not be ridden at all (ROADMAP.md, "Bugfix: Richard's lists and his
// steed stood on a hillside no player could reach").
//
// Written from his post (WORLD_ANCHOR.richard, the point his NpcDef stands on) and resolved like every other local
// point, they go where he goes and shrink or grow with the destination, as he and the ground do.
//
// The layout is the old one turned about him. The barrier ran 7.5 m to his west, from 5 to 24 m beyond him, with the
// steed past its far end. The ground a player can walk on now is a small pad round his post, joined on its east side
// to the tilt field below — nothing west or south-west of the pad — so the barrier runs 9 m to his EAST, down the
// slope from beside his post to the edge of the field, and the steed grazes on the field at its foot. East is +x and
// south is +z here, by the HUD's compass. Where exactly was settled by looking (pictures kept with the cleanup
// tools): every piece, and the whole circle the steed grazes in, is on ground the game lets a player stand on. That
// is true of today's bake and today's scale; nothing in the data can check it, because where a bake's walkable
// ground lies is only known once its model has loaded. So tourney.test.ts pins the six points that were looked at:
// move Richard, the scale or an offset and it fails, and what it asks for is another look, not a new number.
import { WORLD_ANCHOR } from './anchors';
import { resolveWorldAnchor } from './worlds';

/** so many local units east (+x) and south (+z) of Richard's post, as a world point */
function fromRichard(east: number, south: number): { x: number; z: number } {
  const post = WORLD_ANCHOR.richard;
  return resolveWorldAnchor({ dest: post.dest, x: post.x + east, z: post.z + south });
}

/** how far east of his post the barrier's line runs: 9 m at today's scale — clear of the Knights' hall beside him,
 *  and three metres inside the field's western edge */
const LINE = 120;

/** The barrier: three rails in a line running south from beside Richard's post, and a pennant beyond each end —
 *  the red one by his post, the blue one down by the field. Drawn by CourtDressing.tsx's TourneyLists, each piece
 *  set on the terrain at its own spot (the line runs down a slope). */
export const TOURNEY_LISTS = {
  rails: [fromRichard(LINE, 120), fromRichard(LINE, 195), fromRichard(LINE, 270)],
  pennants: [
    { ...fromRichard(LINE, 70), color: '#b03a2e' },
    { ...fromRichard(LINE, 320), color: '#2e5fb0' },
  ],
};

/** Where Richard's steed is stabled: on the tilt field, past the barrier's far end. A horse grazes up to 13 m from
 *  its home (Wildlife.tsx), so the home is far enough into the field for that whole circle to be ground a player
 *  can walk on — he has to be able to walk up to the horse to mount it — and far enough from Richard that a
 *  grazing steed never strays into the place where his pass is offered.
 *
 *  One array, made once, so that the useMemo in Wildlife.tsx's Horse, which depends on it, is not re-run on every
 *  render (the horse's record copies the two numbers, and is made only once either way). */
export const TOURNEY_STEED_HOME: [number, number] = (() => {
  const home = fromRichard(300, 370);
  return [home.x, home.z];
})();
