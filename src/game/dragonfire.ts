// What a dragon's breath does to the homestead: which building it sets
// alight, what goes on burning, where the fire leaps. It lived inside the
// siege's frame loop (components/world/DragonSiegeController.tsx) and moved
// here so that it can be driven, and tested, without a renderer.
//
// Wave 57 (F5): a bounded chain reaction, folded into the same breath tick
// rather than a new timer. Numbers chosen so a dense base visibly catches
// without a siege routinely razing the whole thing: ~9-11 ticks per 55s siege
// * 0.18 spread chance per burning building ~= 1-2 expected extra ignitions in
// a base with real neighbors, hard-capped at 3 simultaneous fires total.
// SPREAD_RADIUS=8m (center-to-center) catches a piece placed right next to
// another (typical footprints run 2-8m; walls in a run touch at ~0m gap)
// without reaching across a spread-out base — an isolated flammable building
// with nothing flammable within 8m never spreads at all, which is the intended
// "build densely at your own risk" read, not "never build wood."
import { useGameStore } from './store/gameStore';
import { BUILDABLE_BY_ID } from './data/buildables';
import { isBuilt } from './types';
import type { DragonSiegeConfig } from './dragonSiegeConfig';
import { audio } from '@/lib/audio';
import { pick } from '@/lib/rng';

/** how many buildings can be alight at once — the siege keeps one light and
 *  one fireball for each */
export const MAX_BURNING = 3;
const SPREAD_RADIUS = 8;
const SPREAD_CHANCE = 0.18;
/** how long a blaze flares after each breath on it, in seconds */
export const FLARE_SECONDS = 1.4;

export interface Blaze {
  id: string;
  x: number;
  z: number;
  /** seconds of flare left; the siege counts it down every frame */
  fireT: number;
}

/** one siege's fire */
export interface Dragonfire {
  /** the buildings alight, at most MAX_BURNING, in the order they caught */
  burning: Blaze[];
  /** "stone holds" has been said; it is said once a siege */
  stoneNoted: boolean;
}

export function newDragonfire(): Dragonfire {
  return { burning: [], stoneNoted: false };
}

/** wood burns, stone holds — judged by what the piece is mostly built from */
export function flammable(type: string): boolean {
  const def = BUILDABLE_BY_ID[type];
  if (!def) return false;
  const wood = (def.cost.wood ?? 0) + (def.cost.plank ?? 0);
  return wood > (def.cost.stone ?? 0);
}

/** One breath, in three steps. First, whatever was alight but is no longer
 *  standing is dropped from the set. Then, if nothing is alight (the siege's
 *  first breath, or the last blaze has died out), the breath sets one fresh
 *  random building alight — and that is all it does; the building stays in
 *  the set, flaring, even if this very breath has ruined it. Otherwise every
 *  building alight takes another hit and is dropped at once if it falls
 *  (`leaveRuin` below means a ruin is the only outcome a dragon ever causes),
 *  and each survivor rolls a chance to leap to a fresh flammable neighbor,
 *  capped at MAX_BURNING alight. */
export function breathe(fire: Dragonfire, dragon: Pick<DragonSiegeConfig, 'breathDamage' | 'lines'>): void {
  const st = useGameStore.getState();
  // What has fallen since the last breath is no longer alight — above all the
  // building that breath set alight and ruined in one go. It stays in the set
  // until now so that its flare plays out; without this line the breath
  // scorched the ruin again (ROADMAP.md, "a dragon went on burning a building
  // its first breath had already ruined").
  fire.burning = fire.burning.filter((blaze) => standing(st.buildings, blaze.id));

  if (fire.burning.length === 0) {
    const targets = st.buildings.filter((b) => isBuilt(b) && flammable(b.type));
    if (targets.length) {
      const b = pick(targets);
      st.damageBuilding(b.id, dragon.breathDamage, dragon.lines.scorched, true);
      audio.playAt('flame', b.x, b.z, 0.9);
      fire.burning.push({ id: b.id, x: b.x, z: b.z, fireT: FLARE_SECONDS });
    } else if (!fire.stoneNoted) {
      fire.stoneNoted = true;
      st.notify(dragon.lines.stoneHolds);
    }
    return;
  }

  for (const blaze of fire.burning) {
    st.damageBuilding(blaze.id, dragon.breathDamage, dragon.lines.scorched, true);
    audio.playAt('flame', blaze.x, blaze.z, 0.9);
    blaze.fireT = FLARE_SECONDS;
  }
  const live = useGameStore.getState().buildings;
  fire.burning = fire.burning.filter((blaze) => standing(live, blaze.id));
  const alight = new Set(fire.burning.map((blaze) => blaze.id));
  for (const blaze of [...fire.burning]) {
    if (fire.burning.length >= MAX_BURNING) break;
    if (Math.random() >= SPREAD_CHANCE) continue;
    const candidates = live.filter((o) => !alight.has(o.id) && isBuilt(o) && flammable(o.type)
      && Math.hypot(o.x - blaze.x, o.z - blaze.z) <= SPREAD_RADIUS);
    if (!candidates.length) continue;
    const next = pick(candidates);
    fire.burning.push({ id: next.id, x: next.x, z: next.z, fireT: FLARE_SECONDS });
    alight.add(next.id);
    audio.playAt('flame', next.x, next.z, 0.8);
    st.notify('🔥 The fire leaps to a neighboring structure!', true);
  }
}

function standing(buildings: ReturnType<typeof useGameStore.getState>['buildings'], id: string): boolean {
  const b = buildings.find((x) => x.id === id);
  return !!b && isBuilt(b);
}
