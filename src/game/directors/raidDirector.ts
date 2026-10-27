// CLN-13 · the dusk raid on the homestead: started once the homestead is established (bandits led by Gilbert or
// Cedric — or, for a player sworn to Cedric, the crown's knights — sometimes with a ram or a siege ladder), and
// resolved, with its spoils, when the last raider is gone; and the siege ladder's climb slots freed as raiders fall.
import type { EnemyData, EnemyKind } from '@/game/combat';
import type { GameState } from '@/game/store/gameStore';
import { isHomeBuilding, type ItemId } from '@/game/types';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { pick } from '@/lib/rng';
import { ITEMS } from '@/game/data/items';
import { CEDRIC_REVEAL_QUEST } from '@/game/data/world';
import { difficultyState, CASTER_TIER, SHIELDED_ELITE_TIER } from '@/game/difficulty';
import { roadEntry } from '@/game/data/road';
import { raiderRamState, resetRaiderRam } from '@/game/raiderRam';
import { raiderLadderState, resetRaiderLadder } from '@/game/raiderLadder';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from '@/game/data/keep';
import type { Counter, Flag, Spawn } from './types';

/** Wave 37 (A3 remainder) · rolled once per plain-bandit filler slot in the
 *  ordinary dusk raid (see the raid trigger below): an occasional replacement
 *  once the player has climbed the difficulty curve far enough, one roll
 *  partitioned into three mutually-exclusive outcomes rather than two
 *  independent checks that could both fire on the same slot. */
function rollBanditFiller(): EnemyKind {
  const r = Math.random();
  if (difficultyState.tier >= CASTER_TIER && r < 0.18) return 'caster';
  if (difficultyState.tier >= SHIELDED_ELITE_TIER && r < 0.18 + 0.16) return 'shieldedElite';
  return 'bandit';
}

export function pruneLadderClimbers(list: EnemyData[]): void {
  // Wave 58 (H4) addendum #8: a raider that dies or is removed frees its
  // climb slot — pruned here (1Hz is plenty; this only gates queue timing,
  // never a correctness-critical path) rather than intercepted at every
  // possible death call site (player melee/bolt, a defender, a villager,
  // the wall coming down under it — all already just set `state='dying'`
  // generically with no knowledge of this list).
  if (raiderLadderState.climbers.length) {
    raiderLadderState.climbers = raiderLadderState.climbers.filter((id) =>
      list.some((e) => String(e.id) === id && e.mob.state !== 'dying'));
  }
}

