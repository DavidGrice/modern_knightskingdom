// CLN-13 · one enemy's frame: what it does, where it goes and how it moves, decided each frame from its own state
// (data.mob) and the world's — the frame loop of Enemies.tsx's Enemy, which hands it its own refs, state and setters
// (frame.ts's EnemyFrame). In order: a mounted raider's pace measured for its horse; a fallen one's pieces flung
// apart; one on a wall-walk whose wall has gone, felled; then, outside build mode, the climb (climb.ts), the walk in
// from the road and the flight (movement.ts) each own the frame while they last; otherwise the enemy looks for what it
// has to fight (targeting.ts) and does the first of the chain below that holds — the order is the order it always was
// — then is shouldered apart from its pack, kept to the land and stopped at a shut gate and the keep's walls (as the
// walk in and the flight are too, G-03: holdToTheWalls). Last, its figure is stood where it is and given its clip.
// G-06 · a thief's mark is the store (targeting.ts's storeFor), where he loads up (blows.ts's takeFromStore); struck
// with goods on him, he runs; and a raider at home runs by the road off the map (movement.ts's escape), battering his
// way out when shut in. G-10 · his clips are his arms' (game/combat/fightClips.ts), and a crossbow's shot or a caster's
// spell is drawn before it lands (engage.ts's swingAt): it is let go at the head of a frame he did not swing on at it.
// G-11 · knocked flat (game/combat/knockdown.ts), he does nothing but lie and get up again till he is up.
import * as THREE from 'three';
import { audio } from '@/lib/audio';
import { useGameStore } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { navReachable } from '@/game/navgrid';
import { DEATH_BARK, KIND_LABEL } from '@/game/data/enemies';
import { bark } from '@/game/barks';
import { enemyArms, runClip, stanceClip } from '@/game/combat/fightClips';
import { knockClip, knockLift, stillDown } from '@/game/combat/knockdown';
import { groundUnder, play, stand, type EnemyFrame } from './frame';
import { haulOf, gotAway } from '@/game/plunder';
import { distToPlayer, guardOnMyWall, insideKeep, keepInReach, markFor, nearestFighter, nearestGuard, storeFor, tamInReach } from './targeting';
import { closeIn, dropStaleDraw, engage, rangedProfileOf, swingAt, swingOf, swungInStance, RANGED_RANGE, type Draw } from './engage';
import { batterKeep, blowAtGuard, blowAtTam, blowAtVillager, fireAtPlayer, fireEngine, leaveTheStore, takeFromStore } from './blows';
import {
  breaksAndRuns, escape, flank, flee, keepToLand, makePathStep, paceOf, shoulderApart, stopAtKeepWalls, stopAtShutGates, walkIn,
  walkedIn, wander, FLEE_GONE,
} from './movement';
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
      // G-09 · through the barks' gate: a cooldown on the line, and never twice in one raid
      const line = DEATH_BARK[data.kind];
      if (line) bark('raiderFalls', { line, speaker: KIND_LABEL[data.kind], at: m, raid: data.raid });
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

/** G-06 · how near a store's footprint (or home's middle, with none) a thief comes to take from it */
const STORE_REACH = 1.2;

/** G-06 · A thief struck (below his full health) drops the store and runs with what he has — with a grunt in the
 *  raiders' voice (G-09) — struck with nothing taken yet, he gives up thieving and fights like the rest. */
function struckThief(data: EnemyFrame['data']): void {
  if (!data.thief || data.mob.fleeing || data.hp >= data.maxHp) return;
  if (haulOf(data.carried)) {
    data.mob.fleeing = true;
    bark('raiderStruck', { at: data.mob, raid: data.raid });
  } else data.thief = false;
}

/** The flight, which stands its own figure: a raider at home by the road (escape), battering his way out of the
 *  keep's walls or the player's only when his way OUT is a siege way (keepInReach, as the chain batters; never on the
 *  siege way in he held when he broke), and gone at the world's edge — a thief's haul with him (plunder.ts's gotAway)
 *  — or, with nothing of the player's on him, as soon as he is FLEE_GONE from the player, as every fleeing enemy is
 *  gone elsewhere (flee). Returns whether he is gone. */
function runAway(f: EnemyFrame, st: ReturnType<typeof useGameStore.getState>, dt: number): boolean {
  const { data, path, enemyAtHome } = f;
  const m = data.mob;
  if (data.raid && enemyAtHome) {
    const was = m.state;
    const way = escape(m, path.current, dt);
    const piece = way.out && path.current.siege ? keepInReach(data, st, enemyAtHome).target : null;
    if (piece) {
      // G-10 · battering on: the stance he was in (escape stands him in a chase each frame), so his figure goes on
      // showing his blows (engage.ts's swungInStance), not a fresh stance at rest
      if (was === 'attack') m.state = 'attack';
      swingAt(m, dt, piece, () => batterKeep(data, st, piece));
    }
    else if (way.run()) { gotAway(st, data.carried); f.remove(data.id); return true; }
    if (!haulOf(data.carried) && distToPlayer(m.x, m.z) > FLEE_GONE) { f.remove(data.id); return true; }
  } else if (flee(m, dt) > FLEE_GONE) {
    f.remove(data.id);
    return true;
  }
  holdToTheWalls(f, st);
  stand(f.group.current!, m, groundUnder(f));
  const arms = enemyArms(data);
  play(f, m.state === 'attack' ? stanceClip('attack', arms, swungInStance(m)) : runClip(arms));
  return false;
}

