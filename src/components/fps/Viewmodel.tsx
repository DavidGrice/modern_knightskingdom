'use client';
// First-person viewmodel: the player's minifig arm holding the contextual
// tool (axe / pickaxe / fishing rod / sword), with walk bob and swing.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { loadPalette, paletteColor } from '@/lib/minifig';
import { loadFpsArms, type FpsArms } from '@/lib/rigExtract';
import { labHands } from '@/game/data/labCapabilities';
import { playerState } from './PlayerController';
import { combatState, FULL_DRAW_TIME, activeMelee, bestMeleeTierOwned, ownsMeleeSlot, type MeleeTier, type MeleeWeaponId } from '@/game/combat';
import { couchingTourneyLance } from '@/game/joust';
import { ridingState } from '@/game/riding';
import RealWeapon from '../character/RealWeapon';
import { SWORD_WEAPON_ID, HALBERD_WEAPON_ID } from '../character/weaponIds';
import { Axe, Hammer, Pickaxe, Rod, Crossbow, Sword, BlockShield, CarriedShield } from './viewmodelParts/ProceduralTools';
import { Longbow } from './viewmodelParts/Longbow';
import { HAND_Y, OFFHAND_X, BOW_X, MOUNT, ARM_DIR } from './viewmodelParts/mounts';
import { RigArm } from './viewmodelParts/RigArm';

// N81's bare-fist pivot compensation (see the useFrame comment below) reuses
// these every frame rather than allocating — same "no per-frame allocation"
// convention the rest of this codebase's hot paths already follow.
const _fistQuat = new THREE.Quaternion();
const _fistPivot = new THREE.Vector3();
const _fistPivotRotated = new THREE.Vector3();

