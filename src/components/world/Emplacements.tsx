'use client';
// G23/G24 · Emplacements that fight.
//
// A tower or a siege engine used to be scenery with a "press E to fire"
// prompt: it did nothing unless you were standing on it, which made building
// defences feel like building furniture. Now anything the rig lab marked as
// able to shoot acquires the nearest hostile in range and looses on its own
// cadence — and a defender POSTED to it (G24, `villager.stationId`) makes it
// quicker and sharper, so stationing kin is a real decision rather than a
// label in the roster.
//
// Explosive charges arm themselves the same way: a powder barrel sitting in
// a raider's path goes off when one walks onto it, rather than waiting for
// the player to run over and light it under attack.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore } from '@/game/combat';
import { labAssetId } from '@/game/data/buildables';
import { labCanFire, labIsExplosive } from '@/game/data/labCapabilities';
import { detonate, fireCannon } from '@/game/siege';
import { isBuilt, isHomeBuilding } from '@/game/types';

/** how far an emplacement can see and shoot */
const RANGE = 26;
/** seconds between shots, unmanned and manned */
const CD_UNMANNED = 4.2;
const CD_MANNED = 2.4;
/** a manned engine also reaches further — someone is spotting for it */
const MANNED_RANGE_BONUS = 8;
/** a charge goes off when something hostile comes this close */
const TRIGGER_RADIUS = 3.2;

export default function Emplacements() {
  // per-building cooldown, keyed by id; a plain ref because this is frame
  // state that nothing else reads
  const cooldowns = useRef<Record<string, number>>({});
  const tick = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    // 5 Hz is plenty for turret decisions and keeps a field of them cheap
    tick.current -= dt;
    if (tick.current > 0) return;
    const step = 0.2 - tick.current;
    tick.current = 0.2;

    const st = useGameStore.getState();
    if (st.paused) return;
    const { enemies } = useEnemyStore.getState();
    const live = enemies.filter((e) => e.mob.state !== 'dying' && e.kind !== 'storm');
    if (!live.length) return;

    for (const b of st.buildings) {
      if (!isBuilt(b) || !isHomeBuilding(b)) continue;
      const asset = labAssetId(b.type);

      // ---- charges: proximity-armed ------------------------------------
      if (labIsExplosive(asset)) {
        const near = live.some((e) => Math.hypot(e.mob.x - b.x, e.mob.z - b.z) < TRIGGER_RADIUS);
        if (near) detonate(b);
        continue;
      }

      // ---- anything the lab says can shoot ------------------------------
      if (!labCanFire(asset) && b.type !== 'cannon' && b.type !== 'tower') continue;

      // is a defender posted here? (G24 — stationId already exists on the
      // villager; this is what finally makes it matter)
      const manned = st.villagers.some((v) => v.job === 'defender' && v.stationId === b.id);
      const range = RANGE + (manned ? MANNED_RANGE_BONUS : 0);

      const cd = (cooldowns.current[b.id] ?? 0) - step;
      if (cd > 0) { cooldowns.current[b.id] = cd; continue; }

      let best: typeof live[number] | null = null;
      let bestD = range;
      for (const e of live) {
        const d = Math.hypot(e.mob.x - b.x, e.mob.z - b.z);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) { cooldowns.current[b.id] = 0; continue; }

      // a watch tower has no engine of its own — a posted archer is what
      // makes it shoot, which is the whole point of stationing one there
      if (b.type === 'tower' && !manned) { cooldowns.current[b.id] = 0; continue; }

      // aim at the target rather than the placement rotation: yaw 0 faces -Z
      const aim = Math.atan2(-(best.mob.x - b.x), -(best.mob.z - b.z));
      fireCannon(b, aim);
      cooldowns.current[b.id] = manned ? CD_MANNED : CD_UNMANNED;
    }
  });

  return null;
}
