'use client';
// The royal court: every NPC idles on the original rest pose and answers a
// conversation with a wave (regal for royals). Court members (anyone gated
// behind revealAfterQuest — the always-present starter farmers aren't part
// of this) also keep a simple day/night schedule (Phase 15): they drift from
// their usual daytime spot to a small gathering point outside the Keep at
// night and back at dawn, a plain position lerp rather than real pathfinding
// — enough to read as "they went home" without needing a navmesh.
import { Suspense, useMemo, useRef, useState } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import RiggedFigure from '../character/RiggedFigure';
import { ResourceProp } from '../character/Equipment';
import type { RiggedMinifig } from '@/lib/minifigRig';
import type { ItemId } from '@/game/types';
import { NPCS, isNpcRevealed, type NpcDef } from '@/game/data/npcs';
import { NIGHT_GATHER_SPOT } from '@/game/data/world';
import { worldEnv } from '@/game/env';
import { navSteer } from '@/game/navgrid';
import { registerNpcMob } from '@/game/npcMobs';
import { destinationGroundY, homeGroundY } from './TemplateWorld';
import { agentManager } from '@/ai/core/AgentManager';
import { stepLocomotion } from '@/ai/core/Locomotion';
import { SCOPED_DESTINATIONS, type WorldDestination } from '@/game/data/worlds';

const MOVE_CLIPS = new Set(['anim_c_walk', 'anim_r_restpose']);

// origin-offset for an instance rendered inside DestinationScope.tsx's own
// group (already translated by dest.origin) — the default export below
// passes nothing and keeps every non-scoped destination's absolute-position
// behavior byte-for-byte. See §2 of the Stage 1 plan: every OTHER value in
// this file (destinationGroundY's x/z args, mob.x/mob.z, agent.position) stays
// absolute — only the final g.position.set(...)/JSX position write is local.
const ZERO_OFFSET = { x: 0, z: 0 };

