'use client';
// Reusable animated minifig: assembles the rig for a character config and
// plays whatever clip the parent asks for. Used by the creator preview,
// the third-person player avatar and NPCs.
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { assembleRiggedMinifig, type RiggedMinifig } from '@/lib/minifigRig';
import type { CharacterConfig } from '@/game/types';
import { useAppStore } from '@/game/store/appStore';
import { GRAPHICS_PROFILES } from '@/game/graphicsProfiles';
import { playerState } from '@/game/playerState';
import { FIDGET_CLIPS } from '@/ai/actions/ambient';

/** scratch for the LOD distance check below — module-scope like every other
 *  per-frame scratch object in this codebase (see PlayerController.tsx) */
const _worldPos = new THREE.Vector3();
/** Bugfix (2026-08-19) · the cutoff used to be measured against
 *  `camera.position`, which in third person is not the player at all — it's
 *  the chase camera's boom-arm position, ~4.6 units off on whichever side is
 *  opposite the look direction (see PlayerController.tsx). Turning to face a
 *  fixed point swings the camera to the FAR side of the player relative to
 *  it, which could swing the measured distance by up to ~9.2 units just from
 *  looking around — enough to cull an NPC sitting near the cutoff exactly
 *  when the player centers them in view. `playerState` is the player's real,
 *  camera-independent body position (PlayerController writes it from
 *  `pos.current`, never from `camera.position`), so distance now only
 *  changes when the player actually moves. */
const _playerPos = new THREE.Vector3();

// Wave 34 (G6.7) · a mounted rider's legs float above the saddle playing
// whatever ground-walk clip the FSM picked (anim_c_walk/run, anim_r_restpose,
// anim_g_swordswish) — there is no seated-rider clip anywhere in the
// extraction (all 15 clips under public/assets/anims/ are ground-walk/
// combat/gesture poses), and the rig has no knee joint to bend independently
// (minifigRig.ts's 7 joints stop at leftleg/rightleg, one rigid segment
// each). So this is a static bone-pose override applied AFTER the clip drives
// the figure each frame, not a new animation: head/body/arms/hips stay fully
// clip-driven (a mounted defender still swings a sword normally), and only
// the two leg joints get forced into a straddle bend. The angles are a
// starting estimate, not measured against a render — this mold has no
// in-repo 3D preview harness — and want one live screenshot-and-tune pass.
const SEATED_LEG_X = 1.15;    // forward hip-flexion — thighs raised toward the horse's back
const SEATED_LEG_SPLAY = 0.4; // outward roll per leg, to clear the horse's barrel

