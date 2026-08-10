'use client';
// The player's own minifig, visible in third-person mode. Picks clips from
// movement (idle/walk/run), gathering (swing) and emotes; owned arms show
// as real equipment on the rig.
import { useRef, useState } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import RiggedFigure from '../character/RiggedFigure';
import { HeldSword, HeldHalberd, HeldSpear, ArmShield, HeldHelmet, Chestplate } from '../character/Equipment';
import type { RiggedMinifig } from '@/lib/minifigRig';
import { playerState } from './PlayerController';
import { activeMelee, combatState, type MeleeWeaponId } from '@/game/combat';

export default function PlayerAvatar() {
  const character = useGameStore((s) => s.character);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const emote = useGameStore((s) => s.emote);
  const holder = useRef<THREE.Group>(null);
  const [clip, setClip] = useState('anim_r_restpose');
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  const hasSword = useGameStore((s) => (s.inventory.sword ?? 0) > 0);
  const hasShield = useGameStore((s) => (s.inventory.shield ?? 0) > 0);
  // Wave 7 · third person shows what you have READIED, not just "a sword if
  // you own one" — otherwise a halberd wielder swings a sword out here while
  // the first-person view (and the damage) say polearm.
  const [meleeTool, setMeleeTool] = useState<MeleeWeaponId>('sword');
  const hasHelmet = useGameStore((s) => (s.inventory.helmet ?? 0) > 0);
  const hasChestplate = useGameStore((s) => (s.inventory.chestplate ?? 0) > 0);
  const emoteSeq = useRef(0);
  const emoteActive = useRef(false);

  useFrame(() => {
    const g = holder.current;
    if (g) {
      g.visible = !playerState.riding; // MountedHorse.tsx shows the seated rider instead
      g.position.set(playerState.x, playerState.y, playerState.z);
      g.rotation.y = playerState.yaw + Math.PI; // model faces +Z; movement forward is -Z
    }
    // cheap store read, and setState only on an actual swap — same
    // "compare-then-set" shape the clip selection below already uses
    const m = activeMelee();
    if (m !== meleeTool) setMeleeTool(m);
    // emote takes priority until its clip ends
    if (emote && emote.seq !== emoteSeq.current) {
      emoteSeq.current = emote.seq;
      emoteActive.current = true;
      setClip(emote.clip);
      return;
    }
    if (emoteActive.current) return;
    // acting = held-E gathering swing; the FPS viewmodel's actual melee
    // swing (LMB) is a separate signal (combatState.attackAt) that this
    // rig never checked, so third person just never played it
    const swinging = (performance.now() - combatState.attackAt) / 1000 < 0.3;
    const next =
      playerState.acting || swinging ? 'anim_g_swordswish'
        : playerState.speed > 5 ? 'anim_c_run'
        : playerState.speed > 0 ? 'anim_c_walk'
        : 'anim_r_restpose';
    if (next !== clip) setClip(next);
  });

  if (!character || cameraMode !== 'third') return null;
  return (
    <group ref={holder}>
      <RiggedFigure
        config={character}
        height={1.75}
        clip={clip}
        loop={!emoteActive.current}
        timeScale={clip === 'anim_g_swordswish' ? 2 : clip === 'anim_c_run' ? 1.3 : 1}
        onReady={setRig}
        onClipEnd={() => {
          emoteActive.current = false;
          setClip('anim_r_restpose');
        }}
      />
      {rig && meleeTool === 'sword' && hasSword && createPortal(<HeldSword side={-1} />, rig.joints.rightarm)}
      {rig && meleeTool === 'halberd' && createPortal(<HeldHalberd side={-1} />, rig.joints.rightarm)}
      {rig && meleeTool === 'spear' && createPortal(<HeldSpear side={-1} />, rig.joints.rightarm)}
      {rig && hasShield && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
      {rig && hasHelmet && createPortal(<HeldHelmet />, rig.joints.head)}
      {rig && hasChestplate && createPortal(<Chestplate />, rig.joints.body)}
    </group>
  );
}
