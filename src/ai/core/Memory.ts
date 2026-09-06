// NPC_AI_SPEC §11.2 (Wave 42, E6) — the memory-stream foundation, built ahead
// of any dialogue/LLM layer per that section's own framing: a ring-buffer
// `memoryStream` of timestamped, template-generated summaries, plus a
// `recall(query, k)` stub scored by recency alone ("for now" — §11.2's own
// words). §11's hard boundary applies: nothing in this file has a network or
// model import, and nothing ever will until a real dialogue layer explicitly
// adds one on top of this.
//
// The `MemoryRecord` TYPE itself lives on `core/Blackboard.ts` (added
// alongside `bb.memoryStream`), matching this codebase's own established
// split for `Belief` (see `perception/Belief.ts`'s header) — this file owns
// the three things that actually operate on it: the bounded push, the
// recency-scored read, and the two real producers.
//
// BUILD ORDER, per this wave's own plan: E6 (this file) before E3 (fellow-
// agent beliefs) — E3's `neighbor:` belief formation is about to give this
// file's sighting producer its first REAL content beyond the phase-1 probe
// agent, so building push/cap/recall first and verifying it in isolation,
// then landing E3 on top, means E6 gets exercised by something meaningful
// rather than synthetic-only test content.

import type { Blackboard, MemoryRecord } from './Blackboard';
import { clockLabel, worldEnv } from '@/game/env';

/** §11.2: "Ring buffer, cap 200 per agent." */
export const MEMORY_CAP = 200;

/** Deliberately a plain bounded array + `shift()`, NOT hand-rolled ring-
 *  buffer indexing (a write cursor, a wraparound modulo, a separate "how
 *  full am I" count). §0.4's zero-allocation rule targets per-FRAME code —
 *  A7's neighbour scan (game/navgrid.ts) is the concrete example this wave
 *  actually needs to honour it for. A memory write only ever happens on a
 *  rare, discrete event (an Activity finishing, a belief forming for the
 *  first time), nowhere near render-loop frequency even for a busy agent, so
 *  the O(n) `shift()` cost (memmove the remaining ≤199 entries down by one)
 *  is genuinely free at this scale and the plain-array version is far less
 *  code to get wrong than a ring buffer would be for a benefit nothing here
 *  needs. */
export function pushMemory(stream: MemoryRecord[], at: number, summary: string): void {
  stream.push({ at, summary });
  if (stream.length > MEMORY_CAP) stream.shift();
}

/** §11.2's retrieval stub, literally: "`agent.recall(query, k)` returning
 *  top-k. For now, score by recency alone." — `query` is accepted (the
 *  future embedding-relevance hook the spec names) but genuinely UNUSED
 *  today; that "for now" is the spec's own words, not a shortcut taken here.
 *  `k` defaults to 5, the top of §11.2's own "keep k in the 3-5 range".
 *  Most-recent-first, matching how a person would actually answer "what do
 *  you remember" — the stream itself stays oldest-first internally (plain
 *  append order), this is just the read-time view of it. */
export function recall(stream: MemoryRecord[], _query: string, k = 5): MemoryRecord[] {
  const n = stream.length;
  const count = Math.min(k, n);
  const out: MemoryRecord[] = new Array(count);
  for (let i = 0; i < count; i++) out[i] = stream[n - 1 - i];
  return out;
}

/** §11.2's own worked example, verbatim: "'smithed at 14:20'". Every
 *  `Action.id` this game's reasoner can actually WIN gets a candidate entry
 *  below; only the ones judged worth remembering do, which is the point.
 *  Deliberately EXCLUDED: `wander`/`idle`/`idle_fidget`/`notice_player`/
 *  `socialize`/`follow_leader` — an idle or ambient villager completes one of
 *  these every few seconds, and letting all of them in would flood a 200-cap
 *  stream with nothing worth recalling within minutes (a future dialogue
 *  layer asking "what have you been up to" would get "wandered, wandered,
 *  wandered..." instead of the one time a raider showed up). This is a
 *  stated editorial cut, not an oversight — see this file's own `_doc` twin
 *  in `ai/config/*.json` convention: it would live there if it were a tuning
 *  NUMBER, but a set of action ids is content, not a tunable, matching how
 *  `archetypes.json`'s own `intrinsic` lists are authored as data, not
 *  numbers. */
