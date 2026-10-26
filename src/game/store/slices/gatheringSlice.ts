// CLN-07 · the store's gathering slice: the resource nodes (seeded, harvested, respawned) and the fields and plots
// (broken, sown, tended, watered, harvested).
import type { CultivatedPlot, ItemId, ResourceNodeState, SkillId } from '../../types';
import { isBuilt } from '../../types';
import { GROUNDS, groundAt, type RectSection } from '../../data/grounds';
import { MAX_PLOT_STAGE, PLOT_BY_ID, plotNodeCount } from '../../data/cultivatedPlots';
import { ROAD_HALF_WIDTH, ROAD_TILE, routeCells, vergeCells } from '../../data/road';
import { brickLabel } from '../../data/brickResources';
import { SETTLEMENT_NODES } from '../../data/settlements';
import { ATTR_FX, BASE_FX, CALLING_FX, PERK_FX, TALENT_FX } from '../../data/effects';
import { cropGrowTime, harvestSheaves } from '../../data/derivedStats';
import { callingSignature } from '../../data/classes';
import { ITEMS } from '../../data/items';
import { BUILD_REGION } from '../../data/buildables';
import { audio } from '@/lib/audio';
import { POND, FISHING_DOCK, STARTER_VILLAGE_CLEAR, WORLD_HALF } from '../../data/world';
import { WORLD_DESTINATION_BY_ID, resolveDestPoint } from '../../data/worlds';
import { waterAt } from '../../waterworks';
import { mulberry32, randInt } from '@/lib/rng';
import { atGuildMaxRank } from '../storeHelpers';
import { GROW_TIME } from '../constants';
import type { GameState } from '../gameStore';
import type { SliceCreator } from './types';

const TREE_MODELS = ['/assets/props/scenery/l243500.glb', '/assets/props/scenery/l347100.glb'];

// NOTHING but pieces the player places may stand inside the build grid
// (2026-07-20) — a small margin keeps trunks and foliage from overhanging the
// edge tiles too.
const NODE_BUILD_CLEAR = 3;
const inBuildRegion = (x: number, z: number) =>
  x > BUILD_REGION.minX - NODE_BUILD_CLEAR && x < BUILD_REGION.maxX + NODE_BUILD_CLEAR
  && z > BUILD_REGION.minZ - NODE_BUILD_CLEAR && z < BUILD_REGION.maxZ + NODE_BUILD_CLEAR;
// O3 · neither scatter pass knew Alric/Beda's home corner existed — it sits
// outside BUILD_REGION and outside every GROUNDS section, so a tree could
// (and did) land inside Beda's hut. Both passes reject against the same fixed
// clear-zones a footprint-collision test would have asked for from the start.
const inStarterVillage = (x: number, z: number) =>
  STARTER_VILLAGE_CLEAR.some((c) => Math.hypot(x - c.x, z - c.z) < c.r);

/** a section id, hashed to a stable seed — a cultivated plot has no place in
 *  seedNodes' one shared 20260713 stream (it is scattered on demand, from
 *  cultivatePlot, long after that stream has been consumed), but its layout
 *  still has to come out the same every time it is re-derived */
function sectionSeed(id: string): number {
  let h = 20260805;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return h;
}

/**
 * Empire arc, Wave 5 · scatter a rectangular section's nodes.
 *
 * Lifted verbatim out of seedNodes' per-ground loop so grounds and cultivated
 * plots share ONE implementation — the gates below (world edge, pond shore,
 * build region, starter village, separation) are the accumulated result of
 * several real bugs and must not exist in two copies that can drift.
 *
 * `existingNodes` is everything already standing: candidates keep clear of it
 * the same way the road's verge pass already does. A no-op for the six
 * grounds (their boxes sit far enough apart that no two node clouds can come
 * within 3m once the edge inset is applied) — it earns its keep for plots,
 * which are scattered late, into a world that already has nodes in it.
 *
 * `rnd` is threaded IN rather than seeded here: seedNodes runs every ground
 * off one shared 20260713 stream, and re-seeding per section would change
 * every existing layout.
 */
