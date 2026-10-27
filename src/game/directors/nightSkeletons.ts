// CLN-13 · skeletons rising at night near the player at home, and crumbling at dawn.
import type { EnemyData } from '@/game/combat';
import type { GameState } from '@/game/store/gameStore';
import { worldEnv } from '@/game/env';
import { playerState } from '@/game/playerState';
import { audio } from '@/lib/audio';
import { navBlocked } from '@/game/navgrid';
import { roadEntry } from '@/game/data/road';
import { insideWalls } from '@/game/fort';
import type { Counter, Spawn } from './types';

export function nightSkeletonDirector(st: GameState, list: EnemyData[], spawn: Spawn, skelTimer: Counter): void {
  // skeletons rise at night NEAR THE PLAYER, crumble at dawn — spawn
  // position is anchored to playerState.x/z itself (see below), which is
  // only meaningful while the player is actually standing at the
  // homestead to have them rise beside them, so this part alone stays
  // gated on `st.destination` (a real "player must be home" case, unlike
  // the raid logic (raidDirector.ts) — see that block's own comment for why
  // IT no longer early-returns here). Wave 18 #5 bugfix: this used to be a
  // single `if (st.destination) return;` that also swallowed the raid
  // cooldown/resolve/trigger logic after it every frame the player was away —
  // now it only wraps what actually needs the player's own position.
  if (!st.destination) {
    const skeletons = list.filter((e) => e.kind === 'skeleton' && e.mob.state !== 'dying');
    if (worldEnv.night > 0.62) {
      skelTimer.current -= 1;
      if (skeletons.length < 3 && skelTimer.current <= 0) {
        skelTimer.current = 14 + Math.random() * 14;
        // Wave 20 · a ring point can land inside a fully walled-in
        // homestead (insideWalls, game/fort.ts — the same cheap cached
        // flood-fill Sound Walls already reads), which used to rise a
        // skeleton on the wrong side of your own fence. A few re-rolls are
        // enough given the ring sits 26-38m out and a typical wall
        // footprint is small against that; if every try still lands
        // inside, fall back to the same road-entry treatment dusk raiders
        // already get rather than spawning somewhere unchecked.
        // Wave 34 (G6.3) · insideWalls only floods the outer wall
        // boundary, so it stayed blind to a BUILDING placed inside that
        // yard — a ring point could still land inside a house/workshop's
        // own footprint. navBlocked (navgrid.ts) already rebuilds from
        // every placed building's real collision boxes, not just walls,
        // and is already this cheap (one grid lookup), so it's a one-line
        // addition to the same reroll rather than a new pass.
        let sx = 0, sz = 0, placed = false;
        for (let tries = 0; tries < 6; tries++) {
          const a = Math.random() * Math.PI * 2;
          const r = 26 + Math.random() * 12;
          const cx = playerState.x + Math.cos(a) * r;
          const cz = playerState.z + Math.sin(a) * r;
          if (!insideWalls(cx, cz) && !navBlocked(cx, cz)) { sx = cx; sz = cz; placed = true; break; }
        }
        if (!placed) {
          const entry = roadEntry();
          sx = entry.x;
          sz = entry.z;
        }
        // approaching is independent of raid — a fallback skeleton walks in
        // via the nav grid like a raider does, without being counted as one
        spawn('skeleton', sx, sz, false, undefined, !placed);
        audio.playAt('skeleton', sx, sz, 0.7);
        st.notify('Bones rattle in the dark…');
      }
    } else {
      for (const e of skeletons) {
        e.mob.state = 'dying';
        e.mob.dieT = 0;
      }
    }
  }
}
