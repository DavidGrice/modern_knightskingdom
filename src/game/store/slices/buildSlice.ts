// CLN-07 · the store's build slice: placing, raising, moving, undoing and removing buildings; gates, damage and
// ruins, carts, explosive charges, and a building's own menu.
import type { BuildTool, ItemId, PlacedBuilding } from '../../types';
import { isBuilt } from '../../types';
// CLN-07 · moved here from gameStore.ts with the import it explains. "This file"/"this module" below mean the store,
// which this slice is part of — and "gameStore.ts never imports navgrid.ts" now has to hold for every slice and leaf
// the store imports too: they all load while gameStore.ts is still loading its own imports.
// Wave 31 hotfix · this used to import `homeGroundY` from
// '@/components/world/TemplateWorld' directly, reasoning that
// TemplateWorld.tsx's own two `useGameStore` reads are both inside component
// bodies, never at module-evaluation time. That check only looked at
// TemplateWorld.tsx's own direct calls and missed its transitive import
// chain: TemplateWorld -> DungeonScene -> Buildings -> siege -> combat ->
// difficulty, and difficulty.ts calls `useGameStore.subscribe(refresh)` at
// ITS OWN module scope. Importing TemplateWorld.tsx from this file therefore
// closed a real cycle back onto this module's own `useGameStore` — confirmed
// live as "ReferenceError: Cannot access 'useGameStore' before
// initialization" on the very first page load, in both `next dev` and a real
// production build (see src/ai/core/AgentManager.ts's header for the
// identical class of bug hit before, via a different edge into the same
// chain). `homeGroundY` now lives in its own leaf module
// (src/game/homeGround.ts) that imports only `three` and the pure-data
// terrainRegions.ts — no path back to gameStore.ts, so no cycle regardless of
// import order. navgrid.ts's own getMountedRoot/getMountedRegion import from
// TemplateWorld.tsx remains fine specifically because gameStore.ts never
// imports navgrid.ts, so that edge never re-enters this module's own loading.
import { homeGroundY } from '@/game/homeGround';
import { CALLING_FX, TALENT_FX } from '../../data/effects';
import { callingSignature } from '../../data/classes';
import { capOf, labDamagedForm } from '../../data/labCapabilities';
import {
  activeBuildRegion, BUILDABLE_BY_ID, MAX_STACK_HEIGHT, buildableForLabAsset, heightOf, labAssetId, maxHpFor, sizeFor,
} from '../../data/buildables';
import { wallSnap } from '../../walls';
import { audio } from '@/lib/audio';
import { cartLivePos } from '../../carts';
import { waterworksInRect } from '../../waterworks';
import { buildChallengeState, BUILD_CHALLENGE_ID, BUILD_CHALLENGE_TARGET } from '../../buildChallenge';
import { buildUndo, seq } from '../storeCounters';
import { atGuildMaxRank } from '../storeHelpers';
import { sharedActions } from './shared';
import type { SliceCreator } from './types';

const topOf = (b: PlacedBuilding) => (b.y ?? 0) + heightOf(b.type);

export interface BuildSlice {
  buildMode: boolean;
  buildSelection: string | null; // buildable id chosen in the aerial build bar
  movingBuilding: PlacedBuilding | null; // picked-up structure being repositioned

  /** L72 · which placed building the action menu is open on */
  menuBuilding: string | null;

  setBuildMode: (v: boolean) => void;
  setBuildSelection: (id: string | null) => void;
  toggleGate: (buildingId: string) => void;
  /** Wave 57 (F5): trailing `leaveRuin` — true only from a dragon's
   *  breath (game/dragonfire.ts). Every other caller
   *  (siege.ts, CedricSiege.tsx, game/enemyAi/blows.ts) omits it and keeps today's
   *  delete+half-refund behavior exactly. */
  damageBuilding: (id: string, amount: number, cause?: string, leaveRuin?: boolean) => void;
  settleCart: (id: string) => void;

