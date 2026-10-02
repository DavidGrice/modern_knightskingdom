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
import perceptionJson from './perception.json';
import combatJson from './combat.json';
import ambientJson from './ambient.json';
import companionJson from './companion.json';
import { POND } from '@/game/data/world';
import {
  NEED_IDS,
  type NeedId, type Tier, type NeedTuning, type ArchetypeDef, type TierDef, type LodConfig, type PerceptionConfig,
  type CombatConfig, type AmbientConfig, type CompanionConfig, type AnchorRule,
} from './types';

// CLN-16 · the interfaces now live in ./types; these are the names this module has always exported.
export { NEED_IDS };
export type { NeedId, Tier, NeedTuning, ArchetypeDef, SteeringMode, AnchorRule } from './types';

const DEFAULT_NEEDS = needsJson.defaults as Record<NeedId, NeedTuning>;
const NEED_PROFILES = needsJson.profiles as Record<
  string,
  Partial<Record<NeedId, Partial<NeedTuning>>>
>;

const ARCHETYPES = archetypesJson as unknown as Record<string, ArchetypeDef>;

export const LOD = lodJson as unknown as LodConfig;

/** §6/§3.3 — phase 6's tunables. Same `as unknown as` cast every other config
 *  in this file uses: the JSON carries `_doc` string arrays the TS interfaces
 *  deliberately don't model (they are authoring comments, not data). */
export const PERCEPTION = perceptionJson as unknown as PerceptionConfig;

/** §6.1 — the cone test compares against the HALF angle's cosine, and both
 *  are pure functions of an authored constant that never changes at runtime.
 *  Derived once here rather than per candidate per tick (§0.4). */
export const VISION_HALF_COS = Math.cos(PERCEPTION.vision.fov / 2);

/** §10 item 7 — phase 7's tunables, same cast and same reasoning as
 *  `PERCEPTION` above. Kept a separate file from perception.json because the
 *  two are tuned against different things; combat.json's `_doc` names the one
 *  place they genuinely have to agree. */
export const COMBAT = combatJson as unknown as CombatConfig;

/** §10 item 8's ambient half — phase 8's tunables, same cast and reasoning as
 *  `PERCEPTION`/`COMBAT` above. A separate file from lod.json because they are
 *  two unrelated halves of one build-order item: nothing in `wander`'s geometry
 *  has any business changing when a tier threshold is retuned. */
export const AMBIENT = ambientJson as unknown as AmbientConfig;

/** Wave 25 — companion.json's tunables, same cast and reasoning as
 *  `PERCEPTION`/`COMBAT`/`AMBIENT` above. */
export const COMPANION = companionJson as unknown as CompanionConfig;

const ANCHOR_RULES = anchorsJson as unknown as {
  nodes: Record<string, AnchorRule>;
  buildings: Record<string, AnchorRule>;
};

// CLN-16 · a dev-only shape check for the `as unknown as X` casts above. A cast tells TypeScript nothing at
// runtime, so a renamed or missing top-level key in one of these JSON files would otherwise surface much later
// as an `undefined`/NaN deep inside some tick. This logs it loudly at load instead. console.error, not a throw:
// this module's own rule is a dull NPC over a blank screen (see archetypeDef's fallback below). (A missing
// `perception.vision` already throws on its own, a few lines up, when VISION_HALF_COS reads it.) Production
// builds skip it entirely.
function checkKeys<T>(file: string, obj: unknown, keys: readonly (keyof T & string)[]): void {
  const missing = keys.filter((k) => obj == null || typeof obj !== 'object' || !(k in obj));
  if (missing.length) console.error(`[ai/config] ${file} is missing top-level key(s): ${missing.join(', ')}`);
}
if (process.env.NODE_ENV !== 'production') {
  checkKeys<LodConfig>('lod.json', LOD, ['thinkBudgetPerFrame', 'nearDistance', 'farDistance', 'tierRefreshHz', 'agentRadius', 'tiers', 'steering']);
  checkKeys<PerceptionConfig>('perception.json', PERCEPTION, ['vision', 'hearing', 'belief', 'threat']);
  checkKeys<CombatConfig>('combat.json', COMBAT, ['cover', 'alarm', 'engage', 'engageVillager', 'engageCompanion']);
  checkKeys<AmbientConfig>('ambient.json', AMBIENT, ['wander', 'roam']);
  checkKeys<CompanionConfig>('companion.json', COMPANION, ['follow']);
  checkKeys<typeof ANCHOR_RULES>('anchors.json', ANCHOR_RULES, ['nodes', 'buildings']);
  checkKeys<Record<'villager', ArchetypeDef>>('archetypes.json', ARCHETYPES, ['villager']);
}

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