function CourtNpc({ def, index, originOffset = ZERO_OFFSET }: { def: NpcDef; index: number; originOffset?: { x: number; z: number } }) {
  const greetSeq = useGameStore((s) => s.npcGreetSeq);
  const greetId = useGameStore((s) => s.npcGreetId);
  const greetClip = useGameStore((s) => s.npcGreetClip);
  const seen = useRef(0);
  const [clip, setClip] = useState('anim_r_restpose');
  const clipRef = useRef(clip);
  clipRef.current = clip;
  const [loop, setLoop] = useState(true);
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  // mirrors agent.bb.carrying every frame — see Villagers.tsx's identical
  // pattern (iteration 3.5) for why this needs its own render-visible copy
  // rather than reading the useFrame-local `agent` from the JSX below
  const [carrying, setCarrying] = useState<{ resource: ItemId; amount: number } | null>(null);
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
    mob.clip = clipRef.current;

    // Phase 3, iteration 3.4 — an Agent with an active MOVE_TO/MOVE_TO_ANCHOR
    // Intent takes over movement entirely, checked FIRST, before the
    // `!schedule` early-return below. Mirrors Villagers.tsx's iteration 3.3
    // splice, adapted to this file's own shape: one navSteer call site (not
    // seven), no offset on g.rotation.y — §3.2's rig-offset note is explicit
    // that Npc.tsx keeps none, unlike Villagers.tsx's +Math.PI, so
    // Locomotion's universal agent.yaw is applied as-is here.
    //
    // Deliberately NOT gated behind `schedule`: an agent+active-intent check
    // should be the only gate, the same as Villagers.tsx's splice doesn't
    // care about `job`. npcSync.ts (this same iteration) only ever spawns an
    // Agent for a scheduled NPC today, so in practice this is equivalent —
    // but placing the check after `!schedule`'s early return would silently
    // stop working the moment anything (a future cutscene, a one-off quest
    // beat) gives a STATIC NPC a real intent without also making them
    // "scheduled." Caught this the hard way: the first version of this
    // splice sat after the early return, and its own smoke test — which
    // manually spawns an Agent for the always-static farmer_alric, since
    // zero real NPCs currently satisfy scheduledCourtNpcs at all — showed
    // zero movement despite a real MOVE_TO intent, because the early return
    // fired first every frame. Nothing issues a real Intent yet regardless
    // (phase 5's reasoner is the first real writer), so this is inert today.
    const agent = agentManager.get(def.id);
    const intent = agent?.intent;
    // Phase 3, iteration 3.5 — resynced unconditionally, same reasoning as
    // Villagers.tsx: covers both entering AND leaving a PLAY_ANIM intent in
    // one place, rather than only inside the branch below. Outside PLAY_ANIM,
    // `loop` keeps exactly this file's original clip-derived rule (walk/
    // restpose loop, anything else — greet waves, a future PLAY_ANIM one-shot
    // — plays once), just moved from an inline JSX expression into a synced
    // field so intent.loop can override it.
    const wantLoop = agent && intent && intent.type === 'PLAY_ANIM' ? intent.loop : MOVE_CLIPS.has(clipRef.current);
    if (loop !== wantLoop) setLoop(wantLoop);
    const wantCarrying = agent?.bb.carrying ?? null;
    if (carrying !== wantCarrying) setCarrying(wantCarrying);
    if (agent && intent && (intent.type === 'MOVE_TO' || intent.type === 'MOVE_TO_ANCHOR')) {
      const loc = pos.current;
      if (Math.hypot(loc.x - agent.position.x, loc.z - agent.position.z) > 6) {
        loc.x = agent.position.x;
        loc.z = agent.position.z;
      }
      stepLocomotion(agent, dt);
      loc.x = agent.position.x;
      loc.z = agent.position.z;
      yaw.current = agent.yaw;
      // Wave 31 · a real Agent only ever exists for a SCHEDULED court NPC
      // (npcSync.ts's own syncNpcAgents reads scheduledCourtNpcs, which
      // requires `!def.world`), so this branch — and the PLAY_ANIM/FACE
      // branches below it — are provably home-only. homeGroundY, not the
      // full ternary Villagers.tsx needs.
      g.position.set(loc.x - originOffset.x, homeGroundY(loc.x, loc.z), loc.z - originOffset.z);
      g.rotation.y = yaw.current;
      mob.x = loc.x;
      mob.z = loc.z;
      if (MOVE_CLIPS.has(clipRef.current)) {
        const wantClip = agent.bb.movement.status === 'moving' ? 'anim_c_walk' : 'anim_r_restpose';
        if (clipRef.current !== wantClip) setClip(wantClip);
      }
      return;
    }

    // Phase 3, iteration 3.5 — PLAY_ANIM: hold position, play whatever clip
    // the intent names. Same unconditional agent+intent gate as the
    // MOVE_TO/MOVE_TO_ANCHOR branch above, for the same reason (see its own
    // comment on why this can't sit behind `!schedule`).
    if (agent && intent && intent.type === 'PLAY_ANIM') {
      const loc = pos.current;
      loc.x = agent.position.x;
      loc.z = agent.position.z;
      yaw.current = agent.yaw;
      g.position.set(loc.x - originOffset.x, homeGroundY(loc.x, loc.z), loc.z - originOffset.z);
      g.rotation.y = yaw.current;
      mob.x = loc.x;
      mob.z = loc.z;
      if (clipRef.current !== intent.clip) setClip(intent.clip);
      return;
    }

    // Phase 3, iteration 3.7 — FACE: a real gap found verifying the full
    // intent lifecycle in Villagers.tsx (see its own comment on why), fixed
    // identically here for parity — `stepLocomotion` already lerps yaw
    // without moving for this intent, no renderer diverted to it before now.
    if (agent && intent && intent.type === 'FACE') {
      stepLocomotion(agent, dt);
      const loc = pos.current;
      loc.x = agent.position.x;
      loc.z = agent.position.z;
      yaw.current = agent.yaw;
      g.position.set(loc.x - originOffset.x, homeGroundY(loc.x, loc.z), loc.z - originOffset.z);
      g.rotation.y = yaw.current;
      mob.x = loc.x;
      mob.z = loc.z;
      if (clipRef.current !== 'anim_r_restpose') setClip('anim_r_restpose');
      return;
    }

    if (!schedule) {
      // residents stand on their bake's real terrain (these hillside scenes
      // vary meters in relief); a home NPC now reads the homestead's own
      // terrain regions the same way (Wave 31 — previously a hardcoded 0).
      // destinationGroundY(def.x, def.z)/homeGroundY(def.x, def.z) stay the
      // full ABSOLUTE value — see this file's own ZERO_OFFSET comment — only
      // the final position.set write below is shifted into this group's
      // local (origin-offset) space.
      const gy = def.world ? destinationGroundY(def.x, def.z) : homeGroundY(def.x, def.z);
      g.position.set(def.x - originOffset.x, gy, def.z - originOffset.z);
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
    // reachable only for home NPCs (schedule requires !def.world, so
    // originOffset is always ZERO_OFFSET here today) — offset-subtracted
    // anyway for the same defensive-parity reason as the other three
    // useFrame branches above. homeGroundY, not the full ternary, for the
    // same home-only reason those branches use it.
    g.position.set(p.x - originOffset.x, homeGroundY(p.x, p.z), p.z - originOffset.z);
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
    <group ref={group} position={[def.x - originOffset.x, 0, def.z - originOffset.z]} rotation-y={def.yaw}>
      <RiggedFigure
        config={def.config}
        height={def.id === 'king' ? 1.85 : 1.75}
        // court NPCs keep their molded regalia/arms — the crown, the goblet,
        // Richard's spear are part of who they are. The village folk do not:
        // see NpcDef.keepProps for why that also fixed their rigs.
        keepProps={def.keepProps !== false}
        // Bugfix (2026-08-19): every NpcDef here is a real, interactive,
        // quest-giving court member (lines/sideQuests are mandatory fields —
        // see NpcDef) — never cull one out of view for a performance
        // optimization meant for ambient crowds. See RiggedFigure's own doc
        // comment on `lodExempt`.
        lodExempt
        clip={clip}
        loop={loop}
        onClipEnd={() => setClip('anim_r_restpose')}
        onReady={setRig}
      />
      {rig && carrying && createPortal(<ResourceProp resource={carrying.resource} />, rig.joints.rightarm)}
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
  // Stage 1 (2026-08-20): SCOPED_DESTINATIONS' own court NPCs now render
  // through DestinationCourtNpcs below instead, so this stops double-
  // rendering them — every other world (including "no destination" = home)
  // is completely unaffected, since SCOPED_DESTINATIONS never contains null.
  const revealed = NPCS.filter(
    (n) => isNpcRevealed(n, completedQuests) && (n.world ?? null) === (destination ?? null)
      && !villagers.some((v) => v.id === n.id) && !SCOPED_DESTINATIONS.has(n.world ?? ''),
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

/** Stage 1 (scene-isolation rearchitecture, 2026-08-20) · same revealed-NPC
 *  filter as the default export above, restricted to one SCOPED_DESTINATIONS
 *  member and rendered with `dest.origin` subtracted at the final position
 *  write in each — meant to be mounted inside DestinationScope.tsx's own
 *  origin-offset <group>, so the same absolute stored `def.x`/`def.z` lands
 *  in the right local spot. `villagers` exclusion kept even though no
 *  villager currently has `world: dest.id` (Villagers.tsx has nothing to
 *  move for Stage 1 — confirmed empty, not assumed) — the same future-proof
 *  reasoning as npcs.ts's Alric/Beda recruitment carve-out in the default
 *  export. */
export function DestinationCourtNpcs({ dest }: { dest: WorldDestination }) {
  const completedQuests = useGameStore((s) => s.completedQuests);
  const villagers = useGameStore((s) => s.villagers);
  const revealed = NPCS.filter(
    (n) => isNpcRevealed(n, completedQuests) && n.world === dest.id && !villagers.some((v) => v.id === n.id),
  );
  return (
    <Suspense fallback={null}>
      {revealed.map((n) => (
        <CourtNpc key={n.id} def={n} index={NPCS.findIndex((x) => x.id === n.id)} originOffset={dest.origin} />
      ))}
    </Suspense>
  );
}
