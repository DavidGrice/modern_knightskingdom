'use client';
// The enemies on the field: each one's figure (EnemyFigure.tsx), moved every frame by its AI (game/enemyAi/), and
// the once-a-second directors (game/directors/) that bring them: skeletons at night, raids at dusk, the Sealed
// Crypt's rooms, Cedric's camp guards. Defeated minifigs pop apart into their parts, LEGO-style.
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEnemyStore, type EnemyData } from '@/game/combat';
import { useGameStore } from '@/game/store/gameStore';
import { measureHitBoxes } from '@/lib/minifigRig';
import { registerHitbox, unregisterHitbox } from '@/game/hitbox';
import HealthBillboard from './HealthBillboard';
import type { RiggedMinifig } from '@/lib/minifigRig';
import { maintainNav } from '@/game/directors/navMaintenance';
import { dungeonDirector } from '@/game/directors/dungeonDirector';
import { campGuardDirector } from '@/game/directors/campGuards';
import { nightSkeletonDirector } from '@/game/directors/nightSkeletons';
import { pruneLadderClimbers, raidDirector } from '@/game/directors/raidDirector';
import { campGuardTimer, directorTick, raidActive, raidCooldown, raidLost, skelTimer } from '@/game/directors/state';
import { stepEnemy } from '@/game/enemyAi/step';
import { speedOf } from '@/game/enemyAi/movement';
import EnemyFigure from './EnemyFigure';

function Enemy({ data }: { data: EnemyData }) {
  const group = useRef<THREE.Group>(null);
  // Where the group is first put: where he stands when his figure is mounted
  // (his spawn point, as a rule). From the first frame on, the frame loop
  // below places him, height and all — so this is handed over as the SAME
  // array on every render. react-three-fiber applies a prop again whenever
  // its array differs, element by element, from the last render's, so a
  // fresh `[data.mob.x, 0, data.mob.z]` said "height 0" to any raider who had
  // moved since he was last rendered. While the frame loop places him that
  // never shows: it has the last word before a frame is drawn. It showed
  // whenever the loop stood down. Pausing renders every raider and stops his
  // loop — one on a wall-walk was drawn on the ground beneath it, one on a
  // hill inside it. And a dying raider is no longer placed while he flies
  // apart, so a render in that second dropped him to height 0 where he fell.
  const mountedAt = useRef<[number, number, number]>([data.mob.x, 0, data.mob.z]).current;
  const rigRef = useRef<RiggedMinifig | null>(null);
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  const scatter = useRef<Map<string, THREE.Vector3> | null>(null);
  // this mob's current route: waypoints, which one we are heading for, when
  // to recompute, and where the target was when we last did
  const path = useRef({ pts: [] as { x: number; z: number }[], i: 0, t: 0, tx: 0, tz: 0 });
  const [clip, setClip] = useState('anim_c_walk');
  // Wave 36 (A3): how fast a mounted raider is ACTUALLY travelling, fed to
  // its horse's own walk cycle — measured from real displacement rather than
  // read off any one behaviour branch, same K54 technique Defenders.tsx uses
  // for its own mounted patrols (chase/approach/flee/wander all move `m.x/z`
  // by their own rules, and all of them should make the horse walk). A no-op
  // ref/state pair for every other kind (its frame, game/enemyAi/step.ts,
  // updates it for a rider alone).
  const pace = useRef({ x: data.mob.x, z: data.mob.z, v: -1 });
  const [ridePace, setRidePace] = useState(0);
  const remove = useEnemyStore((s) => s.remove);
  // Wave 18 #5 bugfix: THIS enemy's own home-ness, not the player's current
  // `st.destination` — Enemies() now keeps home enemies mounted even while
  // the player is elsewhere (see its own comment), so every branch of its
  // frame (game/enemyAi/) that used to read the player's global destination as a stand-in for
  // "is this mob at home" has to ask about the mob instead, or a home
  // raider ticking while the player is away would wrongly read itself as
  // being at whatever destination the player happens to be visiting.
  const enemyAtHome = (data.world ?? null) === null;

  // drop this mob's hit volumes when it leaves the field, or a dead id keeps
  // soaking bolts fired through the empty space where it used to stand
  useEffect(() => () => unregisterHitbox(String(data.id)), [data.id]);
  const speed = speedOf(data);

  useFrame((_, rawDt) => stepEnemy({ data, group, rigRef, scatter, path, clip, setClip, pace, setRidePace, remove, enemyAtHome, speed }, rawDt));

  return (
    <group ref={group} position={mountedAt}>
      <EnemyFigure
        data={data}
        clip={clip}
        ridePace={ridePace}
        rig={rig}
        onReady={(r) => {
          rigRef.current = r;
          setRig(r);
          // publish this donor's REAL per-part volumes for ranged combat
          registerHitbox(String(data.id), measureHitBoxes(r));
        }}
      />
    </group>
  );
}