function scatterNodesInRect(
  section: RectSection & { id: string },
  world: string | null,
  existingNodes: ResourceNodeState[],
  rnd: () => number = mulberry32(sectionSeed(section.id)),
): ResourceNodeState[] {
  const out: ResourceNodeState[] = [];
  const placed: [number, number][] = [];
  // min separation inside a section, by kind — trees may crowd, boulders need
  // room to walk between, herb patches must not stack
  const sep = section.kind === 'tree' ? 3.2 : section.kind === 'rock' ? 4.5 : 7;
  let tries = 0;
  while (placed.length < section.count && tries < section.count * 60) {
    tries++;
    // sections are rectangular pieces on the build grid, so the scatter is a
    // plain uniform roll inside the rectangle, held one node-radius clear of
    // its own edge — a boulder half over the boundary would sit on a build
    // square the section does not own
    const inset = section.kind === 'rock' ? 2.2 : 1.6;
    const x = section.x + (rnd() * 2 - 1) * Math.max(0, section.halfX - inset);
    const z = section.z + (rnd() * 2 - 1) * Math.max(0, section.halfZ - inset);
    // stay well clear of the literal world edge (WORLD_HALF, ±200), not a
    // fixed 95 — that bound predated the 2026-08-03 ground repositioning
    // (Iron Seam/Deepwood moved out to ~±100-130) and silently zeroed out
    // their node seeding, since every single candidate kept failing this
    // check and the retry budget just ran out
    if (Math.abs(x) > WORLD_HALF - 20 || Math.abs(z) > WORLD_HALF - 20) continue;
    // pond shore stays clear — a real distance check against POND's own
    // position, not the blanket "x > 30 && z > 20" half-plane this used to
    // be. That crude rule happened to work while every SE-quadrant ground sat
    // near the pond, but the 2026-08-04 repositioning moved Old Quarry/Iron
    // Seam out to (150,35)/(155,90) — nowhere near its shore — and the
    // half-plane rejected every one of their candidates anyway (silently
    // zeroing out node seeding again). `pondShore` sections are exempt: the
    // Home Grove is deliberately pond-adjacent by design.
    if (!section.pondShore && Math.hypot(x - POND.x, z - POND.z) < POND.radius + 20) continue;
    // Wave 12 · and out of any water the player has cut. Nothing re-scatters
    // on its own, but `buyLand` re-runs seedNodes over the widened holding, so
    // without this a deed bought after digging could stand a fresh boulder in
    // the middle of your own moat. `waterAt` is home-only by construction, so
    // a destination section is never affected.
    if (!world && waterAt(x, z, 1.2)) continue;
    if (inBuildRegion(x, z)) continue;
    if (inStarterVillage(x, z)) continue;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < sep)) continue;
    if (existingNodes.some((n) => Math.hypot(n.x - x, n.z - z) < 3)) continue;
    placed.push([x, z]);
    const i = placed.length - 1;
    if (section.kind === 'tree') {
      out.push({
        id: `${section.id}_t${i}`, kind: 'tree', model: TREE_MODELS[i % 2], ground: section.id, world,
        x, z, scale: 0.85 + rnd() * 0.5, yaw: rnd() * Math.PI * 2,
        hitsLeft: 3, respawnAt: null,
      });
    } else if (section.kind === 'rock') {
      out.push({
        id: `${section.id}_r${i}`, kind: 'rock', variant: section.variant, ground: section.id, world,
        x, z, scale: 0.8 + rnd() * 0.9, yaw: rnd() * Math.PI * 2,
        hitsLeft: 4, respawnAt: null,
      });
    } else {
      // a patch carries an RNG yield of 1-10 picks, and reads bigger the
      // richer it is
      const yieldN = 1 + Math.floor(rnd() * 10);
      out.push({
        id: `${section.id}_h${i}`, kind: 'herb', ground: section.id, world,
        x, z, scale: 0.7 + yieldN * 0.05 + rnd() * 0.15,
        yaw: rnd() * Math.PI * 2, hitsLeft: yieldN, respawnAt: null,
      });
    }
  }
  return out;
}

export interface GatheringSlice {
  // runtime world
  nodes: ResourceNodeState[];

  seedNodes: () => void;

