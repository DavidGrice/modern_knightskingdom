'use client';
// First-person viewmodel: the player's minifig arm holding the contextual
// tool (axe / pickaxe / fishing rod / sword), with walk bob and swing.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { loadPalette, paletteColor } from '@/lib/minifig';
import { loadFpsArms, type FpsArm, type FpsArms } from '@/lib/rigExtract';
import { labHands } from '@/game/data/labCapabilities';
import { playerState } from './PlayerController';
import { combatState, FULL_DRAW_TIME, activeMelee, type MeleeWeaponId } from '@/game/combat';
import { couchingTourneyLance } from '@/game/joust';
import { ridingState } from '@/game/riding';
import RealWeapon from '../character/RealWeapon';
import RealShield from '../character/RealShield';

function Axe() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.4, 8]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 0.33, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.03]} />
        <meshStandardMaterial color="#c2c6ce" metalness={0.4} roughness={0.45} />
      </mesh>
    </group>
  );
}

// Procedural builder's mallet — no dedicated hammer mold exists in the
// extraction, same "procedural where the original has no equivalent" rule
// as the pickaxe/rod (Wave 34: the axe now has a real mold — weaponParts).
function Hammer() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.38, 8]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.055, 0.055, 0.2, 8]} />
        <meshStandardMaterial color="#8a6234" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Pickaxe() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.42, 8]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.045, 0.3, 6]} />
        <meshStandardMaterial color="#8a8a90" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Rod() {
  return (
    <group rotation-x={-0.35}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.02, 0.75, 6]} />
        <meshStandardMaterial color="#7a5a34" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.66, -0.02]}>
        <sphereGeometry args={[0.018, 6, 6]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
    </group>
  );
}

function Crossbow() {
  return (
    <group rotation-x={-1.35}>
      {/* stock */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.05, 0.42, 0.06]} />
        <meshStandardMaterial color="#5d3d20" roughness={0.85} />
      </mesh>
      {/* bow arms */}
      <mesh position={[0, 0.34, 0]} rotation-z={Math.PI / 2}>
        <boxGeometry args={[0.03, 0.4, 0.03]} />
        <meshStandardMaterial color="#3a3a40" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* string */}
      <mesh position={[-0.1, 0.28, 0]} rotation-z={0.45}>
        <cylinderGeometry args={[0.006, 0.006, 0.24, 4]} />
        <meshStandardMaterial color="#d8d0b8" />
      </mesh>
      <mesh position={[0.1, 0.28, 0]} rotation-z={-0.45}>
        <cylinderGeometry args={[0.006, 0.006, 0.24, 4]} />
        <meshStandardMaterial color="#d8d0b8" />
      </mesh>
      {/* loaded bolt */}
      <mesh position={[0, 0.3, 0.01]}>
        <cylinderGeometry args={[0.012, 0.012, 0.3, 5]} />
        <meshStandardMaterial color="#8a6234" roughness={0.8} />
      </mesh>
    </group>
  );
}

// H29/H33 · A REAL longbow. The rig lab found the mold on John of Mayne
// (`minifigjohnmayne01` → role `bow`), together with the `arrow` he carries,
// so the draw nocks an actual arrow instead of a hand-built stand-in.
//
// The bowstring is still procedural, and honestly so: it is a LEGO mold and
// there is no string in the plastic. It is drawn between the two limb tips
// and pulled back with the draw, which is what sells the motion.
function Longbow({ draw }: { draw: number }) {
  const pull = 0.02 + draw * 0.26;      // how far the nock travels toward you
  const limb = 0.42;                    // half the bow's height, for the string
  return (
    <group>
      {/* K56 · the bow and the arrow were BOTH inside one rotated group, so
          the arrow inherited the bow's cross-body turn and ended up aimed
          back at the player while the bow's belly faced outward — the two
          read as swapped. They are siblings now: the bow keeps its
          cross-body presentation, and the arrow is aimed downrange in the
          MOUNT's own frame, independent of however the bow is turned (see
          the arrow's own group below for which axis "downrange" ended up
          being, re-measured 2026-07-29). */}
      <group rotation={[0.1, -Math.PI / 2, 0]}>
      <RealWeapon
        id="bow"
        fallback={(
          <mesh rotation-z={0.5}>
            <cylinderGeometry args={[0.014, 0.02, 0.34, 6]} />
            <meshStandardMaterial color="#6b4a2a" roughness={0.85} />
          </mesh>
        )}
      />
      {/* string: two segments meeting at the nock, so it forms a real V as
          it is drawn rather than sliding about as one straight bar */}
      {[1, -1].map((side) => {
        const dx = -pull;
        const dy = side * limb;
        const len = Math.hypot(dx, dy);
        return (
          <mesh
            key={side}
            position={[dx / 2, dy / 2, 0]}
            rotation-z={Math.atan2(dy, dx) - Math.PI / 2}
          >
            <cylinderGeometry args={[0.004, 0.004, len, 4]} />
            <meshStandardMaterial color="#e8ddc0" />
          </mesh>
        );
      })}
      </group>
      {/* the nocked arrow: pointing DOWNRANGE (+X, this mount's own forward
          once rotated), riding back toward the archer along -X as the draw
          deepens. Re-measured 2026-07-29: the arrow's own rest orientation
          (see loadWeapon('arrow')) is +Y like every other real mold, but a
          quarter-turn onto -Z (what K56 shipped) points it along the
          camera's OWN forward axis — which looks right on paper but is
          exactly wrong on screen: pointing straight into the depth the
          camera is already looking down foreshortens it to a barely-visible
          sliver, which is what "lies vertically alongside the bow rather
          than downrange" actually looked like. A quarter-turn onto ±X
          instead keeps the shaft ACROSS the view, visibly running from the
          string out to the reticle the way a nocked arrow actually reads. */}
      <group position={[-pull, 0, 0]} rotation-z={-Math.PI / 2}>
        <RealWeapon id="arrow" scale={0.85} fallback={null} />
      </group>
    </group>
  );
}

