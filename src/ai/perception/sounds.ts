// NPC_AI_SPEC §6.2 — "the world emits `{ position, loudness, type, sourceId }`;
// the manager dispatches to agents within `loudness * falloff`."
//
// This is that emitter, and it is deliberately NOT a general pub/sub bus.
// This game has a handful of genuinely loud events (a blow landing on the
// player, the player's own sword or bolt connecting, a sprint going past) and
// 6-20 listeners; a subscription registry would be more machinery than the
// problem has. Instead the emitter is a small ring of recent events, and each
// agent drains whatever is newer than the last one it consumed on its own
// perceive tick. That also solves the real cadence problem a push-to-listeners
// design would have had: an agent perceives at 2-6 Hz, so a blow struck
// between two of its ticks must still be there when the next one comes round.
//
// Zero imports beyond playerState (a plain leaf module, the same one-way read
// notice.ts/Enemies.tsx/combat.ts already make of it) so that `game/combat.ts`
// can push into this file without adding a single new edge to the import graph
// the AI system already has to be careful about — the same "dependency-free
// leaf both sides import" role `game/carts.ts` already plays (PROJECT_CONTEXT
// §2).

import { playerState } from '@/game/playerState';
import { PERCEPTION } from '../config';

/** §6.2's `loudness` per real event, authored in perception.json rather than
 *  as literals at the call sites — §12's rule, and it keeps the whole "how
 *  far does a fight carry" decision readable in one place instead of spread
 *  across `game/combat.ts`. Re-exported here so an emitter needs exactly one
 *  import from the perception layer, not two. */
export const SOUND_LOUDNESS = PERCEPTION.hearing.loudness;

/** §6.2's `type`. Kept coarse: what a listener actually needs to know is
 *  "was that a fight" (raises threat) vs "was that someone moving about"
 *  (locates a neighbour, threatens nobody). */
export type SoundType = 'combat' | 'footstep';

export interface SoundEvent {
  /** monotonic; agents remember the last seq they consumed rather than a
   *  timestamp, so an event can never be half-consumed by a tick landing on
   *  the same clock value */
  seq: number;
  x: number;
  z: number;
  /** 0..1; audible radius is `loudness * hearing.radiusPerLoudness` */
  loudness: number;
  type: SoundType;
  /** The BELIEF id this sound is evidence for — `enemy:<id>`, `player`, or
   *  `noise:<what>` when the source cannot be pinned to an entity (a fight
   *  heard from the next field over). See Belief.ts's id scheme: the prefix
   *  is what makes a belief count toward threat, so it is load-bearing, not
   *  a label. */
  sourceId: string;
  /** which world this happened in (gameStore's `destination`, null = the home
   *  meadow). An agent only hears its own region — coordinates repeat across
   *  regions, and without this a villager at home would flinch at a fight in
   *  the Crypt happening to occur at the same x/z. */
  region: string | null;
  /** AgentManager's game clock at emission (see `emitSound`'s note on why
   *  this module is handed the clock rather than reading one). */
  at: number;
}

// A fixed ring. §0.4's zero-allocation rule is about per-FRAME code and this
// only runs on real combat events, but the ring costs nothing and bounds the
// worst case (a dragon siege landing many blows in one frame) for free.
const RING_SIZE = 32;
const ring: SoundEvent[] = [];
let seq = 0;
let write = 0;

/** The AI clock, mirrored here by `Senses.update`. This module cannot import
 *  `AgentManager` — `combat.ts` imports this file, and `AgentManager` sits
 *  inside the `gameStore -> ... -> AgentManager -> Agent` cycle `combat.ts`
 *  is already part of. A mirrored number is one assignment per think tick and
 *  keeps this file a true leaf. Emitters (combat.ts) therefore do not pass a
 *  timestamp: they have no business knowing which clock the AI runs on. */
let aiNow = 0;

export function setSoundClock(now: number): void {
  aiNow = now;
}

/** §6.2 — push a world sound. Safe to call from anywhere in the game layer;
 *  if the AI system never loaded (a screen with no `AiRuntime`), this writes
 *  into a ring nothing ever reads, which costs one object write. */
export function emitSound(
  x: number, z: number, loudness: number, type: SoundType, sourceId: string, region: string | null,
): void {
  seq++;
  const e = ring[write];
  if (e) {
    e.seq = seq; e.x = x; e.z = z; e.loudness = loudness;
    e.type = type; e.sourceId = sourceId; e.region = region; e.at = aiNow;
  } else {
    ring[write] = { seq, x, z, loudness, type, sourceId, region, at: aiNow };
  }
  write = (write + 1) % RING_SIZE;
}

/** The newest sequence number issued — an agent stores this after draining so
 *  it never re-hears an event, and a freshly spawned agent starts deaf to
 *  everything that happened before it existed. */
export function latestSoundSeq(): number {
  return seq;
}

/** Iterate every event newer than `afterSeq` that is still within its TTL,
 *  in unspecified order (a ring wraps; nothing downstream cares — each event
 *  is scored independently). Deliberately a callback rather than a returned
 *  array: this runs on every agent's perceive tick and must not allocate. */
export function forEachSoundSince(
  afterSeq: number, now: number, fn: (e: SoundEvent) => void,
): void {
  const ttl = PERCEPTION.hearing.eventTtlSec;
  for (let i = 0; i < ring.length; i++) {
    const e = ring[i];
    if (!e || e.seq <= afterSeq) continue;
    if (now - e.at > ttl) continue;
    fn(e);
  }
}

// --- the one CONTINUOUS source ---------------------------------------------
// Everything else here is a discrete event pushed by the game layer. Footsteps
// are not an event anything already fires, so they are pumped from the
// perception tick instead — throttled by wall-of-clock interval so it emits
// once per interval no matter how many agents call it in the same tick, which
// is what keeps this correct without a per-frame caller.
let lastFootstepAt = -Infinity;

/** A sprinting player is audible; a walking one is not (`hearing.sprintSpeed`
 *  is the exact threshold `PlayerAvatar.tsx` already uses to switch to
 *  `anim_c_run`, so what an NPC can hear matches what the player can see
 *  themselves doing). Emits a NON-hostile `player`-sourced sound: it locates
 *  the player for anything that wants that, and contributes nothing to threat
 *  — a villager is not frightened of you jogging past. */
export function pumpPlayerFootsteps(now: number, region: string | null): void {
  const h = PERCEPTION.hearing;
  if (playerState.speed <= h.sprintSpeed) return;
  if (now - lastFootstepAt < h.footstepIntervalSec) return;
  lastFootstepAt = now;
  emitSound(playerState.x, playerState.z, h.footstepLoudness, 'footstep', 'player', region);
}

/** Session reset (`agentManager.clear()`'s counterpart — a new game must not
 *  leave the last one's sounds audible for two seconds). */
export function resetSounds(): void {
  ring.length = 0;
  seq = 0;
  write = 0;
  aiNow = 0;
  lastFootstepAt = -Infinity;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kksounds = {
    emitSound, latestSoundSeq, forEachSoundSince, resetSounds,
  };
}