  /** Empire arc, Wave 5: break and plant one of the hand-authored plots
   *  (data/cultivatedPlots.ts). Seeds a sparse stage-0 cluster. */
  cultivatePlot: (plotId: string) => void;
  /** Wave 5: pour a Pail of Water on a planted plot — one stage thicker, one
   *  pail spent. */
  waterPlot: (plotId: string) => void;

  plantPlot: (buildingId: string) => void;
  harvestPlot: (buildingId: string) => void;
  tickPlots: (dt: number) => void;

  harvestNode: (nodeId: string) => void;
  /** AI-only, single-swing harvest for `GatherAtNode` (PHASE_2_NAVIGATION_
   *  AND_GATHERING.md §3.5/§4) — distinct from `harvestNode`, the player's
   *  own action, which empties a whole node in one go with skill/guild bonus
   *  rolls that make no sense applied against the player's own state for a
   *  background villager. Yields exactly one base resource per call and
   *  decrements `hitsLeft` by one. Returns null if the node doesn't exist or
   *  is already unavailable. Never calls `addItems` — the yield goes into
   *  the calling Activity's own `bb.carrying`, not the shared inventory
   *  (§4: that only happens on `HaulToDeposit`'s deposit, via `addItems`). */
  gatherSwing: (nodeId: string) => { item: ItemId; amount: number } | null;
  /** Wave 10 · AI-only, the villager farmer's half of the farmplot cycle —
   *  `gatherSwing`'s counterpart for a TIMER-based resource. `plantPlot`/
   *  `harvestPlot` stay exactly as the player's own hands use them (a notify,
   *  farming skill XP, straight into the satchel); this one moves the same
   *  `st.plots` state machine but hands the yield BACK to the caller so it
   *  lands in the hauler's sack and is walked to the stores like every other
   *  trade's load, instead of teleporting into the inventory out at the plot.
   *  One call per arrival, not a swing loop: `'planted'` when an untilled plot
   *  was sown, a yield when a ready one was cut, `null` when the plot is still
   *  growing or gone (the caller has nothing to do there). */
  tendPlot: (buildingId: string) => 'planted' | { item: ItemId; amount: number } | null;

  tickRespawns: () => void;
}

