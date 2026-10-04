// CLN-18 · what differs between the two dragon sieges. Both are one state
// machine (components/world/DragonSiegeController.tsx): a nightly roll, a
// circling flight that breathes fire on wooden structures, a hit count that
// routs the beast, a reward. DragonSiege.tsx and BlackDragonSiege.tsx were two
// copies of it that differed in exactly what is listed here — numbers, lines,
// which air channel, which gate, which record.
import type { useGameStore } from './store/gameStore';
import { blackDragonAllowed, dragonAllowed } from './difficulty';
import { dragonAir, dragonAirBlack } from './dragonAir';

type GameState = ReturnType<typeof useGameStore.getState>;

export interface DragonSiegeConfig {
  /** which boss this is to game/bossEncounter.ts: the hits-to-rout tier
   *  curve, the victory reward and the legendary roll */
  boss: 'dragon' | 'blackDragon';
  /** which rig DragonOmen.tsx's loader builds */
  rig: 'green' | 'black';
  /** where this dragon publishes itself each frame, so ground defenders can
   *  look up and engage it (G26), and the flag that keeps two dragons from
   *  being in the air at once */
  air: typeof dragonAir;
  /** the window.__kk* test hook's name */
  debugKey: string;

  /** may it come at all tonight? */
  allowed: (st: GameState) => boolean;
  /** chance of the siege on a night it is allowed, rolled once per night */
  rollChance: number;
  /** stings that rout it, before bossTierScale(boss) scales the count at
   *  roll time */
  hitsToRoutBase: number;

  /** seconds between fire passes, and before the first one */
  breathEvery: number;
  firstBreath: number;
  breathDamage: number;

  /** the flight: a circle of this radius, flown at orbitRate radians per
   *  second, bobbing six metres either side of `altitude` at bobRate, banked
   *  into the turn */
  circleR: number;
  orbitRate: number;
  altitude: number;
  bobRate: number;
  bank: number;
  /** the wing beat (the tail trails it) and the head's sweep */
  wingRate: number;
  headRate: number;

  /** the store's own record of how the siege ended */
  record: (st: GameState, routed: boolean) => void;

  lines: {
    /** damageBuilding's cause */
    scorched: string;
    /** said once, when there is nothing wooden to burn */
    stoneHolds: string;
    struck: (source: string, hits: number, hitsToRout: number) => string;
    boltStruck: (hits: number, hitsToRout: number) => string;
    routed: string;
    sated: string;
    descends: string;
    /** one villager's own line as it arrives */
    scream: (villager: string) => string;
  };
}

/** The Dragonfire Siege: the beast of the omen. */
export const GREEN_DRAGON: DragonSiegeConfig = {
  boss: 'dragon',
  rig: 'green',
  air: dragonAir,
  debugKey: '__kkSiege',
  // the siege only comes after the omen has been seen.
  // O7 · the gate used to be `builtBuildings < 2`, which clears in the
  // first minutes — long before a bow or a single arrow is craftable, so
  // the first dragon was an unwinnable fight. It now reads the shared
  // threat tier (game/difficulty.ts), which also requires the player to
  // actually own a ranged weapon AND ammunition for it.
  allowed: (st) => st.dragonSeen && dragonAllowed(),
  rollChance: 0.25,
  hitsToRoutBase: 5,
  breathEvery: 6,
  firstBreath: 3.5,
  breathDamage: 14,
  circleR: 30,
  orbitRate: 0.32,
  altitude: 15,
  bobRate: 0.85,
  bank: 0.22,
  wingRate: 4.2,
  headRate: 0.8,
  record: (st, routed) => st.recordDragonSiege(routed),
  lines: {
    scorched: 'scorched by dragonfire',
    stoneHolds: 'The flames find nothing to catch — stone holds against dragonfire!',
    struck: (source, hits, hitsToRout) => `${source} strikes the beast! (${hits}/${hitsToRout})`,
    boltStruck: (hits, hitsToRout) => `🏹 A bolt strikes the beast! (${hits}/${hitsToRout})`,
    routed: '🐉 Stung and shrieking, the dragon breaks off into the dark — the homestead stands!',
    sated: '🐉 The dragon wheels away, sated… for now. The homestead endures.',
    descends: '🐉 DRAGONFIRE! The beast descends upon your homestead — to arms!',
    scream: (villager) => `${villager} points to the sky and screams — the homestead scatters!`,
  },
};

/** Wave 36 (A8) · The Black Dragon: Cedric's own beast, l7517401 — a second,
 *  fully independent dragon siege. Gated well past the first dragon
 *  (game/difficulty.ts's blackDragonAllowed: the curve's ceiling tier AND
 *  having already routed the green dragon at least once) — this is what the
 *  realm sends once a player has proven they can already beat one dragon, not
 *  a second copy of the same unlock. A touch tighter and faster in the air
 *  than the green dragon, a shade quicker and hotter with its fire. */
export const BLACK_DRAGON: DragonSiegeConfig = {
  boss: 'blackDragon',
  rig: 'black',
  air: dragonAirBlack,
  debugKey: '__kkBlackSiege',
  allowed: (st) => blackDragonAllowed(st),
  rollChance: 0.18,
  // Wave 38 (A1): was its own local `6 + Math.max(0, difficultyState.tier - 5)`
  // formula, now the same shared curve the green dragon reads (BOSS_TIER_STEP,
  // bossEncounter.ts). Numerically identical today: BLACK_DRAGON_TIER already
  // sits at TIER_RULES' own ceiling, so bossTierScale('blackDragon') is
  // always 1 until a future wave extends the curve past tier 5.
  hitsToRoutBase: 6,
  breathEvery: 5,
  firstBreath: 3,
  breathDamage: 18,
  circleR: 26,
  orbitRate: 0.36,
  altitude: 14,
  bobRate: 0.9,
  bank: 0.24,
  wingRate: 4.6,
  headRate: 0.85,
  record: (st, routed) => st.recordBlackDragonSiege(routed),
  lines: {
    scorched: "scorched by the black dragon's flame",
    stoneHolds: 'The flames find nothing to catch — stone holds against the black dragon!',
    struck: (source, hits, hitsToRout) => `${source} strikes the black beast! (${hits}/${hitsToRout})`,
    boltStruck: (hits, hitsToRout) => `🏹 A bolt strikes the black beast! (${hits}/${hitsToRout})`,
    routed: '🐉 Stung and shrieking, the black dragon breaks off into the dark — the homestead stands!',
    sated: '🐉 The black dragon wheels away, sated… for now. The homestead endures.',
    descends: "🐉 THE BLACK DRAGON! Cedric's own beast descends upon your homestead — to arms!",
    scream: (villager) => `${villager} points at the black shape overhead and screams — the homestead scatters!`,
  },
};
