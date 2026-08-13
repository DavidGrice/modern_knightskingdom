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

/** §8 — the three steering modes the tier table assigns. Named here rather
 *  than inline on `TierDef` so `Agent.steering`, `LodConfig.steering`'s keys
 *  and `Locomotion`'s cadence lookup are all provably the same three strings. */
export type SteeringMode = 'full' | 'simplified' | 'teleport';

export interface TierDef {
  thinkHz: number;
  perceiveHz: number;
  steering: SteeringMode;
}

/** Phase 8 — what `steering` actually COSTS per mode. Every field is
 *  documented against the real number it was chosen from in lod.json's own
 *  `_doc`; nothing here is a free-floating guess. */
export interface SteeringConfig {
  /** seconds between tier-C steering passes (0 would mean every frame) */
  simplifiedInterval: number;
  /** seconds between tier-D coarse jumps — deliberately tier D's own think period */
  teleportInterval: number;
  /** hard metre cap on one tier-D jump, whatever dt banked up */
  teleportMaxStep: number;
  /** how recently a renderer must have driven an agent for the tier-D sweep
   *  to leave it alone */
  rendererStaleSec: number;
  /** §8's re-entry snap radius, in NavGrid cells */
  reentrySnapCells: number;
}

export interface LodConfig {
  thinkBudgetPerFrame: number;
  nearDistance: number;
  /** phase 8 — tier B's missing far bound; beyond this an in-frustum agent
   *  is C. See lod.json's `_doc` for why this number is 60 and not a new one. */
  farDistance: number;
  tierRefreshHz: number;
  agentRadius: number;
  tiers: Record<Tier, TierDef>;
  steering: SteeringConfig;
}

/** §6.1 — the vision cone's shape and its per-tick LOS budget. `fov` is the
 *  FULL cone angle in radians (the sensor halves it itself), not the half
 *  angle: perception.json is authored by a human, and "how wide can it see"
 *  is the natural thing to type. No `updateHz` — see perception.json's own
 *  `_doc` for why perception reuses the agent's lod.json `perceiveHz`
 *  instead of carrying a second rate that has to agree with it by hand. */
export interface VisionConfig {
  fov: number;
  range: number;
  peripheralRange: number;
  rampSecondsNear: number;
  rampSecondsFar: number;
  losChecksPerTick: number;
  losSampleStep: number;
}

/** §6.2 — event-driven hearing. `radiusPerLoudness` is the spec's `falloff`
 *  (audible radius = `loudness * radiusPerLoudness`). */
export interface HearingConfig {
  radiusPerLoudness: number;
  /** the authored per-event loudness table every real emitter reads
   *  (`SOUND_LOUDNESS`, perception/sounds.ts) — audible radius is
   *  `loudness * radiusPerLoudness` */
  loudness: { playerStruck: number; meleeHit: number; boltHit: number };
  fuzzRadius: number;
  confidence: number;
  eventTtlSec: number;
  sprintSpeed: number;
  footstepIntervalSec: number;
  footstepLoudness: number;
}

/** §3.3 — belief decay, the prune floor, and the reaction delay. */
export interface BeliefConfig {
  decayPerSec: number;
  pruneBelow: number;
  noticedAt: number;
  reactionMinSec: number;
  reactionMaxSec: number;
  visibleGraceSec: number;
}

/** §6.3 — how beliefs become `bb.threatLevel`. */
export interface ThreatConfig {
  smoothingTau: number;
  closeDistance: number;
  falloffDistance: number;
  extraPerHostile: number;
  damageMemorySec: number;
  damageWeight: number;
}

export interface PerceptionConfig {
  vision: VisionConfig;
  hearing: HearingConfig;
  belief: BeliefConfig;
  threat: ThreatConfig;
}

/** Phase 7 (§10's build-order item 7) — `take_cover`'s own geometry. Every
 *  distance is in world metres; `minThreat` is on `bb.threatLevel`'s 0..1
 *  scale and is deliberately coupled to `PERCEPTION.hearing.confidence` (see
 *  combat.json's `_doc` for the loop-freedom argument that coupling buys). */
export interface CoverConfig {
  /** the ENTRY gate — threat must reach this for `take_cover` to start */
  minThreat: number;
  /** the RELEASE gate — once stood down behind the piece, threat only has to
   *  stay above this to keep watching. Hysteresis: without it the action ended
   *  the moment retreating dropped threat back under `minThreat`, which is
   *  before the run to cover has finished (see combat.json's `cover._doc`). */
  sustainThreat: number;
  /** how long a run to cover is honoured regardless of what threat does — a
   *  backstop on the travel phase, which normally ends by arriving */
  commitSec: number;
  /** what the threat gate reports during that window: a flat value, chosen so
   *  `flee_to_safety`'s 4.0 still clears the reasoner's switch threshold while
   *  nothing below survival can (combat.json's `cover._doc` shows the sum) */
  commitThreat: number;
  searchRadius: number;
  minPieceHeight: number;
  standoff: number;
  /** how far past `standoff` the stand point may be pushed, outward along the
   *  same retreat ray, looking for walkable ground — the nav grid's blocked
   *  cells reach further past a piece than `sizeFor` reports */
  standoffProbe: number;
  /** the increment that probe walks in */
  standoffStep: number;
  minRetreatGain: number;
  retreatDistance: number;
  stopDistance: number;
  repathDistance: number;
}

/** Phase 7 — the shout a villager breaking for cover emits into §6.2's
 *  hearing sensor, plus the throttle on its player-facing notice. */
export interface AlarmConfig {
  loudness: number;
  cooldownSec: number;
}

/** Phase 7 — `engage_threat`'s reach and swing rhythm. Both mirror
 *  `Defenders.tsx`'s own MELEE_RANGE/attackCd on purpose: same swing, same
 *  people, same weapons (see combat.json's `_doc`). */
export interface EngageConfig {
  reach: number;
  approachStop: number;
  swingSeconds: number;
  loseTargetSec: number;
}

export interface CombatConfig {
  cover: CoverConfig;
  alarm: AlarmConfig;
  engage: EngageConfig;
}

/** Phase 8 (§10's build-order item 8, the "ambient" half) — `wander`'s own
 *  geometry. Distances are world metres and are lifted from Villagers.tsx's
 *  shipped cascade rather than re-picked; see ambient.json's `_doc`. */
export interface WanderConfig {
  radius: number;
  minRadius: number;
  stopDistance: number;
  samples: number;
  /** the `Action.cooldown` a completed stroll starts — a real pause, not a
   *  rate limit; see ambient.json's `_doc` for what fills it */
  pauseSec: number;
  giveUpSec: number;
}

export interface AmbientConfig {
  wander: WanderConfig;
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
