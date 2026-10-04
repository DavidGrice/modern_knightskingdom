'use client';
// CLN-18 · one dragon siege, whichever dragon it is. DragonSiege.tsx (the
// green dragon of the omen) and BlackDragonSiege.tsx (Cedric's own beast,
// Wave 36) were two copies of this state machine that differed only in the
// numbers, the lines and the handles game/dragonSiegeConfig.ts now lists;
// each of those files mounts this with its own config.
//
// The siege: deep-night rolls can bring the beast DOWN — it circles the
// homestead making low passes and breathes fire on wooden structures (stone
// shrugs the flames off — the top-tier reason to build in stone). The
// player's counterplay is real: crossbow/longbow bolts that pass near the
// beast wound it, and enough stings rout it early ("Sting the Sky" deed). A
// Castle Wall prefab caught in the fire degrades through its labeled
// damage-state molds (mc006 → mc009 breached → mc010 ruined — see
// damageBuilding). Survive either way for "Flame and Stone".
import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { useBoltStore } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { isBuilt } from '@/game/types';
import { bossTierScale, BOSS_VICTORY_REWARD, rollBossLegendaryDrop } from '@/game/bossEncounter';
import { ITEMS } from '@/game/data/items';
import { dragonAir, dragonAirBlack } from '@/game/dragonAir';
import type { DragonSiegeConfig } from '@/game/dragonSiegeConfig';
import { loadDragonRig, type DragonRig } from './DragonOmen';
import { pick } from '@/lib/rng';
import { exposeDebug } from '@/lib/debugHooks';

const SIEGE_SECONDS = 55;
// Wave 57 (F5): a bounded chain reaction, folded into the same breath tick
// rather than a new timer. Numbers chosen so a dense base visibly catches
// without a siege routinely razing the whole thing: ~9-11 ticks per 55s siege
// * 0.18 spread chance per burning building ~= 1-2 expected extra ignitions in
// a base with real neighbors, hard-capped at 3 simultaneous fires total.
// SPREAD_RADIUS=8m (center-to-center) catches a piece placed right next to
// another (typical footprints run 2-8m; walls in a run touch at ~0m gap)
// without reaching across a spread-out base — an isolated flammable building
// with nothing flammable within 8m never spreads at all, which is the intended
// "build densely at your own risk" read, not "never build wood."
const MAX_BURNING = 3;
const SPREAD_RADIUS = 8;
const SPREAD_CHANCE = 0.18;

/** wood burns, stone holds — judged by what the piece is mostly built from */
function flammable(type: string): boolean {
  const def = BUILDABLE_BY_ID[type];
  if (!def) return false;
  const wood = (def.cost.wood ?? 0) + (def.cost.plank ?? 0);
  return wood > (def.cost.stone ?? 0);
}