  placeBuilding: (type: string, x: number, z: number, rot: 0 | 1 | 2 | 3, yaw?: number, scale?: number) => boolean;
  /** Wave 9 · lay a whole run of one wall-family piece in a single action.
   *  `cells` are the already-stepped centres BuildController's row drag drew,
   *  in order from the anchor outward; each is re-offered to walls.ts's
   *  `wallSnap` as it goes so a run genuinely latches onto whatever is standing
   *  (including the segment laid a moment earlier), and the run STOPS at the
   *  first cell that will not take — out of materials, off the region, blocked.
   *  Returns how many actually went down. One undo entry for the lot. */
  placeRow: (type: string, cells: { x: number; z: number }[], rot: 0 | 1 | 2 | 3) => number;
  constructBuilding: (id: string, amount: number) => void;
  /** L72 · open the action menu for a placed building */
  openBuildingMenu: (id: string) => void;
  /** L72 · mount an explosive charge on a wall piece */
  mountCharge: (buildingId: string, chargeType: string) => void;
  /** `quiet` (Wave 9) folds the per-piece toast + crash sound into the caller's
   *  own single report — for area demolition, where twenty of each at once is
   *  noise rather than feedback. */
  removeBuilding: (id: string, consumed?: boolean, quiet?: boolean) => void;
  /** resolve stacking elevation + validity for a ghost at (x, z) */
  evalPlacement: (type: string, x: number, z: number, rot: 0 | 1 | 2 | 3, ignoreId?: string) => { y: number; valid: boolean };
  pickupBuilding: (id: string) => void;
  cancelMove: () => void;
  finishMove: (x: number, z: number, rot: 0 | 1 | 2 | 3, yaw?: number, scale?: number) => boolean;
  undoLast: () => void;
}