export function raidDirector(st: GameState, list: EnemyData[], spawn: Spawn, raidCooldown: Counter, raidActive: Flag): void {
  // bandit raids at dusk once the homestead is established. Wave 18 #5
  // bugfix: deliberately NOT gated on `st.destination` (unlike the
  // skeleton rise, nightSkeletons.ts) — every position this block touches is anchored
  // to roadEntry()/HOME_X/HOME_Z or the ram's own fixed ring, never the
  // player's own live position, so a raid can genuinely start, be fought
  // (by defenders and the keep, both of which already read all of
  // useEnemyStore rather than a world-filtered subset — see Defenders.tsx/
  // damageKeepPart), and resolve while the player is away visiting a
  // destination. This is what makes PROJECT_CONTEXT.md's "Instance
  // separation" claim — that raids deliberately keep resolving in real
  // time while the player is elsewhere — actually true; previously this
  // whole section was unreachable whenever `st.destination` was set, so an
  // already-in-progress raid could never even conclude: raidActive/
  // raidCooldown just hung until the player came home. The loud one-shot
  // stingers below (warcry/horn/voice barks) stay `!st.destination`-gated
  // on their own — ROADMAP.md's own TODO already called out that a raid
  // resolving while away should notify, not blare, and `st.notify` itself
  // (never gated) is what delivers that notification regardless of where
  // the player is.
  raidCooldown.current = Math.max(0, raidCooldown.current - 1);
  const raiders = list.filter((e) => e.raid);
  if (raidActive.current && raiders.length === 0) {
    raidActive.current = false;
    raiderRamState.active = false;
    raiderLadderState.active = false; // Wave 58 (H4) · same singleton cleanup as the ram
    st.notify('The raid is beaten back! The bandits dropped their spoils.', true);
    st.addItems({ plank: 4, stone: 4, iron_ore: 2 }, 'grant');
    st.addXp('combat', 60);
    // a driven-off raider sometimes leaves gear behind — straight into the
    // Armory, ready to outfit the garrison that just held the line (real
    // weapons now drop here too, not just armor, since the Armory arms
    // defenders' loadouts as well as their helmet/chestplate)
    if (Math.random() < 0.4) {
      const drops: ItemId[] = ['helmet', 'chestplate', 'sword', 'shield', 'crossbow'];
      const piece = pick(drops);
      st.grantArmory(piece, 1);
      st.notify(`A fallen raider's ${ITEMS[piece].name.toLowerCase()} is added to the Armory.`, true);
    }
    if (!st.destination) audio.play('horn', 0.8);
  }
  if (
    !raidActive.current &&
    raidCooldown.current <= 0 &&
    worldEnv.time > 0.7 && worldEnv.time < 0.78 &&
    st.buildings.filter(isHomeBuilding).length >= 4 &&
    st.unlocks.includes('mining')
  ) {
    raidActive.current = true;
    raidCooldown.current = Math.max(240, worldEnv.dayLength * 1.5);
    if (!st.destination) { audio.play('warcry', 0.9); audio.play('horn', 0.9); }
    const a0 = Math.random() * Math.PI * 2;
    // N79 (requested 2026-07-28): raiders arrive by the road instead of
    // popping into existence on a ring around the homestead — spawned
    // loosely clustered around the same road entry point newcomers and
    // the merchant already walk in from (roadEntry()), each individually
    // routed home via Enemies.tsx's own approaching walk (see its
    // per-frame block). a0 (below) still picks the ram's own spot —
    // see that call's own comment for why it's unchanged.
    const entry = roadEntry();
    function roadSpawnPos(i: number): [number, number] {
      const a = (i / 3) * Math.PI * 2;
      return [entry.x + Math.cos(a) * 3, entry.z + Math.sin(a) * 3];
    }
    // Wave 18 #5 bugfix: every spawn() call below now passes `null` as the
    // explicit 10th `worldOverride` arg — this block can now fire while
    // `st.destination` is set (see this block's own comment), and spawn()
    // otherwise stamps a new enemy's `world` from whatever destination the
    // player currently happens to be standing in. Without the override, a
    // raid triggered while away would tag its own raiders with the
    // player's CURRENT destination instead of home, so they'd never render
    // there (positioned at home's coordinates, thousands of units off) and
    // would vanish from view for good the moment the player came home
    // (home is destination null, no longer a `world` match).
    if (st.alliance === 'cedric') {
      // Phase 19 alliance branch: pledge to Cedric and it's the CROWN that
      // comes for your homestead — a wave of royal knights, never Cedric's
      // own people (your allies now), and no Weezil bark in the pack
      st.notify('⚔ The crown brands you a traitor — royal knights raid your homestead!', true);
      for (let i = 0; i < 3; i++) {
        const [sx, sz] = roadSpawnPos(i);
        spawn('royal', sx, sz, true, undefined, true, false, 1, false, null);
      }
    } else {
      // unsworn or crown-sworn: the bandit threat, exactly as before
      // once his camp is known and he's still at large, Cedric himself
      // occasionally leads the raid in person — a bigger, named wave
      // instead of another anonymous bandit party (his own real war cry,
      // snd053, already plays above; his greeting bark makes it unmistakable)
      const cedricEligible = st.completedQuests.includes(CEDRIC_REVEAL_QUEST) && !st.defeatedCedric;
      const cedricLed = cedricEligible && Math.random() < 0.35;
      if (cedricLed) {
        if (!st.destination) audio.playVoice('greeting_cedric', 0.9);
        st.notify('⚔ Cedric the Bull himself leads the raid on your homestead!', true);
        const [sx, sz] = roadSpawnPos(0);
        spawn('cedric', sx, sz, true, undefined, true, false, 1, false, null);
      } else {
        // Gilbert the Bad leads the raid, with Weezil somewhere in the pack —
        // their own real voice lines instead of an anonymous mob (see combat.ts)
        if (!st.destination) audio.playVoice('greeting_gilbert', 0.85);
        st.notify('⚔ Gilbert the Bad leads a raid on your homestead!', true);
        const [sx, sz] = roadSpawnPos(0);
        spawn('gilbert', sx, sz, true, undefined, true, false, 1, false, null);
      }
      if (!st.destination) audio.playVoice('greeting_weezil', 0.6);
      // Wave 37 (A3 remainder): each plain-bandit filler slot can
      // occasionally roll a caster or a shielded elite instead, once the
      // difficulty curve allows it (rollBanditFiller, above)
      for (let i = 1; i < 3; i++) {
        const [sx, sz] = roadSpawnPos(i);
        spawn(rollBanditFiller(), sx, sz, true, undefined, true, false, 1, false, null);
      }
    }
    // raiders occasionally bring their own ram — the same threat the
    // player's siege tools already pose, now aimed at the player's gate.
    // Has no walk-in of its own (raiderRamState is a separate system, not
    // an EnemyData/mob), so it still starts on the old 34m ring rather
    // than at the road entry — a rework of its own, out of scope here.
    if (Math.random() < 0.4) {
      // full reset, not just `active = true` — a ram that was broken last
      // raid must not roll back in already wrecked and on 0 HP
      resetRaiderRam(Math.cos(a0) * 34, Math.sin(a0) * 34);
    }
    // Wave 58 (H4): a siege ladder sometimes joins too — a singleton, same
    // as the ram (game/raiderLadder.ts's own header comment) — gated on
    // the keep actually having a FINISHED wall-walk to put it against; a
    // bare keep, or one with only ungated pieces (low wall/gatehouse/great
    // hall, none of which carry a `walkway`), never gets one, since
    // there's nothing worth climbing yet. Difficulty-scaled, same shape
    // raidStrength() itself uses (game/difficulty.ts).
    if (!raiderLadderState.active) {
      const walkwaySockets = st.keep
        ? KEEP_SOCKETS.filter((s) => {
            const partId = st.keep!.parts[s.id];
            return !!partId && (st.keep!.built[s.id] ?? 0) >= 1 && !!KEEP_PART_BY_ID[partId]?.walkway;
          })
        : [];
      if (walkwaySockets.length && Math.random() < Math.min(0.6, 0.25 + difficultyState.tier * 0.07)) {
        const targetSocket = pick(walkwaySockets);
        resetRaiderLadder(targetSocket.id);
      }
    }
  }
}
