'use client';
// The royal court: every NPC idles on the original rest pose and answers a
// conversation with a wave (regal for royals). Court members (anyone gated
// behind revealAfterQuest — the always-present starter farmers aren't part
// of this) also keep a simple day/night schedule (Phase 15): they drift from
// their usual daytime spot to a small gathering point outside the Keep at
// night and back at dawn, a plain position lerp rather than real pathfinding
// — enough to read as "they went home" without needing a navmesh.
import { Suspense, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import RiggedFigure from '../character/RiggedFigure';
import { NPCS, isNpcRevealed, type NpcDef } from '@/game/data/npcs';
import { NIGHT_GATHER_SPOT } from '@/game/data/world';
import { worldEnv } from '@/game/env';
import { navSteer } from '@/game/navgrid';
import { registerNpcMob } from '@/game/npcMobs';
import { destinationGroundY } from './TemplateWorld';

const MOVE_CLIPS = new Set(['anim_c_walk', 'anim_r_restpose']);

function CourtNpc({ def, index }: { def: NpcDef; index: number }) {
  const greetSeq = useGameStore((s) => s.npcGreetSeq);
  const greetId = useGameStore((s) => s.npcGreetId);
  const greetClip = useGameStore((s) => s.npcGreetClip);
  const seen = useRef(0);
  const [clip, setClip] = useState('anim_r_restpose');
  const clipRef = useRef(clip);
  clipRef.current = clip;
  const group = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(def.x, 0, def.z));
  const yaw = useRef(def.yaw);
  const mob = useMemo(() => registerNpcMob(def.id, def.x, def.z), [def.id, def.x, def.z]);

  const nightSpot = useMemo(() => {
    const a = (index / 5) * Math.PI * 2;
    return { x: NIGHT_GATHER_SPOT.x + Math.cos(a) * 2.6, z: NIGHT_GATHER_SPOT.z + Math.sin(a) * 2.6 };
  }, [index]);
  // starter farmers (Alric/Beda) stay put; instance residents (Phase 20 —
  // anyone with a `world`) hold court at their own castle/grounds rather
  // than drifting toward the homestead Keep's night-gathering spot,
  // which is a thousand units away in another realm
  const schedule = !!def.revealAfterQuest && !def.world;

  useFrame((_, dt) => {
    if (greetSeq !== seen.current) {
      seen.current = greetSeq;
      if (greetId === def.id) {
        setClip(greetClip ?? (def.id === 'king' || def.id === 'queen' ? 'anim_r_regalwave' : 'anim_r_greet1'));
      }
    }
    const g = group.current;
    if (!g) return;
    if (!schedule) {
      // residents stand on their bake's real terrain (these hillside scenes
      // vary meters in relief); home NPCs stay on the flat meadow at y=0
      const gy = def.world ? destinationGroundY(def.x, def.z) : 0;
      g.position.set(def.x, gy, def.z);
      mob.x = def.x; mob.z = def.z;
      return;
    }
    const night = worldEnv.night > 0.6;
    const tx = night ? nightSpot.x : def.x;
    const tz = night ? nightSpot.z : def.z;
    const p = pos.current;
    // court NPCs cross the homestead to reach the night gathering spot, so
    // they route around structures like everyone else (game/navgrid.ts).
    // This is an eased lerp rather than a constant-speed walk, so the routed
    // unit vector is scaled by the remaining distance to keep the same feel.
    const { nx, nz, dist } = navSteer(p, tx, tz, dt);
    const dx = nx * dist;
    const dz = nz * dist;
    const moving = dist > 0.08;
    p.x += dx * Math.min(1, dt * 0.15);
    p.z += dz * Math.min(1, dt * 0.15);
    g.position.set(p.x, 0, p.z);
    mob.x = p.x;
    mob.z = p.z;
    // only steer the walk/idle animation when not mid-greet — a wave in
    // progress plays out and settles back to restpose on its own
    if (MOVE_CLIPS.has(clipRef.current)) {
      if (moving) {
        const desired = Math.atan2(-dx, -dz);
        let diff = desired - yaw.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        yaw.current += diff * Math.min(1, dt * 3);
        g.rotation.y = yaw.current;
        if (clipRef.current !== 'anim_c_walk') setClip('anim_c_walk');
      } else if (clipRef.current !== 'anim_r_restpose') {
        setClip('anim_r_restpose');
      }
    }
  });

  return (
    <group ref={group} position={[def.x, 0, def.z]} rotation-y={def.yaw}>
      <RiggedFigure
        config={def.config}
        height={def.id === 'king' ? 1.85 : 1.75}
        // court NPCs keep their molded regalia/arms — the crown, the goblet,
        // Richard's spear are part of who they are. The village folk do not:
        // see NpcDef.keepProps for why that also fixed their rigs.
        keepProps={def.keepProps !== false}
        clip={clip}
        loop={clip === 'anim_r_restpose' || clip === 'anim_c_walk'}
        onClipEnd={() => setClip('anim_r_restpose')}
      />
    </group>
  );
}

export default function Npc() {
  const completedQuests = useGameStore((s) => s.completedQuests);
  const destination = useGameStore((s) => s.destination);
  const villagers = useGameStore((s) => s.villagers);
  // Phase 20 (Kingdom of Instances): an NPC renders only in the place they
  // reside — homestead NPCs when home, instance residents when visiting
  // their world. (Their far-away coordinates would already fail every
  // interact-distance check, so this is presence, not just interactability.)
  // Alric & Beda (2026-07-20): once recruited onto the roster (their
  // Villager id matches their NpcDef id), they're a real villager now —
  // Villagers.tsx renders them, not this static flavor figure.
  const revealed = NPCS.filter(
    (n) => isNpcRevealed(n, completedQuests) && (n.world ?? null) === (destination ?? null)
      && !villagers.some((v) => v.id === n.id),
  );
  return (
    <Suspense fallback={null}>
      {/* index is each NPC's stable slot in the full roster, not their
          position among only the ones revealed so far — otherwise a later
          arrival would reshuffle everyone else's night-gathering spot */}
      {revealed.map((n) => (
        <CourtNpc key={n.id} def={n} index={NPCS.findIndex((x) => x.id === n.id)} />
      ))}
    </Suspense>
  );
}
