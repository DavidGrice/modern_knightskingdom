// Wave 43 (B6) — activates the 5 dormant challenge grounds (game/data/
// worlds.ts's CHALLENGE_DESTINATIONS) that buildChallenge.ts's own header
// left for later ("promote to a per-destination table... once a second one
// is worth building"). Rather than 5 literally unique mechanics — a much
// larger scope than any prior wave, and disproportionate to what this file's
// own precedent (arena.ts: 4 environments reused indefinitely) already
// established as the right shape — this ships 3 genuinely distinct mechanic
// TYPES, reused across the 5 remaining grounds:
//   challenge-1  Build Race   (existing, unchanged — buildChallenge.ts)
//   challenge-2  Gather Race
//   challenge-3  Defend the Plot
//   challenge-4  Joust Gauntlet
//   challenge-5  Gather Race   (reused)
//   challenge-6  Defend the Plot (reused)
//
// Three leaf modules in one file, same pattern as arena.ts/buildChallenge.ts/
// dungeonState/fishingState: run-local, unsaved state, no store import here
// (ChallengeRunner.tsx, the component that ticks these every frame, and
// ChallengePanels.tsx, the HUD that polls them, both import useGameStore
// themselves — mirrors ArenaSpawner.tsx's own split from arena.ts).
//
// CLN-20 · each mechanic's per-frame RULES live here too now (tickGather,
// tickDefend, tickJoust), moved out of ChallengeRunner.tsx's frame loop to
// sit beside the state they write. Still no store import, and none of the
// enemy store either: the frame's store snapshot is an argument, and the
// enemy store, the player's place and the sound come in as `deps`, built by
// the component. (Nothing forces that here — the game store does not import
// this module, as it does arena.ts and settlementRaid.ts — but it is the one
// shape for all three, the shared core in waveDefense.ts takes the same
// `deps`, and the rules can be run on their own, without a store.) The marker
// meshes stay in the component.
import type { EnemyKind } from './data/enemies';
import type { SoundName } from '@/lib/audio';
import { WORLD_DESTINATION_BY_ID } from './data/worlds';
import { exposeDebug } from '@/lib/debugHooks';
import { tickWaveDefense, type EnemyDeps } from './waveDefense';

type Store = ReturnType<typeof import('./store/gameStore').useGameStore.getState>;

/** CLN-20 · what the three ticks need from outside this module, handed in by ChallengeRunner (built once, at module
 *  scope). The enemy-store members read `useEnemyStore.getState()` when they are called. */
export interface ChallengeDeps extends EnemyDeps {
  /** the player's place — game/playerState.ts's own record, read live (the controller publishes it every frame) */
  player: { readonly x: number; readonly z: number };
  /** `audio.play`, with the default detune. Its position among the statements matters as much as its arguments:
   *  when the audio context is live a played sound draws a `Math.random` for its detune. */
  play: (name: SoundName, volume: number) => unknown;
}

const GATHER_CHALLENGE_IDS: readonly string[] = ['challenge-2', 'challenge-5'];
const DEFEND_CHALLENGE_IDS: readonly string[] = ['challenge-3', 'challenge-6'];
const JOUST_CHALLENGE_ID = 'challenge-4';

export function isGatherChallenge(destId: string | null): boolean {
  return !!destId && GATHER_CHALLENGE_IDS.includes(destId);
}
export function isDefendChallenge(destId: string | null): boolean {
  return !!destId && DEFEND_CHALLENGE_IDS.includes(destId);
}
export function isJoustChallenge(destId: string | null): boolean {
  return destId === JOUST_CHALLENGE_ID;
}

// ---------------------------------------------------------------------------
// Gather Race — collect GATHER_TARGET_COUNT markers scattered around the
// ground's own origin/radius before the clock runs out. Failing (timeout, or
// walking away) is silent, no penalty — same forgiving tone as
// buildChallenge.ts's own tickBuildChallenge.
export const GATHER_TARGET_COUNT = 6;
export const GATHER_TIME_MS = 75_000;
export const GATHER_PICKUP_RADIUS = 2.5;

interface GatherPoint { x: number; z: number; collected: boolean }
interface GatherChallengeState {
  active: boolean;
  destId: string | null;
  deadline: number; // performance.now() timestamp
  points: GatherPoint[];
}
export const gatherChallengeState: GatherChallengeState = {
  active: false, destId: null, deadline: 0, points: [],
};

