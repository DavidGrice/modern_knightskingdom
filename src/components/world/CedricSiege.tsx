'use client';
// Cedric's Siege — the homestead half of Cedric's two-part arc. Once
// unlocked (game/cedricSiege.ts's tier gate), a nightly roll can bring his
// FULL war party — and his siege engines — down on the homestead, mirroring
// DragonSiege.tsx's own nightly-roll shape exactly. Weathering this never
// permanently defeats him: only his final stand (PlayerController.tsx's
// challenge_cedric handler, upgraded once cedricFinalStandReady) does that —
// see combat.ts's `finalStand` flag, which is what keeps him alive to fight
// another night here.
import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore, type EnemyKind } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { isBuilt, isHomeBuilding } from '@/game/types';
import type { ItemId } from '@/game/types';
import { KEEP_SOCKETS } from '@/game/data/keep';
import { heightOf } from '@/game/data/buildables';
import { roadEntry } from '@/game/data/road';
import { resetRaiderRam, raiderRamState } from '@/game/raiderRam';
import { CEDRIC_CAMP } from '@/game/data/world';
import { dragonAir } from './DragonOmen';
import { cedricSiegeAllowed, cedricWarState } from '@/game/cedricSiege';
import { difficultyState, MOUNTED_RAIDER_TIER } from '@/game/difficulty';
import RiggedProp, { fireProp } from './RiggedProp';

/** final stand: seconds after the escort arrives before a single wave-2
 *  reinforcement rushes in, if he's still standing */
const FINAL_STAND_REINFORCE_AT = 20;

const SIEGE_SECONDS = 70;
const ROLL_CHANCE = 0.22;
/** how hard his engines hit — no wood/stone filtering (unlike the dragon's
 *  breath): a catapult stone does not care what it lands on. Stone still
 *  helps indirectly, since maxHpFor/maxHpForPart scale off material cost. */
const ENGINE_DAMAGE = 16;
const ENGINE_CD_BASE = 14;
const ARMORY_DROPS: ItemId[] = ['helmet', 'chestplate', 'sword', 'shield', 'crossbow'];

interface EnginePos { id: string; assetId: string; x: number; z: number }

function WarParty({ onDone }: { onDone: (routed: boolean) => void }) {
  const [engines] = useState<EnginePos[]>(() => {
    const entry = roadEntry();
    return [
      { id: 'cedric_catapult', assetId: 'oc6096-4', x: entry.x + 6, z: entry.z + 2 },
      { id: 'cedric_stonethrower', assetId: 'oc1289', x: entry.x - 6, z: entry.z - 2 },
    ];
  });
  const engineCd = useRef<Record<string, number>>({ cedric_catapult: 5, cedric_stonethrower: 9 });
  const t = useRef(0);
  const done = useRef(false);

  const finish = (routed: boolean) => {
    if (done.current) return;
    done.current = true;
    onDone(routed);
  };

  useFrame((_, dt) => {
    if (done.current) return;
    const st = useGameStore.getState();
    if (st.paused) return;
    t.current += dt;
    if (t.current >= SIEGE_SECONDS) { finish(false); return; }

    // repel check: the whole war party is gone — he broke and fled (see the
    // finalStand-gated flee guard in Enemies.tsx), same as "all raiders gone"
    // already means for an ordinary raid
    const raiders = useEnemyStore.getState().enemies.filter((e) => e.raid);
    if (raiders.length === 0) { finish(true); return; }

    for (const eng of engines) {
      engineCd.current[eng.id] -= dt;
      if (engineCd.current[eng.id] > 0) continue;
      engineCd.current[eng.id] = ENGINE_CD_BASE + Math.random() * 4;
      const targets: { keep: boolean; id: string; x: number; z: number }[] = [
        // the keep's own synthetic PlacedBuilding (gameStore's foundKeep) is
        // excluded — it exists purely for interact-detection, and calling
        // damageBuilding on it would delete that entry at 0 HP while leaving
        // the real assembled castle (st.keep) untouched and orphaned. Real
        // keep pieces are covered separately via KEEP_SOCKETS/damageKeepPart.
        ...st.buildings.filter((b) => isBuilt(b) && isHomeBuilding(b) && b.type !== 'keep').map((b) => ({ keep: false, id: b.id, x: b.x, z: b.z })),
        ...(st.keep
          ? KEEP_SOCKETS.filter((s) => st.keep!.parts[s.id] && (st.keep!.built[s.id] ?? 0) >= 1)
            .map((s) => ({ keep: true, id: s.id, x: st.keep!.x + s.x, z: st.keep!.z + s.z }))
          : []),
      ];
      if (!targets.length) continue;
      const target = targets[Math.floor(Math.random() * targets.length)];
      fireProp(eng.id);
      audio.playAt('explosion', target.x, target.z, 0.8);
      if (target.keep) st.damageKeepPart(target.id, ENGINE_DAMAGE, "battered by Cedric's siege engines");
      else st.damageBuilding(target.id, ENGINE_DAMAGE, "battered by Cedric's siege engines");
    }
  });

  return (
    <>
      {engines.map((eng) => (
        <group key={eng.id} position={[eng.x, 0, eng.z]}>
          <Suspense fallback={null}>
            <RiggedProp assetId={eng.assetId} height={heightOf(eng.assetId)} buildingId={eng.id} />
          </Suspense>
        </group>
      ))}
    </>
  );
}

