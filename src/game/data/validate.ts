// CLN-21 · a pure integrity check over the authored quest and cast data.
//
// ~105 side quests are assembled from seven tables (the cast's own pools, EXTRA_SIDE_QUESTS, Cedric's war council,
// the guild pools, the interior residents, SETTLEMENT_QUESTS, DELIVERY_QUESTS). Nothing used to check that an
// errand could actually be finished, and that bug shipped once: Wave 34 found five `gather` errands aimed at
// craft-only items (plank, bread, iron_bar), which the gather counter can never advance. Every rule below names the
// runtime behaviour that makes it a real requirement (see gameStore's bumpSideQuest), not a style preference.
//
// CLN-22 · it also checks the links a settlement record (data/settlements.ts) makes to the rest of the data — its
// giver's NpcDef, the guild hall its road runs to, the caravan roads between sites. Those are links between FILES,
// which is exactly what one table per site cannot hold together by itself.
//
// `validateGameData()` returns one human-readable line per violation — an empty array means the data is sound.
// It runs in `validate.test.ts` (npm run test:unit), logs loudly in development, and is on `window.__kkdata` for
// browser smoke scripts.
import type { SideQuestDef } from './cast/types';
import { CEDRIC_WAR_QUESTS, GUILD_ARC_REP, GUILD_QUESTS, INTERIOR_RESIDENTS, NPCS, NPC_BY_ID, sideQuestsOf } from './npcs';
import { EXISTING_QUEST_ALLEGIANCE, EXTRA_SIDE_QUESTS } from './allegianceQuests';
import { SETTLEMENTS } from './settlements';
import { CARAVAN_ROUTES, caravanRouteKey } from './caravan';
import { BESTIARY_LORE } from './bestiary';
import { BUILDABLE_BY_ID } from './buildables';
import { GUILD_BY_ID, GUILD_BY_WORLD } from './guilds';
import { ITEMS } from './items';
import { QUESTS } from './quests';
import { RANKS } from './ranks';
import { RECIPES } from './recipes';
import { TEMPLATE_ARRIVAL_SPAWN, WORLD_DESTINATION_BY_ID } from './worlds';
import { exposeDebug } from '@/lib/debugHooks';

/** Everyone a side quest can be accepted from: every NpcDef (interior residents included), Cedric, each guild. */
function allGivers(): string[] {
  return [...Object.keys(NPC_BY_ID), 'cedric', ...Object.keys(GUILD_QUESTS)];
}

