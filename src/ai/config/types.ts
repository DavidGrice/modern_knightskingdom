// CLN-16 · every config interface, split out of config/index.ts so the shapes can be read (and imported) without
// pulling in the JSON or the loaders. index.ts re-exports the names it always exported, so no importer changes.
// The one runtime value here is NEED_IDS: `NeedId` is derived from it, so they have to live together.

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
  /** Wave 42 (E3) — the neighbour-contagion term's own weight; see
   *  perception.json's `threat._doc` for the arithmetic behind 0.5. */
  neighborWeight: number;
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

/** Wave 21 — `engage_threat_villager`'s own reach/rhythm plus its three
 *  capability-gate thresholds (see combat.json's `engageVillager._doc`).
 *  A distinct interface from `EngageConfig` even though the shape mostly
 *  overlaps: `courageThreshold`/`capableTierMax`/`closeRange` have no
 *  equivalent on the defender-tuned action, and folding them into
 *  `EngageConfig` would make every existing `COMBAT.engage` reference look
 *  like it also carries a villager-only field. */
export interface EngageVillagerConfig {
  reach: number;
  approachStop: number;
  swingSeconds: number;
  loseTargetSec: number;
  closeRange: number;
  courageThreshold: number;
  capableTierMax: number;
}

/** Wave 25 verification fix — `engageCompanion` needs one field neither
 *  `engage` nor `engageVillager` carries: a real distance-from-the-PLAYER
 *  give-up. Both of those models fight where they already stand (a defender's
 *  post, a villager's take_cover point); assist_leader is the first combat
 *  Action that CHASES, and its only pre-existing exit condition
 *  (`!isVisibleNow && now - lastSeenAt > loseTargetSec`) never fires against a
 *  fleeing target crossing open ground, which is exactly the case that let
 *  Tam be dragged indefinitely — verified live, chasing a fleeing bandit for
 *  10+ seconds with the gap never closing and no sign of the chase ever being
 *  abandoned. A distinct interface (rather than an optional field bolted onto
 *  `EngageConfig`) for the same reason `EngageVillagerConfig` is its own type:
 *  a field with no meaning on `engage`/`engageVillager` shouldn't appear to be
 *  part of their shape. */
export interface EngageCompanionConfig extends EngageConfig {
  /** metres from the PLAYER (not from the target) — once Tam's own chase has
   *  pulled him this far from the person he is meant to be companioning,
   *  assist_leader gives up and returns SUCCESS regardless of whether the
   *  target is still visible, handing control straight back to follow_leader
   *  (interruptPriority 5 < 8, so it wins the very next reasoner tick with
   *  nothing else contending). */
  leashDistance: number;
}

export interface CombatConfig {
  cover: CoverConfig;
  alarm: AlarmConfig;
  engage: EngageConfig;
  engageVillager: EngageVillagerConfig;
  /** Wave 25 — assist_leader's own rhythm. See `EngageCompanionConfig`'s own
   *  comment for the one field it adds over the shared `EngageConfig` shape,
   *  and combat.json's own `engageCompanion._doc` for why it carries none of
   *  `engageVillager`'s extra roster-scaling gates. */
  engageCompanion: EngageCompanionConfig;
}

/** Wave 25 — follow_leader's own geometry (combat.json's `_doc` convention,
 *  applied to a dedicated file since this tunable belongs to the
 *  `companion` category rather than `combat` — see companion.json's own
 *  `_doc`). */
export interface FollowConfig {
  stopDistance: number;
  runDistance: number;
  repathDistance: number;
}

export interface CompanionConfig {
  follow: FollowConfig;
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
  /** Wave 53 (E1) — the ambient-archetype songbird population's own roam
   *  geometry (actions/roam.ts). Same `WanderConfig` shape as `wander`
   *  above (both are "pick a walkable point on a ring, walk to it, pause"),
   *  tuned smaller/quicker — see ambient.json's own `_doc` for why this
   *  isn't just `wander` reused. */
  roam: WanderConfig;
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
