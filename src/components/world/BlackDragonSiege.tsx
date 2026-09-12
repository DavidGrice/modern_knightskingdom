'use client';
// Wave 36 (A8) · The Black Dragon: Cedric's own beast, l7517401 — a second,
// fully independent dragon siege, mirroring DragonSiege.tsx's own
// nightly-roll shape exactly (the same "duplicate the state machine for a
// second entity" precedent CedricSiege.tsx already set for Cedric's own
// homestead assault). This was a sibling file rather than a retrofit onto
// the EXISTING, already-tuned green dragon, to avoid blurring into "build a
// generalized boss-encounter framework" (its own later item) and risking
// the shipped encounter — Wave 38 (A1) is that later item: both dragons now
// read one shared hits-to-rout curve (game/bossEncounter.ts) instead of
// this file's own local formula.
//
// Gated well past the first dragon (game/difficulty.ts's blackDragonAllowed:
// the curve's ceiling tier AND having already routed the green dragon at
// least once) — this is what the realm sends once a player has proven they
// can already beat one dragon, not a second copy of the same unlock. Unlike
// the original (which grants nothing on rout — only achievements), this one
// has real stakes: Cedric's beast carries a real haul.
import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { useBoltStore } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { isBuilt } from '@/game/types';
import { blackDragonAllowed } from '@/game/difficulty';
import { bossTierScale, BOSS_VICTORY_REWARD, rollBossLegendaryDrop } from '@/game/bossEncounter';
import { ITEMS } from '@/game/data/items';
import { dragonAir, dragonAirBlack } from '@/game/dragonAir';
import { loadDragonRig, type DragonRig } from './DragonOmen';

const SIEGE_SECONDS = 55;
const BREATH_EVERY = 5;   // a shade quicker than the green dragon's own 6s
const BREATH_DAMAGE = 18;
// Wave 57 (F5): same bounded chain reaction as DragonSiege.tsx, same numbers
// — see that file's own comment for the math (~9-11 ticks/siege * 0.18 ~=
// 1-2 expected extra ignitions, hard-capped at 3, 8m catches touching/near
// footprints without reaching across a spread-out base).
const MAX_BURNING = 3;
const SPREAD_RADIUS = 8;
const SPREAD_CHANCE = 0.18;
// Wave 38 (A1): base threshold, scaled at roll time by bossTierScale('blackDragon')
// — was its own local `6 + Math.max(0, difficultyState.tier - 5)` formula,
// now the same shared curve the green dragon reads (BOSS_TIER_STEP,
// bossEncounter.ts). Numerically identical today: BLACK_DRAGON_TIER already
// sits at TIER_RULES' own ceiling, so bossTierScale('blackDragon') is
// always 1 until a future wave extends the curve past tier 5.
const HITS_TO_ROUT_BASE = 6;
const CIRCLE_R = 26;
const ROLL_CHANCE = 0.18;

/** wood burns, stone holds — same judgement DragonSiege.tsx makes */
function flammable(type: string): boolean {
  const def = BUILDABLE_BY_ID[type];
  if (!def) return false;
  const wood = (def.cost.wood ?? 0) + (def.cost.plank ?? 0);
  return wood > (def.cost.stone ?? 0);
}

