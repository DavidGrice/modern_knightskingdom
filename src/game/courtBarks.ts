// G-09 · the court's barks, from the player's frame (PlayerController.tsx): a court member the player walks into
// protests (collisionSound), and one he stands idle beside mutters a line of their own now and then (randomSound) —
// each through barks.ts's gate, so each line keeps its cooldown and each speaker his gap. collide.ts has no actor
// collision (the player walks through a figure), so a walk into one is the player, moving, coming within BUMP of where
// the figure stands now (npcMobs), counted once until he steps away again. None of them says a word while a fight is
// on in their world: Storm's duel is fought on the spot where her figure stands.
import { NPCS, isNpcPresent } from '@/game/data/npcs';
import { npcMobs } from '@/game/npcMobs';
import { useEnemyStore } from '@/game/combat/enemyStore';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { bark } from './barks';

/** metres between the player and a figure that are a walk into them (the player's body and theirs) */
export const BUMP = 1.1;
/** metres from a figure that are near enough to be muttered at */
export const NEAR = 6;
/** seconds the player stands still before the court mutters */
export const IDLE_FOR = 5;

/** the figures the player is touching now (a walk into one counts once, until he is clear of them) */
const touching = new Set<string>();
const still = { t: 0, x: NaN, z: NaN };

/** One frame of the player at (x, z), `dt` seconds after the last: the court present in his world, and what each of
 *  them says. `now` (seconds) is for the tests. */
export function courtBarks(st: { destination: string | null; completedQuests: string[] }, x: number, z: number, dt: number, now?: number): void {
  const moving = Math.hypot(x - still.x, z - still.z) > 0.002;
  const fight = useEnemyStore.getState().enemies.some((e) => (e.world ?? null) === st.destination && e.mob.state !== 'dying');
  // a player standing his ground in a fight is not standing idle: the clock starts again once it is over (else the
  // line Storm says as her duel ends was muttered again the moment it finished)
  still.t = moving || fight ? 0 : still.t + dt;
  still.x = x;
  still.z = z;
  for (const npc of NPCS) {
    if (!npc.randomSound && !npc.collisionSound) continue;
    if ((npc.world ?? null) !== st.destination || !isNpcPresent(npc, st.completedQuests, worldEnv.time)) {
      touching.delete(npc.id);
      continue;
    }
    const at = npcMobs[npc.id] ?? npc;
    const d = Math.hypot(at.x - x, at.z - z);
    if (d < BUMP) {
      if (moving && !fight && !touching.has(npc.id) && npc.collisionSound) bark('courtBump', { line: npc.collisionSound, speaker: npc.name, now });
      touching.add(npc.id);
    } else {
      touching.delete(npc.id);
    }
    // a mutter never talks over a line being spoken or loaded to be spoken (a greeting, a taunt, another of the court)
    if (!fight && still.t >= IDLE_FOR && d < NEAR && npc.randomSound && !audio.speaking) {
      bark('courtIdle', { line: npc.randomSound, speaker: npc.name, now });
    }
  }
}

/** test hook: no one touched, the player not yet seen */
export function resetCourtBarks(): void {
  touching.clear();
  Object.assign(still, { t: 0, x: NaN, z: NaN });
}
