'use client';
// Cedric the Bull's forest camp: a discoverable, gated location that becomes
// the game's capstone boss encounter. Grounded in the original game's own
// dialogue, not invented — King Leo: "Cedric still lives in the woods", a
// later challenge has him "up to something" with sawing sounds (an
// attack tower under construction), and the campaign's ending line is
// "we'll soon have Cedric safely behind bars." Revealed after Knight's Arms
// (see CEDRIC_REVEAL_QUEST); the fight itself is handled by Enemies.tsx
// (kind 'cedric') and gameStore's markCedricDefeated — this component is the
// static camp dressing plus the idle boss / jailed-after-defeat figures.
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore } from '@/game/combat';
import { CEDRIC_CAMP, CEDRIC_REVEAL_QUEST, CEDRIC_WORLD } from '@/game/data/world';
import { sampleTemplateGroundY } from './TemplateWorld';
import PropModel from './PropModel';
import RiggedFigure from '../character/RiggedFigure';
import type { CharacterConfig } from '@/game/types';

const CEDRIC_CONFIG: CharacterConfig = {
  name: 'Cedric the Bull', headDonor: 'minifigcedricbull00', bodyDonor: 'minifigcedricbull00',
  armColor: 34, handColor: 18, legColor: 38, hipColor: 34,
};

const CYL = '/assets/props/cylindrical';
const WEDGE = '/assets/props/wedge';
const SCEN = '/assets/props/scenery';

function CampProps() {
  return (
    <Suspense fallback={null}>
      {/* a part-built attack tower — deliberately unfinished, per the
          original game's own "up to something" / sawing-sounds lore */}
      <PropModel url={`${CYL}/00_l306200.glb`} height={2.6} position={[2, 0, -3]} />
      <PropModel url={`${CYL}/02_l458900.glb`} height={2.0} position={[2, 2.4, -3]} />
      <PropModel url={`${WEDGE}/00_l304000.glb`} height={0.8} position={[3.6, 0.1, -1.6]} yaw={0.6} />
      {/* camp dressing: supply crates, a barrel, dead trees */}
      <PropModel url={`${SCEN}/l473800.glb`} height={0.6} position={[-2.5, 0, 1.5]} yaw={0.3} />
      <PropModel url={`${SCEN}/l301500.glb`} height={0.7} position={[-3.6, 0, 0.2]} yaw={1.1} />
      <PropModel url={`${SCEN}/l248900.glb`} height={0.6} position={[-1.8, 0, -1.2]} />
      <PropModel url={`${SCEN}/l606400.glb`} height={2.4} position={[5, 0, 2]} />
      <PropModel url={`${SCEN}/l606400.glb`} height={1.8} position={[-5, 0, -3.5]} yaw={2} />
    </Suspense>
  );
}

export default function CedricCamp() {
  const completedQuests = useGameStore((s) => s.completedQuests);
  const defeatedCedric = useGameStore((s) => s.defeatedCedric);
  const destination = useGameStore((s) => s.destination);
  const cedricAlive = useEnemyStore((s) => s.enemies.some((e) => e.kind === 'cedric'));
  const revealed = completedQuests.includes(CEDRIC_REVEAL_QUEST);
  // Phase 20: the camp pitches at the foot of The Rival Castle — mounted
  // only while visiting, following the bake's real terrain height (sampled
  // per frame via a ref: the bake streams in async, so a one-shot sample at
  // mount could land before there's anything to raycast against)
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) {
      group.current.position.y = sampleTemplateGroundY(CEDRIC_CAMP.x, CEDRIC_CAMP.z);
    }
  });

  if (!revealed || destination !== CEDRIC_WORLD) return null;

  return (
    <group ref={group} position={[CEDRIC_CAMP.x, 0, CEDRIC_CAMP.z]}>
      <CampProps />
      {/* his chargers. The rig lab tags these two `traits.mount.faction:
          'cedric'` — red saddle and red face-mask barding — so they belong
          tethered at the Bull's camp, not grazing in the player's meadow. */}
      <Suspense fallback={null}>
        <PropModel url="/assets/props/lab/l7339231.glb" height={1.7} position={[-4.6, 0, 3.2]} yaw={0.7} />
        <PropModel url="/assets/props/lab/l7339232.glb" height={1.9} position={[-6.2, 0, 1.4]} yaw={1.2} />
      </Suspense>
      {!defeatedCedric && !cedricAlive && (
        <Suspense fallback={null}>
          <group rotation-y={Math.PI}>
            <RiggedFigure config={CEDRIC_CONFIG} height={1.9} keepProps clip="anim_r_restpose" />
          </group>
        </Suspense>
      )}
      {defeatedCedric && (
        <Suspense fallback={null}>
          <group position={[0, 0, 2.5]}>
            <RiggedFigure config={CEDRIC_CONFIG} height={1.9} keepProps clip="anim_r_restpose" />
            {/* the same portcullis lattice used for gates — bars on the man
                who "we'll soon have safely behind bars" */}
            <PropModel url="/assets/props/windows_doors/06_l318500.glb" height={2.4} position={[0, 0, -0.4]} />
          </group>
        </Suspense>
      )}
    </group>
  );
}
