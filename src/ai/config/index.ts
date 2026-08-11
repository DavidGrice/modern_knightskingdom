// NPC_AI_SPEC §12 — every tunable number lives in JSON; this module is the
// only thing allowed to know the shape of those files. Nothing else imports
// the .json directly, so a schema change lands in one place.
//
// The JSON is imported (bundled) rather than fetched: Next resolves it at
// build time with `resolveJsonModule`, matching how the rest of this project
// loads authored data (see game/data/bricks.generated.json). Tuning is still
// a text edit in a .json file, which is what §12 is actually asking for.

import needsJson from './needs.json';
import archetypesJson from './archetypes.json';
import lodJson from './lod.json';
import anchorsJson from './anchors.json';
import { POND } from '@/game/data/world';

/** §3.2 — the seven drives. Order here is the order the overlay prints them.
 *  Reworked 2026-07-27: the original set (energy/hygiene/bladder/hunger/
 *  fun/social/comfort) was The Sims' seven motives lifted wholesale, with
 *  worked examples (bathtub, toilet, bookshelf) that have no object in this
 *  game. `safety` and `purpose` replace hygiene/bladder — safety gives the
 *  existing guard intrinsic actions (engage_threat/take_cover/flee, see
 *  archetypes.json) a need to actually drive their utility score once phase
 *  5 wires it up; purpose ties to the JOBS system (lumberjack/miner/farmer/
 *  merchant/defender/builder, see game/data/villagers.ts) instead of a
 *  bodily function with no in-game object. `fun` is renamed `morale` —
 *  same slot, a label that fits a homestead instead of a dollhouse. */
export const NEED_IDS = [
  'energy', 'safety', 'purpose', 'hunger', 'morale', 'social', 'comfort',
] as const;
export type NeedId = (typeof NEED_IDS)[number];

/** §8 — LOD tiers, best to worst. */
export type Tier = 'A' | 'B' | 'C' | 'D';
export const TIERS: Tier[] = ['A', 'B', 'C', 'D'];

export interface NeedTuning {
  /** satisfaction lost per GAME second (see needs.json's _doc) */
  decayPerSec: number;
  /** value at spawn */
  start: number;
}

export interface ArchetypeDef {
  label: string;
  needProfile: string;
  /** §5.1 intrinsic action ids — content for the reasoner in phase 5 */
  intrinsic: string[];
}

export interface TierDef {
  thinkHz: number;
  perceiveHz: number;
  steering: 'full' | 'simplified' | 'teleport';
}

export interface LodConfig {
  thinkBudgetPerFrame: number;
  nearDistance: number;
  tierRefreshHz: number;
  agentRadius: number;
  tiers: Record<Tier, TierDef>;
}

/** §3.2 — how a target kind resolves to a real point an agent can stand at.
 *  2.8 (this) only needs every `Target` to carry the right rule and its
 *  `slots` count for reservation capacity; turning a rule into an actual
 *  walkable point is iteration 2.9's job (radial sampling + nearestWalkable
 *  fallback, fixed-offset rotation by rot*90°). */
export interface AnchorRuleRadial {
  mode: 'radial';
  radius: number;
  slots: number;
  /** How far nearestWalkable may search when every radial sample lands on
   *  blocked ground — in WORLD units; AnchorResolution converts to a cell
   *  budget. Defaults to `radius`, which is only ever right for a piece
   *  whose radius already clears its own nav-inflated footprint; see
   *  anchors.json's authoring rule (and the barrel, which it defaulted into
   *  a 1-cell budget and an unresolvable anchor). Authored per kind in
   *  anchors.json EXCEPT for fishing, which derives it — see anchorRuleFor's
   *  own comment. */
  fallbackRadius?: number;
}
export interface AnchorRuleFixed {
  mode: 'fixed';
  offset: [number, number];
  facing: number;
  slots: number;
}
export type AnchorRule = AnchorRuleRadial | AnchorRuleFixed;