export function validateGameData(): string[] {
  const out: string[] = [];
  const has = (table: object, key: string) => Object.prototype.hasOwnProperty.call(table, key);
  const mainQuestIds = new Set(QUESTS.map((q) => q.id));
  const recipeIds = new Set(RECIPES.map((r) => r.id));
  const craftedItems = new Set<string>(RECIPES.map((r) => r.output));

  // ---- the cast ----
  const npcIds = new Set<string>();
  for (const n of [...NPCS, ...Object.values(INTERIOR_RESIDENTS).map((r) => r.npc)]) {
    if (npcIds.has(n.id)) out.push(`npc '${n.id}': duplicate id`);
    npcIds.add(n.id);
    if (n.world && !has(WORLD_DESTINATION_BY_ID, n.world)) out.push(`npc '${n.id}': world '${n.world}' is not a destination`);
    if (n.revealAfterQuest && !mainQuestIds.has(n.revealAfterQuest)) {
      out.push(`npc '${n.id}': revealAfterQuest '${n.revealAfterQuest}' is not a main quest`);
    }
  }

  // ---- the main quest line (matched by gameStore's bumpQuestCounters) ----
  const rankNames = new Set(RANKS.map((r) => r.name));
  for (const quest of QUESTS) {
    if (QUESTS.filter((o) => o.id === quest.id).length > 1) out.push(`main quest '${quest.id}': duplicate id`);
    for (const id of Object.keys(quest.grantItems ?? {})) if (!has(ITEMS, id)) out.push(`main quest '${quest.id}': grant '${id}' is not an item`);
    const seen = new Set<string>();
    for (const o of quest.objectives) {
      const where = `main quest '${quest.id}' objective '${o.id}'`;
      if (seen.has(o.id)) out.push(`${where}: duplicate objective id`);
      seen.add(o.id);
      if (!(o.count > 0)) out.push(`${where}: count must be positive`);
      if (o.kind === 'gather') {
        if (!has(ITEMS, o.target)) out.push(`${where}: gather target '${o.target}' is not an item`);
        else if (craftedItems.has(o.target)) out.push(`${where}: gather target '${o.target}' is a recipe output and is never harvested (use kind 'craft')`);
      } else if (o.kind === 'craft') {
        if (!recipeIds.has(o.target)) out.push(`${where}: craft target '${o.target}' is not a recipe id`);
      } else if (o.kind === 'build') {
        if (o.target !== 'anywall' && !has(BUILDABLE_BY_ID, o.target)) out.push(`${where}: build target '${o.target}' is not a buildable`);
      } else if (o.kind === 'visit') {
        if (!has(WORLD_DESTINATION_BY_ID, o.target)) out.push(`${where}: visit target '${o.target}' is not a destination`);
      } else if (o.kind === 'talk') {
        if (!has(NPC_BY_ID, o.target)) out.push(`${where}: talk target '${o.target}' is not an NPC`);
      } else if (o.kind === 'rank') {
        if (!rankNames.has(o.target)) out.push(`${where}: rank target '${o.target}' is not a rank`);
      }
    }
  }

  // ---- pool keys ----
  const givers = new Set(allGivers());
  for (const g of Object.keys(GUILD_QUESTS)) if (!has(GUILD_BY_ID, g)) out.push(`GUILD_QUESTS: '${g}' is not a guild`);
  for (const g of Object.keys(EXTRA_SIDE_QUESTS)) if (!givers.has(g)) out.push(`EXTRA_SIDE_QUESTS: '${g}' is not a quest giver`);

  // ---- every errand, once ----
  const byId = new Map<string, SideQuestDef>();
  for (const giver of givers) {
    for (const q of sideQuestsOf(giver)) {
      if (byId.has(q.id)) { out.push(`quest '${q.id}': duplicate id (also offered by '${giver}')`); continue; }
      byId.set(q.id, q);
      const where = `quest '${q.id}' (${giver})`;
      // SideQuestDef types `target` per kind, but a cast can still get past that — so the checks below read it as
      // the plain string it is at runtime
      const target: string = q.target;
      if (!(q.need > 0)) out.push(`${where}: need must be positive`);
      if (q.needsQuest && !mainQuestIds.has(q.needsQuest)) out.push(`${where}: needsQuest '${q.needsQuest}' is not a main quest`);
      for (const id of Object.keys(q.rewardItems ?? {})) if (!has(ITEMS, id)) out.push(`${where}: reward '${id}' is not an item`);
      if (q.kind !== 'deliver' && q.deliverTo) out.push(`${where}: deliverTo is only read on 'deliver' errands`);

      switch (q.kind) {
        case 'gather':
          // advanced only by items entering the stores as a real harvest (addItems' 'gather' source)
          if (!has(ITEMS, target)) out.push(`${where}: gather target '${target}' is not an item`);
          else if (craftedItems.has(target)) {
            out.push(`${where}: gather target '${target}' is a recipe output — it is crafted, never harvested, so the counter can never advance (use kind 'craft')`);
          }
          break;
        case 'deliver':
          // loaded up by harvesting the goods or, for a crafted good, by crafting them; handed over at deliverTo
          if (!has(ITEMS, target)) out.push(`${where}: deliver target '${target}' is not an item`);
          if (!(q.deliverTo && has(WORLD_DESTINATION_BY_ID, q.deliverTo))) out.push(`${where}: deliverTo '${q.deliverTo}' is not a destination`);
          break;
        case 'craft': // bumped with the RECIPE id
          if (!recipeIds.has(target)) out.push(`${where}: craft target '${target}' is not a recipe id`);
          break;
        case 'build': // bumped with the placed buildable's type
          if (target !== 'any' && !has(BUILDABLE_BY_ID, target)) out.push(`${where}: build target '${target}' is not a buildable`);
          break;
        case 'kill': // bumped with the slain enemy's kind
          if (target !== 'any' && !has(BESTIARY_LORE, target)) out.push(`${where}: kill target '${target}' is not an enemy kind`);
          break;
        case 'defend': // bumped with the settlement's destination id
          if (target !== 'any' && !has(SETTLEMENTS, target)) out.push(`${where}: defend target '${target}' is not a settlement`);
          break;
        case 'joust':
        case 'duel':
        case 'caravan': // every bump for these passes the literal 'any'
          if (target !== 'any') out.push(`${where}: ${q.kind} errands are only ever bumped with 'any', so target '${target}' can never match`);
          break;
      }
    }
  }

  // ---- references between errands ----
  for (const [id, q] of byId) {
    for (const r of q.requires ?? []) if (!byId.has(r)) out.push(`quest '${id}': requires '${r}', which does not exist`);
  }
  // a `requires` cycle would leave every errand in it permanently blocked
  const state = new Map<string, 1 | 2>();
  const visit = (id: string, trail: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { out.push(`quest '${id}': requires-cycle ${[...trail.slice(trail.indexOf(id)), id].join(' -> ')}`); return; }
    state.set(id, 1);
    for (const r of byId.get(id)?.requires ?? []) if (byId.has(r)) visit(r, [...trail, id]);
    state.set(id, 2);
  };
  for (const id of byId.keys()) visit(id, []);

  for (const id of Object.keys(EXISTING_QUEST_ALLEGIANCE)) if (!byId.has(id)) out.push(`EXISTING_QUEST_ALLEGIANCE: '${id}' is not a quest`);
  const guildQuestIds = new Set(Object.values(GUILD_QUESTS).flat().map((q) => q.id));
  for (const id of Object.keys(GUILD_ARC_REP)) if (!guildQuestIds.has(id)) out.push(`GUILD_ARC_REP: '${id}' is not a guild quest`);
  // Cedric's pool is reached through sideQuestsOf('cedric') above; this only guards the table itself going unused
  if (CEDRIC_WAR_QUESTS.some((q) => !byId.has(q.id))) out.push('CEDRIC_WAR_QUESTS: an errand is unreachable through sideQuestsOf');

  // ---- the settlements (data/settlements.ts) ----
  const settlers = new Set<string>();
  for (const [destId, site] of Object.entries(SETTLEMENTS)) {
    const where = `settlement '${destId}'`;
    // travelTo goes nowhere for an id that is no destination, and seedNodes passes over its nodes
    if (!has(WORLD_DESTINATION_BY_ID, destId)) out.push(`${where}: is not a destination`);
    // The giver's NpcDef is how a settlement is reached at all: its `sideQuests` are the errands on offer, the deed,
    // the yield and the caravan desk are offered by whoever's NpcDef names this destination as its `world`
    // (DialoguePanel), and the settlement's road runs out to where he stands (settlementRoads).
    const giver = NPC_BY_ID[site.giver];
    if (!giver) out.push(`${where}: giver '${site.giver}' is not an NPC`);
    else {
      if (giver.world !== destId) out.push(`${where}: giver '${site.giver}' lives in '${giver.world ?? 'the homestead'}', not here`);
      if (giver.sideQuests !== site.quests) out.push(`${where}: giver '${site.giver}' does not hand out this settlement's errands`);
    }
    const errands = new Set(site.quests.map((q) => q.id));
    // foundSettlement refuses the deed until this errand is done, and only the giver's own talk speaks of it
    if (!errands.has(site.founding.requiredQuestId)) out.push(`${where}: the deed waits on '${site.founding.requiredQuestId}', which is not one of its errands`);
    // turnInSideQuest raises the growth tier on this errand's turn-in and on no other
    if (!errands.has(site.growthQuestId)) out.push(`${where}: grows on '${site.growthQuestId}', which is not one of its errands`);
    // canAfford reads the cost's keys as item ids: a price in something that is no item can never be paid
    for (const id of Object.keys(site.founding.cost)) if (!has(ITEMS, id)) out.push(`${where}: deed cost '${id}' is not an item`);
    // foundSettlement leaves out a resident whose id a villager already carries
    for (const r of site.founding.residents) {
      if (settlers.has(r.id)) out.push(`${where}: resident '${r.id}' is named twice, so only one of them ever moves in`);
      settlers.add(r.id);
    }
    // settlementRoads starts every leg at the destination's arrival point, and builds ALL the settlements' roads the
    // first time any region asks for one — a leg it cannot lay throws there, for every destination
    if (site.roadsTo.length > 0 && !has(TEMPLATE_ARRIVAL_SPAWN, destId)) out.push(`${where}: a road, but no arrival point to start it from`);
    // ...and reads the hall of the guild housed at this destination
    if (site.roadsTo.includes('guildHall') && !has(GUILD_BY_WORLD, destId)) out.push(`${where}: a road to a guild hall, but no guild is housed here`);
  }

  // ---- the caravan roads (data/caravan.ts) ----
  for (const key of Object.keys(CARAVAN_ROUTES)) {
    const ends = key.split('|');
    // dispatchCaravan wants a founded settlement at each end, two different ones, and finds the road by caravanRouteKey
    if (ends.length !== 2 || ends[0] === ends[1] || !ends.every((e) => has(SETTLEMENTS, e))) {
      out.push(`caravan road '${key}': must join two different settlements`);
    } else if (caravanRouteKey(ends[0], ends[1]) !== key) {
      out.push(`caravan road '${key}': is looked up as '${caravanRouteKey(ends[0], ends[1])}', so this entry is never found`);
    }
  }

  return out;
}

if (process.env.NODE_ENV !== 'production') {
  const violations = validateGameData();
  if (violations.length) console.error(`[data] ${violations.length} quest/cast data violation(s):\n  ${violations.join('\n  ')}`);
}

exposeDebug('__kkdata', { validateGameData });
