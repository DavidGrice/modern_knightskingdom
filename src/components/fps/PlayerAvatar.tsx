'use client';
// The player's own minifig, visible in third-person mode. Picks clips from
// movement (idle/walk/run), gathering (swing) and emotes; owned arms show
// as real equipment on the rig. G-10 · his attacks, walk and run are his
// readied weapon's (game/combat/fightClips.ts), each attack's clip played
// from the frame its blow lands or its bolt or arrow is loosed: the click's.
import { useEffect, useRef, useState } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import RiggedFigure from '../character/RiggedFigure';
import { HeldSword, HeldHalberd, HeldSpear, HeldCrossbow, ArmShield, HeldHelmet, Chestplate } from '../character/Equipment';
import { bestChestplateOwned } from '@/game/data/armor';
import { preloadClip, type RiggedMinifig } from '@/lib/minifigRig';
import { playerState } from './PlayerController';
import { activeMelee, bestMeleeTierOwned, combatState, MELEE, RANGED_CD, type MeleeWeaponId } from '@/game/combat';
import { attackClip, avatarClip, instantSwing, playerArms, runClip, swingSeconds } from '@/game/combat/fightClips';

export default function PlayerAvatar() {
  const character = useGameStore((s) => s.character);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const emote = useGameStore((s) => s.emote);
  const holder = useRef<THREE.Group>(null);
  const [clip, setClip] = useState('anim_r_restpose');
  // Wave 40 (A6) · optional polish: a compare-then-set flag (same shape as
  // meleeTool/clip below) so a dodge burst's faster timeScale actually takes
  // effect — timeScale is a JSX prop, only re-read on a re-render, and this
  // file otherwise only re-renders when clip/meleeTool/rig actually change.
  const [dodging, setDodging] = useState(false);
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  // Wave 49 (C1) fix: owns ANY tier, not just the base item (see combat.ts's
  // own ownsMeleeSlot comment — re-forging consumes the tier below).
  const hasSword = useGameStore((s) => bestMeleeTierOwned('sword', s.inventory) !== null);
  const hasShield = useGameStore((s) => (s.inventory.shield ?? 0) > 0);
  // Wave 7 · third person shows what you have READIED, not just "a sword if
  // you own one" — otherwise a halberd wielder swings a sword out here while
  // the first-person view (and the damage) say polearm.
  const [meleeTool, setMeleeTool] = useState<MeleeWeaponId>('sword');
  // G-10 · the ranged weapon readied (owned, as combat's rangedReady reads it) — shown in his hand (the crossbow: no longbow is modelled for the
  // rig) and fought with in place of the melee one
  const [rangedTool, setRangedTool] = useState<'crossbow' | 'longbow' | null>(null);
  // G-10 · the attack (or the longbow's draw) his clip was last started for, and how that clip plays (null for any
  // other: his gait, a gather's swing, an emote)
  const [cue, setCue] = useState(0);
  const strike = useRef<{ timeScale: number; from: number } | null>(null);
  // whether a strike is on: its start and its end each re-render the figure (a gather's swing after a sword's cut is the
  // same clip, and must loop again at its own pace from its first frame)
  const [striking, setStriking] = useState(false);
  const hasHelmet = useGameStore((s) => (s.inventory.helmet ?? 0) > 0);
  // Wave 49 (C1) · the best tier of the readied sword/halberd, for the
  // Held*'s own held mesh — mirrors how `plateTier` just below already reads
  // the best chestplate.
  const swordTier = useGameStore((s) => bestMeleeTierOwned('sword', s.inventory) ?? 'base');
  const halberdTier = useGameStore((s) => bestMeleeTierOwned('halberd', s.inventory) ?? 'base');
  // Wave 9 · the player wears the BEST plate they own (there is no armor equip
  // slot — owning it is wearing it, which is also how armorReduction reads it)
  const plateTier = useGameStore((s) => bestChestplateOwned(s.inventory)?.id ?? null);
  const emoteSeq = useRef(0);
  const emoteActive = useRef(false);
  // G-10 · the readied weapon's attack clip fetched as it is readied, not at his first swing (a clip loads on first play)
  const readiedAttack = attackClip(playerArms({ ranged: rangedTool, melee: meleeTool, shield: hasShield }));
  useEffect(() => { preloadClip(readiedAttack); }, [readiedAttack]);

  useFrame(() => {
    const g = holder.current;
    // Wave 40 (A6) · optional polish — see the `dodging` state's own comment.
    const nowDodging = performance.now() < combatState.dodgeUntil;
    if (nowDodging !== dodging) setDodging(nowDodging);
    if (g) {
      g.visible = !playerState.riding; // MountedHorse.tsx shows the seated rider instead
      g.position.set(playerState.x, playerState.y, playerState.z);
      // face the roll's own direction instead of camera yaw while dodging,
      // so a sideways/backward roll visibly turns the body instead of
      // moonwalking — same movement-facing convention the enemies' own AI (game/enemyAi/)
      // already uses (atan2(-dx, -dz) off a normalized direction).
      const facingYaw = nowDodging
        ? Math.atan2(-combatState.dodgeDir.x, -combatState.dodgeDir.z)
        : playerState.yaw;
      g.rotation.y = facingYaw + Math.PI; // model faces +Z; movement forward is -Z
    }
    // cheap store read, and setState only on an actual swap — same
    // "compare-then-set" shape the clip selection below already uses
    const m = activeMelee();
    if (m !== meleeTool) setMeleeTool(m);
    const inv = useGameStore.getState().inventory;
    const ranged = combatState.weapon === 'ranged' && (inv[combatState.rangedWeapon] ?? 0) > 0 ? combatState.rangedWeapon : null;
    if (ranged !== rangedTool) setRangedTool(ranged);
    // emote takes priority until its clip ends
    if (emote && emote.seq !== emoteSeq.current) {
      emoteSeq.current = emote.seq;
      emoteActive.current = true;
      // G-10 · an emote plays from its first frame at its own pace, whatever swing came before it
      strike.current = null;
      if (striking) setStriking(false);
      setClip(emote.clip);
      return;
    }
    if (emoteActive.current) return;
    // acting = held-E gathering swing; the FPS viewmodel's actual melee
    // swing (LMB) is a separate signal (combatState.attackAt) that this
    // rig never checked, so third person just never played it
    // G-10 · his attack's clip from the frame of the click — the blow's, or the bolt's or arrow's release — fitted to
    // the weapon's cooldown, shown for as long as it moves; a longbow being drawn plays its clip from the start
    const arms = playerArms({ ranged, melee: m, shield: hasShield });
    const drawing = ranged === 'longbow' && combatState.drawStart > 0;
    const attack = instantSwing(attackClip(arms), ranged ? RANGED_CD[ranged] : MELEE[m].cd);
    const attacking = !drawing && (performance.now() - combatState.attackAt) / 1000 < swingSeconds(attack);
    const next = avatarClip({ acting: playerState.acting, attacking, drawing, speed: playerState.speed, arms });
    strike.current = playerState.acting ? null : attacking ? attack : drawing ? { timeScale: 1, from: 0 } : null;
    if (!!strike.current !== striking) setStriking(!!strike.current);
    const c = drawing ? combatState.drawStart : combatState.attackAt;
    if (c !== cue) setCue(c);
    if (next !== clip) setClip(next);
  });

  if (!character || cameraMode !== 'third') return null;
  return (
    <group ref={holder}>
      <RiggedFigure
        config={character}
        height={1.75}
        clip={clip}
        loop={!emoteActive.current && !strike.current}
        timeScale={strike.current ? strike.current.timeScale : clip === 'anim_g_swordswish' ? 2
          : clip === runClip(playerArms({ ranged: rangedTool, melee: meleeTool, shield: hasShield })) ? (dodging ? 1.9 : 1.3) : 1}
        cue={cue}
        from={strike.current?.from ?? 0}
        onReady={setRig}
        onClipEnd={() => {
          // an emote's end (an attack's clip holds its last frame till the frame loop above moves on)
          if (!emoteActive.current) return;
          emoteActive.current = false;
          setClip('anim_r_restpose');
        }}
      />
      {rig && !rangedTool && meleeTool === 'sword' && hasSword && createPortal(<HeldSword side={-1} tier={swordTier} />, rig.joints.rightarm)}
      {rig && !rangedTool && meleeTool === 'halberd' && createPortal(<HeldHalberd side={-1} tier={halberdTier} />, rig.joints.rightarm)}
      {rig && !rangedTool && meleeTool === 'spear' && createPortal(<HeldSpear side={-1} />, rig.joints.rightarm)}
      {rig && rangedTool === 'crossbow' && createPortal(<HeldCrossbow side={-1} />, rig.joints.rightarm)}
      {rig && hasShield && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
      {rig && hasHelmet && createPortal(<HeldHelmet />, rig.joints.head)}
      {rig && plateTier && createPortal(<Chestplate tier={plateTier} />, rig.joints.body)}
    </group>
  );
}
