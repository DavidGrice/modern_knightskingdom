// CLN-13 · one enemy's frame: what it does, where it goes and how it moves, decided each frame from its own state
// (data.mob) and the world's — the frame loop of Enemies.tsx's Enemy, which hands it its own refs, state and setters
// (frame.ts's EnemyFrame). In order: a mounted raider's pace measured for its horse; a fallen one's pieces flung
// apart; one on a wall-walk whose wall has gone, felled; then, outside build mode, the climb (climb.ts), the walk in
// from the road and the flight (movement.ts) each own the frame while they last; otherwise the enemy looks for what it
// has to fight (targeting.ts) and does the first of the chain below that holds — the order is the order it always was
// — then is shouldered apart from its pack, kept to the land and stopped at a shut gate. Last, its figure is stood
// where it is and given its clip.
import * as THREE from 'three';
import { audio } from '@/lib/audio';
import { useGameStore } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { DEATH_BARK } from '@/game/data/enemies';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import { groundUnder, play, stand, type EnemyFrame } from './frame';
import { distToPlayer, guardOnMyWall, keepInReach, markFor, nearestFighter, nearestGuard, tamInReach } from './targeting';
import { closeIn, engage, rangedProfileOf, swingAt, RANGED_RANGE } from './engage';
import { batterKeep, blowAtGuard, blowAtTam, blowAtVillager, fireAtPlayer, fireEngine } from './blows';
import { breaksAndRuns, flank, flee, keepToLand, makePathStep, paceOf, shoulderApart, stopAtShutGates, walkIn, wander } from './movement';
import { CLIMB_RANGE, climb, holdBattlement, ladderPull, poseOnLadder, takeTheLadder, walkwayStands } from './climb';

export type { EnemyFrame } from './frame';

/** Wave 36 (A3): how fast a mounted raider is ACTUALLY travelling, fed to its horse's own walk cycle — measured from
 *  real displacement rather than read off any one behaviour branch (chase/approach/flee/wander all move `m.x/z` by
 *  their own rules, and all of them should make the horse walk) */
function trackRidePace(f: EnemyFrame, dt: number): void {
  const m = f.data.mob;
  const pc = f.pace.current;
  const moved = Math.hypot(m.x - pc.x, m.z - pc.z) / Math.max(dt, 1 / 240);
  pc.x = m.x; pc.z = m.z;
  const want = moved > 0.4 ? Math.min(moved, 6) : 0;
  if (Math.abs(want - pc.v) > 0.55) { pc.v = want; f.setRidePace(want); }
}

/** LEGO pop-apart: fling the rig's joints outward, then despawn */
function fallApart(f: EnemyFrame, dt: number): void {
  const { data, scatter } = f;
  const m = data.mob;
  m.dieT += dt;
  const rig = f.rigRef.current;
  if (rig) {
    if (!scatter.current) {
      scatter.current = new Map();
      for (const [name, joint] of Object.entries(rig.joints)) {
        scatter.current.set(name, new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          2.5 + Math.random() * 2.5,
          (Math.random() - 0.5) * 4,
        ));
        void joint;
      }
      // positional (Phase 23): a mob dying across the homestead is faint,
      // and one dying in another instance entirely is silent — defenders
      // now cull night skeletons while the player is away, which used to
      // rattle bones at full volume on whatever map the player stood on
      audio.playAt(data.kind === 'skeleton' ? 'skeleton' : 'brick_collide', m.x, m.z, 0.8);
      const bark = DEATH_BARK[data.kind];
      if (bark) audio.playAt(bark, m.x, m.z, 0.85);
    }
    for (const [name, joint] of Object.entries(rig.joints)) {
      const v = scatter.current.get(name)!;
      v.y -= 9 * dt;
      joint.position.addScaledVector(v, dt);
      joint.rotation.x += dt * 5;
      joint.rotation.z += dt * 4;
    }
  }
  if (m.dieT > 1.1) f.remove(data.id);
}

