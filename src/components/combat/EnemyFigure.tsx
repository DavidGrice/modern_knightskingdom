'use client';
// CLN-13 · an enemy's figure: its minifig (game/data/enemies.ts's KIND_FIGURE) and what it holds, and — for one of
// Cedric's riders or a siege crew — the horse under it or the engine it mans. Enemies.tsx's Enemy draws it inside the
// group its frame (game/enemyAi/step.ts) stands and turns. G-06 · and a thief's load on his back, once he has one.
// G-10 · his attack clip played once a swing, at his swing's timeScale (game/enemyAi/engage.ts's swingOf).
import { Suspense, useEffect, useRef } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { ArmShield, HeldCrossbow, HeldHalberd, HeldSpear, HeldSword, SpellHandGlow } from '../character/Equipment';
import { MOUNT_SEAT_Y, type EnemyData } from '@/game/combat';
import RiggedProp from '../world/RiggedProp';
import RiggedFigure from '../character/RiggedFigure';
import { preloadClip, type RiggedMinifig } from '@/lib/minifigRig';
import { BUILDABLE_BY_ID, heightOf } from '@/game/data/buildables';
import { haulOf } from '@/game/plunder';
import PropModel from '../world/PropModel';
import { labOccupyMode } from '@/game/data/labCapabilities';
import { KIND_FIGURE } from '@/game/data/enemies';
import { CLIP_TIMING } from '@/game/combat/fightClips';
import { swingOf } from '@/game/enemyAi/engage';
import type { EnemyCue } from '@/game/enemyAi/frame';

/** how far back of its own manned engine's centre a siege crew's figure
 *  stands, so it doesn't render inside the catapult's own mesh — same
 *  "standoff behind the machine" idea game/crew.ts's own crewState.back
 *  computes for the PLAYER crewing an engine, just a fixed approximation
 *  here rather than re-deriving it from the buildable's own depth */
const SIEGE_CREW_STANDOFF = 2.2;

/** G-06 · the props a thief's load is drawn with — the Barrel's and the Stockpile's crate's own molds, no new asset —
 *  and how tall each stands on his back */
const LOADS = [
  { model: BUILDABLE_BY_ID.barrel.model!, height: 0.5 },
  { model: BUILDABLE_BY_ID.stockpile.model!, height: 0.42 },
];

/** G-06 · A thief's load, slung on his back (the body joint, behind the chest the chestplate covers), drawn from the
 *  first good he takes until he falls or is gone — a barrel or a crate by his id, so that a thief can be told from a
 *  fighter at a distance. His haul changes in place (blows.ts's takeFromStore), so it is looked at every frame. */
function CarriedLoad({ data }: { data: EnemyData }) {
  const group = useRef<Group>(null);
  const load = LOADS[data.id % LOADS.length];
  useFrame(() => {
    if (group.current) group.current.visible = haulOf(data.carried) > 0;
  });
  return (
    <group ref={group} position={[0, -0.04, -0.34]} visible={false}>
      <Suspense fallback={null}>
        <PropModel url={load.model} height={load.height} />
      </Suspense>
    </group>
  );
}