export const createGatheringSlice: SliceCreator<GatheringSlice> = (set, get) => {
  return {
    nodes: [],

    seedNodes: () => {
      const rnd = mulberry32(20260713);
      const nodes: ResourceNodeState[] = [];

      // J46 · every node now belongs to a NAMED GROUND (game/data/grounds.ts)
      // rather than seeding wherever a scatter loop happened to drop it. The
      // ground carries the deed that opens it, so the land ladder finally
      // buys you something to work rather than a wider fence.
      // Wave 5: the loop body itself now lives in scatterNodesInRect, shared
      // with cultivatePlot — one scatter, two callers.
      for (const g of GROUNDS) {
        nodes.push(...scatterNodesInRect(g, null, nodes, rnd));
      }

      // Trees along the VERGES of the road — the green margin of each plate,
      // never the printed path. A road through open grass reads as a scar;
      // lined with timber it reads as a road. They are ordinary tree nodes,
      // so they can be felled like any other, but they belong to no ground
      // and so need no deed.
      //
      // Wave 12 · planted along `vergeCells()`, the homestead's own lane,
      // rather than the whole road — see ROAD_VERGE_RANGE for why a network
      // reaching six grounds must not line every leg with deedless timber.
      // The neighbour lookup still uses the FULL route: which way the road
      // runs through a cell, and whether it is a junction, is a fact about
      // the road, not about which cells happen to be planted.
      {
        const onRoad = new Set(routeCells().map(([cx, cz]) => `${cx},${cz}`));
        let vi = 0;
        for (const [cx, cz] of vergeCells()) {
          // which way does the road run through this cell? A cell with a
          // neighbour north or south runs N-S; otherwise E-W. Junction cells
          // are skipped entirely — every side of them is carriageway.
          const ns = onRoad.has(`${cx},${cz - 1}`) || onRoad.has(`${cx},${cz + 1}`);
          const ew = onRoad.has(`${cx - 1},${cz}`) || onRoad.has(`${cx + 1},${cz}`);
          if (ns && ew) continue;
          const rx = cx * ROAD_TILE;
          const rz = cz * ROAD_TILE;
          for (const side of [-1, 1]) {
            // out past the printed edge, with room for the trunk
            const off = ROAD_HALF_WIDTH + 1.5 + rnd() * 1.6;
            // and jittered along the road so they do not march in lockstep
            const along = (rnd() - 0.5) * ROAD_TILE * 0.7;
            const x = ns ? rx + side * off : rx + along;
            const z = ns ? rz + along : rz + side * off;
            if (inBuildRegion(x, z)) continue;
            if (inStarterVillage(x, z)) continue;     // O3 · see above
            if (groundAt(x, z)) continue;            // a ground grows its own
            if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + 2) continue;
            // never on another plate's carriageway
            const ncx = Math.round(x / ROAD_TILE);
            const ncz = Math.round(z / ROAD_TILE);
            if (onRoad.has(`${ncx},${ncz}`)) {
              const dx = Math.abs(x - ncx * ROAD_TILE);
              const dz = Math.abs(z - ncz * ROAD_TILE);
              if (dx < ROAD_HALF_WIDTH + 1 && dz < ROAD_HALF_WIDTH + 1) continue;
            }
            if (nodes.some((n) => Math.hypot(n.x - x, n.z - z) < 3)) continue;
            nodes.push({
              id: `verge${vi++}`, kind: 'tree', model: TREE_MODELS[vi % 2],
              x, z, scale: 0.8 + rnd() * 0.45, yaw: rnd() * Math.PI * 2,
              hitsLeft: 3, respawnAt: null,
            });
          }
        }
      }

      // fishing spot at the far end of the dock, out over the water (see
      // FISHING_DOCK / ResourceNodes.tsx's FishingSpot). Open water belongs
      // to no deed.
      nodes.push({ id: 'fishspot', kind: 'fishing', x: FISHING_DOCK.endX, z: FISHING_DOCK.endZ, scale: 1, yaw: 0, hitsLeft: 999, respawnAt: null });

      // Empire arc, Wave 26 · hand-placed destination resource nodes
      // (SETTLEMENT_NODES, data/settlements.ts) — The Frozen Pass's
      // real ore/timber, stamped with `world` so ResourceNodes.tsx's
      // per-destination filter and villagerAtWork's node-kind check both
      // see them only while standing in (or working for) that instance.
      // Hand-placed rather than run through scatterNodesInRect: that
      // helper's WORLD_HALF gate is a home-world-only bound that rejects
      // every destination coordinate outright (see its own header comment).
      // Local points, resolved through the same durable resolveDestPoint
      // convention every other hand-placed destination fixture uses.
      for (const [destId, defs] of Object.entries(SETTLEMENT_NODES)) {
        const dest = WORLD_DESTINATION_BY_ID[destId];
        if (!dest) continue;
        let treeI = 0;
        defs.forEach((d, i) => {
          const p = resolveDestPoint(dest, d.x, d.z);
          nodes.push({
            id: `${destId}_${d.kind}${i}`, kind: d.kind, variant: d.variant,
            model: d.kind === 'tree' ? TREE_MODELS[treeI++ % 2] : undefined,
            x: p.x, z: p.z, scale: d.scale, yaw: d.yaw,
            hitsLeft: d.hitsLeft, respawnAt: null, world: destId,
          });
        });
      }

      // Wave 5 · a plot you planted is RE-DERIVED here, never restored:
      // st.nodes is runtime-only and this runs on every load and every land
      // purchase, so the persisted `stage` is the one source of truth for how
      // thick the cluster stands. Last, so it sees the same "everything else
      // already standing" set cultivatePlot/waterPlot pass in and the two can
      // never place differently.
      for (const live of Object.values(get().cultivatedPlots)) {
        const def = PLOT_BY_ID[live.id];
        if (!def) continue; // a plot id retired from the table
        nodes.push(...scatterNodesInRect(
          { ...def, count: plotNodeCount(def, live.stage) },
          live.world ?? null,
          nodes,
        ));
      }
      set({ nodes });
    },

    // Empire arc, Wave 5 — plots. `plantedAt`/`lastWateredAt` are epoch ms,
    // the wall-clock convention foundSettlement/collectSettlementYield use,
    // NOT tickPlots' frame-accumulated countdown: a plot has to survive being
    // reloaded, and the countdown only advances while you stand in the world.
    // Nothing reads those timestamps YET — watering advances a stage
    // immediately, with no real-time growth or cooldown. Growth-rate and
    // cooldown timing are explicitly out of scope for this wave; the fields
    // are here so the balance pass has real data to work from.
    cultivatePlot: (plotId) => {
      const st = get();
      const def = PLOT_BY_ID[plotId];
      if (!def || st.cultivatedPlots[plotId]) return;
      // field by field, not a spread of `def`: the definition's own display
      // strings have no business in a save file, and the record's geometry is
      // only ever read back through PLOT_BY_ID anyway
      const plot: CultivatedPlot = {
        id: def.id, kind: def.kind, variant: def.variant,
        x: def.x, z: def.z, halfX: def.halfX, halfZ: def.halfZ, count: def.count,
        world: def.world ?? null,
        stage: 0, plantedAt: Date.now(), lastWateredAt: null,
      };
      // stage 0 is nearly bare on purpose — the cluster is the reward for
      // carrying water to it, not for breaking the ground once
      const fresh = scatterNodesInRect(
        { ...def, count: plotNodeCount(def, 0) }, def.world ?? null, st.nodes,
      );
      set({
        cultivatedPlots: { ...st.cultivatedPlots, [plotId]: plot },
        nodes: [...st.nodes, ...fresh],
        dirty: true,
      });
      audio.play('graze', 0.5);
      st.notify(`${def.name} is broken and planted — water it to bring it on.`, true);
    },

    waterPlot: (plotId) => {
      const st = get();
      const def = PLOT_BY_ID[plotId];
      const plot = st.cultivatedPlots[plotId];
      if (!def || !plot) return;
      if (plot.stage >= MAX_PLOT_STAGE) {
        st.notify(`${def.name} has come in full — there is nothing more to draw up.`);
        return;
      }
      if ((st.inventory.water_bucket ?? 0) <= 0) {
        st.notify('You need a Pail of Water — fill one at the brook.');
        return;
      }
      const stage = plot.stage + 1;
      // the whole cluster is re-scattered from the plot's own fixed seed
      // rather than appended to: a fixed seed places the same candidates in
      // the same order regardless of the target count, so a higher stage is
      // strictly the same nodes PLUS new ones — and it is byte-identical to
      // what seedNodes re-derives after a reload, which an append could never
      // promise (see scatterNodesInRect's own note on the shared stream).
      const kept = st.nodes.filter((n) => n.ground !== def.id);
      // ...and a node that survives that re-scatter keeps the state it was
      // already in — otherwise watering would heal every stump and half-mined
      // boulder in the plot, i.e. a whole respawn for the price of one pail.
      const was = new Map(st.nodes.filter((n) => n.ground === def.id).map((n) => [n.id, n]));
      const grown = scatterNodesInRect(
        { ...def, count: plotNodeCount(def, stage) }, plot.world ?? null, kept,
      ).map((n) => {
        const before = was.get(n.id);
        return before ? { ...n, hitsLeft: before.hitsLeft, respawnAt: before.respawnAt } : n;
      });
      const inv = { ...st.inventory };
      inv.water_bucket = (inv.water_bucket ?? 0) - 1;
      set({
        inventory: inv,
        cultivatedPlots: {
          ...st.cultivatedPlots,
          [plotId]: { ...plot, stage, lastWateredAt: Date.now() },
        },
        nodes: [...kept, ...grown],
        dirty: true,
      });
      st.addXp('farming', 10);
      audio.play('graze', 0.6);
      st.notify(
        stage >= MAX_PLOT_STAGE
          ? `${def.name} has come in full.`
          : `You water ${def.name} — it thickens (${stage}/${MAX_PLOT_STAGE}).`,
        stage >= MAX_PLOT_STAGE,
      );
    },

    plantPlot: (buildingId) => {
      const st = get();
      if ((st.plots[buildingId] ?? -1) >= 0) return;
      // Green Thumb, Rich Soil and the Farmhand's Green-Fingered (data/derivedStats.ts)
      const growTime = cropGrowTime(GROW_TIME, st);
      set({ plots: { ...st.plots, [buildingId]: growTime }, dirty: true });
      audio.play('graze', 0.5);
      st.notify('Wheat planted. Give it time and sunshine.');
    },

    harvestPlot: (buildingId) => {
      const st = get();
      const left = st.plots[buildingId];
      if (left === undefined || left > 0) return;
      const plots = { ...st.plots };
      delete plots[buildingId]; // back to untilled
      set({ plots, dirty: true });
      // Heavy Sheaves talent (farming3): +1 wheat every harvest.
      // Bountiful Harvest mastery talent (farming4): +2 instead.
      const sheaves = harvestSheaves(st);
      st.addItems({ wheat: 2 + sheaves + (Math.random() < 0.35 ? 1 : 0) }, 'gather');
      st.addXp('farming', 12);
      audio.play('treasure', 0.5);
    },

    tickPlots: (dt) => {
      const st = get();
      let changed = false;
      let ready = false;
      const plots = { ...st.plots };
      const growthRate = st.season === 3 ? 0.55 : 1; // winter: crops grow slower
      for (const [id, left] of Object.entries(plots)) {
        if (left <= 0) continue;
        const next = Math.max(0, left - dt * growthRate);
        if (next !== left) {
          plots[id] = next;
          changed = true;
          if (next === 0) ready = true;
        }
      }
      if (changed) set({ plots });
      if (ready) st.notify('🌾 A crop is ready to harvest!', true);
    },

    harvestNode: (nodeId) => {
      const st = get();
      const node = st.nodes.find((n) => n.id === nodeId);
      if (!node || node.respawnAt) return;
      if (node.kind === 'fishing') {
        // one bite, one fish — already a single chunky action, unaffected
        // by the multi-hit drip fix below
        let fish = st.skillTree.includes('fishing4') ? (Math.random() < TALENT_FX.fishing4.twoFishChance ? 2 : 1)
          : st.skillTree.includes('fishing3') && Math.random() < TALENT_FX.fishing3.twoFishChance ? 2 : 1;
        if (st.perks.includes('hermit')) fish *= PERK_FX.hermit.gatherTimes; // Hermit trade-off perk
        // Forager's Fortune perk (Wave 52, D2): a plain, no-downside chance
        // at one more, independent of Hermit's own always-double
        if (st.perks.includes('foragers_fortune') && Math.random() < PERK_FX.foragers_fortune.extraYieldChance) fish += 1;
        // Wave 9 · report what the stores actually took, not what was on the
        // hook — a "You got 2 fish!" over a full store is indistinguishable
        // from a bug. addItems raises its own "stores are full" toast.
        const got = st.addItems({ fish }, 'gather').fish ?? 0;
        st.addXp('fishing', 14);
        st.useTool('fishing_rod');
        audio.play('treasure', 0.6);
        if (got > 0) st.notify(`🐟 You got ${got} fish!`);
      } else {
        // one harvest action now empties the WHOLE node at once — rolls the
        // exact same per-hit odds/bonuses as before, `node.hitsLeft` times,
        // but batches them into a single grant + a single "you got X" notify
        // instead of requiring several separate E-holds each with their own
        // tiny +1 pickup ("spamming multiple items", per user report)
        const hits = node.hitsLeft;
        const totals: Partial<Record<ItemId, number>> = {};
        let xpTotal = 0;
        let xpSkill: SkillId = 'woodcutting';
        for (let i = 0; i < hits; i++) {
          if (node.kind === 'tree') {
            xpSkill = 'woodcutting';
            // Woodsmen's Lodge passive + Deep Rings talent: each an
            // independent extra-log chance; Forest Bounty doubles flowers.
            // Wave 22: Warden of the Timberline (max guild rank) sharpens
            // the base passive itself, 0.20 -> 0.30. Wave 32: the Woodsman
            // calling's own small Forest-Raised passive stacks on top too —
            // a third of the guild's base rate, since it needs no membership.
            const extraChance = (st.guild === 'woodsmen' ? (atGuildMaxRank(st.guild, st.guildRanks, 'woodsmen') ? 0.3 : 0.2) : 0)
              + (st.skillTree.includes('woodcutting2') ? TALENT_FX.woodcutting2.extraLogChance : 0)
              + (st.attrSpent.diligence ?? 0) * ATTR_FX.diligence.yieldChance // Diligence attribute
              + (callingSignature(st.character?.classId, 'woodcutting') ? CALLING_FX.woodcutting.extraLogChance : 0);
            totals.wood = (totals.wood ?? 0) + (Math.random() < extraChance ? 2 : 1);
            // Ancient Growth mastery talent (woodcutting4): flowers guaranteed
            const flowerChance = st.skillTree.includes('woodcutting4') ? TALENT_FX.woodcutting4.flowerChance
              : st.skillTree.includes('woodcutting3') ? TALENT_FX.woodcutting3.flowerChance : BASE_FX.flowerChance;
            if (Math.random() < flowerChance) totals.flowers = (totals.flowers ?? 0) + 1;
            xpTotal += 10;
            st.useTool('axe');
          } else if (node.kind === 'rock') {
            xpSkill = 'mining';
            if (node.variant === 'iron') {
              // Vein Splitter talent: bonus stone from veins twice as often
              // Deep Vein Mastery mastery talent (mining4): bonus stone guaranteed
              const veinBonus = (st.skillTree.includes('mining4') ? TALENT_FX.mining4.veinStoneChance
                : st.skillTree.includes('mining3') ? TALENT_FX.mining3.veinStoneChance : BASE_FX.veinStoneChance)
                + (st.attrSpent.diligence ?? 0) * ATTR_FX.diligence.yieldChance;
              totals.iron_ore = (totals.iron_ore ?? 0) + 1;
              if (Math.random() < veinBonus) totals.stone = (totals.stone ?? 0) + 1;
              xpTotal += 16;
            } else {
              const mining = st.unlocks.includes('mining');
              // Miners' Brotherhood passive + Ore Eye talent stack
              // additively. Wave 22: Warden of the Old Ruins (max guild
              // rank) sharpens the base passive itself, 0.65 -> 0.75. Wave
              // 32: the Quarryman calling's own small Stone-Bred passive
              // stacks on top too, no membership required.
              const oreChance = (st.guild === 'miners' ? (atGuildMaxRank(st.guild, st.guildRanks, 'miners') ? 0.75 : 0.65) : 0.4)
                + (st.skillTree.includes('mining2') ? TALENT_FX.mining2.oreChancePlus : 0)
                + (callingSignature(st.character?.classId, 'mining') ? CALLING_FX.mining.oreChancePlus : 0);
              totals.stone = (totals.stone ?? 0) + 1;
              if (mining && Math.random() < oreChance) totals.iron_ore = (totals.iron_ore ?? 0) + 1;
              xpTotal += 12;
            }
            st.useTool('pickaxe');
          } else if (node.kind === 'herb') {
            xpSkill = 'farming';
            totals.herb = (totals.herb ?? 0) + 1;
            xpTotal += 8;
          }
        }
        // Hermit trade-off perk: everything the player personally gathers
        // is doubled (its own downside lives in tickVillagers' own trip
        // duration, villagerSlice.ts) — after the per-kind rolls above, not baked into
        // any one of them, so it applies uniformly across tree/rock/herb
        if (st.perks.includes('hermit')) {
          for (const k of Object.keys(totals) as ItemId[]) totals[k] = (totals[k] ?? 0) * PERK_FX.hermit.gatherTimes;
        }
        // Forager's Fortune perk (Wave 52, D2): one roll per harvest action
        // (not per hit — hits are already batched above), +1 of the node's
        // own primary resource on a hit. A plain sibling to Hermit's
        // always-double trade-off, no downside.
        if (st.perks.includes('foragers_fortune') && Math.random() < PERK_FX.foragers_fortune.extraYieldChance) {
          const primary: ItemId | null = node.kind === 'tree' ? 'wood' : node.kind === 'rock' ? 'stone' : node.kind === 'herb' ? 'herb' : null;
          if (primary) totals[primary] = (totals[primary] ?? 0) + 1;
        }
        // Wave 9 · the node is still fully spent (the swing happened either
        // way — the wasted yield IS the cost of letting your stores overflow),
        // but the notification below reports what the stores took, not what
        // the tree held. addItems raises its own "stores are full" toast.
        const got = st.addItems(totals, 'gather');
        st.addXp(xpSkill, xpTotal);
        audio.play(node.kind === 'tree' ? 'thud' : node.kind === 'rock' ? 'brick_collide' : 'villager', node.kind === 'herb' ? 0.4 : 0.8);
        // J45 · what you pick up is a PIECE, and it is named as one — you
        // did not gather "3 stone", you gathered three 2x2 stone bricks
        const label = Object.entries(got)
          .filter(([, n]) => (n ?? 0) > 0)
          .map(([id, n]) => `${n}× ${brickLabel(id as ItemId, ITEMS[id as ItemId]?.name ?? id)}`)
          .join(', ');
        if (label) st.notify(`You got ${label}!`);
      }
      // read stats fresh (not the `st` snapshot from the top of this action) —
      // the addItems() call above already wrote its own stats update via its
      // own set(), so merging from the stale `st.stats` here would clobber it
      const freshStats = get().stats;
      const harvested = { ...freshStats.nodesHarvested };
      harvested[node.kind] = (harvested[node.kind] ?? 0) + 1;
      const patch: Partial<GameState> = { stats: { ...freshStats, nodesHarvested: harvested } };
      if (node.kind !== 'fishing') {
        // the node is always fully spent in one action now — no partial
        // hitsLeft state to carry between harvests
        patch.nodes = st.nodes.map((n) =>
          n.id === nodeId ? { ...n, hitsLeft: 0, respawnAt: Date.now() + 35000 } : n,
        );
      }
      set(patch);
    },

    gatherSwing: (nodeId) => {
      const st = get();
      const node = st.nodes.find((n) => n.id === nodeId);
      if (!node || node.respawnAt !== null || node.hitsLeft <= 0) return null;
      const item: ItemId =
        node.kind === 'tree' ? 'wood' : node.kind === 'rock' ? 'stone' : node.kind === 'herb' ? 'herb' : 'fish';
      const hitsLeft = node.hitsLeft - 1;
      // fishing spots never deplete (harvestNode's own fishing branch skips
      // this too — "one bite, one fish", the node stays available)
      const depleted = hitsLeft <= 0 && node.kind !== 'fishing';
      set({
        nodes: st.nodes.map((n) =>
          n.id === nodeId ? { ...n, hitsLeft, respawnAt: depleted ? Date.now() + 35000 : n.respawnAt } : n,
        ),
      });
      return { item, amount: 1 };
    },

    tendPlot: (buildingId) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === buildingId);
      if (!b || b.type !== 'farmplot' || !isBuilt(b)) return null;
      const left = st.plots[buildingId];
      if (left === undefined) {
        // untilled -> sown. Same growth timer the player's own plantPlot
        // computes (perk + Rich Soil talent): the farm's soil is the farm's
        // soil, whoever pushed the seed into it. Deliberately quiet — no
        // notify, no sound: a villager doing their job all day should not
        // narrate every furrow, unlike the player's own deliberate action.
        const growTime = cropGrowTime(GROW_TIME, st);
        set({ plots: { ...st.plots, [buildingId]: growTime }, dirty: true });
        return 'planted';
      }
      if (left > 0) return null; // still growing — nothing a farmer can do but wait
      const plots = { ...st.plots };
      delete plots[buildingId]; // back to untilled, exactly as harvestPlot leaves it
      set({ plots, dirty: true });
      // same yield as the player's own harvest (Heavy Sheaves included) — but
      // NOT addXp('farming'): that is the player's own skill, and a villager
      // swinging the sickle must not level it. Their equivalent, trade
      // mastery, is granted by the completed HAUL (awardTradeXp in haul.ts),
      // which is where every other trade earns it too.
      const sheaves = harvestSheaves(st);
      return { item: 'wheat' as ItemId, amount: 2 + sheaves + (Math.random() < 0.35 ? 1 : 0) };
    },

    tickRespawns: () => {
      const now = Date.now();
      const st = get();
      if (!st.nodes.some((n) => n.respawnAt && n.respawnAt < now)) return;
      set({
        nodes: st.nodes.map((n) =>
          n.respawnAt && n.respawnAt < now
            ? { ...n, respawnAt: null, hitsLeft: n.kind === 'tree' ? 3 : n.kind === 'herb' ? randInt(1, 10) : 4 }
            : n,
        ),
      });
    },
  };
};