/** Pure geometry — an evenly-spaced ring at half the ground's own radius, the
 *  same "no real per-diorama floor data, so keep placement generic" call
 *  ArenaScene.tsx's own primitives-only design already made. Absolute world
 *  coordinates (dest.origin + offset), matching every other absolute-space
 *  system that touches a challenge ground (Enemies.tsx mob positions,
 *  the arena's own ring spawns) — NOT local-to-origin the way
 *  DestinationScope.tsx's claimed-building children are, since this is read
 *  by flat, top-level components (ChallengeRunner.tsx), not ones nested
 *  inside that origin-offset <group>. */
function gatherTargetOffsets(destId: string): { x: number; z: number }[] {
  const dest = WORLD_DESTINATION_BY_ID[destId];
  return Array.from({ length: GATHER_TARGET_COUNT }, (_, i) => {
    const a = (i / GATHER_TARGET_COUNT) * Math.PI * 2;
    return { x: dest.origin.x + Math.sin(a) * dest.radius * 0.5, z: dest.origin.z + Math.cos(a) * dest.radius * 0.5 };
  });
}

export function startGatherChallenge(destId: string) {
  gatherChallengeState.active = true;
  gatherChallengeState.destId = destId;
  gatherChallengeState.deadline = performance.now() + GATHER_TIME_MS;
  gatherChallengeState.points = gatherTargetOffsets(destId).map((p) => ({ ...p, collected: false }));
}

/** CLN-20 · one frame of the Gather Race's rules (ChallengeRunner draws the markers straight after, from the state
 *  this leaves). `now` is the frame's one clock read.
 *
 *  Two edges are deliberate and must survive any tidying: the deadline is tested BEFORE the pickups (on the
 *  deadline's frame nothing is picked up), and `allCollected` is cleared before a marker's own pickup test — so the
 *  run completes on the frame AFTER the last pickup, and a last marker taken on the final frame before the deadline
 *  is "Time's up! You gathered 6/6" with no reward. */