function Sword() {
  return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.02, 0.024, 0.14, 8]} />
        <meshStandardMaterial color="#3a3a40" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.165, 0]}>
        <boxGeometry args={[0.16, 0.03, 0.03]} />
        <meshStandardMaterial color="#c8a43c" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.05, 0.48, 0.016]} />
        <meshStandardMaterial color="#c9ccd4" metalness={0.75} roughness={0.25} />
      </mesh>
    </group>
  );
}

function ShieldFace() {
  return (
    <>
      <mesh>
        <boxGeometry args={[0.34, 0.44, 0.04]} />
        <meshStandardMaterial color="#9aa0aa" metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position-z={0.015}>
        <boxGeometry args={[0.26, 0.34, 0.02]} />
        <meshStandardMaterial color="#b03a2e" roughness={0.7} />
      </mesh>
      <mesh position-z={0.035}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#c8a43c" metalness={0.7} roughness={0.3} />
      </mesh>
    </>
  );
}

function BlockShield() {
  return (
    // +Math.PI from the third-person ArmShield's outward-facing angle: the
    // wielder's own eyes see the INSIDE of a raised shield (the arm strap/
    // hook), not the painted lion face an enemy in front of them would see.
    <group rotation={[0.1, 0.5 + Math.PI, 0]}>
      <RealShield fallback={<ShieldFace />} />
    </group>
  );
}

/** A crafted shield used to only ever appear while actively blocking — owning
 *  one did nothing to the view otherwise. Carried at rest on the off-hand
 *  arm instead, angled down and in rather than raised flat to the camera, so
 *  it reads as "carried" and not "about to block." */
function CarriedShield() {
  return (
    <group position={[0, -0.1, 0.05]} rotation={[0.55, 2.35, 0.35]} scale={0.7}>
      <RealShield fallback={<ShieldFace />} />
    </group>
  );
}

/**
 * Where each weapon POINTS once mounted. Every real mold now arrives grip-at-
 * origin with its length along +Y (see lib/weaponParts), so these are
 * statements of intent rather than per-weapon fudge factors:
 *   sword     — blade up and angled forward, carried at the ready
 *   crossbow  — levelled downrange, +Y turned a quarter onto -Z, plus a roll
 *               to square the bow-arms (see MOUNT's own comment)
 *   tool      — haft up and forward, the shared pose for the procedural set
 */
/** how high the hands sit in the frame, and how far out the off hand is.
 *  The weapon hand used to sit at -0.42, low enough that it read as hanging
 *  below the viewport rather than being carried. */
const HAND_Y = -0.34;
const OFFHAND_X = 0.36;
/** L73 · how far left the bow hand sits — inboard of the off hand, because a
 *  drawn bow is held toward the centre of the view, not out at the shoulder */
const BOW_X = 0.2;

