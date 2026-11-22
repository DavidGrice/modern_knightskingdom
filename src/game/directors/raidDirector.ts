// CLN-13 · the raid on the homestead: started once the homestead is established (bandits led by Gilbert or Cedric —
// or, for a player sworn to Cedric, the crown's knights — sometimes with a ram or a siege ladder), and resolved when
// the last raider is gone — with its spoils, unless the player's knock-out called it off; and the siege ladder's climb
// slots freed as raiders fall. G-03 · each raid comes at the homestead from its own sides (approach.ts), its ram by the
// road and its ladder on the wall nearest where its raiders come. G-04 · at any hour, by the hour's odds
// (raidTiming.ts), never on top of another major event (game/majorEvents.ts), and never unannounced: the horn sounds,
// and the raiders come warningLeadTime() seconds later. G-06 · as many as the homestead's stores are worth (raidSize),
// every other one behind the leader a thief come to strip them (game/plunder.ts); and its end — which waits for the
// last thief to fall or get away — names the goods lost and the goods taken back. G-07 · a raid the player falls out of
// is settled as his garrison's fight goes (raidSettle.ts): knocked out, or away with the garrison fallen and raiders
// on the field, which nothing in the world would end.
import { useEnemyStore, type EnemyData, type EnemyKind } from '@/game/combat';
import type { GameState } from '@/game/store/gameStore';
import { isHomeBuilding, type ItemId } from '@/game/types';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { pick } from '@/lib/rng';
import { ITEMS } from '@/game/data/items';
import { CEDRIC_REVEAL_QUEST } from '@/game/data/world';
import { difficultyState, CASTER_TIER, SHIELDED_ELITE_TIER } from '@/game/difficulty';
import { roadEntry } from '@/game/data/road';
import { raiderRamState, ramSpawn, resetRaiderRam } from '@/game/raiderRam';
import { raiderLadderState, resetRaiderLadder } from '@/game/raiderLadder';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from '@/game/data/keep';
import { KEEP_SITE_ID, siteById, siteSocketWorld } from '@/game/sites/sites';
import { majorEventOn } from '@/game/majorEvents';
import { approachPoint, raidSeedFor, raidSides, sidesNamed } from './approach';
import { raidDue, raidSize, stockpileValue, thiefSlot, warningLeadTime } from './raidTiming';
import { goodsNamed, haulOf, raidHaul, resetRaidHaul } from '@/game/plunder';
import { raidDowned, raidForce, raidPlan } from './state';
import { garrisonStands, homeRaiders, settleRaid } from './raidSettle';
import type { Counter, Flag, Spawn } from './types';

/** Wave 37 (A3 remainder) · rolled once per plain-bandit filler slot in the
 *  ordinary raid (see raidArrives below): an occasional replacement
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

export function raidDirector(st: GameState, list: EnemyData[], spawn: Spawn, raidCooldown: Counter, raidActive: Flag, raidLost: Flag): void {
  // bandit raids once the homestead is established. Wave 18 #5
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
  // G-07 · away, the raid goes on live (measured on main: two level-1 defenders beat off Gilbert and three in 36 s with
  // the player at The King's Approach); but with no defender standing, nothing ends it — the thieves strip the stores
  // and run, and the rest stand about the homestead for good. Once raiders have come up to it and the garrison is down
  // (or there is none), the raid is settled as lost, and the report waits for the player's return.
  if (raidActive.current && st.destination && !garrisonStands(st)
    && homeRaiders().some((e) => !e.mob.approaching) && settleRaid(st, true)) {
    st.notify('Word from home: the garrison is down, and the raiders have the homestead.', true);
  }
  const raiders = list.filter((e) => e.raid);
  if (raidActive.current && raiders.length === 0) {
    raidActive.current = false;
    raiderRamState.active = false;
    raiderLadderState.active = false; // Wave 58 (H4) · same singleton cleanup as the ram
    raidPlan.sides = []; // G-04 · the raid is over: no sides for the minimap's arrow to point at
    // F-17 · no raiders left is not always a raid beaten back: a raid the player fell out of is settled at once
    // (raidSettle.ts), and one lost pays nothing; the cooldown it started with runs on, as a won raid's does. G-07 ·
    // what it cost was settled with it: the report names it all.
    if (raidLost.current) {
      raidLost.current = false;
      // G-07 · said as it was settled (raidSettle.ts's report): away, at the hour the garrison fell, with no night
      // between; and torn down only if the raiders wrecked anything
      const r = st.raidReport;
      const tore = !!r && r.ruined.length + r.razed.length > 0;
      st.notify(`The raiders had the field. They are gone${r?.away ? '' : ' by dawn'}, and they took${tore ? ' and tore down' : ''} what they could.` + haulReport(), true);
    } else {
      st.notify('The raid is beaten back! The bandits dropped their spoils.' + haulReport(), true);
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
    resetRaidHaul();
  }
  // G-04 · a warning running counts down to the raiders' arrival
  if (raidPlan.incoming > 0) {
    raidPlan.incoming -= 1;
    if (raidPlan.incoming <= 0) raidArrives(st, list, spawn, raidActive);
    return;
  }
  if (
    !raidActive.current &&
    raidCooldown.current <= 0 &&
    st.buildings.filter(isHomeBuilding).length >= 4 &&
    st.unlocks.includes('mining') &&
    !majorEventOn() &&
    (raidForce.current || raidDue(worldEnv.dayCount, Math.floor(worldEnv.time * 24)))
  ) {
    raidForce.current = false;
    raidWarning(st, raidCooldown);
  }
}

/** G-06 · what a raid's end says of the stores: the goods its thieves got away with, and those taken back from the
 *  fallen, by name and count (game/plunder.ts's raidHaul) — nothing when no thief took anything */