/** A shut gate in its own world, and at home the keep's walls, stop an enemy wherever it went this frame — after the
 *  frame's chain, and (G-03) after the walk in from the road and the flight, which return before it and walked
 *  through both (ROADMAP.md, "a fleeing raider, and one still walking in from the road, pass through the keep's
 *  walls"). */
function holdToTheWalls(f: EnemyFrame, st: ReturnType<typeof useGameStore.getState>): void {
  stopAtShutGates(f.data.mob, st, f.data.world ?? null);
  if (f.enemyAtHome) stopAtKeepWalls(f.data.mob);
}

export function stepEnemy(f: EnemyFrame, rawDt: number): void {
  const { data, path, speed, enemyAtHome } = f;
  const dt = Math.min(rawDt, 0.05);
  const st = useGameStore.getState();
  const g = f.group.current;
  if (!g) return;
  const m = data.mob;
  if (st.paused) return;
  dropStaleDraw(m);

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

  // G-11 · knocked flat, he lies and gets up again and does nothing else meanwhile: no blow, no draw (let go as he went
  // down), no step of his own and no shouldering apart. What moves him is the hit — a blow's knockback, at once; a
  // blast's throw, through his flight (stillDown) — kept to the land and stopped at the walls as any step of his is.
  if (stillDown(m, dt)) {
    if (enemyAtHome) keepToLand(m);
    holdToTheWalls(f, st);
    stand(g, m, (m.elevated ? (m.postY ?? 0) : groundUnder(f)) + knockLift(m.knock!));
    play(f, knockClip(m.knock!, enemyArms(data)));
    return;
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
    // he has walked in (walkedIn: at his own approach point, G-03, or close
    // enough to the homestead), or the player is already near, at
    // which point approaching clears and the normal wander/chase/attack
    // chain below takes over on the next frame. Like the flight just
    // below, it stands its own figure and returns early rather than
    // falling through to the shared tail. G-03 · and once his way in is a
    // siege way that has brought him up against the piece he is to batter
    // (keepInReach), the chain's battering takes over: walking in still,
    // he stood at a shut gate for good and the raid never ended.
    if (m.approaching) {
      if (walkedIn(m, d) || (path.current.siege && keepInReach(data, st, enemyAtHome).target)) {
        m.approaching = false; // close enough — the chain below takes over next frame
      } else {
        walkIn(m, path.current, dt, speed, !!data.raid && enemyAtHome);
        // the same pack-separation nudge the shared tail applies to a
        // chase or an attack — here too, since this returns early
        shoulderApart(data);
        holdToTheWalls(f, st);
        stand(g, m, groundUnder(f));
        play(f, runClip(enemyArms(data)));
        return;
      }
    }
    struckThief(data);
    breaksAndRuns(data, st);
    if (m.fleeing) {
      runAway(f, st, dt);
      return;
    }
    if (m.alertT) m.alertT = Math.max(0, m.alertT - dt);

    // what it has to fight (targeting.ts), looked for in this order every frame
    const keep = keepInReach(data, st, enemyAtHome);
    const guard = nearestGuard(data, enemyAtHome);
    const tam = tamInReach(data);
    const fighter = nearestFighter(data, enemyAtHome);
    const ranged = rangedProfileOf(data);
    // G-10 · a crossbow's shot at a mark (or a caster's spell at the player) is drawn first, to its clip's release
    const drawn = (mark: string, shoots = !!data.ranged): Draw | undefined => (shoots ? { mark, release: swingOf(data).hit } : undefined);
    const store = storeFor(data, st, enemyAtHome);
    const { mark, blocked } = markFor(data, d, guard, tam, fighter, store);
    const besieger = !!data.raid && enemyAtHome;
    const pathStep = makePathStep(path.current, m, dt, besieger);
    // G-02 · a guard, Tam or a villager inside the keep's walls is closed in on by a way round them, as the player is —
    // straight at him, a raider would stand pressed against the stone for good. G-03 · and one shut off from him (the
    // grid's word), behind the player's own walls: straight at him, he walked through the palisades, which stop no enemy
    const walledIn = (p: { x: number; z: number }) => besieger && (insideKeep(st, p.x, p.z) || !navReachable(m.x, m.z, p.x, p.z));
    const wallGuard = guardOnMyWall(m, st);
    const ladder = ladderPull(data, enemyAtHome);
    // G-02 · a raider battering a piece of the keep works out his way to his mark again on its timer all the while
    // (pathStep, its direction unused): a breach elsewhere, the gatehouse opened or his mark come out gives him his
    // way, and he leaves off — not once the piece in front of him is down
    let battering = !m.elevated && !ladder.eligible
      && !!keep.target && keep.d < (store ? store.d : Math.min(d, guard.d)) && !!path.current.siege;
    if (battering) {
      const at = (mark === 'store' && store) || (mark === 'def' && guard.target) || (mark === 'companion' && tam.target)
        || (mark === 'villager' && fighter.target) || playerState;
      pathStep(at.x, at.z);
      battering = !!path.current.siege;
    }

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
          draw: drawn(`def:${wallGuard.id}`),
        });
      } else if (playerReachable < Infinity) {
        engage(m, dt, {
          inReach: d < (ranged ? ranged.range : 1.8),
          face: ranged ? playerState : null,
          blow: () => fireAtPlayer(data, ranged, m.postY ?? 0),
          way: () => ({ nx: (playerState.x - m.x) / (d || 1), nz: (playerState.z - m.z) / (d || 1) }),
          pace: speed,
          draw: drawn('player', !!ranged),
        });
      } else {
        // nobody left to fight up here right now — hold the battlement
        holdBattlement(m, dt);
      }
    } else if (ladder.eligible && ladder.d < CLIMB_RANGE) {
      takeTheLadder(data, ladder.footX, ladder.footZ);
    } else if (ladder.eligible) {
      // make for the ladder's own foot — G-02: by a way round, as he closes
      // in on any mark: a beeline from the keep's side ran him into the
      // very wall the ladder stands against, which now stops him (it went
      // through it before)
      closeIn(m, dt, () => pathStep(ladder.footX, ladder.footZ), speed);
    } else if (battering && keep.target) {
      // (G-02 · only shut out of the keep his mark is in — G-03: or in it, or out from behind the player's own walls —
      // his route a way to a piece to batter)
      const piece = keep.target;
      swingAt(m, dt, piece, () => batterKeep(data, st, piece));
    } else if (store && mark === 'store') {
      // G-06 · at the store, he loads up; on his way, by a way round as to any mark (a siege way when shut off from it,
      // which the battering just above takes) — and with no way to it at all, nor a piece to batter through, he leaves
      // it rather than stand at whatever is in his way for good: for the road with what he has already taken (his load
      // still on his back), or, with nothing, to fight (blows.ts's leaveTheStore). "No way" is the route's own word,
      // given when it was worked out (makePathStep's noWay): read fresh against a route worked out before a gate shut in
      // front of him, it turned him from the store before his route could become the siege way to that gate
      if (store.d < STORE_REACH) swingAt(m, dt, store, () => takeFromStore(data, st));
      else {
        closeIn(m, dt, () => pathStep(store.x, store.z), speed);
        const route = path.current;
        if (route.tx === store.x && route.tz === store.z && route.noWay) leaveTheStore(data, st);
      }
    } else if (guard.target && mark === 'def') {
      const gt = guard.target;
      engage(m, dt, {
        inReach: guard.d < (data.ranged ? RANGED_RANGE : 1.7) && !blocked,
        face: gt,
        blow: () => blowAtGuard(data, st, gt, guard.id, false),
        way: () => (blocked || walledIn(gt) ? pathStep(gt.x, gt.z) : { nx: (gt.x - m.x) / guard.d, nz: (gt.z - m.z) / guard.d }),
        pace: paceOf(data, speed, guard.d),
        draw: drawn(`def:${guard.id}`),
      });
    } else if (tam.target && mark === 'companion') {
      // Wave 25: the guard's shape, one rung weaker — Tam gets fought back
      // at exactly like a sworn defender does
      const tt = tam.target;
      engage(m, dt, {
        inReach: tam.d < (data.ranged ? RANGED_RANGE : 1.7) && !blocked,
        face: tt,
        blow: () => blowAtTam(data, st, tt),
        way: () => (blocked || walledIn(tt) ? pathStep(tt.x, tt.z) : { nx: (tt.x - m.x) / tam.d, nz: (tt.z - m.z) / tam.d }),
        pace: paceOf(data, speed, tam.d),
        draw: drawn('tam'),
      });
    } else if (fighter.target && mark === 'villager') {
      // Wave 21: the same shape again, one rung weaker — a villager who
      // chose to fight gets fought back at
      const vt = fighter.target;
      engage(m, dt, {
        inReach: fighter.d < (data.ranged ? RANGED_RANGE : 1.7) && !blocked,
        face: vt,
        blow: () => blowAtVillager(data, st, vt),
        way: () => (blocked || walledIn(vt) ? pathStep(vt.x, vt.z) : { nx: (vt.x - m.x) / fighter.d, nz: (vt.z - m.z) / fighter.d }),
        pace: paceOf(data, speed, fighter.d),
        draw: drawn(`vil:${vt.id}`),
      });
    } else if (d < (ranged ? ranged.range : 1.8) && !blocked) {
      // held at range rather than closing the last few metres (see the
      // chase just below), so — unlike melee, which already arrives
      // facing its target — a ranged attacker needs its own aim-turn here
      swingAt(m, dt, ranged ? playerState : null, () => fireAtPlayer(data, ranged, 0), drawn('player', !!ranged));
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
    holdToTheWalls(f, st);
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

  play(f, stanceClip(m.state, enemyArms(data), swungInStance(m)));
}