export default function EnemyFigure({ data, clip, cue, ridePace, rig, onReady }: {
  data: EnemyData;
  clip: string;
  /** G-10 · the swing his attack clip is played for */
  cue: EnemyCue;
  /** how fast a mounted raider is really travelling, for its horse's walk */
  ridePace: number;
  /** the figure's rig once it has loaded, for what it holds */
  rig: RiggedMinifig | null;
  onReady: (rig: RiggedMinifig) => void;
}) {
  // G-10 · his attack clip, once a swing: from its first frame for a shot drawn to its release, from its hit for a blow
  // that landed at once (a caster's swing at one of the player's side plays his spell's clip so)
  const swing = swingOf(data);
  const attacking = clip === swing.clip;
  // G-10 · his attack clip fetched as he comes on, not at his first swing: a clip loads on its first play, and he stands
  // at rest till that swing (step.ts), so nothing else would ask for it sooner
  useEffect(() => { preloadClip(swing.clip); }, [swing.clip]);
  return (
    <>
      {/* Wave 36 (A3): one of Cedric's own tethered chargers — the same
          RiggedProp + gaitSpeed pattern Defenders.tsx already uses for a
          mounted defender's own horse, so this reuses a shipped rig rather
          than inventing a second one. */}
      {data.mountAsset && (
        <Suspense fallback={null}>
          <RiggedProp assetId={data.mountAsset} height={data.mountAsset === 'l7339232' ? 1.9 : 1.7} gaitSpeed={ridePace} />
        </Suspense>
      )}
      {/* Wave 37 (A3 remainder): a real Wave-35 turret asset — the same
          RiggedProp pattern the mount above already uses, just for a
          stationary engine instead of a horse. Rotates with the whole group
          (its frame's own turn, game/enemyAi/) exactly like the mount does, so the machine
          visibly turns to face whatever it just fired at. */}
      {data.siegeAsset && (
        <Suspense fallback={null}>
          <RiggedProp assetId={data.siegeAsset} height={heightOf(data.siegeAsset)} buildingId={`siegeCrew_${data.id}`} />
        </Suspense>
      )}
      <group
        position-y={data.mountAsset ? MOUNT_SEAT_Y : 0}
        // the crew stands clear of its own machine rather than rendering
        // inside it — SIEGE_CREW_STANDOFF's own comment above explains the
        // fixed approximation; labOccupyMode is consulted (rather than
        // hardcoding standing) so a future seated variant (oc6032b1) gets
        // the right leg pose for free, same as a mounted rider's does.
        position-z={data.siegeAsset ? SIEGE_CREW_STANDOFF : 0}
      >
        <RiggedFigure
          config={KIND_FIGURE[data.kind]}
          height={1.72}
          // Wave 36 (A3): the same straddle-bend override Defenders.tsx
          // already applies to a mounted rider's legs (RiggedFigure.tsx's
          // own seatedLegPose, Wave 34/G6.7) — config-agnostic, so it reuses
          // cleanly onto an enemy rig too. Wave 37: extended to a siege
          // crew's own manned engine, via the lab's real occupyMode data.
          seatedLegPose={!!data.mountAsset || labOccupyMode(data.siegeAsset) === 'seated'}
          // Reported 2026-07-28: Gilbert spawned with a hand floating away from
          // his body. Root cause — his donor's own molded axe+shield are
          // "prop"-kind parts (verified, part_roles.json): kept (per the old
          // `keepProps` here) means they're parented straight to the body
          // joint at their ORIGINAL baked position, never re-hung alongside
          // the arm the way the hand riding it is (see rehangArm) — so once
          // the arm moves to its neutral hanging pose, the axe stays exactly
          // where it was baked, adrift from wherever the hand ended up. It was
          // also pure redundancy: bandits/Gilbert/royal knights already carry
          // a REAL separately-portalled weapon below, and neither Cedric's
          // horn+helmet nor Storm's visor are "prop" kind at all (they're
          // "accessory", which is always kept regardless of this flag) — so
          // no enemy in the roster actually needs their own donor's molded
          // weapon kept. Confirmed with a fresh read of every KIND_FIGURE entry's
          // rig data, not assumed.
          keepProps={false}
          clip={clip}
          loop={!attacking}
          timeScale={attacking ? swing.timeScale : 1.15}
          cue={cue.n}
          from={attacking && !cue.held ? CLIP_TIMING[clip].hit : 0}
          onReady={onReady}
        />
        {/* bandits: a raiding party mixes melee and ranged rather than every
            raider carrying the same halberd (requested 2026-07-30) — the
            `ranged` roll happens once at spawn (combat.ts), so it's stable for
            the mob's whole life, and its frame's own AI (game/enemyAi/)
            already reads the same flag to hold-and-hit-scan at range instead of
            closing to melee. Gilbert, their leader, always fights melee. */}
        {rig && data.kind === 'bandit' && data.ranged
          && createPortal(<HeldCrossbow side={-1} />, rig.joints.rightarm)}
        {rig && ((data.kind === 'bandit' && !data.ranged) || data.kind === 'gilbert')
          && createPortal(<HeldHalberd side={-1} />, rig.joints.rightarm)}
        {/* the crown's knights — and Cedric, their equal and opposite — fight
            sword-and-shield, like the player's own kit. Wave 37: the
            shielded elite (its whole mechanic) and the siege crew's own
            melee-defense fallback join the same kit. */}
        {rig && (data.kind === 'royal' || data.kind === 'cedric' || data.kind === 'skeleton'
          || data.kind === 'shieldedElite' || data.kind === 'siegeCrew')
          && createPortal(<HeldSword side={-1} />, rig.joints.rightarm)}
        {/* shields (requested 2026-07-30): every melee kind now carries one —
            a crossbow bandit's off-hand stays empty (it's a two-handed weapon,
            same as Gilbert's halberd), and skeletons pick up the shield they
            were the one melee kind still missing. */}
        {rig && (data.kind === 'royal' || data.kind === 'cedric' || data.kind === 'skeleton'
          || (data.kind === 'bandit' && !data.ranged) || data.kind === 'shieldedElite' || data.kind === 'siegeCrew')
          && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
        {/* Wave 36 (A3): couched-lance cavalry — spear and shield, like the
            player's own kit rather than Gilbert's halberd (a two-handed
            weapon a rider on a charger has no free hand for). */}
        {rig && data.kind === 'mountedRaider'
          && createPortal(<HeldSpear side={-1} />, rig.joints.rightarm)}
        {rig && data.kind === 'mountedRaider'
          && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
        {/* Wave 37 (A3 remainder): the caster is fully bare-handed — the
            first enemy in the roster with no held prop at all — save for a
            small self-lit glow at its casting hand, so it reads as a
            spellcaster rather than simply unarmed. */}
        {rig && data.kind === 'caster'
          && createPortal(<SpellHandGlow side={-1} />, rig.joints.rightarm)}
        {rig && data.thief && createPortal(<CarriedLoad data={data} />, rig.joints.body)}
      </group>
    </>
  );
}