export default function RiggedFigure({
  config,
  height = 1.75,
  clip,
  loop = true,
  timeScale = 1,
  onClipEnd,
  onReady,
  keepProps = false,
  lodExempt = false,
  seatedLegPose = false,
}: {
  config: CharacterConfig;
  height?: number;
  clip: string;
  loop?: boolean;
  timeScale?: number;
  onClipEnd?: () => void;
  onReady?: (rig: RiggedMinifig) => void;
  /** show weapons molded into the donor mesh. Enemies and armed NPCs want
   *  this (it's their actual weapon); villagers and the player don't, since
   *  their gear is attached separately from the Armory/inventory. */
  keepProps?: boolean;
  /** Bugfix (2026-08-19) · opt this figure out of `characterLodDistance`
   *  entirely, regardless of graphics tier. The Performance-tier cutoff below
   *  exists to thin out ambient/decorative crowds (villagers, enemies,
   *  mounted background riders) at a real perf cost saved; it was never meant
   *  to be able to cull an NPC with real dialogue/quests into
   *  unreachability. Set true for every interactive, named NPC (see
   *  Npc.tsx's CourtNpc — every entry in the NPCS table has mandatory
   *  lines/sideQuests, so all of them qualify). */
  lodExempt?: boolean;
  /** Wave 34 (G6.7) · force the leg joints into a straddle bend every frame,
   *  after the clip has posed everything else. For a rider seated on a
   *  mount — see SEATED_LEG_X/SEATED_LEG_SPLAY's own comment above. */
  seatedLegPose?: boolean;
}) {
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  const endRef = useRef(onClipEnd);
  endRef.current = onClipEnd;

  // Requested 2026-07-31 (Performance quality tier): every rigged character
  // in the game — villagers, NPCs, enemies, mounted riders, the player's own
  // third-person avatar — renders through this ONE component, always as a
  // child of a caller-repositioned outer <group>, so a distance cutoff here
  // covers all of them with zero changes to any caller (except an explicit
  // `lodExempt` opt-out, added by the bugfix below). `characterLodDistance`
  // is null at Balanced/Ultra (no cutoff at all, unchanged behavior).
  const lodDistance = useAppStore((s) => GRAPHICS_PROFILES[s.settings.graphicsQuality].characterLodDistance);
  const lodTimer = useRef(0);
  const culled = useRef(false);
  // Beda investigation (Wave 2) — see the useFrame comment below for why
  // this exists. Fails OPEN on a play() rejection (a failed clip fetch):
  // showing an unposed rig beats hiding one forever, which is worse than
  // the glitch this is meant to fix.
  const posed = useRef(false);

  useEffect(() => {
    let alive = true;
    assembleRiggedMinifig(config, height, keepProps)
      .then((r) => {
        if (!alive) return;
        // reset here, not in the "play clip" effect below — that effect
        // also re-runs on a plain clip/loop/timeScale change for an
        // ALREADY-POSED rig (e.g. idle -> walk), which should keep showing
        // whatever it's currently doing while the new clip loads (same as
        // before this fix), not hide. Only a genuinely fresh rig (this
        // callback) should start unposed.
        posed.current = false;
        setRig(r);
        onReady?.(r);
      })
      .catch((e) => console.error('rig assembly failed', e));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.headDonor, config.bodyDonor, config.armColor, config.handColor, config.legColor, config.hipColor, height, keepProps]);

  useEffect(() => {
    if (!rig) return;
    rig.animator.play(clip, { loop, timeScale, onEnd: () => endRef.current?.() })
      .catch((e) => {
        console.error('clip load failed — showing the rig unposed rather than hiding it forever', e);
        posed.current = true;
      });
  }, [rig, clip, loop, timeScale]);

  useFrame((_, dt) => {
    if (!rig) return;
    if (lodDistance != null && !lodExempt) {
      // ~5Hz — a coarse LOD decision, matching the AI LOD system's own
      // tierRefreshHz convention (src/ai/config/lod.json), not a per-frame one
      lodTimer.current -= dt;
      if (lodTimer.current <= 0) {
        lodTimer.current = 0.2;
        rig.group.getWorldPosition(_worldPos);
        // measured against the player's stable body position, NOT
        // camera.position — see _playerPos's own comment above for why that
        // distinction is the whole fix
        _playerPos.set(playerState.x, playerState.y, playerState.z);
        culled.current = _worldPos.distanceTo(_playerPos) > lodDistance;
      }
    } else {
      // tier switched away from Performance mid-session, or this figure is
      // `lodExempt` — un-cull immediately rather than waiting for the next
      // throttled tick
      culled.current = false;
    }
    // Beda investigation (Wave 2): a fresh rig's joints all sit at the
    // construction-time neutral stance (rotation identity) until the FIRST
    // MinifigAnimator.update() with a resolved clip actually runs —
    // `animator.play()` above awaits `loadClip()`, and this component
    // starts rendering the instant `rig` state resolves, regardless of
    // whether that await has finished. `animator.current` (the playing
    // clip's name) becomes non-empty once it has. Computed into the SAME
    // final `.visible` assignment as the LOD cull below, rather than a
    // separate write, so the two conditions can't stomp on each other (an
    // earlier version wrote `.visible` in three different places and the
    // LOD branch's own "un-cull immediately" case silently undid the
    // pose-readiness hide on every tier except Performance).
    if (rig.animator.current !== '') posed.current = true;
    rig.group.visible = posed.current && !culled.current;
    // a hard visibility toggle, not a fade and not a reduced-poly swap —
    // skips both the draw call (three.js doesn't recurse into invisible
    // subtrees, so portaled equipment on rig.joints.* is correctly skipped
    // too) and the bone/skinning update cost below
    if (!culled.current) {
      rig.animator.update(Math.min(dt, 0.06));
      // Wave 34 (G6.7) · applied AFTER the clip so it wins over whatever
      // ground-walk pose the animator just wrote to these two joints this
      // frame; every other joint (head/body/arms/hips) is untouched.
      if (seatedLegPose) {
        rig.joints.leftleg.rotation.set(SEATED_LEG_X, 0, SEATED_LEG_SPLAY);
        rig.joints.rightleg.rotation.set(SEATED_LEG_X, 0, -SEATED_LEG_SPLAY);
      }
    }
  });

  if (!rig) return null;
  return <primitive object={rig.group} />;
}

const REST_CLIP = 'anim_r_restpose';
// wide spread so a crowd of these never reads as synchronized puppets —
// each instance rolls its own next-fidget delay independently
const IDLE_FIDGET_MIN_REST = 4;
const IDLE_FIDGET_MAX_REST = 11;

function randomFidgetRest() {
  return IDLE_FIDGET_MIN_REST + Math.random() * (IDLE_FIDGET_MAX_REST - IDLE_FIDGET_MIN_REST);
}

/** Drives the `clip`/`loop`/`onClipEnd` trio for a decorative, non-Agent
 *  figure — the same controlled-clip contract every other RiggedFigure
 *  caller already supplies by hand, generated locally on a timer instead of
 *  through a real NpcDef/Agent. For the figures this exists for (Cedric's
 *  cameos, Weezil, Gilbert, generic troops — TemplatePopulation.tsx/
 *  CedricCamp.tsx), registering a real Agent isn't an option: see
 *  TemplatePopulation.tsx's own header comment for why the raw Grok
 *  position data resolves thousands of world units from dest.origin for
 *  this same donor family, deep in unreachable background terrain.
 *
 *  Reuses the exact FIDGET_CLIPS pool `idle_fidget` (ai/actions/ambient.ts)
 *  plays for every real NPC's own Agent-driven ambient behavior — same
 *  clips, same "background life only" curation, just cycled locally rather
 *  than through the Reasoner. The return-to-rest signal is RiggedFigure's
 *  own onEnd callback (the clip's real length), exactly like Npc.tsx's
 *  `onClipEnd={() => setClip('anim_r_restpose')}` already uses to settle a
 *  greet wave back to idle. */
export function useIdleFidget() {
  const [clip, setClip] = useState(REST_CLIP);
  const [loop, setLoop] = useState(true);
  const restTimer = useRef(randomFidgetRest());

  useFrame((_, dt) => {
    if (clip !== REST_CLIP) return; // mid-fidget already — onClipEnd below settles it
    restTimer.current -= dt;
    if (restTimer.current > 0) return;
    setClip(FIDGET_CLIPS[Math.floor(Math.random() * FIDGET_CLIPS.length)]);
    setLoop(false);
  });

  const onClipEnd = () => {
    setClip(REST_CLIP);
    setLoop(true);
    restTimer.current = randomFidgetRest();
  };

  return { clip, loop, onClipEnd };
}
