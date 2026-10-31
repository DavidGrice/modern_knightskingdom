// CLN-26 · what the player would act on if they pressed E now: findTarget, moved here whole from PlayerController.tsx
// (it was a function inside the component; it takes the two component values it used — the camera and the player's
// position — from `ctx`). The early answers of a context (inside, riding, at a destination, at an engine, at a
// cart) first; otherwise everything in reach scored by distance and facing, the best one taken.
import * as THREE from 'three';
import { useGameStore, TAX_COOLDOWN_MS } from '@/game/store/gameStore';
import { LAND_TIERS, BUILDABLE_BY_ID, heightOf, labAssetId, sizeFor } from '@/game/data/buildables';
import {
  CEDRIC_CAMP, CEDRIC_INTERACT_RANGE, CEDRIC_REVEAL_QUEST, CEDRIC_WORLD,
  BROOK, EYE_HEIGHT, FISH_CAST_RANGE, INTERACT_RANGE, KEEP_CHEST_POS, KEEP_THRONE_POS, PLAYER_RADIUS,
  POND, RESIDENT_TALK_RANGE, SIGNPOST,
} from '@/game/data/world';
import { NPCS, isNpcRevealed, isNpcPresent, INTERIOR_RESIDENTS } from '@/game/data/npcs';
import { INTERIORS, pocketFor } from '@/game/data/interiors';
import { cedricFinalStandReady } from '@/game/cedricSiege';
import { worldEnv } from '@/game/env';
import { combatState, useEnemyStore } from '@/game/combat';
import { fishingState } from '@/game/fishing';
import { ridingState, horses, horseOnOffer } from '@/game/riding';
import { falconPos, FALCON_CALL_RANGE } from '@/game/falcon';
import { agentManager } from '@/ai/core/AgentManager';
import { COMPANION_ID } from '@/game/data/companion';
import { atJoustPass } from '@/game/joust';
import { cartState } from '@/game/carts';
import { dungeonState } from '@/game/dungeon';
import { npcMobs } from '@/game/npcMobs';
import { isBuilt, isDoorLike, isHomeBuilding } from '@/game/types';
import { GUILD_BY_WORLD } from '@/game/data/guilds';
import { MERCHANT_SPOT, merchantPresent } from '@/game/data/trade';
import { labCanFire, labCanLaunch, labCanOccupy, labIsExplosive, labIsLadder } from '@/game/data/labCapabilities';
import { GROUNDS, GROUND_BY_ID, deedName, groundOpen } from '@/game/data/grounds';
import { CULTIVATED_PLOTS, MAX_PLOT_STAGE, plotStakeAt } from '@/game/data/cultivatedPlots';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from '@/game/data/keep';
import { SET_PLANS, setStepCount } from '@/lib/setBuild';
import { crewState } from '@/game/crew';
import type { Target } from './types';
import { climbTargetFor } from './climb';

// scratch for the facing score — requested 2026-07-31: consider() runs once per interact candidate (every
// resource node, NPC and horse in range) and used to allocate a fresh Vector3 each call. Never stored past the
// statement that reads it.
const _forwardV = new THREE.Vector3();
const _considerV = new THREE.Vector3();

// Wave 35 verify-fix · man_engine/cannon/push_cart/hitch_cart all used the
// flat default INTERACT_RANGE regardless of the piece's own footprint. That
// silently worked for every engine so far because they all happened to be
// small enough — but oc6098b2 (Wave 35's own biggest single piece, no
// collision.json entry so it falls back to one full-size box) is genuinely
// UNREACHABLE from every angle: the physical collision box alone keeps the
// player back (footprint half-extent + PLAYER_RADIUS) past 3.4m on its
// SHORTER axis, let alone its longer one, so its own labCanOccupy:true
// promise (labCapabilities.ts) could never actually be triggered
// (live-confirmed: distAtPress pinned at 4.125m, prompt always null).
// oc6032b3's hitch prompt had the same shape one notch down — reachable
// from the side, but not head-on the way a player naturally approaches a
// vehicle (live-confirmed: side 2.77m worked, front/back 3.55m didn't).
//
// Rather than hand-tune a range per new piece, this grows the interact
// range to whatever the piece's OWN declared footprint demands so it is
// reachable from any facing the player might reasonably try — including
// the wider axis, not just the narrowest one a min-based fix would still
// have left half-blind. Math.max means it can only ever widen an already-
// working piece's range, never narrow it, so nothing that worked before
// this can regress.
function reachRangeFor(type: string, rot: number): number {
  const [sx, sz] = sizeFor(type, rot);
  return Math.max(INTERACT_RANGE, Math.max(sx, sz) / 2 + PLAYER_RADIUS + 0.5);
}

/** What findTarget reads from its caller (holdToAct, handing on PlayerController's): the camera (where the player faces)
 *  and the player's position. */
export interface TargetCtx {
  camera: THREE.Camera;
  pos: { current: THREE.Vector3 };
}