export default function Enemies() {
  const allEnemies = useEnemyStore((s) => s.enemies);
  const destination = useGameStore((s) => s.destination);
  // instance-separation doctrine (Phase 23), Stage 0a: an enemy belongs to
  // wherever it was spawned (EnemyData.world, absent/null = home) — same
  // filter Buildings/ResourceNodes/Villagers/Npc already apply. Without it a
  // home raid kept rendering (and being fought) at whatever destination the
  // player travelled to mid-fight, and a dungeon/arena/Cedric-camp spawn
  // bled into every other world too.
  //
  // Wave 18 #5 bugfix: home-world enemies (world null) are ALWAYS included
  // here now, regardless of `destination` — not just when destination is
  // also null. A raid's own combatants are the one thing that must keep
  // moving/fighting/dying while the player is away (PROJECT_CONTEXT.md's
  // "Instance separation" note; RaiderRam/Emplacements already stay
  // unconditionally mounted for the identical reason). This is safe the
  // same way those two are: home sits near the origin while every
  // destination sits thousands of units away in the same shared coordinate
  // space, so a mounted home raider is never actually in view once the
  // player has travelled elsewhere — nothing extra to hide. Only home gets
  // this treatment; a DIFFERENT destination's own enemies (dungeon rooms,
  // the arena, Cedric's camp) still unmount and pause the instant the
  // player leaves THAT world, which is what they're supposed to do.
  const enemies = allEnemies.filter((e) => {
    const w = e.world ?? null;
    return w === null || w === (destination ?? null);
  });
  const spawn = useEnemyStore((s) => s.spawn);

  // the directors' timers and the raid's flags are module state (game/directors/state.ts), not refs of this
  // component: a raid outlives the scene's unmount behind Options or Stats
  useFrame((_, dt) => {
    directorTick.current -= dt;
    if (directorTick.current > 0) return;
    directorTick.current = 1; // 1 Hz is plenty for spawning decisions
    // the directors (game/directors/), in the order this tick always ran them: the navigation grids, then — with
    // the game running — the siege ladder's freed slots, the Sealed Crypt (which, while the player is inside, is all
    // there is), Cedric's camp guards, the night's skeletons and the dusk raid
    maintainNav();
    const st = useGameStore.getState();
    if (st.paused || !st.character) return;
    const { enemies: list } = useEnemyStore.getState();
    pruneLadderClimbers(list);
    if (dungeonDirector(st)) return; // skip the homestead-only spawn systems below entirely while inside
    campGuardDirector(st, list, spawn, campGuardTimer);
    nightSkeletonDirector(st, list, spawn, skelTimer);
    raidDirector(st, list, spawn, raidCooldown, raidActive, raidLost);
  });

  return (
    <>
      {enemies.map((e) => <Enemy key={e.id} data={e} />)}
      {/* I39 · at-a-glance health, in the world above each wounded foe */}
      {enemies.map((e) => <HealthBillboard key={`hb${e.id}`} data={e} />)}
    </>
  );
}
