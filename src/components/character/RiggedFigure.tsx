'use client';
// Reusable animated minifig: assembles the rig for a character config and
// plays whatever clip the parent asks for. Used by the creator preview,
// the third-person player avatar and NPCs.
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { assembleRiggedMinifig, type RiggedMinifig } from '@/lib/minifigRig';
import type { CharacterConfig } from '@/game/types';
import { useAppStore } from '@/game/store/appStore';
import { GRAPHICS_PROFILES } from '@/game/graphicsProfiles';

/** scratch for the LOD distance check below — module-scope like every other
 *  per-frame scratch object in this codebase (see PlayerController.tsx) */
const _worldPos = new THREE.Vector3();

export default function RiggedFigure({
  config,
  height = 1.75,
  clip,
  loop = true,
  timeScale = 1,
  onClipEnd,
  onReady,
  keepProps = false,
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
}) {
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  const endRef = useRef(onClipEnd);
  endRef.current = onClipEnd;

  // Requested 2026-07-31 (Performance quality tier): every rigged character
  // in the game — villagers, NPCs, enemies, mounted riders, the player's own
  // third-person avatar — renders through this ONE component, always as a
  // child of a caller-repositioned outer <group>, so a distance cutoff here
  // covers all of them with zero changes to any caller. `characterLodDistance`
  // is null at Balanced/Ultra (no cutoff at all, unchanged behavior).
  const lodDistance = useAppStore((s) => GRAPHICS_PROFILES[s.settings.graphicsQuality].characterLodDistance);
  const { camera } = useThree();
  const lodTimer = useRef(0);
  const culled = useRef(false);

  useEffect(() => {
    let alive = true;
    assembleRiggedMinifig(config, height, keepProps)
      .then((r) => {
        if (!alive) return;
        setRig(r);
        onReady?.(r);
      })
      .catch((e) => console.error('rig assembly failed', e));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.headDonor, config.bodyDonor, config.armColor, config.handColor, config.legColor, config.hipColor, height, keepProps]);

  useEffect(() => {
    if (!rig) return;
    rig.animator.play(clip, { loop, timeScale, onEnd: () => endRef.current?.() });
  }, [rig, clip, loop, timeScale]);

  useFrame((_, dt) => {
    if (!rig) return;
    if (lodDistance != null) {
      // ~5Hz — a coarse LOD decision, matching the AI LOD system's own
      // tierRefreshHz convention (src/ai/config/lod.json), not a per-frame one
      lodTimer.current -= dt;
      if (lodTimer.current <= 0) {
        lodTimer.current = 0.2;
        rig.group.getWorldPosition(_worldPos);
        culled.current = _worldPos.distanceTo(camera.position) > lodDistance;
        rig.group.visible = !culled.current;
      }
    } else if (!rig.group.visible) {
      // tier switched away from Performance mid-session — un-hide
      // immediately rather than waiting for the next throttled tick
      culled.current = false;
      rig.group.visible = true;
    }
    // a hard visibility toggle, not a fade and not a reduced-poly swap —
    // skips both the draw call (three.js doesn't recurse into invisible
    // subtrees, so portaled equipment on rig.joints.* is correctly skipped
    // too) and the bone/skinning update cost below
    if (!culled.current) rig.animator.update(Math.min(dt, 0.06));
  });

  if (!rig) return null;
  return <primitive object={rig.group} />;
}