export function findTarget(ctx: TargetCtx, st: ReturnType<typeof useGameStore.getState>): Target | null {
  const { camera, pos } = ctx;
  // inside a building: the Grand Keep's own great hall still has its
  // bespoke chest/throne interactions; every other generalised interior
  // (data/interiors.ts) just offers a way back out
  if (st.interior) {
    const insideKeep = st.buildings.find((b) => b.id === st.interior)?.type === 'keep';
    if (insideKeep) {
      const toChest = Math.hypot(KEEP_CHEST_POS.x - pos.current.x, KEEP_CHEST_POS.z - pos.current.z);
      if (toChest < INTERACT_RANGE) {
        return {
          id: 'keep_chest', kind: 'chest', duration: 0.8, actionable: true,
          label: st.treasureOpened ? 'Open the empty chest' : 'Open the Royal Treasure Chest',
        };
      }
      const toThrone = Math.hypot(KEEP_THRONE_POS.x - pos.current.x, KEEP_THRONE_POS.z - pos.current.z);
      if (toThrone < INTERACT_RANGE) {
        const ready = Date.now() - st.lastTaxAt >= TAX_COOLDOWN_MS && st.villagers.length > 0;
        return {
          id: 'keep_throne', kind: 'collect_taxes', duration: 1.2, actionable: ready,
          label: ready ? 'Collect Taxes from the Kingdom' : "The Treasury Isn't Ready Yet",
        };
      }
      return { id: 'keep_exit', kind: 'interior_exit', duration: 0, actionable: true, label: 'Leave the Keep' };
    }
    const building = st.buildings.find((b) => b.id === st.interior);
    const def = building ? INTERIORS[building.type] : null;
    // Wave 45 (B3): a resident quest-giver stands at a fixed local spot
    // inside their own building type's pocket room (INTERIOR_RESIDENTS,
    // data/npcs.ts) — checked here, ahead of the plain exit fallback, the
    // same "specific stand-point, not talk-from-anywhere" gate the Keep's
    // own chest/throne above already use. `st.openDialogue` (performAction's
    // existing `kind === 'npc'` branch) needs no changes — it already
    // resolves any npc id generically, with no position/world check of its
    // own, and these residents are merged into NPC_BY_ID for exactly this.
    //
    // verify-fix (Wave 45): uses RESIDENT_TALK_RANGE (1.5m), NOT the
    // general INTERACT_RANGE (3.4m) — see that constant's own comment
    // (data/world.ts) for why. At the full 3.4m range this check covered
    // every wall of 3 of the 4 rooms from a centrally-placed resident, so
    // the "Leave" fallback right below could never win anywhere inside
    // them — a real, live-verified regression fixed here.
    const resident = building ? INTERIOR_RESIDENTS[building.type] : null;
    if (building && resident) {
      const pocket = pocketFor(building.type, building.id);
      const rx = pocket.x + resident.localX;
      const rz = pocket.z + resident.localZ;
      if (Math.hypot(rx - pos.current.x, rz - pos.current.z) < RESIDENT_TALK_RANGE) {
        return { id: resident.npc.id, kind: 'npc', duration: 0, actionable: true, label: `Talk to ${resident.npc.name}` };
      }
    }
    return {
      id: 'interior_exit', kind: 'interior_exit', duration: 0, actionable: true,
      label: `Leave ${def?.doorLabel ?? 'the building'}`,
    };
  }
  // mounted: E trains at a nearby quintain, jousts Richard at a gallop,
  // otherwise dismounts. Checked BEFORE the destination branch (Phase 20:
  // Richard's jousting field IS a destination now — the Tourney Grounds)
  if (ridingState.active) {
    // Wave 7 · the residency/reveal/range test moved to game/joust.ts so the
    // viewmodel can couch the lance off the SAME condition this prompt offers
    // it on. `st` carries both halves of the gate (completedQuests +
    // destination); the live `pos.current` goes in separately because
    // playerState is not written until the end of this frame.
    if (atJoustPass(st, pos.current.x, pos.current.z)) {
      return {
        id: 'richard', kind: 'joust', duration: 0.8, actionable: combatState.galloping,
        label: combatState.galloping ? 'Couch your lance!' : 'Gallop (Shift) to charge Richard',
      };
    }
    for (const b of st.buildings) {
      if (b.type !== 'quintain') continue;
      if (Math.hypot(b.x - pos.current.x, b.z - pos.current.z) < INTERACT_RANGE + 1.2) {
        return { id: b.id, kind: 'quintain', duration: 0.9, actionable: true, label: 'Mounted training!' };
      }
    }
    return { id: 'dismount', kind: 'dismount', label: 'Dismount', duration: 0, actionable: true };
  }
  // Wave 25 · Tam, the companion squire, greets both at home and away —
  // his own check placed here, in NEITHER the (home-only) block that
  // precedes this function's real dispatch nor `st.destination`'s own
  // block below, since each of those returns unconditionally for
  // everything reachable inside it (a check placed inside either would
  // silently work only half the time). Checked BEFORE the destination
  // split, same placement rule this file already documents for the
  // ridingState.active block just above.
  if (st.companionRecruited) {
    const c = agentManager.get(COMPANION_ID);
    if (c && Math.hypot(c.position.x - pos.current.x, c.position.z - pos.current.z) < INTERACT_RANGE) {
      return { id: COMPANION_ID, kind: 'talk_companion', duration: 0, actionable: true, label: 'Talk to Tam' };
    }
  }
  // away visiting a template world: residents (Phase 20 — the court, their
  // horses, Cedric's camp all live out here now) take priority when within
  // reach; anywhere else in the instance, E returns home exactly as before
  if (st.destination) {
    for (const n of NPCS) {
      if (n.world !== st.destination) continue;
      // Wave 53 (E5) verify-fix · isNpcPresent, not just isNpcRevealed:
      // King Leo/Queen Leonora now hide outside court hours (Npc.tsx's own
      // per-frame g.visible toggle) — without this, "Talk to King Leo"
      // could still be offered at his empty post at night. This whole
      // findTarget() call already runs every real frame (see its call site,
      // holdToAct, run from PlayerController's frame), so worldEnv.time is genuinely reactive here, unlike a
      // render-time filter — see npcs.ts's isNpcPresent doc.
      if (!isNpcPresent(n, st.completedQuests, worldEnv.time)) continue;
      const mob = npcMobs[n.id];
      const nx = mob?.x ?? n.x;
      const nz = mob?.z ?? n.z;
      if (Math.hypot(nx - pos.current.x, nz - pos.current.z) < INTERACT_RANGE) {
        return { id: n.id, kind: 'npc', duration: 0, actionable: true, label: `Talk to ${n.name}` };
      }
    }
    // only a horse that lives HERE: every horse's record exists in every
    // scene, and Richard's steed stands on ground The King's Approach has
    // too (riding.ts's horseOnOffer) — the same residency test the NPC loop
    // just above makes with `n.world`
    for (const h of Object.values(horses)) {
      if (!horseOnOffer(h, st.destination)) continue;
      if (Math.hypot(h.x - pos.current.x, h.z - pos.current.z) < INTERACT_RANGE) {
        return { id: h.id, kind: 'horse', duration: 0, actionable: true, label: 'Ride Horse' };
      }
    }
    // Cedric's camp at The Rival Castle: unsworn parleys, crown-sworn
    // fights — and his own bannermen sit the WAR COUNCIL for rebellion
    // errands (Phase 20 4b) instead of raising a hand against him
    if (
      st.destination === CEDRIC_WORLD
      && st.completedQuests.includes(CEDRIC_REVEAL_QUEST) && !st.defeatedCedric
      && !useEnemyStore.getState().enemies.some((e) => e.kind === 'cedric')
      && Math.hypot(CEDRIC_CAMP.x - pos.current.x, CEDRIC_CAMP.z - pos.current.z) < CEDRIC_INTERACT_RANGE
    ) {
      return {
        id: 'cedric', kind: 'challenge_cedric', duration: 0, actionable: true,
        // Wave 56 (F4): a Leo-sworn knight now gets the same parley moment
        // as an unsworn one (ParleyPanel branches the dialogue/options by
        // alliance itself) rather than a distinct pre-panel label.
        label: st.alliance === 'cedric' ? 'Sit the War Council'
          : cedricFinalStandReady(st) ? 'Challenge Cedric — His Final Stand'
          : 'Approach Cedric the Bull',
      };
    }
    // guild halls (Phase 21): each guild's hall sits near its world's landing
    const hall = GUILD_BY_WORLD[st.destination];
    if (hall && Math.hypot(hall.hallX - pos.current.x, hall.hallZ - pos.current.z) < INTERACT_RANGE + 1) {
      return {
        id: hall.id, kind: 'guild_hall', duration: 0, actionable: true,
        label: st.guild === hall.id ? `${hall.name} (your banner)` : `Enter the ${hall.name}`,
      };
    }
    // Wave 13 fix (2026-08-14) · a 'retrieve' room's Sealed Reliquary
    // (dungeon.ts's DungeonRoom.objective) used to be considered only in
    // the general facing-scored sweep far below findTarget — but THIS
    // block (every branch above) always returns first whenever
    // st.destination is set, which it always is while visiting the
    // dungeon ('dungeon' is set by enterDungeon() and never cleared until
    // the player leaves). That made the relic permanently unreachable.
    // Checked here instead, same distance-only test the NPC/horse checks
    // above already use (no facing requirement needed for those either).
    if (st.destination === 'dungeon' && dungeonState.layout) {
      for (const room of dungeonState.layout.rooms) {
        if (room.objective === 'retrieve' && !room.relicTaken
          && Math.hypot(room.cx - pos.current.x, room.cz - pos.current.z) < INTERACT_RANGE) {
          return {
            id: String(room.index), kind: 'dungeon_relic', duration: 1.0, actionable: true,
            label: 'Take the Sealed Reliquary',
          };
        }
      }
      // Wave 48 (B9) · an 'escort' room's captive, same distance-only
      // convention as the relic just above — checked at the room's own
      // (cx, cz) since the captive hasn't moved from there until freed.
      for (const room of dungeonState.layout.rooms) {
        if (room.objective === 'escort' && !room.captiveFreed
          && Math.hypot(room.cx - pos.current.x, room.cz - pos.current.z) < INTERACT_RANGE) {
          return {
            id: String(room.index), kind: 'dungeon_captive', duration: 1.0, actionable: true,
            label: 'Free the Prisoner',
          };
        }
      }
    }
    return { id: 'travel_return', kind: 'travel_return', duration: 0, actionable: true, label: 'Return Home' };
  }
  // already pushing/hitched: E always lets go, regardless of which way
  // you're currently facing (the cart follows you, so "look at it" isn't
  // a meaningful requirement the way it is for a stationary target)
  // crewing an engine: E always steps down (firing is the attack button,
  // see crewEngine, game/playerPhysics/locomotion.ts), so nothing else competes for it
  if (crewState.engineId) {
    const eb = st.buildings.find((x) => x.id === crewState.engineId);
    return {
      id: crewState.engineId, kind: 'leave_engine', duration: 0, actionable: true,
      label: `Step down from the ${eb ? BUILDABLE_BY_ID[eb.type]?.name ?? 'engine' : 'engine'}`,
    };
  }
  if (cartState.pushingId) {
    return { id: cartState.pushingId, kind: 'push_cart', duration: 0, actionable: true, label: 'Let go of the Ram' };
  }
  if (cartState.hitchedId) {
    return { id: cartState.hitchedId, kind: 'hitch_cart', duration: 0, actionable: true, label: 'Unhitch the Cart' };
  }
  camera.getWorldDirection(_forwardV);
  const p = pos.current;
  let best: { t: Target; score: number } | null = null;

  const consider = (x: number, z: number, y: number, t: Target, range = INTERACT_RANGE) => {
    _considerV.set(x - p.x, y - p.y, z - p.z);
    const dist = Math.hypot(_considerV.x, _considerV.z);
    if (dist > range) return;
    _considerV.normalize();
    const dot = _considerV.dot(_forwardV);
    if (dot < 0.45) return;
    const score = dot - dist * 0.05;
    if (!best || score > best.score) best = { t, score };
  };

  // a worn-out tool (durability hit 0) still works, just slower — a nudge
  // toward the workbench rather than a hard block on gathering
  const wornPenalty = (id: 'axe' | 'pickaxe' | 'fishing_rod') => ((st.durability[id] ?? 100) <= 0 ? 1.4 : 1);

  for (const n of st.nodes) {
    if (n.respawnAt !== null) continue;
    // J46 · a node in a ground beyond your deed can be walked up to and
    // read, but not worked — that is what makes buying the next deed an
    // acquisition rather than a wider fence
    const gr = n.ground ? GROUND_BY_ID[n.ground] : null;
    const beyondDeed = !!gr && !groundOpen(gr, st.landTier);
    if (beyondDeed) {
      consider(n.x, n.z, n.kind === 'tree' ? 1.2 : 0.8, {
        id: n.id, kind: n.kind, duration: 1, actionable: false,
        label: `${gr!.name} — needs the ${deedName(gr!.tier)} deed`,
      });
      continue;
    }
    if (n.kind === 'tree') {
      consider(n.x, n.z, 1.2, {
        id: n.id, kind: 'tree', duration: 1.6 * wornPenalty('axe'), actionable: true, label: 'Chop Tree',
      });
    } else if (n.kind === 'herb') {
      consider(n.x, n.z, 0.7, {
        id: n.id, kind: 'herb', duration: 1.0, actionable: true, label: 'Forage Herbs',
      });
    } else if (n.kind === 'rock') {
      const hasPick = (st.inventory.pickaxe ?? 0) > 0;
      if (n.variant === 'iron') {
        const mining = st.unlocks.includes('mining');
        consider(n.x, n.z, 0.8, {
          id: n.id, kind: 'rock', duration: 2.2 * wornPenalty('pickaxe'), actionable: hasPick && mining,
          label: !mining ? 'A strange dark rock… (learn Mining)'
            : hasPick ? 'Mine Iron Vein' : 'You need a Pickaxe',
        });
      } else {
        consider(n.x, n.z, 0.8, {
          id: n.id, kind: 'rock', duration: 1.9 * wornPenalty('pickaxe'), actionable: hasPick,
          label: hasPick ? 'Mine Boulder' : 'You need a Pickaxe',
        });
      }
    } else if (n.kind === 'fishing') {
      const hasRod = (st.inventory.fishing_rod ?? 0) > 0;
      const unlocked = st.unlocks.includes('fishing');
      const target: Target = !unlocked || !hasRod
        ? { id: n.id, kind: 'fishing', duration: 1, actionable: false,
            label: !unlocked ? 'The fish ignore you… (locked)' : 'You need a Fishing Rod' }
        : fishingState.nodeId !== n.id
          ? { id: n.id, kind: 'fishing', duration: 0.8 * wornPenalty('fishing_rod'), actionable: true, label: 'Cast your line' }
          : fishingState.phase === 'waiting'
            ? { id: n.id, kind: 'fishing', duration: 1, actionable: false, label: 'Watching the water…' }
            : { id: n.id, kind: 'fishing', duration: 0.06, actionable: true, label: 'Bite!' };
      // the dock's own interact point — Wave 17 #2: tightened to
      // FISH_CAST_RANGE (was the general INTERACT_RANGE), which was
      // reaching 2.81m onto the east road tile's own rendered footprint
      // right next to the fishspot node; see world.ts's FISH_CAST_RANGE.
      consider(n.x, n.z, 0.9, target, FISH_CAST_RANGE);
      // Requested 2026-07-30: fishing shouldn't need the one specific dock
      // plank — cast from anywhere along the pond's edge instead. Reuses
      // the SAME `consider()` distance+facing check unchanged, just feeds
      // it the player's own nearest point on the pond's circle each frame
      // instead of the dock's fixed coordinate, so the same INTERACT_RANGE
      // bubble effectively wraps the whole shoreline rather than sitting
      // on one point. Everything downstream (fishingState, the rod swing,
      // the catch) still keys off the one real `fishspot` node id
      // regardless of where the cast actually started.
      const toPondX = p.x - POND.x;
      const toPondZ = p.z - POND.z;
      const distFromCenter = Math.hypot(toPondX, toPondZ) || 1;
      const edgeX = POND.x + (toPondX / distFromCenter) * POND.radius;
      const edgeZ = POND.z + (toPondZ / distFromCenter) * POND.radius;
      consider(edgeX, edgeZ, 0.9, target, FISH_CAST_RANGE);
    }
  }
  // wild horses can be ridden — the ones that live here (horseOnOffer, as
  // in the destination branch above)
  for (const h of Object.values(horses)) {
    if (!horseOnOffer(h, st.destination)) continue;
    consider(h.x, h.z, 1.1, {
      id: h.id, kind: 'horse', duration: 0, actionable: true, label: 'Ride Horse',
    });
  }
  // Wave 13 · the untamed falcon can be called down and kept. A walk-up
  // range doesn't mean anything for something that never lands and is
  // never at ground level, so this feeds the SAME scored consider() the
  // rest of the interact system runs on the bird's own live position
  // (game/falcon.ts, written every frame by Wildlife.tsx) at a wider
  // range instead of a fixed spot — you have to actually be near it, and
  // looking up at it, on whatever part of its circling path it is
  // currently flying. Hidden at night to match the bird's own visibility
  // rule (Wildlife.tsx). No skill check, no minigame, same as mounting a
  // wild horse: in range and holding E is the whole of it.
  if (!st.falconTamed && worldEnv.night < 0.6) {
    consider(falconPos.x, falconPos.z, falconPos.y, {
      id: 'falcon', kind: 'call_falcon', duration: 0, actionable: true, label: 'Whistle for the Falcon',
    }, FALCON_CALL_RANGE);
  }
  // (the dungeon relic's own interact check lives up in the st.destination
  // branch above — this sweep never runs while destination is set, since
  // that branch always returns first; see the Wave 13 fix comment there.)
  // L69 · the deed ladder used to live entirely in a build-menu button, so
  // the only way to learn that a ground could be bought was to find that
  // button. Every ground's boundary stone is now an interaction: walk up to
  // it and it either tells you what the deed costs or takes your gold.
  for (const g of GROUNDS) {
    const sx = g.x;
    const sz = g.z + (g.z > 0 ? -g.halfZ : g.halfZ);
    if (groundOpen(g, st.landTier)) {
      consider(sx, sz, 2.4, {
        id: g.id, kind: 'buy_ground', duration: 0, actionable: false,
        label: `${g.name} — yours to work`,
      });
    } else {
      // the next deed up the ladder is the one that buys this ground
      const need = LAND_TIERS[Math.min(g.tier, LAND_TIERS.length - 1)];
      const canBuyNow = st.landTier + 1 >= g.tier;
      const nextCost = LAND_TIERS[Math.min(st.landTier + 1, LAND_TIERS.length - 1)]?.cost ?? 0;
      const gold = st.inventory.gold ?? 0;
      consider(sx, sz, 2.4, {
        id: g.id, kind: 'buy_ground', duration: 0, actionable: canBuyNow && gold >= nextCost,
        label: canBuyNow
          ? (gold >= nextCost
            ? `Buy the ${LAND_TIERS[st.landTier + 1].name} deed · ${nextCost}g — opens ${g.name}`
            : `${g.name} needs the ${LAND_TIERS[st.landTier + 1].name} deed · ${nextCost}g (you have ${gold})`)
          : `${g.name} — held under the ${need.name} deed, still ${g.tier - st.landTier} deeds away`,
      });
    }
  }

  // Wave 5 · cultivated plots. Same static-table shape as the boundary
  // stones above (these are hand-authored data, not PlacedBuildings), and
  // the same homestead-facing stake position, so the prompt appears exactly
  // where the stake you can see stands. Home-only for free: the destination
  // branch at the top of findTarget returns long before this line.
  for (const def of CULTIVATED_PLOTS) {
    const stake = plotStakeAt(def);
    const live = st.cultivatedPlots[def.id];
    if (!live) {
      consider(stake.x, stake.z, 1.2, {
        id: def.id, kind: 'plant_plot', duration: 1.2, actionable: true,
        label: `${def.name} — ${def.plantHint}`,
      });
      continue;
    }
    const full = live.stage >= MAX_PLOT_STAGE;
    const pails = st.inventory.water_bucket ?? 0;
    consider(stake.x, stake.z, 1.2, {
      id: def.id, kind: 'water_plot', duration: 1, actionable: !full && pails > 0,
      label: full ? `${def.name} — come in full`
        : pails > 0 ? `Water ${def.name} (${live.stage}/${MAX_PLOT_STAGE})`
        : `${def.name} is thirsty — fill a pail at the brook`,
    });
  }

  // Wave 5 · fill a pail anywhere along the brook, not at one magic plank —
  // the same trick the pond-edge fishing cast above uses, fed the player's
  // own nearest point on the brook's line instead of the pond's circle.
  {
    const bdx = BROOK.endX - BROOK.startX;
    const bdz = BROOK.endZ - BROOK.startZ;
    const len2 = bdx * bdx + bdz * bdz;
    const tt = Math.max(0, Math.min(1, ((p.x - BROOK.startX) * bdx + (p.z - BROOK.startZ) * bdz) / len2));
    consider(BROOK.startX + tt * bdx, BROOK.startZ + tt * bdz, 0.4, {
      id: 'brook', kind: 'draw_water', duration: 0.8, actionable: true,
      label: 'Fill a Pail of Water',
    });
  }

  // M · the workshop. A workbench with nothing on it opens the set list;
  // one with a set laid out takes the work, a piece per hold.
  for (const b of st.buildings) {
    if (b.type !== 'workbench' || !isBuilt(b) || !isHomeBuilding(b)) continue;
    const w = st.workshop;
    if (w) {
      const total = setStepCount(w.setNum);
      consider(b.x, b.z, 2.6, {
        id: b.id, kind: 'set_part', duration: 0.55, actionable: true,
        label: `Set the next piece — ${SET_PLANS[w.setNum]?.name} (${w.step}/${total})`,
      });
    } else {
      consider(b.x, b.z, 2.6, {
        id: b.id, kind: 'workshop', duration: 0, actionable: true,
        label: 'Open the workshop',
      });
    }
  }

  // J51 · the castle foundation. Each socket is its own place to stand:
  // an empty one offers what can be raised there, a staked-out one takes
  // hammer work like any other construction site.
  if (st.keep) {
    for (const sock of KEEP_SOCKETS) {
      const sx = st.keep.x + sock.x;
      const sz = st.keep.z + sock.z;
      const partId = st.keep.parts[sock.id];
      const done = (st.keep.built[sock.id] ?? 0) >= 1;
      if (!partId) {
        consider(sx, sz, 2.6, {
          id: sock.id, kind: 'keep_socket', duration: 0, actionable: true,
          label: `${sock.name} — choose what to raise`,
        });
      } else if (!done) {
        const part = KEEP_PART_BY_ID[partId];
        consider(sx, sz, 2.6, {
          id: sock.id, kind: 'keep_work', duration: 0.9, actionable: true,
          label: `Build ${part?.name ?? 'piece'} (${Math.round((st.keep.built[sock.id] ?? 0) * 100)}%)`,
        });
      }
    }
  }

  // stations open their crafting menu; beds let you sleep through the night
  for (const b of st.buildings) {
    const def = BUILDABLE_BY_ID[b.type];
    // build-then-construct (Phase 19): an unbuilt site's only interaction
    // is swinging the hammer at it — nothing else it "is" exists yet
    if (!isBuilt(b)) {
      // Wave 57 (F5): a dragon-fire ruin (b.ruin) reuses this exact same
      // under-construction state — reads as "Rebuild" rather than "Build"
      // so the prompt doesn't imply this piece never existed.
      consider(b.x, b.z, 1.4, {
        id: b.id, kind: 'construct', duration: 0.9, actionable: true,
        label: `${b.ruin ? 'Rebuild' : 'Build'} ${def?.name ?? 'structure'} (${Math.round((b.built ?? 0) * 100)}%)`,
      });
      continue;
    }
    if (b.type === 'quintain') {
      consider(b.x, b.z, 1.2, {
        id: b.id, kind: 'quintain', duration: 0.9, actionable: true,
        label: ridingState.active ? 'Mounted training!' : 'Train Combat',
      });
      continue;
    }
    // Wave 34 (G6.2) · the skeleton-display prop's flavor-text examine.
    // Bespoke content (the notify text is hand-written), so this checks
    // the placed piece's own id directly rather than a generic lab-trait
    // predicate — the same shape `quintain` above uses.
    if (b.type === 'oc6095-1') {
      consider(b.x, b.z, 1.2, {
        id: b.id, kind: 'examine_skeleton', duration: 0.6, actionable: true,
        label: 'Examine the skeleton display',
      });
      continue;
    }
    // the springboard: any piece the lab charts a real launch mechanism on
    // (traits.interaction.canLaunch) lights up here, mirroring how
    // labCanFire above generalizes the siege engines.
    if (labCanLaunch(labAssetId(b.type))) {
      consider(b.x, b.z, 1.4, {
        id: b.id, kind: 'launch', duration: 0, actionable: true, label: 'Launch!',
      });
      continue;
    }
    // anything the rig lab marked as able to shoot works like the cannon —
    // the nine siege engines from `traits.vehicle.canFire` all light up here
    // without needing a per-piece branch (2026-07-20 lab integration)
    if (b.type === 'cannon' || labCanFire(labAssetId(b.type))) {
      const hasStone = (st.inventory.stone ?? 0) >= 1;
      const label = def?.name ?? 'Cannon';
      // engines the lab found a crew position on are MANNED first — you
      // step aboard, then aim and shoot from where the crew stands. The
      // ones with no crew position (oc1289) stay fire-in-place.
      const range = reachRangeFor(b.type, b.rot);
      if (labCanOccupy(labAssetId(b.type))) {
        consider(b.x, b.z, 1.0, {
          id: b.id, kind: 'man_engine', duration: 0, actionable: true,
          label: `Man the ${label}`,
        }, range);
      } else {
        consider(b.x, b.z, 1.0, {
          id: b.id, kind: 'cannon', duration: 0, actionable: hasStone,
          label: hasStone ? `Fire ${label} (1 stone)` : `${label} needs a stone ball`,
        }, range);
      }
      continue;
    }
    // charges from `traits.explosive` — hold to light the fuse
    if (labIsExplosive(labAssetId(b.type))) {
      consider(b.x, b.z, 1.0, {
        id: b.id, kind: 'detonate', duration: 1.0, actionable: true,
        label: `Light the ${def?.name ?? 'charge'}`,
      });
      continue;
    }
    if (b.type === 'farmplot') {
      const growth = st.plots[b.id];
      const label =
        growth === undefined ? 'Plant wheat'
          : growth > 0 ? `Wheat growing… ${Math.ceil((growth / 200) * 100)}%`
          : 'Harvest wheat';
      consider(b.x, b.z, 0.5, {
        id: b.id, kind: 'plot', duration: growth === 0 ? 1.0 : 0,
        actionable: growth === undefined || growth === 0,
        label,
      });
      continue;
    }
    // Wave 8 · doors answer here too. Same target kind, same store action,
    // same `gateOpen` record — a door IS a small gate (see isDoorLike),
    // just a lighter mechanism: it raises faster than the Castle Gate's
    // full drawbridge winds up.
    if (isDoorLike(b.type)) {
      const open = st.gateOpen[b.id] ?? true;
      // Wave 24 · a shutter is lighter still than the Portcullis — barely
      // more than lifting a latch, not raising a lattice or a drawbridge
      const noun = b.type === 'door' ? 'Portcullis' : b.type === 'window' ? 'Shutters' : 'Gate';
      const duration = b.type === 'door' ? 0.5 : b.type === 'window' ? 0.4 : 1.2;
      consider(b.x, b.z, 1.6, {
        id: b.id, kind: 'gate', duration, actionable: true,
        label: `${open ? 'Close' : 'Open'} the ${noun}`,
      });
      continue;
    }
    // Wave 8 · the ladder. Standing at its foot it offers the climb (and
    // says so plainly when it is leaning against nothing); standing above
    // it, it is the way back down.
    if (labIsLadder(labAssetId(b.type))) {
      // climbTargetFor sweeps every building and 17 probe points, so ask it
      // only about a ladder that could actually be offered this frame
      if (Math.hypot(b.x - p.x, b.z - p.z) > INTERACT_RANGE + 1.6) continue;
      const feet = p.y - EYE_HEIGHT;
      if (feet > (b.y ?? 0) + 1.2) {
        consider(b.x, b.z, (b.y ?? 0) + heightOf(b.type), {
          id: b.id, kind: 'climb_down', duration: 0.8, actionable: true, label: 'Climb down',
        }, INTERACT_RANGE + 1.4);
      } else {
        const info: { nearAnything?: boolean } = {};
        const climb = climbTargetFor(st, b, info);
        const label = climb ? `Climb to the ${climb.what}`
          // leaning on something real, just not tall enough for one ladder yet
          : info.nearAnything ? 'Too short to reach — stack another ladder'
          : 'Lean this ladder against a wall to climb';
        consider(b.x, b.z, 1.2, {
          id: b.id, kind: 'climb', duration: 1.1, actionable: !!climb, label,
        });
      }
      continue;
    }
    // already-engaged carts are handled as an early return above (letting
    // go / unhitching shouldn't depend on which way you happen to be
    // facing) — here we only need to offer starting one
    // Wave 35 (G5) · oc6096-1 (a bigger battering-ram/siege-tower combo,
    // literal battering_head/ram_horns rig) and oc6032b3 (a mobile
    // catapult/crossbow wagon, not a ram) extend the same two hardcoded
    // checks rather than a new predicate — `traits.vehicle.canPush`/
    // `canDrive` is the generic auto-seeded shape EVERY `kind:'vehicle'`
    // asset gets (verified identical to warcart/bladecart's own entries),
    // so it can't discriminate which pieces should actually push or
    // hitch; there is no `labCanPush()` because none of this is data-
    // driven today (see labCapabilities.ts's Wave 35 G5 comment).
    if (b.type === 'warcart' || b.type === 'oc6096-1') {
      if (cartState.pushingId !== b.id) {
        consider(b.x, b.z, 1.6, { id: b.id, kind: 'push_cart', duration: 0, actionable: true, label: 'Push the Battering Ram' }, reachRangeFor(b.type, b.rot));
      }
      continue;
    }
    if (b.type === 'bladecart' || b.type === 'oc6032b3') {
      if (cartState.hitchedId !== b.id) {
        consider(b.x, b.z, 1.6, { id: b.id, kind: 'hitch_cart', duration: 0, actionable: true, label: 'Hitch the Cart' }, reachRangeFor(b.type, b.rot));
      }
      continue;
    }
    {
      // any building with a generalised interior (data/interiors.ts) offers
      // a door prompt once finished — the Keep is just the first of these
      const def = INTERIORS[b.type];
      if (def && isBuilt(b)) {
        consider(b.x, b.z, 2.0, {
          id: b.id, kind: 'interior_enter', duration: 0, actionable: true, label: `Enter ${def.doorLabel}`,
        }, def.enterRange);
        continue;
      }
    }
    if (b.type === 'bed') {
      const night = worldEnv.night > 0.45;
      consider(b.x, b.z, 0.6, {
        id: b.id, kind: 'bed', duration: 1.2,
        actionable: night,
        label: night ? 'Sleep until dawn' : 'Too early to sleep',
      });
      continue;
    }
    if (!def?.station) continue;
    consider(b.x, b.z, 1.0, {
      id: b.id, kind: 'station', station: def.station, duration: 0,
      actionable: true, label: `Use ${def.name}`,
    });
  }
  for (const n of NPCS) {
    if (!isNpcRevealed(n, st.completedQuests)) continue;
    // Alric & Beda (2026-07-20): once recruited onto the roster they're a
    // real villager, not a standalone NPC — Npc.tsx already stops
    // rendering them, so interaction must skip them too or "Talk to
    // Alric" keeps offering at his old post after he's joined
    if (st.villagers.some((v) => v.id === n.id)) continue;
    // their day/night schedule (Phase 15) can move them well away from
    // this static spot — talk to wherever they actually are right now,
    // or the prompt lingers at their old post after they've left it
    const mob = npcMobs[n.id];
    consider(mob?.x ?? n.x, mob?.z ?? n.z, 1.3, {
      id: n.id, kind: 'npc', duration: 0, actionable: true, label: `Talk to ${n.name}`,
    });
  }
  if (merchantPresent(worldEnv.time)) {
    consider(MERCHANT_SPOT.x, MERCHANT_SPOT.z, 1.2, {
      id: 'merchant', kind: 'merchant', duration: 0, actionable: true, label: 'Trade with the Merchant',
    });
  }
  const stall = st.buildings.find((b) => b.type === 'market_stall');
  if (stall) {
    const staffed = st.villagers.some((v) => v.job === 'merchant');
    consider(stall.x, stall.z, 1.6, {
      id: 'market_stall', kind: 'merchant', duration: 0, actionable: staffed,
      label: staffed ? 'Trade at the Market Stall' : 'Market Stall (assign a Merchant in the Roster)',
    });
  }
  consider(SIGNPOST.x, SIGNPOST.z, 1.4, {
    id: 'signpost', kind: 'travel_board', duration: 0, actionable: true, label: 'Consult the Travel Map',
  });
  // (Cedric's camp interaction moved into the destination branch above —
  // Phase 20 relocated his camp to The Rival Castle, template-05)
  return best ? (best as { t: Target }).t : null;
}
