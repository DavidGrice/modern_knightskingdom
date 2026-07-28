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

const DEFAULT_NEEDS = needsJson.defaults as Record<NeedId, NeedTuning>;
const NEED_PROFILES = needsJson.profiles as Record<
  string,
  Partial<Record<NeedId, Partial<NeedTuning>>>
>;

const ARCHETYPES = archetypesJson as unknown as Record<string, ArchetypeDef>;

export const LOD = lodJson as unknown as LodConfig;

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