function haulReport(): string {
  const lost = haulOf(raidHaul.lost) ? ` They got away with ${goodsNamed(raidHaul.lost)}.` : '';
  const back = haulOf(raidHaul.recovered) ? ` Taken back from the fallen: ${goodsNamed(raidHaul.recovered)}.` : '';
  return lost + back;
}

/** G-04 · the horn: the raid is coming. Its plan is drawn now, so that the banner and the minimap can say from where,
 *  and its cooldown runs from now (the warning is the raid's first part). Away, the warning is a word from home: no
 *  horn, no banner — the raid still comes, and resolves, while the player is away (see raidDirector). */
function raidWarning(st: GameState, raidCooldown: Counter): void {
  raidCooldown.current = Math.max(240, worldEnv.dayLength * 1.5);
  // G-03 · the raid's plan: its sides (approach.ts), drawn from the day's seed and kept for the minimap and the
  // informants (state.ts's raidPlan)
  raidPlan.seed = raidSeedFor(worldEnv.dayCount);
  raidPlan.sides = raidSides(raidPlan.seed);
  raidPlan.incoming = warningLeadTime(st, null);
  const from = sidesNamed(raidPlan.sides);
  if (st.destination) {
    st.notify(`📯 Word from home: raiders are on the road to the homestead, coming from ${from}.`, true);
  } else {
    audio.play('horn', 0.9);
    st.notify(`📯 The horn! Raiders on the road, coming from ${from} — ${raidPlan.incoming} seconds to ready the walls.`, true);
  }
}

/** the raiders come, at the end of their warning */
function raidArrives(st: GameState, list: EnemyData[], spawn: Spawn, raidActive: Flag): void {
  raidActive.current = true;
  resetRaidHaul();
  raidDowned.clear(); // G-07 · this raid's own
  // G-06 · how many follow the leader: a richer homestead draws a hungrier raid (it was always two)
  const followers = raidSize(stockpileValue(st.inventory));
  if (!st.destination) { audio.play('warcry', 0.9); audio.play('horn', 0.9); }
  // N79 (requested 2026-07-28): raiders arrive by the road instead of
  // popping into existence on a ring around the homestead — spawned
  // loosely clustered around the same road entry point newcomers and
  // the merchant already walk in from (roadEntry()), each individually
  // routed in via the enemies' own walk in from the road
  // (game/enemyAi/movement.ts's walkIn) — G-03: to his own side of home.
  const entry = roadEntry();
  function roadSpawnPos(i: number): [number, number] {
    const a = (i / (followers + 1)) * Math.PI * 2;
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
    for (let i = 0; i <= followers; i++) {
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
    for (let i = 1; i <= followers; i++) {
      const [sx, sz] = roadSpawnPos(i);
      spawn(rollBanditFiller(), sx, sz, true, undefined, true, false, 1, false, null);
    }
  }
  // G-03 · each raider just spawned his own point on one of the plan's sides (drawn at the warning), in turn — G-06:
  // and every other one behind the leader (the first spawned) a thief
  const points: { x: number; z: number }[] = [];
  useEnemyStore.getState().enemies.filter((e) => e.raid && e.mob.approaching && !list.includes(e)).forEach((e, i) => {
    e.thief = i > 0 && thiefSlot(i);
    const at = approachPoint(e.mob, raidPlan.sides, i, e.id, raidPlan.seed);
    if (!at) return;
    e.mob.approachX = at.x;
    e.mob.approachZ = at.z;
    points.push(at);
  });
  // raiders occasionally bring their own ram — the same threat the
  // player's siege tools already pose, now aimed at the player's gate.
  // G-03 · rolled in by the road, from back along it past where the
  // raiders step on (raiderRam.ts's ramSpawn) — it started on a 34 m ring.
  if (Math.random() < 0.4) {
    // full reset, not just `active = true` — a ram that was broken last
    // raid must not roll back in already wrecked and on 0 HP
    const at = ramSpawn();
    resetRaiderRam(at.x, at.z);
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
      // G-03 · up against the wall-walk nearest where the raiders come: the middle of their approach points (the
      // road's entry with none) — it was any of them, picked at random, often the far side of the keep
      const n = points.length;
      const mean = n ? { x: points.reduce((a, p) => a + p.x, 0) / n, z: points.reduce((a, p) => a + p.z, 0) / n } : entry;
      const site = siteById(st, KEEP_SITE_ID)!;
      const away = (id: string) => { const at = siteSocketWorld(site, id)!; return Math.hypot(at.x - mean.x, at.z - mean.z); };
      const targetSocket = walkwaySockets.reduce((a, b) => (away(b.id) < away(a.id) ? b : a));
      resetRaiderLadder(targetSocket.id);
    }
  }
}
