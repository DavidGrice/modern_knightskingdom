'use client';
// Wave 47 (B5) — ticks game/settlementRaid.ts's rival-raid mechanic: real
// hostiles spawn (worldOverride-scoped to the settlement, exactly like
// ChallengeRunner.tsx's own Defend the Plot per combat.ts's EnemyData.world
// doctrine) and close on the settlement's own claimed plot
// (claimedWorlds[destId]). "Defending" is the same proximity check Defend
// the Plot already proved out: any live raider within
// SETTLEMENT_RAID_PROXIMITY_RADIUS of the claim chips its HP pool, and the
// player's own melee/ranged combat against those raiders is what keeps it
// standing. Mounted unconditionally in GameWorld.tsx right after
// <ChallengeRunner />, same "cheap, early-returns" reasoning — renders
// nothing, every block below early-returns the instant no raid is
// possible/active.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore, type EnemyKind } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { HOUSE_NAME, leaningHouse } from '@/game/data/allegiance';
import {
  settlementRaidState, settlementRaidCooldownMs, settlementRaiderKinds, settlementRaidMaxLive,
  startSettlementRaid, SETTLEMENT_RAID_START_HP, SETTLEMENT_RAID_DRAIN_PER_SEC,
  SETTLEMENT_RAID_PROXIMITY_RADIUS, SETTLEMENT_RAID_SPAWN_INTERVAL_S,
} from '@/game/settlementRaid';

export default function SettlementRaidRunner() {
  const spawnTimer = useRef(SETTLEMENT_RAID_SPAWN_INTERVAL_S);
  const wasActive = useRef(false);

  useFrame((_, dt) => {
    const st = useGameStore.getState();
    if (st.paused) return;
    const now = performance.now();
    const r = settlementRaidState;

    if (r.active && !wasActive.current) spawnTimer.current = 1.5; // first wave arrives quickly
    wasActive.current = r.active;

    // ---------------------------------------------------------------------
    // Trigger — only while standing at a founded settlement, at real dusk+,
    // with a real contested standing, past the settlement's own cooldown.
    if (!r.active) {
      const destId = st.destination;
      const settlement = destId ? st.settlements[destId] : undefined;
      if (!destId || !settlement) return;
      if (worldEnv.night <= 0.62) return;
      const kinds = settlementRaiderKinds(st.allegiance);
      if (!kinds) return; // genuinely Unsworn — no raid is possible, by design
      const cooldownMs = settlementRaidCooldownMs(st.allegiance);
      if (Date.now() - (settlement.lastRaidAt ?? settlement.since) < cooldownMs) return;
      startSettlementRaid(destId);
      // whichever house you have NOT been leaning toward is the one testing
      // this claim — Cedric's men retaliate against a crown-leaning player,
      // the crown's knights move on a traitor's
      const attacker = leaningHouse(st.allegiance) === 'leo' ? 'cedric' : 'leo';
      const destName = WORLD_DESTINATION_BY_ID[destId]?.name ?? 'your settlement';
      st.notify(`${HOUSE_NAME[attacker]}'s riders test your claim at ${destName}!`, true);
      return;
    }

    // ---------------------------------------------------------------------
    // Active raid
    const destId = r.destId;
    if (!destId) { r.active = false; return; }
    if (st.destination !== destId) {
      // left mid-fight — clean up its hostiles immediately and count it a
      // loss at whatever HP the plot was left at, same "can retry on the
      // same ground without destination ever changing" reasoning
      // ChallengeRunner's own Defend branch documents.
      r.active = false;
      useEnemyStore.getState().removeByWorld(destId);
      st.resolveSettlementRaid(destId, false, r.plotHp / SETTLEMENT_RAID_START_HP);
      return;
    }
    const claim = st.claimedWorlds[destId];
    if (!claim) { r.active = false; useEnemyStore.getState().removeByWorld(destId); return; }

    const kinds = settlementRaiderKinds(st.allegiance);
    const enemies = useEnemyStore.getState().enemies;
    const live = enemies.filter((e) => e.world === destId).length;
    const maxLive = settlementRaidMaxLive(st.allegiance);
    spawnTimer.current -= dt;
    if (kinds && spawnTimer.current <= 0 && live < maxLive) {
      spawnTimer.current = SETTLEMENT_RAID_SPAWN_INTERVAL_S;
      const dest = WORLD_DESTINATION_BY_ID[destId];
      const kind = kinds[Math.floor(Math.random() * kinds.length)] as EnemyKind;
      const angle = Math.random() * Math.PI * 2;
      const rad = dest.radius * 0.85;
      useEnemyStore.getState().spawn(
        kind, dest.origin.x + Math.sin(angle) * rad, dest.origin.z + Math.cos(angle) * rad,
        false, undefined, false, false, 1, false, destId,
      );
    }
    for (const e of enemies) {
      if (e.world !== destId) continue;
      if (Math.hypot(e.mob.x - claim.x, e.mob.z - claim.z) < SETTLEMENT_RAID_PROXIMITY_RADIUS) {
        r.plotHp -= SETTLEMENT_RAID_DRAIN_PER_SEC * dt;
      }
    }
    if (r.plotHp <= 0) {
      r.plotHp = 0;
      r.active = false;
      useEnemyStore.getState().removeByWorld(destId);
      st.resolveSettlementRaid(destId, false, 0);
      st.notify(`The raid overwhelms the watch — ${WORLD_DESTINATION_BY_ID[destId]?.name ?? 'the settlement'}'s next yield will be late.`);
    } else if (now >= r.deadline) {
      r.active = false;
      useEnemyStore.getState().removeByWorld(destId);
      st.resolveSettlementRaid(destId, true, r.plotHp / SETTLEMENT_RAID_START_HP);
    }
  });

  return null;
}
