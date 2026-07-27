'use client';
// Reusable animated minifig: assembles the rig for a character config and
// plays whatever clip the parent asks for. Used by the creator preview,
// the third-person player avatar and NPCs.
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { assembleRiggedMinifig, type RiggedMinifig } from '@/lib/minifigRig';
import type { CharacterConfig } from '@/game/types';

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
    rig?.animator.update(Math.min(dt, 0.06));
  });

  if (!rig) return null;
  return <primitive object={rig.group} />;
}
