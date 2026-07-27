'use client';
// The Dragonfire Siege: once the omen has been witnessed, deep-night rolls
// can bring the beast DOWN — it circles the homestead making low passes and
// breathes fire on wooden structures (stone shrugs the flames off — the
// top-tier reason to build in stone). The player's counterplay is real:
// crossbow/longbow bolts that pass near the beast wound it, and enough
// stings rout it early ("Sting the Sky" deed). A Castle Wall prefab caught
// in the fire degrades through its labeled damage-state molds (mc006 →
// mc009 breached → mc010 ruined — see damageBuilding). Survive either way
// for "Flame and Stone".
import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { useBoltStore } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { isBuilt } from '@/game/types';
import { dragonAir, loadDragonRig, type DragonRig } from './DragonOmen';

const SIEGE_SECONDS = 55;
const BREATH_EVERY = 6;   // seconds between fire passes
const BREATH_DAMAGE = 14;
const HITS_TO_ROUT = 5;
const CIRCLE_R = 30;
const ROLL_CHANCE = 0.25;

/** wood burns, stone holds — judged by what the piece is mostly built from */
function flammable(type: string): boolean {
  const def = BUILDABLE_BY_ID[type];
  if (!def) return false;
  const wood = (def.cost.wood ?? 0) + (def.cost.plank ?? 0);
  return wood > (def.cost.stone ?? 0);
}

