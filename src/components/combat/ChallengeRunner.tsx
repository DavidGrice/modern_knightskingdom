'use client';
// Wave 43 (B6) — ticks the 3 new challenge-ground mechanics (game/
// challengeModes.ts) and renders their few decorative primitives. Renders
// (almost) nothing but logic — a sibling to ArenaSpawner.tsx's own "steps a
// system, mounts a couple of meshes" shape — mounted unconditionally in
// GameWorld.tsx next to it, cheap: every block below early-returns the
// instant its own mechanic isn't the active one.
//
// Visuals are driven imperatively via refs inside useFrame (position/
// visible/color writes), the same convention Enemies.tsx already uses for
// every mob it renders, rather than routing collection/hit state through
// React re-renders — these leaf-module states aren't Zustand, so nothing
// upstream re-renders on their own mutation anyway.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore, type EnemyKind } from '@/game/combat';
import { playerState } from '@/game/playerState';
import { audio } from '@/lib/audio';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { destinationGroundY } from '../world/TemplateWorld';
import {
  gatherChallengeState, GATHER_TARGET_COUNT, GATHER_PICKUP_RADIUS,
  defendChallengeState, DEFEND_START_HP, DEFEND_DRAIN_PER_SEC, DEFEND_PROXIMITY_RADIUS,
  DEFEND_SPAWN_INTERVAL_S, DEFEND_MAX_LIVE,
  joustChallengeState, joustRingOffsets, JOUST_RING_COUNT, JOUST_RING_RADIUS, JOUST_RING_ACTIVE_MS,
} from '@/game/challengeModes';

type Store = ReturnType<typeof useGameStore.getState>;

const DEFEND_SPAWN_TABLE: EnemyKind[] = ['skeleton', 'bandit'];

function finishJoust(st: Store) {
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

export default function ChallengeRunner() {
  const gatherRefs = useRef<(Mesh | null)[]>([]);
  const joustRefs = useRef<(Mesh | null)[]>([]);
  const defendSpawnTimer = useRef(DEFEND_SPAWN_INTERVAL_S);
  const defendWasActive = useRef(false);

  useFrame((_, dt) => {
    const st = useGameStore.getState();
    if (st.paused) return;
    const now = performance.now();

    // -------------------------------------------------------------------
    // Gather Race
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
          if (Math.hypot(playerState.x - p.x, playerState.z - p.z) < GATHER_PICKUP_RADIUS) {
            p.collected = true;
            audio.play('treasure', 0.7);
          }
        }
        if (allCollected) {
          g.active = false;
          st.addItems({ gold: 25, herb: 4 }, 'grant');
          st.notify('Gather race complete! A forager’s haul awaits.', true);
        }
      }
    }
    for (let i = 0; i < GATHER_TARGET_COUNT; i++) {
      const mesh = gatherRefs.current[i];
      if (!mesh) continue;
      const p = g.points[i];
      const visible = g.active && !!p && !p.collected;
      mesh.visible = visible;
      if (visible && p) mesh.position.set(p.x, destinationGroundY(p.x, p.z) + 0.6, p.z);
    }

    // -------------------------------------------------------------------
    // Defend the Plot
    const d = defendChallengeState;
    if (d.active && !defendWasActive.current) defendSpawnTimer.current = 1.5; // first wave arrives quickly
    defendWasActive.current = d.active;
    if (d.active && d.destId && st.destination !== d.destId) {
      // left the fight — clean up its hostiles immediately (this can be
      // retried on the same ground without `destination` ever changing away
      // and back, so combat.ts's own generic exit-cleanup subscriber alone
      // wouldn't be enough here)
      d.active = false;
      useEnemyStore.getState().removeByWorld(d.destId);
    } else if (d.active && d.destId) {
      const claim = st.claimedWorlds[d.destId];
      if (!claim) {
        d.active = false;
      } else {
        const enemies = useEnemyStore.getState().enemies;
        const live = enemies.filter((e) => e.world === d.destId).length;
        defendSpawnTimer.current -= dt;
        if (defendSpawnTimer.current <= 0 && live < DEFEND_MAX_LIVE) {
          defendSpawnTimer.current = DEFEND_SPAWN_INTERVAL_S;
          const dest = WORLD_DESTINATION_BY_ID[d.destId];
          const kind = DEFEND_SPAWN_TABLE[Math.floor(Math.random() * DEFEND_SPAWN_TABLE.length)];
          const angle = Math.random() * Math.PI * 2;
          const r = dest.radius * 0.85;
          useEnemyStore.getState().spawn(
            kind, dest.origin.x + Math.sin(angle) * r, dest.origin.z + Math.cos(angle) * r,
            false, undefined, false, false, 1, false, d.destId,
          );
        }
        for (const e of enemies) {
          if (e.world !== d.destId) continue;
          if (Math.hypot(e.mob.x - claim.x, e.mob.z - claim.z) < DEFEND_PROXIMITY_RADIUS) {
            d.plotHp -= DEFEND_DRAIN_PER_SEC * dt;
          }
        }
        if (d.plotHp <= 0) {
          d.plotHp = 0;
          d.active = false;
          useEnemyStore.getState().removeByWorld(d.destId);
          st.notify('The banner falls — the plot could not be held.');
        } else if (now >= d.deadline) {
          d.active = false;
          useEnemyStore.getState().removeByWorld(d.destId);
          const frac = d.plotHp / DEFEND_START_HP;
          const bonus = Math.round(30 * frac);
          const xp = Math.round(50 * frac);
          st.addItems({ gold: bonus }, 'grant');
          st.addXp('combat', xp);
          st.notify(`The banner holds! +${bonus} gold for your defense.`, true);
        }
      }
    }

    // -------------------------------------------------------------------
    // Joust Gauntlet
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
        const hit = ring && Math.hypot(playerState.x - ring.x, playerState.z - ring.z) < JOUST_RING_RADIUS;
        if (hit) {
          const precision = Math.max(0, 1 - elapsed / JOUST_RING_ACTIVE_MS);
          j.hits += 1;
          j.precisionSum += precision;
          audio.play('thud', 0.7);
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
    const jRings = j.destId ? joustRingOffsets(j.destId) : [];
    for (let i = 0; i < JOUST_RING_COUNT; i++) {
      const mesh = joustRefs.current[i];
      if (!mesh) continue;
      const ring = jRings[i];
      const visible = j.active && !!ring;
      mesh.visible = visible;
      if (visible && ring) {
        mesh.position.set(ring.x, destinationGroundY(ring.x, ring.z) + 1.2, ring.z);
        const mat = mesh.material as MeshBasicMaterial;
        mat.color.set(i === j.ringIndex ? '#ffcf4d' : i < j.ringIndex ? '#5fae52' : '#8a5a2c');
      }
    }
  });

  return (
    <group>
      {Array.from({ length: GATHER_TARGET_COUNT }).map((_, i) => (
        <mesh key={`gather${i}`} ref={(el) => { gatherRefs.current[i] = el; }} visible={false}>
          <torusGeometry args={[0.6, 0.18, 8, 20]} />
          <meshBasicMaterial color="#5fd6ff" toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: JOUST_RING_COUNT }).map((_, i) => (
        <mesh key={`joust${i}`} ref={(el) => { joustRefs.current[i] = el; }} visible={false} rotation-x={Math.PI / 2}>
          <torusGeometry args={[JOUST_RING_RADIUS, 0.2, 8, 24]} />
          <meshBasicMaterial color="#8a5a2c" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