const DEFAULT_NEEDS = needsJson.defaults as Record<NeedId, NeedTuning>;
const NEED_PROFILES = needsJson.profiles as Record<
  string,
  Partial<Record<NeedId, Partial<NeedTuning>>>
>;

const ARCHETYPES = archetypesJson as unknown as Record<string, ArchetypeDef>;

export const LOD = lodJson as unknown as LodConfig;

const ANCHOR_RULES = anchorsJson as unknown as {
  nodes: Record<string, AnchorRule>;
  buildings: Record<string, AnchorRule>;
};
/** a radial rule nobody authored a kind for yet — a real gap should be
 *  loud in the debug overlay, not a silent crash the first time a new
 *  buildable/node kind reaches the reasoner before anchors.json catches up */
const FALLBACK_ANCHOR_RULE: AnchorRule = { mode: 'radial', radius: 1.0, slots: 1 };

// A profile is the defaults with its own overrides folded in. Merged once per
// profile and cached — this allocates, so it must never run per frame (§0.4);
// agents resolve their profile at spawn.
const profileCache = new Map<string, Record<NeedId, NeedTuning>>();

export function needProfile(profile: string): Record<NeedId, NeedTuning> {
  const cached = profileCache.get(profile);
  if (cached) return cached;
  const overrides = NEED_PROFILES[profile] ?? {};
  const merged = {} as Record<NeedId, NeedTuning>;
  for (let i = 0; i < NEED_IDS.length; i++) {
    const id = NEED_IDS[i];
    const base = DEFAULT_NEEDS[id];
    const over = overrides[id];
    merged[id] = {
      decayPerSec: over?.decayPerSec ?? base.decayPerSec,
      start: over?.start ?? base.start,
    };
  }
  profileCache.set(profile, merged);
  return merged;
}

/** Falls back to `villager` rather than throwing — a typo'd archetype should
 *  produce a dull NPC in the overlay, not a blank screen. */
export function archetypeDef(id: string): ArchetypeDef {
  return ARCHETYPES[id] ?? ARCHETYPES.villager;
}

/** `_doc` keys are authoring comments, not archetypes — every config file in
 *  here carries one, so anything enumerating a file's keys must skip them. */
export function archetypeIds(): string[] {
  return Object.keys(ARCHETYPES).filter((k) => !k.startsWith('_'));
}

export function tierDef(tier: Tier): TierDef {
  return LOD.tiers[tier];
}

/** §4.4 — resolved once, not per query: `POND` (game/data/world.ts) is a
 *  static module-level constant, never mutated at runtime, so re-deriving
 *  `POND.radius + 4` and allocating a fresh merged object on every single
 *  `anchorRuleFor('node'|'building', 'fishing')` call (as the first version
 *  of this function did, iteration 2.8) is pure waste — the exact "must
 *  never run per frame" §0.4 already states for `profileCache` above.
 *  Keyed by the base rule object rather than a bare boolean/kind string so
 *  this stays correct even if a future 'fishing' *building* entry (there
 *  isn't one today — checked anchors.json directly) got its own distinct
 *  base rule. */
const fishingRuleCache = new WeakMap<AnchorRule, AnchorRule>();

/** §3.2/§4.4 — kind -> anchor rule. fishing's `fallbackRadius` is
 *  `POND.radius + 4`, computed from the real pond definition (game/data/
 *  world.ts) rather than a second hardcoded number in anchors.json — the
 *  spec doc's "derive:POND.r + 4" notation meant exactly this, not a
 *  literal string to store and later parse. */
export function anchorRuleFor(source: 'node' | 'building', kind: string): AnchorRule {
  const table = source === 'node' ? ANCHOR_RULES.nodes : ANCHOR_RULES.buildings;
  const rule = table[kind];
  if (!rule) return FALLBACK_ANCHOR_RULE;
  if (kind === 'fishing' && rule.mode === 'radial') {
    let cached = fishingRuleCache.get(rule);
    if (!cached) {
      cached = { ...rule, fallbackRadius: POND.radius + 4 };
      fishingRuleCache.set(rule, cached);
    }
    return cached;
  }
  return rule;
}