export function tickGather(
  st: Pick<Store, 'destination' | 'notify' | 'addItems'>,
  now: number,
  deps: Pick<ChallengeDeps, 'player' | 'play'>,
) {
  const g = gatherChallengeState;
  if (g.active && g.destId && st.destination !== g.destId) {
    // walked away mid-run — quietly abandon, no penalty, same tone as
    // tickBuildChallenge's own silent-exit branch
    g.active = false;
  } else if (g.active) {
    if (now >= g.deadline) {
      g.active = false;
      // natural timeout gets a toast (same tone as buildChallenge.ts's own
      // tickBuildChallenge: "no penalty" means no lost items/xp, not that
      // the player hears nothing) — walking away above stays truly silent,
      // that's the "active choice to leave" case neither file announces
      const collected = g.points.filter((p) => p.collected).length;
      st.notify(`Time's up! You gathered ${collected}/${GATHER_TARGET_COUNT} — try again whenever you're ready.`);
    } else {
      let allCollected = true;
      for (const p of g.points) {
        if (p.collected) continue;
        allCollected = false;
        if (Math.hypot(deps.player.x - p.x, deps.player.z - p.z) < GATHER_PICKUP_RADIUS) {
          p.collected = true;
          deps.play('treasure', 0.7);
        }
      }
      if (allCollected) {
        g.active = false;
        st.addItems({ gold: 25, herb: 4 }, 'grant');
        st.notify('Gather race complete! A forager’s haul awaits.', true);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Defend the Plot — real hostiles spawn (worldOverride-scoped to this ground,
// exactly like a dungeon room or Cedric's camp, per combat.ts's own EnemyData
// .world doctrine) and close on the destination's own claimed flag
// (claimedWorlds[destId], already rendered as <ClaimFlag>). Rather than real
// object-targeting combat AI against the flag (siegeCrew's own un-scoped
// building-attack AI is exactly the unsafe shortcut this avoids — see this
// wave's research), "defending" is our own proximity check against the
// flag's stored position: any live hostile within DEFEND_PROXIMITY_RADIUS
// chips the plot's own HP pool. The player's normal melee/ranged combat
// against those same hostiles is what actually keeps the plot standing.
export const DEFEND_TIME_MS = 90_000;
export const DEFEND_START_HP = 100;
export const DEFEND_DRAIN_PER_SEC = 5;
export const DEFEND_PROXIMITY_RADIUS = 7;
export const DEFEND_SPAWN_INTERVAL_S = 4;
export const DEFEND_MAX_LIVE = 4;

interface DefendChallengeState {
  active: boolean;
  destId: string | null;
  deadline: number;
  plotHp: number;
}
export const defendChallengeState: DefendChallengeState = {
  active: false, destId: null, deadline: 0, plotHp: DEFEND_START_HP,
};

export function startDefendChallenge(destId: string) {
  defendChallengeState.active = true;
  defendChallengeState.destId = destId;
  defendChallengeState.deadline = performance.now() + DEFEND_TIME_MS;
  defendChallengeState.plotHp = DEFEND_START_HP;
}

const DEFEND_SPAWN_TABLE: EnemyKind[] = ['skeleton', 'bandit'];

/** CLN-20 · the two values of a Defend run that belong to ChallengeRunner (one ref, for the component's lifetime)
 *  and NOT to defendChallengeState: the wave countdown (initial DEFEND_SPAWN_INTERVAL_S) and whether the run was
 *  active on the last unpaused frame (initial false). Kept out of the module record so that a remount while a run is
 *  still active reads as a fresh start — the first frame sees a rising edge and sets the countdown to 1.5. */
export interface DefendRun { spawnTimer: number; wasActive: boolean }

/** CLN-20 · one frame of Defend the Plot. `dt` is the RAW frame delta, `now` the frame's one clock read.
 *
 *  The edge test and the record of `active` are the first two statements, in that order, before any branch: the flag
 *  holds what `active` was BEFORE this frame's rules could end the run, so a run ended on one frame and restarted
 *  before the next shows no edge and keeps its old countdown. The shared core is game/waveDefense.ts; the branches
 *  around it are this mechanic's own — leaving clears the ground and says nothing, a missing claim only stops the
 *  run (it does NOT clear the ground), an active run with no destId does nothing at all, and a win pays its gold and
 *  experience unconditionally, zero included. Nothing here returns early past a branch that the next mechanic needs:
 *  ChallengeRunner runs the joust after this whatever happened. */
export function tickDefend(
  run: DefendRun,
  st: Pick<Store, 'destination' | 'claimedWorlds' | 'notify' | 'addItems' | 'addXp'>,
  dt: number,
  now: number,
  deps: EnemyDeps,
) {
  const d = defendChallengeState;
  if (d.active && !run.wasActive) run.spawnTimer = 1.5; // first wave arrives quickly
  run.wasActive = d.active;
  if (d.active && d.destId && st.destination !== d.destId) {
    // left the fight — clean up its hostiles immediately (this can be
    // retried on the same ground without `destination` ever changing away
    // and back, so combat.ts's own generic exit-cleanup subscriber alone
    // wouldn't be enough here)
    d.active = false;
    deps.removeByWorld(d.destId);
  } else if (d.active && d.destId) {
    const claim = st.claimedWorlds[d.destId];
    if (!claim) {
      d.active = false;
    } else {
      const outcome = tickWaveDefense(run, d, d.destId, claim, dt, now, {
        kinds: DEFEND_SPAWN_TABLE,
        maxLive: DEFEND_MAX_LIVE,
        intervalS: DEFEND_SPAWN_INTERVAL_S,
        drainPerSec: DEFEND_DRAIN_PER_SEC,
        proximityRadius: DEFEND_PROXIMITY_RADIUS,
      }, deps);
      if (outcome === 'lost') {
        d.plotHp = 0;
        d.active = false;
        deps.removeByWorld(d.destId);
        st.notify('The banner falls — the plot could not be held.');
      } else if (outcome === 'won') {
        d.active = false;
        deps.removeByWorld(d.destId);
        const frac = d.plotHp / DEFEND_START_HP;
        const bonus = Math.round(30 * frac);
        const xp = Math.round(50 * frac);
        st.addItems({ gold: bonus }, 'grant');
        st.addXp('combat', xp);
        st.notify(`The banner holds! +${bonus} gold for your defense.`, true);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Joust Gauntlet — the one genuinely novel mechanic (no existing joust logic
// generalizes: gameStore.ts's joustRichard() is entirely bespoke to the
// scripted Richard duel — a mount, a gallop flag, and a one-shot distance
// roll, none of which exist as a reusable system). Ride/run through
// JOUST_RING_COUNT rings in sequence, each with its own short active window;
// hitting a ring while it's "hot" scores precision by how early the hit
// landed, generalizing joustRichard's own distance-based precision idea into
// a timing one (no lance/mount mechanic exists to reuse for the distance
// version). Only challenge-4 gets this — the most novel of the three, not
// worth duplicating onto a second ground per this wave's own scope call.
export const JOUST_RING_COUNT = 5;
export const JOUST_TIME_MS = 45_000;
export const JOUST_RING_RADIUS = 2.2;
export const JOUST_RING_ACTIVE_MS = 1200;

interface JoustChallengeState {
  active: boolean;
  destId: string | null;
  deadline: number;
  ringIndex: number;
  ringActivatedAt: number; // performance.now() timestamp the CURRENT ring went hot
  hits: number;
  precisionSum: number;
}
export const joustChallengeState: JoustChallengeState = {
  active: false, destId: null, deadline: 0, ringIndex: 0, ringActivatedAt: 0, hits: 0, precisionSum: 0,
};

/** Same evenly-spaced-ring geometry as gatherTargetOffsets, a touch wider
 *  (0.55x radius vs 0.5x) so the two mechanics don't visually coincide on
 *  the rare "two grounds share a layout" coincidence — not that it would
 *  matter mechanically, since only one ground's mechanic is ever active
 *  under the player at a time. */
export function joustRingOffsets(destId: string): { x: number; z: number }[] {
  const dest = WORLD_DESTINATION_BY_ID[destId];
  return Array.from({ length: JOUST_RING_COUNT }, (_, i) => {
    const a = (i / JOUST_RING_COUNT) * Math.PI * 2;
    return { x: dest.origin.x + Math.sin(a) * dest.radius * 0.55, z: dest.origin.z + Math.cos(a) * dest.radius * 0.55 };
  });
}

export function startJoustChallenge(destId: string) {
  joustChallengeState.active = true;
  joustChallengeState.destId = destId;
  joustChallengeState.deadline = performance.now() + JOUST_TIME_MS;
  joustChallengeState.ringIndex = 0;
  joustChallengeState.ringActivatedAt = performance.now();
  joustChallengeState.hits = 0;
  joustChallengeState.precisionSum = 0;
}

function finishJoust(st: Pick<Store, 'addItems' | 'addXp' | 'notify'>) {
  const j = joustChallengeState;
  // rings never reached count as zero precision, not "not counted" — a
  // gauntlet abandoned at ring 1 shouldn't score as well as one finished at
  // a perfect ring 1 hit
  const avg = j.precisionSum / JOUST_RING_COUNT;
  const bonus = Math.round(60 * avg);
  const xp = Math.round(70 * avg);
  if (bonus > 0) st.addItems({ gold: bonus }, 'grant');
  if (xp > 0) st.addXp('combat', xp);
  st.notify(`Gauntlet complete! ${j.hits}/${JOUST_RING_COUNT} rings struck — +${bonus} gold.`, true);
}

/** CLN-20 · one frame of the Joust Gauntlet's rules (ChallengeRunner colours the rings straight after, from the
 *  state this leaves). `now` is the frame's one clock read: it is the deadline test, the ring's elapsed time AND the
 *  next ring's `ringActivatedAt`. The thud is played between the precision being banked and the ring advancing. */
export function tickJoust(
  st: Pick<Store, 'destination' | 'addItems' | 'addXp' | 'notify'>,
  now: number,
  deps: Pick<ChallengeDeps, 'player' | 'play'>,
) {
  const j = joustChallengeState;
  if (j.active && j.destId && st.destination !== j.destId) {
    j.active = false;
  } else if (j.active && j.destId) {
    if (now >= j.deadline) {
      j.active = false;
      finishJoust(st);
    } else {
      const rings = joustRingOffsets(j.destId);
      const ring = rings[j.ringIndex];
      const elapsed = now - j.ringActivatedAt;
      const hit = ring && Math.hypot(deps.player.x - ring.x, deps.player.z - ring.z) < JOUST_RING_RADIUS;
      if (hit) {
        const precision = Math.max(0, 1 - elapsed / JOUST_RING_ACTIVE_MS);
        j.hits += 1;
        j.precisionSum += precision;
        deps.play('thud', 0.7);
        j.ringIndex += 1;
        j.ringActivatedAt = now;
      } else if (elapsed >= JOUST_RING_ACTIVE_MS) {
        // window expired without a hit — advance anyway, at zero precision
        j.ringIndex += 1;
        j.ringActivatedAt = now;
      }
      if (j.ringIndex >= JOUST_RING_COUNT) {
        j.active = false;
        finishJoust(st);
      }
    }
  }
}

exposeDebug('__kkchallenges', {
  gather: gatherChallengeState, defend: defendChallengeState, joust: joustChallengeState,
});