const ACTION_MEMORY_LABEL: Record<string, string> = {
  gather_resource: 'gathered resources',
  haul_to_deposit: 'hauled a delivery to the store',
  tend_farmplot: 'tended the farm',
  take_cover: 'took cover from danger',
  engage_threat_villager: 'fought off a raider',
  engage_threat: 'fought off a raider',
  sleep: 'slept',
};

/** Called from `Reasoner.ts`'s `runReasoner`, at the existing `status ===
 *  'SUCCESS'` branch — never on `FAILURE` or `RUNNING`, matching §11.2's own
 *  "completed activities" wording: a gather that failed to find a walkable
 *  target is not something worth remembering as having happened. */
export function recordActivitySuccess(bb: Blackboard, actionId: string, now: number): void {
  const label = ACTION_MEMORY_LABEL[actionId];
  if (!label) return; // not on the notable-completions list above — see it for why
  pushMemory(bb.memoryStream, now, `${label} at ${clockLabel(worldEnv.time)}`);
}

/** A cosmetic label only — this is a memory-log SENTENCE, never a decision
 *  input, so duplicating a few literal prefixes from `perception/Belief.ts`'s
 *  own id scheme here (rather than importing `isHostileBeliefId`/
 *  `isNeighborBeliefId`/`PLAYER_BELIEF_ID`) does not risk the class of
 *  two-sources-of-truth bug this project has been bitten by more than once
 *  (node ids, ground height, work-hours gating): every one of those fed back
 *  into real GAMEPLAY logic, and this one only ever feeds a sentence a
 *  future dialogue layer might display. `core/Memory.ts` importing
 *  `perception/Belief.ts` would also be a genuinely NEW cross-layer edge —
 *  every existing import between these two folders runs perception -> core,
 *  never the reverse — and `Agent.ts` statically importing this file (for
 *  `agent.recall`) means that edge would land in `Agent.ts`'s own dependency
 *  closure. Safe today (`Belief.ts`'s own runtime imports are just `three`
 *  and `config/index.ts`, both already in `Agent.ts`'s graph — verified by
 *  reading it, not assumed), but a needless new edge for a cosmetic string
 *  is not worth relying on that staying true forever. If the real id scheme
 *  ever changes, the worst outcome here is an odd-looking memory label, not
 *  a wrong decision — an acceptable, explicitly-chosen trade. */
function describeEntity(beliefId: string): string {
  if (beliefId === 'player') return 'the player';
  if (beliefId.startsWith('neighbor:')) return 'a fellow villager';
  if (beliefId.startsWith('enemy:') || beliefId.startsWith('noise:')) return 'a hostile';
  return beliefId;
}

/** Called from `VisionSensor.ts`/`HearingSensor.ts` right after
 *  `ensureBelief(...)`, guarded on `b.firstSeenAt === now` — a reliable
 *  "this belief was created THIS EXACT TICK" test, since `ensureBelief` only
 *  ever stamps `firstSeenAt` on creation and never touches it on a refresh
 *  (confirmed by reading it). That guard is what keeps this from writing a
 *  memory record every single perceive tick a hostile stays in view — it
 *  fires exactly once per belief's lifetime, on the tick it is first formed
 *  (and again if it later decays out and is re-noticed, which is a real,
 *  separate re-sighting worth its own record). */
export function recordSighting(bb: Blackboard, beliefId: string, now: number, heard: boolean): void {
  pushMemory(
    bb.memoryStream,
    now,
    `${heard ? 'heard' : 'saw'} ${describeEntity(beliefId)} at ${clockLabel(worldEnv.time)}`,
  );
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkmemory = {
    MEMORY_CAP, pushMemory, recall, recordActivitySuccess, recordSighting,
  };
}