function SiegeFlight({ onDone }: { onDone: (routed: boolean) => void }) {
  const [rig, setRig] = useState<DragonRig | null>(null);
  useEffect(() => {
    let live = true;
    loadDragonRig().then((r) => { if (live) setRig(r); });
    return () => { live = false; };
  }, []);
  const group = useRef<THREE.Group>(null);
  const fire = useRef<THREE.PointLight>(null);
  const fireBall = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const breathCd = useRef(3.5);
  const hits = useRef(0);
  const fireT = useRef(0);
  const stoneNote = useRef(false);
  const done = useRef(false);

  const finish = (routed: boolean) => {
    if (done.current) return;
    done.current = true;
    onDone(routed);
  };

  useFrame((_, dt) => {
    const g = group.current;
    if (!g || !rig || done.current) return;
    const st = useGameStore.getState();
    if (st.paused) return;
    t.current += dt;
    if (t.current >= SIEGE_SECONDS) { finish(false); return; }

    // low menacing circles over the homestead, dipping between passes
    const a = t.current * 0.32;
    g.position.set(Math.cos(a) * CIRCLE_R, 15 + Math.sin(t.current * 0.85) * 6, Math.sin(a) * CIRCLE_R);
    // G26 · publish where it is, so ground defenders can engage it
    dragonAir.hostile = true;
    dragonAir.x = g.position.x;
    dragonAir.y = g.position.y;
    dragonAir.z = g.position.z;
    // face along the tangent (velocity direction)
    const vx = -Math.sin(a);
    const vz = Math.cos(a);
    g.rotation.y = Math.atan2(-vx, -vz) + Math.PI;
    g.rotation.z = 0.22; // banked into the turn
    const beat = Math.sin(t.current * 4.2);
    rig.wingL.rotation.z = beat * 0.55;
    rig.wingR.rotation.z = -beat * 0.55;
    rig.tail.rotation.x = Math.sin(t.current * 4.2 - 0.9) * 0.16;
    rig.head.rotation.y = Math.sin(t.current * 0.8) * 0.35;

    // dragonfire: pick a standing wooden structure and scorch it
    breathCd.current -= dt;
    if (breathCd.current <= 0) {
      breathCd.current = BREATH_EVERY;
      const targets = st.buildings.filter((b) => isBuilt(b) && flammable(b.type));
      if (targets.length) {
        const b = targets[Math.floor(Math.random() * targets.length)];
        st.damageBuilding(b.id, BREATH_DAMAGE, 'scorched by dragonfire');
        audio.playAt('flame', b.x, b.z, 0.9);
        fireT.current = 1.4;
        if (fire.current) fire.current.position.set(b.x, 2.2, b.z);
        if (fireBall.current) fireBall.current.position.set(b.x, 1.2, b.z);
      } else if (!stoneNote.current) {
        stoneNote.current = true;
        st.notify('The flames find nothing to catch — stone holds against dragonfire!');
      }
    }
    if (fireT.current > 0) {
      fireT.current = Math.max(0, fireT.current - dt);
      const k = fireT.current / 1.4;
      if (fire.current) fire.current.intensity = k * 30;
      if (fireBall.current) {
        fireBall.current.visible = k > 0;
        fireBall.current.scale.setScalar(0.6 + (1 - k) * 1.8);
      }
    }

    // anything on the ground that can reach it lands a hit through here —
    // the player's bolts below, and a defender's arrows (G26)
    dragonAir.hit = (source: string) => {
      hits.current += 1;
      audio.play('thud', 0.9);
      if (hits.current >= HITS_TO_ROUT) { finish(true); return; }
      st.notify(`${source} strikes the beast! (${hits.current}/${HITS_TO_ROUT})`, true);
    };

    // counterplay: any bolt/arrow passing near the beast stings it
    const { bolts, remove } = useBoltStore.getState();
    for (const b of bolts) {
      const d = Math.hypot(b.pos.x - g.position.x, b.pos.y - g.position.y, b.pos.z - g.position.z);
      if (d < 4.5) {
        remove(b.id);
        hits.current += 1;
        audio.play('thud', 0.9);
        if (hits.current >= HITS_TO_ROUT) {
          finish(true);
          return;
        }
        st.notify(`🏹 A bolt strikes the beast! (${hits.current}/${HITS_TO_ROUT})`, true);
      }
    }
  });

  if (!rig) return null;
  return (
    <>
      <group ref={group} position={[CIRCLE_R, 15, 0]}>
        <primitive object={rig.root} />
      </group>
      <pointLight ref={fire} color="#ff7a2a" intensity={0} distance={26} decay={2} />
      <mesh ref={fireBall} visible={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#ff8c2e" transparent opacity={0.75} />
      </mesh>
    </>
  );
}

export default function DragonSiege() {
  const destination = useGameStore((s) => s.destination);
  const [active, setActive] = useState(false);
  const lastNightChecked = useRef(-1);
  const endRef = useRef<(routed: boolean) => void>(() => {});

  const end = (routed: boolean) => {
    dragonAir.busy = false;
    dragonAir.hostile = false;
    dragonAir.hit = null;
    setActive(false);
    const st = useGameStore.getState();
    st.recordDragonSiege(routed);
    st.notify(
      routed
        ? '🐉 Stung and shrieking, the dragon breaks off into the dark — the homestead stands!'
        : '🐉 The dragon wheels away, sated… for now. The homestead endures.',
      true,
    );
    audio.play('horn', 0.8);
  };
  endRef.current = end;

  // test hook, same convention as the rest of window.__kk*
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__kkSiege = {
      get active() { return active; },
      end: (routed: boolean) => endRef.current(routed),
    };
  }, [active]);

  useFrame(() => {
    if (destination || active) return;
    const st = useGameStore.getState();
    // the siege only comes after the omen has been seen, deep at night, to a
    // homestead worth burning — one roll per night, never two dragons at once
    if (worldEnv.night > 0.8 && worldEnv.dayCount !== lastNightChecked.current && !dragonAir.busy) {
      if (!st.dragonSeen || st.buildings.filter((b) => isBuilt(b)).length < 2) return;
      lastNightChecked.current = worldEnv.dayCount;
      if (Math.random() < ROLL_CHANCE) {
        dragonAir.busy = true;
        st.notify('🐉 DRAGONFIRE! The beast descends upon your homestead — to arms!', true);
        audio.play('horn', 0.95);
        audio.play('warcry', 0.7);
        setActive(true);
      }
    }
  });

  if (!active || destination) return null;
  return (
    <Suspense fallback={null}>
      <SiegeFlight onDone={end} />
    </Suspense>
  );
}