function SiegeFlight({ cfg, hitsToRout, onDone }: { cfg: DragonSiegeConfig; hitsToRout: number; onDone: (routed: boolean) => void }) {
  const [rig, setRig] = useState<DragonRig | null>(null);
  useEffect(() => {
    let live = true;
    loadDragonRig(cfg.rig).then((r) => { if (live) setRig(r); });
    return () => { live = false; };
  }, [cfg.rig]);
  const group = useRef<THREE.Group>(null);
  // Wave 57 (F5): up to MAX_BURNING buildings on fire at once now, each with
  // its own light/fireball slot (fixed-size — MAX_BURNING is a constant, not
  // a dynamic list of hooks) and its own decaying fireT for the visual pulse.
  const fireLights = useRef<(THREE.PointLight | null)[]>([null, null, null]);
  const fireBalls = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const burning = useRef<{ id: string; x: number; z: number; fireT: number }[]>([]);
  const t = useRef(0);
  const breathCd = useRef(cfg.firstBreath);
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

    // low menacing circles over the homestead, dipping between passes
    const a = t.current * cfg.orbitRate;
    g.position.set(Math.cos(a) * cfg.circleR, cfg.altitude + Math.sin(t.current * cfg.bobRate) * 6, Math.sin(a) * cfg.circleR);
    // G26 · publish where it is, so ground defenders can engage it
    cfg.air.hostile = true;
    cfg.air.x = g.position.x;
    cfg.air.y = g.position.y;
    cfg.air.z = g.position.z;
    // face along the tangent (velocity direction)
    const vx = -Math.sin(a);
    const vz = Math.cos(a);
    g.rotation.y = Math.atan2(-vx, -vz) + Math.PI;
    g.rotation.z = cfg.bank; // banked into the turn
    const beat = Math.sin(t.current * cfg.wingRate);
    rig.wingL.rotation.z = beat * 0.55;
    rig.wingR.rotation.z = -beat * 0.55;
    rig.tail.rotation.x = Math.sin(t.current * cfg.wingRate - 0.9) * 0.16;
    rig.head.rotation.y = Math.sin(t.current * cfg.headRate) * 0.35;

    // dragonfire: a bounded chain reaction (Wave 57/F5) — every currently-
    // burning building takes another hit and is dropped from the set the
    // instant it's no longer isBuilt (destroyed, or turned to a ruin —
    // leaveRuin:true below means ruin is the only outcome a dragon ever
    // causes); each survivor then rolls a chance to leap to a fresh
    // flammable neighbor, capped at MAX_BURNING total. If nothing is
    // burning at all (siege start, or the last blaze already died out),
    // seed one fresh random target exactly as before this wave.
    breathCd.current -= dt;
    if (breathCd.current <= 0) {
      breathCd.current = cfg.breathEvery;
      if (burning.current.length === 0) {
        const targets = st.buildings.filter((b) => isBuilt(b) && flammable(b.type));
        if (targets.length) {
          const b = pick(targets);
          st.damageBuilding(b.id, cfg.breathDamage, cfg.lines.scorched, true);
          audio.playAt('flame', b.x, b.z, 0.9);
          burning.current.push({ id: b.id, x: b.x, z: b.z, fireT: 1.4 });
        } else if (!stoneNote.current) {
          stoneNote.current = true;
          st.notify(cfg.lines.stoneHolds);
        }
      } else {
        for (const entry of burning.current) {
          st.damageBuilding(entry.id, cfg.breathDamage, cfg.lines.scorched, true);
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
          const next = pick(candidates);
          burning.current.push({ id: next.id, x: next.x, z: next.z, fireT: 1.4 });
          burningIds.add(next.id);
          audio.playAt('flame', next.x, next.z, 0.8);
          st.notify('🔥 The fire leaps to a neighboring structure!', true);
        }
      }
    }
    // per-slot fire visuals — decays every frame regardless of the tick
    // above, same k-curve the old single-fire version used
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
    // the player's bolts below, and a defender's arrows (G26)
    cfg.air.hit = (source: string) => {
      hits.current += 1;
      audio.play('thud', 0.9);
      if (hits.current >= hitsToRout) { finish(true); return; }
      st.notify(cfg.lines.struck(source, hits.current, hitsToRout), true);
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
        st.notify(cfg.lines.boltStruck(hits.current, hitsToRout), true);
      }
    }
  });

  if (!rig) return null;
  return (
    <>
      <group ref={group} position={[cfg.circleR, cfg.altitude, 0]}>
        <primitive object={rig.root} />
      </group>
      {/* fixed MAX_BURNING slots — one light+fireball pair reused per
          currently-burning building, positioned/hidden every frame above */}
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

export default function DragonSiegeController({ config: cfg }: { config: DragonSiegeConfig }) {
  const destination = useGameStore((s) => s.destination);
  const [active, setActive] = useState(false);
  const lastNightChecked = useRef(-1);
  // captured once per roll, not re-read live — a fight in progress must not
  // get harder out from under the player if their tier ticks over mid-siege
  // (mirrors EnemyData.scale's own "fixed at spawn" rule, combat.ts)
  const hitsToRoutRef = useRef(cfg.hitsToRoutBase);
  const endRef = useRef<(routed: boolean) => void>(() => {});

  const end = (routed: boolean) => {
    cfg.air.busy = false;
    cfg.air.hostile = false;
    cfg.air.hit = null;
    setActive(false);
    const st = useGameStore.getState();
    cfg.record(st, routed);
    // Wave 38 (A1): a rout pays — the green dragon's was achievements-only
    // before (see BOSS_VICTORY_REWARD's own doc comment).
    if (routed) {
      st.addItems(BOSS_VICTORY_REWARD[cfg.boss].items, 'grant');
      st.addXp('combat', BOSS_VICTORY_REWARD[cfg.boss].xp);
    }
    // Wave 50 (C2): a small, independent chance at a real legendary weapon on
    // top of the flat reward above — see bossEncounter.ts's own
    // BOSS_LEGENDARY_DROP for the odds: the green dragon carries the
    // stingiest of the three fights (lowest unlockTier, the most repeatable),
    // the black dragon better ones (it sits at the curve's ceiling and is
    // rarer to even reach).
    const drop = routed ? rollBossLegendaryDrop(cfg.boss) : null;
    if (drop) st.addItems({ [drop]: 1 }, 'grant');
    st.notify(routed ? cfg.lines.routed : cfg.lines.sated, true);
    if (drop) st.notify(`✨ Among the scorched hoard: a ${ITEMS[drop].name}!`, true);
    audio.play('horn', 0.8);
  };
  endRef.current = end;

  // test hook, same convention as the rest of window.__kk*
  useEffect(() => {
    exposeDebug(cfg.debugKey, {
      get active() { return active; },
      end: (routed: boolean) => endRef.current(routed),
    });
  }, [active, cfg.debugKey]);

  useFrame(() => {
    if (destination || active) return;
    const st = useGameStore.getState();
    // deep at night, to a homestead worth burning — one roll per night, never
    // two dragons at once (Wave 36, A8: each dragon checks the other's flag as
    // well as its own; this is its half of that mutual guard).
    if (worldEnv.night > 0.8 && worldEnv.dayCount !== lastNightChecked.current && !dragonAir.busy && !dragonAirBlack.busy) {
      if (!cfg.allowed(st)) return;
      lastNightChecked.current = worldEnv.dayCount;
      if (Math.random() < cfg.rollChance) {
        // Wave 38 (A1): rolled once here, fixed for the fight — the shared
        // bossTierScale curve (game/bossEncounter.ts).
        hitsToRoutRef.current = Math.round(cfg.hitsToRoutBase * bossTierScale(cfg.boss));
        cfg.air.busy = true;
        st.notify(cfg.lines.descends, true);
        audio.play('horn', 0.95);
        audio.play('warcry', 0.7);
        // Wave 57 (F5): a one-shot, dragon-specific flavor line. This
        // extraction has no dragon-specific fear/look-up pose (~15 clips
        // total, confirmed by a prior wave) so reusing flee_to_safety
        // verbatim (see ai/actions/flee.ts) gives zero dragon flavor on its
        // own — a named villager's own line, fired once in this same
        // one-time roll branch (mirrors the horn/warcry calls just above),
        // is the achievable distinguishing touch without new movement.
        if (st.villagers.length) {
          const v = pick(st.villagers);
          st.notify(cfg.lines.scream(v.name), true);
        }
        setActive(true);
      }
    }
  });

  if (!active || destination) return null;
  return (
    <Suspense fallback={null}>
      <SiegeFlight cfg={cfg} hitsToRout={hitsToRoutRef.current} onDone={end} />
    </Suspense>
  );
}