export default function Viewmodel() {
  const camera = useThree((s) => s.camera);
  const character = useGameStore((s) => s.character);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const buildMode = useGameStore((s) => s.buildMode);
  const targetKind = useGameStore((s) => s.targetKind);
  const inventory = useGameStore((s) => s.inventory);
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const offhand = useRef<THREE.Group>(null);
  const swingPhase = useRef(0);
  const bobPhase = useRef(0);
  const [colors, setColors] = useState<{ arm: THREE.Color; hand: THREE.Color } | null>(null);
  // the player's OWN arms, assembled from their donor's real molds — the
  // procedural cylinders below stay as the fallback for a donor whose arms
  // could not be classified, so the hand is never empty
  const [arms, setArms] = useState<FpsArms | null>(null);

  useEffect(() => {
    if (!character) return;
    loadPalette().then((pal) => {
      setColors({
        arm: paletteColor(pal, character.armColor),
        hand: paletteColor(pal, character.handColor),
      });
    });
  }, [character]);

  useEffect(() => {
    if (!character) return;
    let alive = true;
    setArms(null);
    loadFpsArms(character).then((a) => { if (alive) setArms(a); }).catch(() => {});
    return () => { alive = false; };
    // re-assemble whenever the look changes, so recolouring in the menu shows
  }, [character?.headDonor, character?.bodyDonor, character?.armColor,
    character?.handColor, character?.legColor, character?.hipColor]);

  const [rangedMode, setRangedMode] = useState(false);
  const [bowMode, setBowMode] = useState(false);
  const [drawProgress, setDrawProgress] = useState(0);
  const [blockShield, setBlockShield] = useState(false);
  const [bolts, setBolts] = useState(0);
  // L62 (rest) · couching a lance is a charge posture, not a standing one —
  // tracked the same polled way as ranged/draw state above so the tool
  // useMemo below actually re-renders when it flips, since ridingState and
  // combatState are plain mutable objects React has no other way to see.
  const [lanceMode, setLanceMode] = useState(false);
  // Wave 7 · which melee weapon is readied, and whether we're in the saddle
  // (the spear couches once mounted). Same polling reason as everything above.
  const [meleeTool, setMeleeTool] = useState<MeleeWeaponId>('sword');
  // Wave 49 (C1) · the best tier of whichever melee weapon is readied — polled
  // alongside meleeTool itself, same reason (combatState/the store are plain
  // mutable reads React can't otherwise see change).
  const [meleeTier, setMeleeTier] = useState<MeleeTier>('base');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      const st = useGameStore.getState();
      const inv = st.inventory;
      const bow = combatState.rangedWeapon === 'longbow';
      setRangedMode(
        combatState.weapon === 'ranged'
        && (bow ? (inv.longbow ?? 0) > 0 : (inv.crossbow ?? 0) > 0),
      );
      setBowMode(bow);
      const activeKind = activeMelee();
      setMeleeTool(activeKind);
      setMeleeTier(bestMeleeTierOwned(activeKind, inv) ?? 'base');
      setMounted(ridingState.active);
      // Wave 7 · WAS `ridingState.active && combatState.galloping`, which
      // handed the tourney lance to every mounted player holding Shift
      // anywhere in the world — sword, crossbow and longbow alike, while the
      // click underneath still swung/fired the real weapon. The lance is a
      // prop for Richard's pass and nothing else, so it is now gated on that
      // duel's own context (game/joust.ts, shared with E's own prompt).
      setLanceMode(couchingTourneyLance(st));
      setDrawProgress(
        combatState.drawStart > 0
          ? Math.min(1, (performance.now() - combatState.drawStart) / (FULL_DRAW_TIME * 1000))
          : 0,
      );
      setBlockShield(combatState.blocking && (inv.shield ?? 0) > 0);
      setBolts(inv.bolt ?? 0);
    }, 50);
    return () => clearInterval(t);
  }, []);

  // bare-handed start (2026-07-20): no tool/weapon is ever guaranteed to be
  // owned anymore, so the viewmodel must actually check ownership before
  // showing one — 'fist' (no matching render branch below, just the bare
  // arm+hand mesh already drawn unconditionally) is the honest default.
  const tool = useMemo(() => {
    // L62 (rest) · charging Richard couches the TOURNEY lance over whatever
    // else you'd otherwise be holding — the "Couch your lance!" prompt
    // (PlayerController's own joust interaction) implies exactly this
    // posture. Still first in the chain, and deliberately so: the pass is a
    // scripted duel that hands you its own lance. Wave 7 only narrowed WHEN
    // that is true (see the poll above) — outside Richard's field a mounted
    // player now keeps their real weapon, whatever pace they ride at.
    if (lanceMode) return 'lance';
    if (rangedMode) return bowMode ? 'longbow' : 'crossbow';
    if (targetKind === 'rock' && (inventory.pickaxe ?? 0) > 0) return 'pickaxe';
    if (targetKind === 'fishing' && (inventory.fishing_rod ?? 0) > 0) return 'rod';
    if (targetKind === 'tree' && (inventory.axe ?? 0) > 0) return 'axe';
    if (targetKind === 'construct' && (inventory.hammer ?? 0) > 0) return 'hammer';
    // Wave 7 · `activeMelee()` has already resolved ownership (it falls back
    // to 'sword' for anything not actually carried), so these two need no
    // second inventory check — matching how `rangedMode` above is already
    // ownership-resolved before it gets here.
    if (meleeTool === 'halberd') return 'halberd';
    if (meleeTool === 'spear') return 'spear';
    // Wave 49 (C1) fix: ownsMeleeSlot recognizes ANY owned tier — a flat
    // `inventory.sword` count reads 0 the moment a Forged/Crested sword is
    // forged (re-forging consumes the tier below, chestplate-chain style),
    // which used to fall through to bare 'fist' despite the player visibly
    // owning (and having readied) a real sword.
    if (ownsMeleeSlot('sword', inventory)) return 'sword';
    return 'fist';
  }, [lanceMode, rangedMode, bowMode, meleeTool, targetKind, inventory]);
  // ownership-based, same convention as `tool`'s sword branch — a crafted
  // shield should be visibly carried, not only appear once you block with it
  const hasShield = (inventory.shield ?? 0) > 0;

  useFrame((_, dt) => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    o.position.copy(camera.position);
    o.quaternion.copy(camera.quaternion);
    // walk bob
    bobPhase.current += dt * (playerState.speed > 5 ? 11 : 7.5);
    const moving = playerState.speed > 0 && playerState.grounded;
    const bobAmp = moving ? 0.012 : 0;
    const bobY = Math.abs(Math.sin(bobPhase.current)) * -bobAmp;
    // H32 · running arm swing. The two arms counter-phase off the SAME
    // bob phase that drives the footfall, so the swing lands with the step
    // instead of drifting against it — one arm forward as the other goes
    // back, easing to rest when you stop.
    const swingAmp = moving ? Math.min(0.5, 0.16 + playerState.speed * 0.045) : 0;
    const swing = Math.sin(bobPhase.current) * swingAmp;
    // combat swing (quick chop after an attack click)
    const sinceAttack = (performance.now() - combatState.attackAt) / 1000;
    if (sinceAttack < 0.3) {
      const p = sinceAttack / 0.3;
      i.rotation.set(-1.3 * Math.sin(p * Math.PI), 0.25 * Math.sin(p * Math.PI * 2), 0.1);
    } else if (playerState.acting) {
      // swing while gathering
      swingPhase.current += dt * 9;
      const s = Math.sin(swingPhase.current);
      i.rotation.set(-0.55 - 0.55 * Math.max(0, s), 0.15 * s, 0.1);
    } else {
      swingPhase.current = 0;
      i.rotation.x += (0 - i.rotation.x) * Math.min(1, dt * 10);
      i.rotation.y += (0 - i.rotation.y) * Math.min(1, dt * 10);
      i.rotation.z += (0 - i.rotation.z) * Math.min(1, dt * 10);
    }
    i.position.set(0.36, HAND_Y + bobY, -0.74);
    // the swing rides on top of whatever the attack/gather pose set
    i.rotation.x += swing * 0.55;

    // N81 (bare-handed chopping "moves the arms while the hands stay
    // still" — should be the other way round): the gather swing above
    // rotates `inner` around its OWN origin, which RigArm deliberately pins
    // to the WRIST (so a held weapon's grip lands exactly where it should —
    // see RigArm's own doc comment) — correct for a held tool, but for a
    // bare fist it means the forearm (far from that pivot) sweeps a wide
    // arc while the hand (sitting AT the pivot) barely appears to move.
    // Scoped to tool === 'fist' only, so the tuned held-tool/weapon
    // alignment is completely untouched. Standard "rotate about an offset
    // pivot" compensation (pivot − R·pivot) shifts the effective pivot back
    // toward the elbow along the arm's own hang direction (−ARM_DIR),
    // without needing a real wrist joint this viewmodel doesn't have.
    if (tool === 'fist' && playerState.acting) {
      const q = _fistQuat.setFromEuler(i.rotation);
      const comp = _fistPivot.copy(ARM_DIR).multiplyScalar(-0.16);
      comp.sub(_fistPivotRotated.copy(comp).applyQuaternion(q));
      i.position.add(comp);
    }

    const off = offhand.current;
    if (off) {
      off.position.set(-OFFHAND_X, HAND_Y + bobY, -0.78);
      // opposite phase — as the weapon hand comes forward this one goes back
      off.rotation.set(-swing * 0.8, 0, 0);
    }
  });

  // where a held item sits: the real hand's wrist point when the rig loaded,
  // otherwise the old hand-tuned offset for the procedural fallback
  // RigArm pins the hand to its own origin, so a real arm needs no offset at
  // all; the procedural fallback keeps its old hand-tuned one
  const handMount: [number, number, number] = arms ? [0, 0, 0] : [0.02, 0.05, 0];
  // -1 = the shield rides the LEFT of the view (the lab's usual answer)
  const shieldSide = labHands(character?.bodyDonor).shield === 'left' ? -1 : 1;

  // Wave 7 fix · riding is ALWAYS first person, whatever the stored camera
  // preference says (PlayerController forces the eye camera while
  // `ridingState.active`, because MountedHorse.tsx puts the horse's neck
  // ahead of that camera on purpose). Gating this on the stored mode alone
  // meant a player who had chosen third person on foot climbed into the
  // saddle and got a first-person view with empty hands — no sword, no
  // couched spear, no halberd, no lance. The saddle follows the camera that
  // is actually running, not the preference it overrode.
  if (!character || (cameraMode !== 'fps' && !mounted) || buildMode || !colors) return null;

  return (
    <group ref={outer}>
      <group ref={inner} position={[0.34, -0.42, -0.62]} rotation={[0, 0, 0]}>
        {/* The player's OWN arm, from their donor's real mold (lib/fpsArms).
            Falls back to the two procedural cylinders only when a donor's
            arms could not be classified, so the hand is never empty. */}
        {arms ? (
          <RigArm arm={arms.right} side={-1} />
        ) : (
          <>
            <mesh position={[0.02, -0.09, 0.14]} rotation-x={0.8}>
              <cylinderGeometry args={[0.055, 0.065, 0.34, 10]} />
              <meshPhongMaterial color={colors.arm} />
            </mesh>
            <mesh position={[0.02, 0.04, 0.02]} rotation-x={1.2}>
              <cylinderGeometry args={[0.05, 0.05, 0.09, 10]} />
              <meshPhongMaterial color={colors.hand} />
            </mesh>
          </>
        )}
        {/* Whatever is actually equipped, seated in that hand.
            H29 gave every real mold the same convention — grip at the
            origin, weapon pointing +Y — so each mount below is now just a
            statement of where that weapon should POINT in view space,
            rather than an offset tuned by eye per weapon. */}
        <group position={handMount} scale={0.78}>
          {/* pickaxe/hammer/rod (no mold exists for these in the extraction —
              see weaponParts) keep the shared haft-up-and-forward pose */}
          <group rotation={MOUNT.tool}>
            {tool === 'pickaxe' && <Pickaxe />}
            {tool === 'hammer' && <Hammer />}
            {tool === 'rod' && <Rod />}
          </group>
          {/* Wave 34 · the axe now has a real mold (weaponParts) — reuses the
              same haft-up-and-forward MOUNT.tool pitch the procedural axe it
              replaces was already tuned to, since both conventions carry the
              haft along +Y swung forward for a chop. */}
          {tool === 'axe' && (
            <group rotation={MOUNT.tool}>
              <RealWeapon id="axe" fallback={<Axe />} />
            </group>
          )}
          {/* blade up and angled forward, as a sword is carried at the ready.
              Wave 49 (C1): the readied tier's own real WeaponId — a bare
              MELEE fallback (procedural <Sword/>) is still shown for a fresh
              character with no sword at all, since 'base' still resolves to
              the id 'sword' either way. */}
          {tool === 'sword' && (
            <group rotation={MOUNT.sword}>
              <RealWeapon id={SWORD_WEAPON_ID[meleeTier]} fallback={<Sword />} />
            </group>
          )}
          {/* L62 (rest) · couched: tucked under the arm and levelled at the
              target, the same real mold "spear" has always used for a
              standing pose (lib/weaponParts) — the extraction has no mold
              cast specifically for a mounted grip, so this reuses it rather
              than inventing a second "lance" weapon id for one pose */}
          {tool === 'lance' && (
            <group rotation={MOUNT.lance} scale={0.85}>
              <RealWeapon id="spear" fallback={null} />
            </group>
          )}
          {/* Wave 7 · the halberd, the same verified mold Defenders.tsx has
              always portalled onto a defender's arm. Scaled down harder than
              the sword because the mold is nearly twice as long: at the
              sword's own 0.78 it fills the frame rather than sitting in a
              hand. Deliberately NOT gated on riding — the whole point of the
              defender reference implementation is that weapon choice and
              saddle are independent. */}
          {/* Wave 49 (C1): same tier-aware id swap as the sword branch above. */}
          {tool === 'halberd' && (
            <group rotation={MOUNT.halberd} scale={0.6}>
              <RealWeapon id={HALBERD_WEAPON_ID[meleeTier]} fallback={null} />
            </group>
          )}
          {/* Wave 7 · the spear. Mounted it COUCHES — same rest rotation the
              tourney lance uses, because that is what a spear from a saddle
              is, and it is also exactly when combat.ts's charge multiplier
              pays out. On foot it drops to the flatter ready-to-thrust
              carry. */}
          {tool === 'spear' && (
            <group rotation={mounted ? MOUNT.lance : MOUNT.spear} scale={0.62}>
              <RealWeapon id="spear" fallback={null} />
            </group>
          )}
          {/* levelled downrange: +Y rotated a quarter turn onto -Z */}
          {tool === 'crossbow' && (
            <group rotation={MOUNT.crossbow}>
              <RealWeapon id="crossbow" fallback={<Crossbow />} />
              {/* the bolt sitting in the groove, from the same donor */}
              {bolts > 0 && (
                <group position={[0, 0.16, 0]}>
                  <RealWeapon id="bolt" scale={0.9} fallback={null} />
                </group>
              )}
            </group>
          )}
        </group>
      </group>
      {/* L73 · A BOW IS HELD IN THE OFF HAND. It was mounted in the same
          group as the sword and the crossbow — the drawing hand — so it sat
          out at the right edge of the view, half off-screen, with the string
          hand nowhere near it. It hangs off the off-hand side now, pulled in
          toward the middle of the view the way a bow is actually held: limbs
          vertical, belly to the target, the arrow riding the string at eye
          level rather than crossing it. */}
      {tool === 'longbow' && (
        <group position={[-BOW_X, HAND_Y + 0.3, -0.72]} scale={0.78}>
          <Longbow draw={drawProgress} />
        </group>
      )}
      {/* H31 · the OFF hand. A first-person view with one arm in it reads as
          a floating prop; the second hand is most of what makes it read as a
          body. Hidden while blocking, because the shield arm below takes
          that side over, and while a two-handed pose is in play. */}
      {arms && !blockShield && (
        <group ref={offhand} position={[-OFFHAND_X, HAND_Y, -0.78]}>
          <RigArm arm={arms.left} side={1} />
          {hasShield && <CarriedShield />}
        </group>
      )}
      {/* raised shield fills the shield-hand side of the view while blocking.
          Which side that is comes from the rig lab's own per-donor
          `shieldHand`, not a hardcoded left (see labHands). */}
      {blockShield && (
        <group position={[shieldSide * 0.28, -0.22, -0.55]}>
          {arms && (
            <RigArm arm={shieldSide < 0 ? arms.left : arms.right} side={shieldSide < 0 ? 1 : -1} />
          )}
          <BlockShield />
        </group>
      )}
    </group>
  );
}