export function stepEnemy(f: EnemyFrame, rawDt: number): void {
  const { data, path, speed, enemyAtHome } = f;
  const dt = Math.min(rawDt, 0.05);
  const st = useGameStore.getState();
  const g = f.group.current;
  if (!g) return;
  const m = data.mob;
  if (st.paused) return;

  if (data.mountAsset) trackRidePace(f, dt);

  if (m.state === 'dying') {
    fallApart(f, dt);
    return;
  }

  // An UNRELATED siege hit (damageKeepPart) that knocks a raider's own piece of wall back to bare while he is up on
  // it fells him at once — the same "ladder destroyed" handling the climb itself needs (climb.ts's walkwayStands).
  if (m.elevated && !walkwayStands(st, m.ladderSocketId)) {
    m.elevated = false;
    m.state = 'dying';
    m.dieT = 0;
    return; // next frame's dying branch above scatters the rig from wherever it last rendered
  }

  if (!st.buildMode) {
    const d = distToPlayer(m.x, m.z);

    // Wave 58 (H4): a raider already climbing the siege ladder ignores
    // everything else until it either reaches the top or the ladder/wall
    // is pulled out from under it — same early-return shape the walk in
    // from the road uses just below, and for the same reason (a transient
    // state that owns its own position/rotation/clip for as long as it lasts).
    if (m.state === 'climbing') {
      climb(f, g, st, dt);
      return;
    }
    // a raider walking in from the road (movement.ts's walkIn) does so until
    // close enough to the homestead, or the player is already near, at
    // which point approaching clears and the normal wander/chase/attack
    // chain below takes over on the next frame. Like the flight just
    // below, it stands its own figure and returns early rather than
    // falling through to the shared tail.
    if (m.approaching) {
      if (d < 26 || Math.hypot(m.x - HOME_X, m.z - HOME_Z) < 30) {
        m.approaching = false; // close enough — the chain below takes over next frame
      } else {
        walkIn(m, path.current, dt, speed);
        // the same pack-separation nudge the shared tail applies to a
        // chase or an attack — here too, since this returns early
        shoulderApart(data);
        stand(g, m, groundUnder(f));
        play(f, 'anim_c_run');
        return;
      }
    }
    breaksAndRuns(data, st);
    if (m.fleeing) {
      if (flee(m, dt) > 44) { f.remove(data.id); return; }
      stand(g, m, groundUnder(f));
      play(f, 'anim_c_run');
      return;
    }
    if (m.alertT) m.alertT = Math.max(0, m.alertT - dt);

    // what it has to fight (targeting.ts), looked for in this order every frame
    const keep = keepInReach(data, st, enemyAtHome);
    const guard = nearestGuard(data, enemyAtHome);
    const tam = tamInReach(data);
    const fighter = nearestFighter(data, enemyAtHome);
    const ranged = rangedProfileOf(data);
    const { mark, blocked } = markFor(data, d, guard, tam, fighter);
    const pathStep = makePathStep(path.current, m, dt);
    const wallGuard = guardOnMyWall(m, st);
    const ladder = ladderPull(data, enemyAtHome);

    if (m.elevated) {
      // a raider up here fights only what's genuinely reachable — the ONE
      // defender posted to this SAME wall-walk (wallGuard above), or
      // the player, if they're up here too (height-gated: horizontal
      // distance alone can't tell "on the wall" from "in the courtyard
      // directly below it", per the base design's own stated payoff).
      const onWalkway = Math.abs(playerState.y - (m.postY ?? 0)) < 2.2;
      const playerReachable = onWalkway ? d : Infinity;
      const wg = wallGuard.target;
      if (wg && wallGuard.d <= playerReachable) {
        engage(m, dt, {
          inReach: wallGuard.d < (data.ranged ? RANGED_RANGE : 1.7),
          face: wg,
          blow: () => blowAtGuard(data, st, wg, wallGuard.id, true),
          way: () => ({ nx: (wg.x - m.x) / wallGuard.d, nz: (wg.z - m.z) / wallGuard.d }),
          pace: speed,
        });
      } else if (playerReachable < Infinity) {
        engage(m, dt, {
          inReach: d < (ranged ? ranged.range : 1.8),
          face: ranged ? playerState : null,
          blow: () => fireAtPlayer(data, ranged, m.postY ?? 0),
          way: () => ({ nx: (playerState.x - m.x) / (d || 1), nz: (playerState.z - m.z) / (d || 1) }),
          pace: speed,
        });
      } else {
        // nobody left to fight up here right now — hold the battlement
        holdBattlement(m, dt);
      }
    } else if (ladder.eligible && ladder.d < CLIMB_RANGE) {
      takeTheLadder(data, ladder.footX, ladder.footZ);
    } else if (ladder.eligible) {
      // beeline for the ladder's own foot, the same chase shape as every
      // other priority target in this chain
      closeIn(m, dt, () => ({ nx: (ladder.footX - m.x) / ladder.d, nz: (ladder.footZ - m.z) / ladder.d }), speed);
    } else if (keep.target && keep.d < d && keep.d < guard.d) {
      const piece = keep.target;
      swingAt(m, dt, piece, () => batterKeep(data, st, piece));
    } else if (guard.target && mark === 'def') {
      const gt = guard.target;
      engage(m, dt, {
        inReach: guard.d < (data.ranged ? RANGED_RANGE : 1.7) && !blocked,
        face: gt,
        blow: () => blowAtGuard(data, st, gt, guard.id, false),
        way: () => (blocked ? pathStep(gt.x, gt.z) : { nx: (gt.x - m.x) / guard.d, nz: (gt.z - m.z) / guard.d }),
        pace: paceOf(data, speed, guard.d),
      });
    } else if (tam.target && mark === 'companion') {
      // Wave 25: the guard's shape, one rung weaker — Tam gets fought back
      // at exactly like a sworn defender does
      const tt = tam.target;
      engage(m, dt, {
        inReach: tam.d < (data.ranged ? RANGED_RANGE : 1.7) && !blocked,
        face: tt,
        blow: () => blowAtTam(data, st, tt),
        way: () => (blocked ? pathStep(tt.x, tt.z) : { nx: (tt.x - m.x) / tam.d, nz: (tt.z - m.z) / tam.d }),
        pace: paceOf(data, speed, tam.d),
      });
    } else if (fighter.target && mark === 'villager') {
      // Wave 21: the same shape again, one rung weaker — a villager who
      // chose to fight gets fought back at
      const vt = fighter.target;
      engage(m, dt, {
        inReach: fighter.d < (data.ranged ? RANGED_RANGE : 1.7) && !blocked,
        face: vt,
        blow: () => blowAtVillager(data, st, vt),
        way: () => (blocked ? pathStep(vt.x, vt.z) : { nx: (vt.x - m.x) / fighter.d, nz: (vt.z - m.z) / fighter.d }),
        pace: paceOf(data, speed, fighter.d),
      });
    } else if (d < (ranged ? ranged.range : 1.8) && !blocked) {
      // held at range rather than closing the last few metres (see the
      // chase just below), so — unlike melee, which already arrives
      // facing its target — a ranged attacker needs its own aim-turn here
      swingAt(m, dt, ranged ? playerState : null, () => fireAtPlayer(data, ranged, 0));
    } else if (data.kind !== 'siegeCrew' && (d < 26 || (m.alertT ?? 0) > 0)) {
      // Route AROUND structures and THROUGH real openings (makePathStep)
      // instead of steering straight at the player and letting the
      // collision solver shove us sideways — which is what used to read as
      // walking through a wall — each on its own shoulder (flank).
      closeIn(m, dt, () => flank(pathStep(playerState.x, playerState.z), data.id, d), paceOf(data, speed, d));
    } else if (data.kind === 'siegeCrew') {
      // a siege crew never chases (guarded on the branch above) and never
      // idly wanders off its post: it works its manned engine on its own
      // slow reload (blows.ts's fireEngine)
      swingAt(m, dt, null, () => fireEngine(data, st));
    } else {
      wander(m, dt);
    }
    if (m.state === 'chase' || m.state === 'attack') shoulderApart(data);
    // Keep out of the pond and the world edge — home-only geography, same
    // enemyAtHome guard the keep and guard checks above already use
    // (Wave 18 #5: was `!st.destination`, the player's own location, until
    // home enemies started staying mounted while the player travels away —
    // see `enemyAtHome`'s own note in Enemies.tsx's Enemy for why that
    // stopped being the right question to ask). Found and fixed while building the arena
    // (requested 2026-08-03): both this pond check and the WORLD_HALF
    // clamp were previously unconditional, so an enemy spawned
    // thousands of units away at a real destination's own origin got
    // yanked back inside the home world's tiny ±200 bound every single
    // frame. A genuine pre-existing latent bug for the Sealed Crypt too
    // (DUNGEON_ORIGIN is (4200,4200)) — it just never surfaced there,
    // since a room fight is short and its own walls mask a mob's position
    // snapping around.
    if (enemyAtHome) keepToLand(m);
    stopAtShutGates(m, st);
  }

  // Phase 20: away from the flat homestead, enemies stand on the bake's
  // real terrain (Storm's Sister Keep duel ring, Cedric's Rival Castle
  // camp, the dungeon's own floor all raycast against the mounted root)
  //
  // Wave 12 · and the home branch is no longer a literal 0. This was the
  // FIRST NPC-side site the elevation prototype touched, and for a reason
  // specific to raiders: they chase whatever is within 26m of them, so a
  // player who pulls a raid and runs north takes the whole pack up the
  // hill with them, while Villagers/court NPCs/defenders stayed anchored
  // ~90m short of any terrain region and outside the (then ±56m) nav grid
  // entirely — their own hardcoded 0 was out of reach rather than merely
  // unlikely. Wave 31 converted those other sites too (Villagers.tsx,
  // Npc.tsx, Defenders.tsx, RaiderRam.tsx, Merchant.tsx, Wildlife.tsx),
  // closing the gap this comment used to describe rather than leaving it
  // — see terrainRegions.ts for the now data-driven region list.
  //
  // Wave 58 (H4) addendum #4: this tail runs unconditionally for every mob
  // that reaches it, INCLUDING a climbing raider once it transitions into
  // ordinary 'attack'/'chase' combat against its now-eligible elevated
  // defender target (the elevated branch above sets m.state='chase'/
  // 'attack' too, exactly like the ground chain does). Without the ternary
  // below, elevation would snap back to ground height the instant real
  // combat starts, since `enemyAtHome`/`destinationGroundY` know nothing
  // about a wall-walk.
  //
  // And a raider who is ON THE LADDER gets here too: in build mode, where
  // the climb — which owns his place and returns early — is skipped with
  // the rest of what he decides (and on the one frame in which he takes
  // his place at the foot of the rungs). His climb's clock stands still
  // while the player builds, so he stays at the height it has reached —
  // not on the ground under him, which is where this line used to put
  // him for as long as build mode lasted.
  stand(g, m,
    m.elevated ? (m.postY ?? 0)
      : m.state === 'climbing' ? poseOnLadder(m.climbT ?? 0).y
      : groundUnder(f));

  play(f,
    m.state === 'attack' ? 'anim_g_swordswish'
      : m.state === 'chase' ? 'anim_c_run'
      : 'anim_c_walk');
}