export const createBuildSlice: SliceCreator<BuildSlice> = (set, get) => {
  const { bumpQuestCounters } = sharedActions(set, get);

  return {
    buildMode: false,
    buildSelection: null,

    movingBuilding: null,

    menuBuilding: null,

    setBuildMode: (buildMode) => {
      if (!buildMode) get().cancelMove();
      // Wave 9 · leaving the build view puts the tools down: an armed demolish
      // marquee must never survive to fire on the next visit, and coming back
      // in holding the wrecking tool by surprise is the same class of mistake.
      // Freeform is a mode you chose, so it rides along with the tool reset for
      // the same reason — the grid is the default the view opens in.
      set({ buildMode, panel: 'none', buildSelection: null, buildTool: 'build', demolishRect: null, digRect: null, freeformBuild: false });
    },
    setBuildSelection: (buildSelection) => set({
      buildSelection,
      // picking a piece is unambiguously "I want to build" — it puts the
      // wrecking tool down rather than leaving a selected piece that the left
      // button would not actually place
      ...(buildSelection ? { buildTool: 'build' as BuildTool, demolishRect: null, digRect: null } : {}),
    }),

    toggleGate: (buildingId) => {
      const st = get();
      const wasOpen = st.gateOpen[buildingId] ?? true;
      // buildings is also re-spread (its own entries are unchanged) so the
      // 1Hz `rebuildNav(useGameStore.getState().buildings)` poll in
      // game/directors/navMaintenance.ts — which only re-stamps on a reference change — actually
      // notices a gate toggle. gateOpen is a separate field from
      // PlacedBuilding itself, so without this the nav grid would keep
      // treating a just-opened/closed gate as whatever it was before,
      // sometimes indefinitely (found while verifying §2.5's "gate vs
      // wall" checklist item alongside NavGrid.rebuild()'s own missing
      // gateOpen check — the same bug had two different-shaped halves).
      set({ gateOpen: { ...st.gateOpen, [buildingId]: !wasOpen }, buildings: [...st.buildings], dirty: true });
      // Wave 8 · doors share this record and this action (see isDoorLike), so
      // they share the reference-bump above for free — what differs is only
      // what it sounds and reads like. A door has a real `door_open` sample in
      // the bank that nothing was using; a portcullis grinds.
      // Wave 24 · a window shutter is lighter again than either — reuses the
      // same `door_open` sample rather than a new asset, the same honest
      // reuse the door itself already made.
      const type = st.buildings.find((b) => b.id === buildingId)?.type;
      const isDoor = type === 'door';
      const isWindow = type === 'window';
      if (isDoor || isWindow) audio.play('door_open', 0.75);
      else audio.play(wasOpen ? 'portcullis' : 'drawbridge', 0.8);
      st.notify(
        isWindow
          ? (wasOpen ? 'You pull the shutters closed.' : 'The shutters swing open.')
          : isDoor
          ? (wasOpen ? 'You pull the door to.' : 'The door swings open.')
          : (wasOpen ? 'The gate grinds shut.' : 'The gate creaks open.'),
      );
    },

    damageBuilding: (id, amount, cause, leaveRuin) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === id);
      if (!b) return;
      const max = maxHpFor(b.type);
      const hp = (st.buildingHp[id] ?? max) - amount;
      if (hp > 0) {
        // labeled destruction phases, now read from the rig lab's own
        // `destructionPhase`/`destructionPhaseCount` instead of a hardcoded
        // mc006→mc009→mc010 ladder (2026-07-20). Every straight wall degrades
        // through its real damage-state molds now — the old hardcode only
        // covered mc006, so mc007 (the main Castle Wall) and mc008 could be
        // sieged forever without ever showing a scratch. Scars persist.
        const damagedLabId = labDamagedForm(labAssetId(b.type), hp / max);
        const phase = (damagedLabId && buildableForLabAsset(damagedLabId)) || b.type;
        if (phase !== b.type) {
          const ruined = !!capOf(labAssetId(phase))?.traits.wall?.isRuined;
          set({
            buildings: st.buildings.map((x) => (x.id === id ? { ...x, type: phase } : x)),
            buildingHp: { ...st.buildingHp, [id]: hp },
            dirty: true,
          });
          st.notify(ruined ? '🔥 The breached wall crumbles to a ruin!' : '🔥 The castle wall is breached!', true);
        } else {
          set({ buildingHp: { ...st.buildingHp, [id]: hp }, dirty: true });
        }
        audio.play('brick_collide', 0.6);
        return;
      }
      const def = BUILDABLE_BY_ID[b.type];
      // Wave 57 (F5): a dragon-fire kill (leaveRuin=true) leaves a RUIN
      // behind instead of deleting the entry — reuses the exact existing
      // "under construction" state (types.ts's own `built` doc comment:
      // "0..1 construction progress. Absent = 1 (fully built)") rather than
      // a new entity, confirmed safe live: placeBuilding already sets
      // `built: 0` on every FRESH placement too (see its own call sites),
      // so a ruin is byte-identical to an ordinary just-placed construction
      // site in every field except the new `ruin` flag — nav grid, minimap,
      // wall-connection queries and the builder auto-build pass already
      // handle a `built:0` entry correctly today because that state already
      // exists. Also confirmed live that dragon fire can never hit a piece
      // already mid-type-swap (every `wall_straight` mold in
      // capabilities.json costs pure stone, so flammable() is always false
      // for them), so `b.type` here is always the pristine, stable type —
      // never a ruined wall mold.
      //
      // No materials refund on this path (unlike the hand-demolish half
      // refund below), and constructBuilding charges no new materials to
      // finish rebuilding it either (it never has, for any construction
      // site) — so the net material cost of surviving a dragon hit is
      // exactly zero: you neither profit nor pay twice. That's deliberately
      // CHEAPER than the existing half-cost loss of voluntarily demolishing
      // and replacing a building by hand (refund granted, then full cost
      // paid again) — an involuntary loss should sting less than a
      // voluntary one, without ever making being sieged profitable, which a
      // refund-plus-free-rebuild combination would have been.
      if (leaveRuin) {
        const hpRest = { ...st.buildingHp };
        delete hpRest[id];
        set({
          buildings: st.buildings.map((x) => (x.id === id ? { ...x, built: 0, ruin: true } : x)),
          buildingHp: hpRest,
          dirty: true,
        });
        audio.play('brick_collide', 0.8);
        st.notify(`${def?.name ?? 'The building'} ${cause ?? 'was razed'} to a smoking ruin! Rebuild it to restore it.`, true);
        return;
      }
      // destroyed: rubble refund, same half-materials-back rate as demolishing by hand
      const inv = { ...st.inventory };
      // a placed piece can outlive its catalog entry (a save from before a
      // buildable was renamed/removed) — refund nothing rather than throwing
      for (const [itemId, n] of Object.entries(def?.cost ?? {})) {
        const refund = Math.floor((n as number) / 2);
        if (refund > 0) inv[itemId as ItemId] = (inv[itemId as ItemId] ?? 0) + refund;
      }
      const hpRest = { ...st.buildingHp };
      delete hpRest[id];
      set({
        buildings: st.buildings.filter((x) => x.id !== id),
        buildingHp: hpRest,
        inventory: inv,
        dirty: true,
      });
      audio.play('brick_collide', 0.8);
      st.notify(`${def.name} ${cause ?? 'was smashed'} to rubble! Half materials recovered.`, true);
    },

    settleCart: (id) => {
      const st = get();
      const live = cartLivePos[id];
      delete cartLivePos[id];
      if (!live) return;
      const b = st.buildings.find((x) => x.id === id);
      if (!b) return;
      set({
        buildings: st.buildings.map((bld) => (bld.id === id ? { ...bld, x: live.x, z: live.z } : bld)),
        dirty: true,
      });
    },

    evalPlacement: (type, x, z, rot, ignoreId) => {
      const st = get();
      const def = BUILDABLE_BY_ID[type];
      if (!def) return { y: 0, valid: false };
      const [sx, sz] = sizeFor(type, rot);
      const hx = sx / 2;
      const hz = sz / 2;
      const h = def.size[1];
      const invalid = { y: 0, valid: false };
      const region = activeBuildRegion(st.destination ? st.claimedWorlds[st.destination] : null, st.landTier);
      if (x - hx < region.minX || x + hx > region.maxX) return invalid;
      if (z - hz < region.minZ || z + hz > region.maxZ) return invalid;
      // Wave 31 · home's own build region used to hand out one flat scalar
      // (region.groundY: 0) for the entire holding regardless of where in it
      // (x, z) actually fell — real for a claimed destination plot (one
      // sampled level per claim, a deliberate, unchanged simplification), but
      // wrong the instant a terrain region ever overlapped a buildable
      // square. It never has (see terrainRegions.ts's own dev-mode fence
      // check), so this is systemic correctness, not a behavior change today
      // — computed once and used everywhere `region.groundY` used to be read
      // below.
      const baseY = st.destination ? region.groundY : homeGroundY(x, z);
      // Wave 12 · nothing stands in the player's own water. A plain footprint
      // test rather than a nav-grid question: placement is asked about this one
      // rectangle, live, long before the 1Hz rebuild has seen a fresh cut. Home
      // only, because that is the only place a waterway can be cut at all.
      // (A bridge piece that could legitimately span one is the obvious
      // follow-up; there isn't one yet, which is also why terrainConflict
      // refuses to cut the road.)
      if (!st.destination && waterworksInRect({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz }).length > 0) {
        return invalid;
      }

      const overlapsXZ = (b: PlacedBuilding) => {
        const [bsx, bsz] = sizeFor(b.type, b.rot);
        return Math.abs(b.x - x) < hx + bsx / 2 - 0.02 && Math.abs(b.z - z) < hz + bsz / 2 - 0.02;
      };

      // stacking: rest on the tallest overlapped piece (stackable pieces only) —
      // starts from the plot's leveled ground height away from home, instead
      // of always assuming a flat y=0 base
      let y = baseY;
      if (def.stackable) {
        for (const b of st.buildings) {
          if (b.id === ignoreId) continue;
          if (!isBuilt(b)) continue; // can't stack on a construction-site ghost
          if (!BUILDABLE_BY_ID[b.type]?.stackable) continue;
          if (overlapsXZ(b)) y = Math.max(y, topOf(b));
        }
      }
      if (y - baseY + h > MAX_STACK_HEIGHT) return invalid;

      // 3D overlap check against everything
      for (const b of st.buildings) {
        if (b.id === ignoreId) continue;
        if (!overlapsXZ(b)) continue;
        const by = b.y ?? 0;
        if (y < topOf(b) - 0.02 && y + h > by + 0.02) return invalid;
      }
      // ground pieces keep clear of resource nodes near the region edge
      if (y < baseY + 0.5) {
        for (const n of st.nodes) {
          if (n.kind === 'fishing') continue;
          if (Math.abs(n.x - x) < hx + 1.2 && Math.abs(n.z - z) < hz + 1.2) return invalid;
        }
      }
      return { y, valid: true };
    },

    placeBuilding: (type, x, z, rot, yaw, scale) => {
      const st = get();
      const b = BUILDABLE_BY_ID[type];
      if (!b) return false;
      if (b.requiresUnlock && !st.unlocks.includes(b.requiresUnlock)) return false;
      if (!st.canAfford(b.cost)) {
        st.notify('Not enough materials!');
        audio.play('brick_collide', 0.5);
        return false;
      }
      const { y, valid } = st.evalPlacement(type, x, z, rot);
      if (!valid) {
        audio.play('brick_collide', 0.5);
        return false;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(b.cost)) {
        inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      }
      // J51 · the Grand Keep is no longer a mesh you drop. Placing it lays
      // the FOUNDATION, and the castle on top of it is composed socket by
      // socket (game/data/keep.ts) — so this one buildable branches out of
      // the ordinary placement path here.
      if (type === 'keep') {
        if (st.keep) {
          st.notify('You have already laid a foundation.');
          return false;
        }
        set({ inventory: inv });
        // Wave 31 · `y` above is a real evalPlacement-computed elevation —
        // used to be discarded here, leaving the keep permanently at y:0
        // regardless of what evalPlacement actually said.
        get().foundKeep(x, z, y);
        return true;
      }
      // Phase 19 build-then-construct: placement marks the site (materials
      // delivered, ghost outline shown) — XP/stats/quest credit move to
      // constructBuilding's completion, when the thing actually stands.
      const placed: PlacedBuilding = { id: `b${seq.build++}`, type, x, z, y, rot, built: 0, world: st.destination ?? null };
      // Wave 9 freeform: only carry a `yaw` when it is genuinely off the
      // lattice, so a snapped piece's record is byte-for-byte what it always
      // was and no save grows a field it does not need
      if (yaw !== undefined && Math.abs(yaw - (rot * Math.PI) / 2) > 1e-4) placed.yaw = yaw;
      // Wave 51 (C6) · same convention as `yaw` immediately above — only
      // carry a `scale` when it is genuinely off 1, so a piece placed at the
      // default size (every non-freeform placement, and everything placed
      // before this wave) stores nothing new at all.
      if (scale !== undefined && Math.abs(scale - 1) > 1e-4) placed.scale = scale;
      buildUndo.placeHistory = [...buildUndo.placeHistory.slice(-24), [placed.id]];
      set({ inventory: inv, buildings: [...st.buildings, placed], dirty: true });
      audio.play('brick_link', 0.6);
      return true;
    },

    placeRow: (type, cells, rot) => {
      const st = get();
      const def = BUILDABLE_BY_ID[type];
      if (!def || cells.length === 0) return 0;
      // the Grand Keep branches out of the ordinary placement path entirely
      // (foundKeep lays a foundation, not a mesh) and there is only ever one —
      // a "run" of them is not a thing that can exist
      if (type === 'keep') return 0;
      if (def.requiresUnlock && !st.unlocks.includes(def.requiresUnlock)) return 0;
      const inv = { ...st.inventory };
      const placed: PlacedBuilding[] = [];
      const world = st.destination ?? null;
      const afford = () => Object.entries(def.cost).every(
        ([id, n]) => (inv[id as ItemId] ?? 0) >= (n as number),
      );
      for (const cell of cells) {
        if (!afford()) break;
        // re-offer every step to the wall-connect magnet against the CURRENT
        // run (the pieces this loop already laid included), so filling a gap
        // between two standing walls lands flush on both ends instead of
        // marching off the stepped ideal by whatever the neighbours' widths
        // did not divide into
        const standing = [...st.buildings, ...placed];
        const link = wallSnap(type, rot, cell.x, cell.z, standing, world);
        const x = link ? link.x : cell.x;
        const z = link ? link.z : cell.z;
        // evalPlacement only knows the committed store, so the run's own
        // freshly-laid segments have to be checked here by hand — otherwise
        // every step after the first would happily place on top of the last
        const [sx, sz] = sizeFor(type, rot);
        const clashes = placed.some((p) => {
          const [psx, psz] = sizeFor(p.type, p.rot);
          return Math.abs(p.x - x) < sx / 2 + psx / 2 - 0.02 && Math.abs(p.z - z) < sz / 2 + psz / 2 - 0.02;
        });
        if (clashes) break;
        const ev = st.evalPlacement(type, x, z, rot);
        if (!ev.valid) break;
        for (const [id, n] of Object.entries(def.cost)) {
          inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
        }
        placed.push({ id: `b${seq.build++}`, type, x, z, y: ev.y, rot, built: 0, world });
      }
      if (placed.length === 0) {
        audio.play('brick_collide', 0.5);
        // Wave 9 fix (2026-08-10, live verification) · a run that lays
        // NOTHING used to be silent — only the partial/full cases below ever
        // called notify(). The most common real cause (confirmed live) is the
        // first cell overlapping a piece from a run laid moments earlier that
        // hasn't finished construction yet: evalPlacement correctly refuses to
        // stack on an unbuilt piece, but with no words that reads as the tool
        // being broken rather than the rule doing its job.
        st.notify('Nothing to lay there — out of reach, blocked, or not enough materials.');
        return 0;
      }
      // ONE undo entry for the whole run — a gesture that laid twelve walls in
      // one drag should come back up the same way (see buildUndo.placeHistory in storeCounters.ts)
      buildUndo.placeHistory = [...buildUndo.placeHistory.slice(-24), placed.map((p) => p.id)];
      set({ inventory: inv, buildings: [...st.buildings, ...placed], dirty: true });
      audio.play('brick_link', 0.7);
      if (placed.length < cells.length) {
        st.notify(`Run laid: ${placed.length} of ${cells.length} — the rest would not fit or was not paid for.`);
      } else {
        st.notify(`Run laid: ${placed.length} × ${def.name}`);
      }
      return placed.length;
    },

    openBuildingMenu: (id) => set({ menuBuilding: id, panel: 'buildingMenu' }),

    // L72 · a charge mounted ON a wall piece. It is placed as a real building
    // sitting on top of the wall — which means the proximity-armed
    // Emplacements pass already knows what to do with it, and the wall it
    // stands on is what it takes with it when it goes.
    mountCharge: (buildingId, chargeType) => {
      const st = get();
      const wall = st.buildings.find((b) => b.id === buildingId);
      const def = BUILDABLE_BY_ID[chargeType];
      if (!wall || !def) return;
      if (BUILDABLE_BY_ID[wall.type]?.category !== 'walls') {
        st.notify('A charge needs a wall to sit on.');
        return;
      }
      if (!st.canAfford(def.cost)) {
        st.notify(`Not enough materials for a ${def.name}.`);
        audio.play('brick_collide', 0.5);
        return;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(def.cost)) {
        inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      }
      const charge: PlacedBuilding = {
        id: `b${seq.build++}`,
        type: chargeType,
        x: wall.x, z: wall.z,
        y: (wall.y ?? 0) + heightOf(wall.type),
        rot: wall.rot, built: 1,
        world: st.destination ?? null,
      };
      set({ inventory: inv, buildings: [...st.buildings, charge], panel: 'none', menuBuilding: null, dirty: true });
      audio.play('brick_link', 0.8);
      st.notify(`${def.name} mounted on the wall — it arms itself when a raider comes close.`, true);
    },

    constructBuilding: (id, amount) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === id);
      if (!b || isBuilt(b)) return;
      const def = BUILDABLE_BY_ID[b.type];
      if (!def) return;
      // Builders' Guild passive + Sure Hammer/Raised Right talents — every
      // swing bonus stacks additively (player's and builder villagers' alike).
      // Wave 22: Warden of the Siege Works (max guild rank) sharpens the
      // base passive itself, 0.30 -> 0.45. Wave 32: the Artisan calling's own
      // small Builder's Eye passive stacks in too — every swing on ANY site
      // counts a little extra, no membership required.
      const swingBonus = (st.guild === 'builders' ? (atGuildMaxRank(st.guild, st.guildRanks, 'builders') ? 0.45 : 0.3) : 0)
        + (st.skillTree.includes('building2') ? TALENT_FX.building2.swingPlus : 0)
        + (st.skillTree.includes('building3') ? TALENT_FX.building3.swingPlus : 0)
        + (st.skillTree.includes('building4') ? TALENT_FX.building4.swingPlus : 0) // Grand Architect mastery talent
        + (callingSignature(st.character?.classId, 'building') ? CALLING_FX.building.swingPlus : 0);
      const swing = amount * (1 + swingBonus);
      const before = b.built ?? 0;
      const after = Math.min(1, before + swing);
      set({
        buildings: st.buildings.map((x) => (x.id === id ? { ...x, built: after } : x)),
        dirty: true,
      });
      if (after >= 1) {
        if (b.ruin) {
          // Wave 57 (F5): a ruin rebuilt in place — deliberately skips the
          // ENTIRE stats/XP/quest-counter block below (only clearing the
          // flag) rather than running it again. That block is the one place
          // a completion normally "counts": `stats.buildingsPlaced` feeds
          // difficulty.ts's computeThreat() (its own header brags "EVERY
          // INPUT IS MONOTONIC BY CONSTRUCTION" so raiding/razing can't walk
          // the tier back down) and the Architect title (data/challenges.ts,
          // 10/50/200 pieces placed); `bumpQuestCounters('build', ...)`
          // would let a live "build N of X" quest finish by burn-and-rebuild
          // cycling instead of real construction. Reusing `built` for the
          // ruin state (see damageBuilding's own leaveRuin comment) would
          // otherwise let a player farm both for free by having the dragon
          // repeatedly torch and rebuild the same cheap hut.
          //
          // The rebuilt piece is whole ("Rebuild it to restore it"): whatever
          // hit points are on record for the ruin go with the flag. A ruin
          // is made without any (damageBuilding deletes them), but a save
          // from before 2026-10-06 can hold some — a dragon's next breath
          // used to land on the ruin it had just made (ROADMAP.md, "a dragon
          // went on burning a building its first breath had already ruined")
          // — and so can a ruin battered again while it was being rebuilt.
          const hpRest = { ...get().buildingHp };
          delete hpRest[id];
          set({ buildings: get().buildings.map((x) => (x.id === id ? { ...x, ruin: false } : x)), buildingHp: hpRest, dirty: true });
          audio.play('brick_connect', 0.85);
          st.notify(`${def.name} rebuilt from the ashes!`, true);
        } else {
          // the real "built" moment — everything placement used to award
          set({
            stats: {
              ...get().stats,
              buildingsPlaced: get().stats.buildingsPlaced + 1,
              buildingsByType: { ...get().stats.buildingsByType, [b.type]: (get().stats.buildingsByType[b.type] ?? 0) + 1 },
            },
          });
          st.addXp('building', def.buildXp);
          audio.play('brick_connect', 0.85);
          bumpQuestCounters('build', b.type, 1);
          st.notify(`${def.name} construction complete!`);
          // Wave 13 · Timed Build Challenge (see game/buildChallenge.ts) — a
          // finished piece raised at the challenge ground, while a run is
          // live, counts toward it. `b.world` is the tag placeBuilding stamped
          // at placement time (st.destination then), so this can only ever
          // fire for a piece actually standing at BUILD_CHALLENGE_ID — the
          // homestead-villager auto-build pass (tickVillagers', villagerSlice.ts) never
          // touches a building tagged that way, since no villager is ever
          // assigned to a challenge ground.
          if (b.world === BUILD_CHALLENGE_ID && buildChallengeState.active) {
            buildChallengeState.built += 1;
            if (buildChallengeState.built >= BUILD_CHALLENGE_TARGET) {
              buildChallengeState.active = false;
              const bonus = 40;
              st.addItems({ gold: bonus }, 'grant');
              st.addXp('building', 60);
              st.notify(`Challenge complete! ${BUILD_CHALLENGE_TARGET} pieces raised before the bell — +${bonus} gold.`, true);
              audio.play('treasure', 0.85);
            }
          }
        }
      } else {
        audio.play('thud', 0.6);
      }
    },

    pickupBuilding: (id) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === id);
      if (!b || st.movingBuilding) return;
      // anything resting on top stays floating visually until re-placed; keep it simple
      set({
        buildings: st.buildings.filter((x) => x.id !== id),
        movingBuilding: b,
        buildSelection: null,
        dirty: true,
      });
      audio.play('brick_collide', 0.5);
    },

    cancelMove: () => {
      const st = get();
      const mv = st.movingBuilding;
      if (!mv) return;
      const restoredKeep = mv.type === 'keep' && buildUndo.carriedKeepExtra
        ? { x: mv.x, z: mv.z, ...buildUndo.carriedKeepExtra }
        : null;
      buildUndo.carriedKeepExtra = null;
      set({
        buildings: [...st.buildings, mv],
        movingBuilding: null,
        ...(restoredKeep ? { keep: restoredKeep } : {}),
      });
    },

    finishMove: (x, z, rot, yaw, scale) => {
      const st = get();
      const mv = st.movingBuilding;
      if (!mv) return false;
      // the keep's socket layout has no rotation of its own (KeepAssembly.tsx
      // renders it unrotated regardless of PlacedBuilding.rot) — force 0 so a
      // rotated ghost during placement can never leave the synthetic entry
      // and the real KeepState disagreeing about which way it faces
      const placeRot = mv.type === 'keep' ? 0 : rot;
      const { y, valid } = st.evalPlacement(mv.type, x, z, placeRot, mv.id);
      if (!valid) {
        audio.play('brick_collide', 0.5);
        return false;
      }
      const restoredKeep = mv.type === 'keep' && buildUndo.carriedKeepExtra
        ? { x, z, ...buildUndo.carriedKeepExtra }
        : null;
      buildUndo.carriedKeepExtra = null;
      // Wave 9 · a piece set down in freeform keeps its true facing; set down
      // back on the grid (or as the keep, which has no facing of its own) it
      // sheds any it was carrying, so the record stays exactly as clean as it
      // would have been had freeform never been touched
      const freeYaw = mv.type !== 'keep' && yaw !== undefined && Math.abs(yaw - (placeRot * Math.PI) / 2) > 1e-4
        ? yaw : undefined;
      // Wave 51 (C6) · same rule, same reason, for `scale` — set down with
      // freeform off (or as the keep, which never took a `scale` from
      // BuildController in the first place) squares it back to 1, the same
      // "honest reading of the mode you are holding it in" this file's own
      // freeYaw comment above already states for facing.
      const freeScale = mv.type !== 'keep' && scale !== undefined && Math.abs(scale - 1) > 1e-4
        ? scale : undefined;
      set({
        // world stamped to wherever it's actually being set down — covers the
        // edge case of a pickup→travel→place happening in one build session
        buildings: [...st.buildings, { ...mv, x, z, y, rot: placeRot, yaw: freeYaw, scale: freeScale, world: st.destination ?? null }],
        movingBuilding: null,
        ...(restoredKeep ? { keep: restoredKeep } : {}),
        dirty: true,
      });
      audio.play('brick_link', 0.7);
      return true;
    },

    undoLast: () => {
      const st = get();
      while (buildUndo.placeHistory.length) {
        const group = buildUndo.placeHistory.pop()!;
        // a group is one gesture; anything in it already torn down by hand is
        // simply skipped, and a group emptied that way is not an undo at all
        const gone = group.filter((id) => st.buildings.some((x) => x.id === id));
        if (gone.length === 0) continue;
        const inv = { ...st.inventory };
        for (const id of gone) {
          const b = st.buildings.find((x) => x.id === id)!;
          for (const [itemId, n] of Object.entries(BUILDABLE_BY_ID[b.type].cost)) {
            inv[itemId as ItemId] = (inv[itemId as ItemId] ?? 0) + (n as number);
          }
        }
        const def = BUILDABLE_BY_ID[st.buildings.find((x) => x.id === gone[0])!.type];
        set({ buildings: st.buildings.filter((x) => !gone.includes(x.id)), inventory: inv, dirty: true });
        audio.play('brick_collide', 0.6);
        st.notify(gone.length > 1
          ? `Undid ${gone.length} × ${def.name} (materials returned)`
          : `Undid ${def.name} (materials returned)`);
        return;
      }
      st.notify('Nothing to undo.');
    },

    removeBuilding: (id, consumed = false, quiet = false) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === id);
      if (!b) return;
      const def = BUILDABLE_BY_ID[b.type];
      const inv = { ...st.inventory };
      // `consumed` = the piece destroyed itself (a detonated charge), so
      // there's nothing left to salvage — only a deliberate teardown refunds
      for (const [itemId, n] of Object.entries(consumed ? {} : def.cost)) {
        const refund = Math.floor((n as number) / 2);
        if (refund > 0) inv[itemId as ItemId] = (inv[itemId as ItemId] ?? 0) + refund;
      }
      set({ buildings: st.buildings.filter((x) => x.id !== id), inventory: inv, dirty: true });
      if (!quiet) audio.play('brick_collide', 0.6);
      // a consumed piece (a charge that went off) left nothing to salvage —
      // don't claim a refund that didn't happen
      if (!consumed && !quiet) st.notify(`${def.name} removed (half materials refunded)`);
    },
  };
};