const MOUNT = {
  sword: [-0.45, 0, -0.12] as [number, number, number],
  // Re-measured 2026-07-29: the pitch (x) was already right — levelled and
  // pointed downrange — but with zero roll the crossbow's own bow-arms sat
  // canted a good 25-30° off level rather than square to the view, which is
  // what actually read as "wrong" (the pitch alone looked plausible on
  // paper; only screenshotting it at scale made the roll obvious). +0.5 on
  // z squares the arms up without touching the pitch.
  crossbow: [-Math.PI / 2, 0, 0.5] as [number, number, number],
  // L62 (rest) · couched and levelled toward a target ahead of the horse,
  // rather than the sword's more upright ready stance — measured live the
  // same way as the crossbow's own roll, below. Wave 7: the player's OWN
  // spear borrows this exact pose once mounted (see `spear` below), because
  // couched is couched whether the point is aimed at Richard or at a raider.
  lance: [-Math.PI / 2, 0, 0] as [number, number, number],
  // Wave 7 · the two polearms, on foot. Both are far longer molds than the
  // sword (1.15m and 1.25m against 0.62m — lib/weaponParts), so the sword's
  // near-upright carry would put the head somewhere above the top of the
  // frame with the haft filling half the view. Both are pitched hard forward
  // instead, so what you see is the BUSINESS END leading out ahead of you,
  // which is also where the reach actually is:
  //   halberd — angled up off the shoulder, the way a heavy chopping polearm
  //             is carried between swings
  //   spear   — flatter and closer to level, because a thrust is delivered
  //             straight down the line of sight, not swung down onto it
  halberd: [-1.0, 0.14, -0.1] as [number, number, number],
  spear: [-1.28, 0.06, 0] as [number, number, number],
  //   tool — H34. There is no pickaxe or hammer mold anywhere in the
  //          extraction (the lab's only `pickaxe` is a trait on a defence
  //          tower, not a held part), so pickaxe/hammer/rod stay procedural
  //          (Wave 34: the axe moved off this shared rotation onto its own
  //          real mold, but reuses the exact same pitch below — both
  //          conventions carry the haft along +Y swung forward). What was
  //          wrong was the POSE: their hafts sat nearly upright while the
  //          hand angles in toward the camera, so the head pointed up and
  //          away instead of out in front where a swing starts. Pitched
  //          forward to lie along the forearm.
  tool: [-0.78, 0.12, -0.16] as [number, number, number],
};

/** the viewmodel is much smaller than a 1.75m figure */
const ARM_SCALE = 0.62;
/** Where the arm should point in CAMERA space, from shoulder to hand: up,
 *  forward and inward, so the shoulder sits off the bottom-outer corner of
 *  the frame and the hand arrives at the tool mount. */
const ARM_DIR = new THREE.Vector3(-0.39, 0.65, -0.65).normalize();
const UP = new THREE.Vector3(0, 1, 0);
// N81's bare-fist pivot compensation (see the useFrame comment below) reuses
// these every frame rather than allocating — same "no per-frame allocation"
// convention the rest of this codebase's hot paths already follow.
const _fistQuat = new THREE.Quaternion();
const _fistPivot = new THREE.Vector3();
const _fistPivotRotated = new THREE.Vector3();

/**
 * The player's real minifig arm.
 *
 * Rather than hand-tuning a pitch (which only works for one donor's
 * proportions), the arm is PINNED BY ITS HAND: the inner group translates so
 * the measured wrist point lands on this group's origin — which is the same
 * point the held tool mounts at — and the outer rotation is solved from the
 * arm's own hang direction to ARM_DIR. Any donor's arm therefore arrives
 * with its hand exactly where the sword is, whatever its mold looks like.
 */
function RigArm({ arm, side }: { arm: FpsArm; side: 1 | -1 }) {
  const instance = useMemo(() => arm.group.clone(true), [arm]);
  const { quat, offset } = useMemo(() => {
    const dir = ARM_DIR.clone();
    if (side > 0) dir.x = -dir.x;               // mirror for the other arm
    const q = new THREE.Quaternion().setFromUnitVectors(arm.hand.clone().normalize(), dir);
    // roll so the elbow bows outward rather than through the view
    q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, side * 0.25));
    return {
      quat: q,
      offset: arm.hand.clone().multiplyScalar(-ARM_SCALE),
    };
  }, [arm, side]);
  return (
    <group quaternion={quat}>
      <group position={offset} scale={ARM_SCALE}>
        <primitive object={instance} />
      </group>
    </group>
  );
}

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
      setMeleeTool(activeMelee());
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
    if ((inventory.sword ?? 0) > 0) return 'sword';
    return 'fist';
  }, [lanceMode, rangedMode, bowMode, meleeTool, targetKind, inventory.pickaxe, inventory.fishing_rod, inventory.axe, inventory.hammer, inventory.sword]);
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
          {/* blade up and angled forward, as a sword is carried at the ready */}
          {tool === 'sword' && (
            <group rotation={MOUNT.sword}>
              <RealWeapon id="sword" fallback={<Sword />} />
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
          {tool === 'halberd' && (
            <group rotation={MOUNT.halberd} scale={0.6}>
              <RealWeapon id="halberd" fallback={null} />
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