export default function CedricSiege() {
  const destination = useGameStore((s) => s.destination);
  const [active, setActive] = useState(false);
  const lastNightChecked = useRef(-1);
  const endRef = useRef<(routed: boolean) => void>(() => {});
  const finalStandT = useRef(0);
  const finalStandWasActive = useRef(false);

  const end = (routed: boolean) => {
    cedricWarState.active = false;
    raiderRamState.active = false;
    setActive(false);
    const st = useGameStore.getState();
    st.recordCedricSiege(routed);
    if (routed) {
      st.addItems({ gold: 40, plank: 6, stone: 6, iron_ore: 4 }, 'grant');
      st.addXp('combat', 40);
      st.grantArmory(ARMORY_DROPS[Math.floor(Math.random() * ARMORY_DROPS.length)], 1);
    }
    st.notify(
      routed
        ? "⚔ Cedric's war party breaks and flees into the night — the homestead stands!"
        : "⚔ Cedric's assault grinds on past nightfall, but the homestead endures.",
      true,
    );
    audio.play('horn', 0.8);
  };
  endRef.current = end;

  // test hook, same convention as __kkSiege (DragonSiege)
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__kkCedricSiege = {
      get active() { return active; },
      end: (routed: boolean) => endRef.current(routed),
    };
  }, [active]);

  useFrame((_, dt) => {
    // final stand: runs wherever the player is (his own camp, a different
    // `destination` entirely from the homestead) — deliberately NOT behind
    // the homestead-only gate below
    if (cedricWarState.finalStandActive) {
      if (!finalStandWasActive.current) { finalStandT.current = 0; finalStandWasActive.current = true; }
      finalStandT.current += dt;
      const enemies = useEnemyStore.getState().enemies;
      const cedricLive = enemies.some((e) => e.kind === 'cedric' && e.mob.state !== 'dying');
      if (!cedricLive) {
        cedricWarState.finalStandActive = false;
        cedricWarState.reinforced = false;
        finalStandWasActive.current = false;
      } else if (!cedricWarState.reinforced && finalStandT.current > FINAL_STAND_REINFORCE_AT) {
        cedricWarState.reinforced = true;
        const a1 = Math.random() * Math.PI * 2;
        const a2 = a1 + Math.PI;
        useEnemyStore.getState().spawn('bandit', CEDRIC_CAMP.x + Math.cos(a1) * 3, CEDRIC_CAMP.z + Math.sin(a1) * 3, false);
        useEnemyStore.getState().spawn('bandit', CEDRIC_CAMP.x + Math.cos(a2) * 3, CEDRIC_CAMP.z + Math.sin(a2) * 3, false);
        useGameStore.getState().notify("More of Cedric's war party rushes to his side!", true);
        audio.play('warcry', 0.8);
      }
    } else {
      finalStandWasActive.current = false;
    }

    if (destination || active) return;
    const st = useGameStore.getState();
    // deep night, once per day, never stacked with a dragon siege or the
    // final stand, and never on top of an ordinary raid's own stragglers
    if (
      worldEnv.night > 0.8 && worldEnv.dayCount !== lastNightChecked.current
      && !dragonAir.busy && !cedricWarState.active && !cedricWarState.finalStandActive
    ) {
      if (!cedricSiegeAllowed(st)) return;
      if (useEnemyStore.getState().enemies.some((e) => e.raid)) return;
      lastNightChecked.current = worldEnv.dayCount;
      if (Math.random() < ROLL_CHANCE) {
        cedricWarState.active = true;
        st.notify("⚔ CEDRIC'S WAR PARTY! His full force descends upon your homestead — to arms!", true);
        audio.play('horn', 0.95);
        audio.play('warcry', 0.8);

        const entry = roadEntry();
        const warPos = (i: number, n: number): [number, number] => {
          const a = (i / n) * Math.PI * 2;
          return [entry.x + Math.cos(a) * 4, entry.z + Math.sin(a) * 4];
        };
        const [cx, cz] = warPos(0, 6);
        useEnemyStore.getState().spawn('cedric', cx, cz, true, undefined, true);
        audio.playVoice('greeting_cedric', 0.9);
        const [gx, gz] = warPos(1, 6);
        useEnemyStore.getState().spawn('gilbert', gx, gz, true, undefined, true);
        // Wave 36 (A3): once the player has climbed to the game's current
        // difficulty ceiling, two of the four plain-bandit slots ride
        // Cedric's own tethered chargers instead — literally HIS war party
        // on HIS own two named horses (l7339231/l7339232, faction:'cedric'
        // in the rig lab's own capability data), a real escalation on top of
        // an already-tuned encounter rather than part of its first unlock.
        const mounted = difficultyState.tier >= MOUNTED_RAIDER_TIER;
        for (let i = 2; i < 6; i++) {
          const [sx, sz] = warPos(i, 6);
          const kind: EnemyKind = mounted && i < 4 ? 'mountedRaider' : 'bandit';
          useEnemyStore.getState().spawn(kind, sx, sz, true, undefined, true);
        }
        // his vehicles, plural, guaranteed — not the ordinary raid's 40% coin-flip
        resetRaiderRam(entry.x + 10, entry.z);
        setActive(true);
      }
    }
  });

  if (!active || destination) return null;
  return (
    <Suspense fallback={null}>
      <WarParty onDone={end} />
    </Suspense>
  );
}
