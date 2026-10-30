// CLN-13 · the Sealed Crypt's director: each room's enemies spawned once on arrival, its clear watched (by its
// objective: combat, escort, survive), and the full clear rewarded. True while the player is inside — the tick then
// runs none of the homestead's own spawning (campGuards.ts, nightSkeletons.ts, raidDirector.ts).
import { useEnemyStore } from '@/game/combat';
import type { GameState } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { audio } from '@/lib/audio';
import { dungeonState, SURVIVE_DURATION_MS, SURVIVE_CADENCE_MS, ESCORT_EXTRACTION_RADIUS } from '@/game/dungeon';

export function dungeonDirector(st: GameState): boolean {
  // the Sealed Crypt (Phase 17) is its own curated encounter space — spawn
  // each room's enemies once on arrival and watch for a full clear
  if (st.destination === 'dungeon' && dungeonState.layout) {
    const layout = dungeonState.layout;
    let allCleared = true;
    for (const room of layout.rooms) {
      if (room.objective === 'none') continue;
      // Wave 13 · 'retrieve' rooms have no enemies at all — they're
      // cleared by the player's relic pickup (game/interaction/performAction.ts) instead, so this
      // spawn/watch block only applies to 'combat' rooms. Their state
      // still folds into the allCleared check below either way.
      // Wave 48 (B9) · 'escort' shares the SAME one-shot spawn-once guard
      // (a single guard, enemyCount always 1 for that objective — see
      // dungeon.ts), but its clear condition is entirely separate (below):
      // the guard's own life/death never sets `cleared`, only delivering
      // the freed captive to layout.entryPos does.
      if (room.objective === 'combat' || room.objective === 'escort') {
        if (!room.spawned) {
          room.spawned = true;
          for (let i = 0; i < room.enemyCount; i++) {
            const a = (i / room.enemyCount) * Math.PI * 2;
            useEnemyStore.getState().spawn(
              room.enemyKind, room.cx + Math.cos(a) * 2.5, room.cz + Math.sin(a) * 2.5, false, room.index,
            );
          }
        }
        if (room.objective === 'combat' && !room.cleared) {
          const alive = useEnemyStore.getState().enemies.some(
            (e) => e.dungeonRoom === room.index && e.mob.state !== 'dying',
          );
          if (!alive) {
            room.cleared = true;
            st.notify(room.isBoss ? 'The crypt falls silent — the guardian is defeated!' : 'The chamber is cleared.');
          }
        }
      }
      // Wave 48 (B9) · escort delivery — independent of the guard above,
      // checked every tick once the captive is freed. CaptiveFigure
      // (DungeonScene.tsx) writes captiveX/captiveZ every frame; this is
      // the only place that reads them to decide `cleared`.
      if (room.objective === 'escort' && !room.cleared && room.captiveFreed) {
        const delivered = Math.hypot(
          room.captiveX - layout.entryPos.x, room.captiveZ - layout.entryPos.z,
        ) < ESCORT_EXTRACTION_RADIUS;
        if (delivered) {
          room.cleared = true;
          st.notify('You lead the captive to safety — the chamber is cleared.');
        }
      }
      // Wave 48 (B9) · 'survive' — no enemies until the player physically
      // steps into the room (surviveDeadline's own doc explains why an
      // instant dungeon-wide start, the way 'combat' spawns immediately,
      // would let a player dawdle elsewhere until the clock already ran
      // out). Once started: cadence-spawn up to enemyCount concurrent,
      // and `cleared` flips ONLY on timer expiry — never on a kill, which
      // is the genuinely different completion condition this objective
      // exists for.
      if (room.objective === 'survive') {
        const now = Date.now();
        if (room.surviveDeadline === 0) {
          if (Math.abs(playerState.x - room.cx) < room.halfX && Math.abs(playerState.z - room.cz) < room.halfZ) {
            room.surviveDeadline = now + SURVIVE_DURATION_MS;
            room.surviveNextSpawn = now;
            st.notify('Hold the chamber!');
          }
        } else if (!room.cleared && now >= room.surviveDeadline) {
          room.cleared = true;
          // room-scoped cleanup, NOT removeByWorld('dungeon') — that would
          // wrongly wipe every other room's live enemies too, and the
          // exit-cleanup subscriber (combat.ts) only fires on an actual
          // `destination` change, which hasn't happened here.
          for (const e of useEnemyStore.getState().enemies) {
            if (e.dungeonRoom === room.index && e.mob.state !== 'dying') useEnemyStore.getState().remove(e.id);
          }
          st.notify('You held the chamber! It falls quiet once more.');
        } else if (!room.cleared) {
          const aliveCount = useEnemyStore.getState().enemies.filter(
            (e) => e.dungeonRoom === room.index && e.mob.state !== 'dying',
          ).length;
          if (now >= room.surviveNextSpawn && aliveCount < room.enemyCount) {
            const a = Math.random() * Math.PI * 2;
            useEnemyStore.getState().spawn(
              room.enemyKind, room.cx + Math.cos(a) * 2.5, room.cz + Math.sin(a) * 2.5, false, room.index,
            );
            room.surviveNextSpawn = now + SURVIVE_CADENCE_MS;
          }
        }
      }
      if (!room.cleared) allCleared = false;
    }
    if (allCleared && !layout.rewarded) {
      layout.rewarded = true;
      const rooms = layout.rooms.length;
      const gold = 20 + rooms * 8;
      st.addItems({ gold, iron_ore: 2 + rooms, stone: 4 + rooms * 2 }, 'grant');
      st.addXp('combat', 30 + rooms * 10);
      st.recordDungeonClear();
      // a full clear salvages real gear off the fallen for the garrison
      // back home (the Armory) — never the player's own Satchel. The
      // halberd specifically has no craft recipe at all, so a Crypt clear
      // is the ONLY way one ever reaches the Armory.
      st.grantArmory('helmet', 1);
      st.grantArmory('chestplate', 1);
      st.grantArmory('halberd', 1);
      st.notify(`The Sealed Crypt is cleared! +${gold} gold, salvaged materials, and a helmet + chestplate + halberd for the Armory.`, true);
      audio.play('treasure', 0.85);
    }
    return true; // the tick then skips the homestead-only spawn systems entirely while inside
  }
  return false;
}
