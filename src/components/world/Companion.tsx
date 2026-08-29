'use client';
// Wave 25 — Tam, the companion squire: a real, Agent-driven figure once
// recruited (game/store's companionRecruited), following the SAME "renders
// everywhere, unconditionally" convention MountedHorse.tsx/Wildlife.tsx's
// tamed falcon already established — checked live, not assumed: GameWorld.tsx
// mounts both with no `!destination` guard, unlike Terrain/Signpost/Merchant/
// Road/StarterVillage, which are all explicitly home-only-gated at the same
// call site. See this file's own mount site in GameWorld.tsx.
//
// Movement/animation splice below is Npc.tsx's CourtNpc, trimmed to what Tam
// actually needs: he has no fixed home spot and no day/night schedule to fall
// back to when idle — before recruitment this component renders nothing at
// all (the `if (!recruited) return null` below), so there is no "static NPC
// standing at a fixed x/z" case to cover the way Npc.tsx's own `!schedule`
// branch does.
//
// WEAPON RENDERING — a real, verified deviation from this wave's own
// research pass. See game/data/companion.ts's header for the full argument;
// in short, `minifiggenericgood00`'s own molded halberd+shield are
// 'prop'-kind parts that float once rehangArm re-hangs the arm holding them
// (the exact bug Enemies.tsx's own 2026-07-28 comment documents finding and
// fixing for Gilbert). Every armed figure in this game already avoids that by
// keeping `keepProps` false (RiggedFigure's own default) and wearing a REAL,
// separately-portalled weapon instead — Tam does the same here, the identical
// sword+shield loadout Defenders.tsx renders for an ordinary sworn defender.
import { useRef, useState } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import RiggedFigure from '../character/RiggedFigure';
import { ArmShield, HeldSword } from '../character/Equipment';
import type { RiggedMinifig } from '@/lib/minifigRig';
import { agentManager } from '@/ai/core/AgentManager';
import { stepLocomotion } from '@/ai/core/Locomotion';
import { COMPANION_ID, TAM_CONFIG } from '@/game/data/companion';
import { registerCompanionCombat } from '@/game/companion';
import { destinationGroundY, homeGroundY } from './TemplateWorld';

const MOVE_CLIPS = new Set(['anim_c_walk', 'anim_r_restpose']);

export default function Companion() {
  const recruited = useGameStore((s) => s.companionRecruited);
  const [clip, setClip] = useState('anim_r_restpose');
  const clipRef = useRef(clip);
  clipRef.current = clip;
  const [loop, setLoop] = useState(true);
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const agent = agentManager.get(COMPANION_ID);
    if (!agent) return;
    // lazily creates Tam's combat record on the first frame he's actually
    // rendered — same "register on the render component that owns this
    // entity" convention Villagers.tsx's own useMemo(() =>
    // registerVillagerCombat(...)) uses, just a plain per-frame idempotent
    // read here since this component (unlike a per-villager VillagerFigure)
    // stays mounted across recruitment rather than mounting fresh at it.
    const ccs = registerCompanionCombat(COMPANION_ID);

    // Wave 25 verification fix — downed: hide and freeze in place until the
    // recovery timer clears, mirroring Villagers.tsx's/Defenders.tsx's own
    // `state === 'downed'` early-return exactly (same wall-clock `Date.now()`
    // comparison against `downedUntil`, stamped from `Date.now()` at the hit
    // that downed him, in Enemies.tsx). This component is the one place Tam's
    // rig is ever driven, so — unlike a roster villager/defender, each with
    // its own render component — there was previously no reader anywhere that
    // ever put `ccs.state` back to 'ok': he stayed frozen in 'downed' for the
    // rest of the session the first time he lost a real fight. Checked before
    // the Agent-driven MOVE_TO/PLAY_ANIM/FACE branches below, same as both of
    // those files check it before any of their own movement/attack logic.
    if (ccs.state === 'downed') {
      if (Date.now() >= ccs.downedUntil) { ccs.state = 'ok'; ccs.hp = ccs.maxHp; }
      else { g.visible = false; return; }
    }
    g.visible = true;

    const intent = agent.intent;
    const wantLoop = intent && intent.type === 'PLAY_ANIM' ? intent.loop : MOVE_CLIPS.has(clipRef.current);
    if (loop !== wantLoop) setLoop(wantLoop);

    const gy = (agent.region ?? null) === null
      ? homeGroundY(agent.position.x, agent.position.z)
      : destinationGroundY(agent.position.x, agent.position.z);

    if (intent && intent.type === 'MOVE_TO') {
      stepLocomotion(agent, dt);
      g.position.set(agent.position.x, gy, agent.position.z);
      g.rotation.y = agent.yaw;
      if (MOVE_CLIPS.has(clipRef.current)) {
        const wantClip = agent.bb.movement.status === 'moving' ? 'anim_c_walk' : 'anim_r_restpose';
        if (clipRef.current !== wantClip) setClip(wantClip);
      }
      return;
    }
    if (intent && intent.type === 'PLAY_ANIM') {
      g.position.set(agent.position.x, gy, agent.position.z);
      g.rotation.y = agent.yaw;
      if (clipRef.current !== intent.clip) setClip(intent.clip);
      return;
    }
    if (intent && intent.type === 'FACE') {
      stepLocomotion(agent, dt);
      g.position.set(agent.position.x, gy, agent.position.z);
      g.rotation.y = agent.yaw;
      if (clipRef.current !== 'anim_r_restpose') setClip('anim_r_restpose');
      return;
    }
    // No intent — a brief no-winner reasoner tick (both follow_leader and
    // assist_leader gated off, e.g. while downed) or the one frame before
    // companionSync.ts's own spawn call has run. Hold last position/anim
    // rather than snapping anywhere, the same "no winner leaves a clean,
    // stationary signal" contract Reasoner.ts's own runReasoner documents.
    g.position.set(agent.position.x, gy, agent.position.z);
    g.rotation.y = agent.yaw;
  });

  if (!recruited) return null;

  return (
    <group ref={group}>
      <RiggedFigure
        config={TAM_CONFIG}
        height={1.7}
        clip={clip}
        loop={loop}
        onClipEnd={() => setClip('anim_r_restpose')}
        onReady={setRig}
      />
      {rig && createPortal(<HeldSword side={-1} />, rig.joints.rightarm)}
      {rig && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
    </group>
  );
}