function SiegeFlight({ hitsToRout, onDone }: { hitsToRout: number; onDone: (routed: boolean) => void }) {
  const [rig, setRig] = useState<DragonRig | null>(null);
  useEffect(() => {
    let live = true;
    loadDragonRig('black').then((r) => { if (live) setRig(r); });
    return () => { live = false; };
  }, []);
  const group = useRef<THREE.Group>(null);
  // Wave 57 (F5): up to MAX_BURNING buildings on fire at once — see
  // DragonSiege.tsx's own SiegeFlight for the identical mechanism.
  const fireLights = useRef<(THREE.PointLight | null)[]>([null, null, null]);
  const fireBalls = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const burning = useRef<{ id: string; x: number; z: number; fireT: number }[]>([]);
  const t = useRef(0);
  const breathCd = useRef(3);
  const hits = useRef(0);
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

    // low menacing circles, a touch tighter and faster than the green dragon's
    const a = t.current * 0.36;
    g.position.set(Math.cos(a) * CIRCLE_R, 14 + Math.sin(t.current * 0.9) * 6, Math.sin(a) * CIRCLE_R);
    dragonAirBlack.hostile = true;
    dragonAirBlack.x = g.position.x;
    dragonAirBlack.y = g.position.y;
    dragonAirBlack.z = g.position.z;
    const vx = -Math.sin(a);
    const vz = Math.cos(a);
    g.rotation.y = Math.atan2(-vx, -vz) + Math.PI;
    g.rotation.z = 0.24;
    const beat = Math.sin(t.current * 4.6);
    rig.wingL.rotation.z = beat * 0.55;
    rig.wingR.rotation.z = -beat * 0.55;
    rig.tail.rotation.x = Math.sin(t.current * 4.6 - 0.9) * 0.16;
    rig.head.rotation.y = Math.sin(t.current * 0.85) * 0.35;

    // dragonfire: a bounded chain reaction (Wave 57/F5) — see
    // DragonSiege.tsx's own SiegeFlight for the identical mechanism/comment.
    breathCd.current -= dt;
    if (breathCd.current <= 0) {
      breathCd.current = BREATH_EVERY;
      if (burning.current.length === 0) {
        const targets = st.buildings.filter((b) => isBuilt(b) && flammable(b.type));
        if (targets.length) {
          const b = targets[Math.floor(Math.random() * targets.length)];
          st.damageBuilding(b.id, BREATH_DAMAGE, "scorched by the black dragon's flame", true);
          audio.playAt('flame', b.x, b.z, 0.9);
          burning.current.push({ id: b.id, x: b.x, z: b.z, fireT: 1.4 });
        } else if (!stoneNote.current) {
          stoneNote.current = true;
          st.notify('The flames find nothing to catch — stone holds against the black dragon!');
        }
      } else {
        for (const entry of burning.current) {
          st.damageBuilding(entry.id, BREATH_DAMAGE, "scorched by the black dragon's flame", true);
          audio.playAt('flame', entry.x, entry.z, 0.9);
          entry.fireT = 1.4;
        }
        const live = useGameStore.getState().buildings;
        burning.current = burning.current.filter((entry) => {
          const b = live.find((x) => x.id === entry.id);
          return !!b && isBuilt(b);
        });
        const burningIds = new Set(burning.current.map((e) => e.id));
        for (const entry of [...burning.current]) {
          if (burning.current.length >= MAX_BURNING) break;
          if (Math.random() >= SPREAD_CHANCE) continue;
          const candidates = live.filter((o) => !burningIds.has(o.id) && isBuilt(o) && flammable(o.type)
            && Math.hypot(o.x - entry.x, o.z - entry.z) <= SPREAD_RADIUS);
          if (!candidates.length) continue;
          const next = candidates[Math.floor(Math.random() * candidates.length)];
          burning.current.push({ id: next.id, x: next.x, z: next.z, fireT: 1.4 });
          burningIds.add(next.id);
          audio.playAt('flame', next.x, next.z, 0.8);
          st.notify('🔥 The fire leaps to a neighboring structure!', true);
        }
      }
    }
    // per-slot fire visuals — decays every frame regardless of the tick above
    for (let i = 0; i < MAX_BURNING; i++) {
      const entry = burning.current[i];
      const light = fireLights.current[i];
      const ball = fireBalls.current[i];
      if (entry) {
        entry.fireT = Math.max(0, entry.fireT - dt);
        const k = entry.fireT / 1.4;
        if (light) { light.position.set(entry.x, 2.2, entry.z); light.intensity = k * 30; }
        if (ball) {
          ball.position.set(entry.x, 1.2, entry.z);
          ball.visible = k > 0;
          ball.scale.setScalar(0.6 + (1 - k) * 1.8);
        }
      } else {
        if (light) light.intensity = 0;
        if (ball) ball.visible = false;
      }
    }

    // anything on the ground that can reach it lands a hit through here —
    // the player's bolts below, and a defender's arrows (mirrors dragonAir)
    dragonAirBlack.hit = (source: string) => {
      hits.current += 1;
      audio.play('thud', 0.9);
      if (hits.current >= hitsToRout) { finish(true); return; }
      st.notify(`${source} strikes the black beast! (${hits.current}/${hitsToRout})`, true);
    };

    // counterplay: any bolt/arrow passing near the beast stings it
    const { bolts, remove } = useBoltStore.getState();
    for (const b of bolts) {
      const d = Math.hypot(b.pos.x - g.position.x, b.pos.y - g.position.y, b.pos.z - g.position.z);
      if (d < 4.5) {
        remove(b.id);
        hits.current += 1;
        audio.play('thud', 0.9);
        if (hits.current >= hitsToRout) {
          finish(true);
          return;
        }
        st.notify(`🏹 A bolt strikes the black beast! (${hits.current}/${hitsToRout})`, true);
      }
    }
  });

  if (!rig) return null;
  return (
    <>
      <group ref={group} position={[CIRCLE_R, 14, 0]}>
        <primitive object={rig.root} />
      </group>
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <pointLight ref={(el) => { fireLights.current[i] = el; }} color="#ff7a2a" intensity={0} distance={26} decay={2} />
          <mesh ref={(el) => { fireBalls.current[i] = el; }} visible={false}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshBasicMaterial color="#ff8c2e" transparent opacity={0.75} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function BlackDragonSiege() {
  const destination = useGameStore((s) => s.destination);
  const [active, setActive] = useState(false);
  const lastNightChecked = useRef(-1);
  // captured once per roll, not re-read live — a fight in progress must not
  // get harder out from under the player if their tier ticks over mid-siege
  // (mirrors EnemyData.scale's own "fixed at spawn" rule, combat.ts)
  const hitsToRoutRef = useRef(HITS_TO_ROUT_BASE);
  const endRef = useRef<(routed: boolean) => void>(() => {});

  const end = (routed: boolean) => {
    dragonAirBlack.busy = false;
    dragonAirBlack.hostile = false;
    dragonAirBlack.hit = null;
    setActive(false);
    const st = useGameStore.getState();
    st.recordBlackDragonSiege(routed);
    if (routed) {
      st.addItems(BOSS_VICTORY_REWARD.blackDragon.items, 'grant');
      st.addXp('combat', BOSS_VICTORY_REWARD.blackDragon.xp);
    }
    // Wave 50 (C2): a real chance at a legendary weapon on top of the flat
    // reward above — better odds than the green dragon (bossEncounter.ts's
    // own BOSS_LEGENDARY_DROP), since this fight sits at the curve's ceiling
    // and is rarer to even reach.
    const drop = routed ? rollBossLegendaryDrop('blackDragon') : null;
    if (drop) st.addItems({ [drop]: 1 }, 'grant');
    st.notify(
      routed
        ? '🐉 Stung and shrieking, the black dragon breaks off into the dark — the homestead stands!'
        : '🐉 The black dragon wheels away, sated… for now. The homestead endures.',
      true,
    );
    if (drop) st.notify(`✨ Among the scorched hoard: a ${ITEMS[drop].name}!`, true);
    audio.play('horn', 0.8);
  };
  endRef.current = end;

  // test hook, same convention as __kkSiege/__kkCedricSiege
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__kkBlackSiege = {
      get active() { return active; },
      end: (routed: boolean) => endRef.current(routed),
    };
  }, [active]);

  useFrame(() => {
    if (destination || active) return;
    const st = useGameStore.getState();
    // deep night, once per day, never stacked with the green dragon
    if (
      worldEnv.night > 0.8 && worldEnv.dayCount !== lastNightChecked.current
      && !dragonAir.busy && !dragonAirBlack.busy
    ) {
      if (!blackDragonAllowed(st)) return;
      lastNightChecked.current = worldEnv.dayCount;
      if (Math.random() < ROLL_CHANCE) {
        // Wave 38 (A1): now the shared bossTierScale curve — see this file's
        // own HITS_TO_ROUT_BASE comment above for why the numbers don't move
        // yet under today's TIER_RULES.
        hitsToRoutRef.current = Math.round(HITS_TO_ROUT_BASE * bossTierScale('blackDragon'));
        dragonAirBlack.busy = true;
        st.notify("🐉 THE BLACK DRAGON! Cedric's own beast descends upon your homestead — to arms!", true);
        audio.play('horn', 0.95);
        audio.play('warcry', 0.7);
        // Wave 57 (F5): same one-shot dragon-specific flavor line as
        // DragonSiege.tsx — see that file's own comment for why this is the
        // achievable "specific to a dragon" touch given the ~15-clip ceiling.
        if (st.villagers.length) {
          const v = st.villagers[Math.floor(Math.random() * st.villagers.length)];
          st.notify(`${v.name} points at the black shape overhead and screams — the homestead scatters!`, true);
        }
        setActive(true);
      }
    }
  });

  if (!active || destination) return null;
  return (
    <Suspense fallback={null}>
      <SiegeFlight hitsToRout={hitsToRoutRef.current} onDone={end} />
    </Suspense>
  );
}
