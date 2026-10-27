// CLN-07 · the store's build-view tools slice: the tool in hand, freeform placement, the demolish and dig marquees,
// and captured blueprints and their stamping.
import type {
  Blueprint, BlueprintPiece, BuildRect, BuildTool, ItemId, PlacedBuilding, WaterFeature,
} from '../../types';
import { KEEP_SIZE } from '../../data/keep';
import { BUILDABLE_BY_ID, buildingsInRect } from '../../data/buildables';
import { STARTER_BLUEPRINT_BY_ID } from '../../data/blueprints';
import { audio } from '@/lib/audio';
import {
  FILL_REFUND, MAX_WATERWORKS, digCost, setWaterworks, shapeConflict, snapDigRect, terrainConflict, waterworksInRect,
} from '../../waterworks';
import { buildUndo, seq } from '../storeCounters';
import type { SliceCreator } from './types';

export interface BuildToolsSlice {
  blueprintSelection: string | null; // blueprint id chosen for multi-piece stamping

  /** Wave 9 · which build-mode tool the pointer is holding. 'build' is
   *  everything the build view could already do (place / move / right-click
   *  remove); 'demolish' swaps the left button for an area drag. Transient UI,
   *  never saved — the tool you were holding is not part of the homestead. */
  buildTool: BuildTool;
  /** Wave 9 · freeform placement: the ghost stops rounding to the piece's grid
   *  (and stops latching to wall ends), and R turns it in fine steps instead of
   *  quarter turns. Off by default and transient — the grid is still the way
   *  the game is meant to be built, this is for dressing a scene. */
  freeformBuild: boolean;
  /** Wave 9 · the area-demolish marquee once the drag has been released and is
   *  awaiting confirmation. Non-null = a rectangle is armed and BuildBar is
   *  showing what it would cost. Transient. */
  demolishRect: BuildRect | null;
  /** Wave 12 · the DIG marquee, the exact same arm-then-confirm shape as
   *  `demolishRect` above and separate from it on purpose: both tools can have
   *  a patch parked on the rail, and one confirm button firing the other tool's
   *  rectangle is the worst possible way to find out they were sharing a field.
   *  Already snapped to the dig lattice when it lands here. Transient. */
  digRect: BuildRect | null;

  setBlueprintSelection: (id: string | null) => void;
  captureBlueprint: (name: string, x: number, z: number) => boolean;
  deleteBlueprint: (id: string) => void;
  placeBlueprintAt: (blueprintId: string, x: number, z: number, rot: 0 | 1 | 2 | 3) => boolean;
  evalBlueprintPlacement: (
    blueprintId: string, x: number, z: number, rot: 0 | 1 | 2 | 3,
  ) => { pieces: { type: string; x: number; z: number; rot: 0 | 1 | 2 | 3; y: number; valid: boolean }[]; valid: boolean; cost: Partial<Record<ItemId, number>> };

  /** Wave 9 · build-view tool/mode switches (all transient, never saved) */
  setBuildTool: (tool: BuildTool) => void;
  setFreeformBuild: (on: boolean) => void;
  /** arm (or clear, with null) the area-demolish marquee */
  setDemolishRect: (rect: BuildRect | null) => void;
  /** what the armed marquee currently covers: the pieces it would take and the
   *  materials they would hand back. Pure read — BuildBar shows it before the
   *  player commits, which is the whole safety net for an action that can level
   *  a wall run in one click. */
  demolishPreview: () => { ids: string[]; refund: Partial<Record<ItemId, number>> };
  /** tear down everything the armed marquee covers, piece by piece through the
   *  ordinary removeBuilding path, then clear the marquee */
  demolishArea: () => void;

  // ---- Wave 12 · digging ---------------------------------------------
  /** arm (or clear, with null) the dig marquee. Snaps the rectangle to the dig
   *  lattice on the way in, so nothing downstream has to remember to. */
  setDigRect: (rect: BuildRect | null) => void;
  /**
   * What the armed dig marquee would actually do, without doing it. One call
   * answers BOTH of the tool's jobs, because which one it is doing is a fact
   * about the ground rather than a mode the player picks: a patch that covers
   * water FILLS it in, a patch of dry ground is a CUT. (A separate fill tool
   * would need its own button, its own key and its own marquee to say the one
   * thing the rectangle already says.)
   *
   * `problem` is the refusal sentence, or null when the patch is good — the
   * rail shows it live so a 40m drag never ends in a bare "you can't do that".
   *
   * Takes an OPTIONAL rectangle, defaulting to the armed `digRect`, so the
   * ghost still being dragged is judged by exactly the code that will judge it
   * on release. The alternative — a cheap "looks fine" test for the drag and
   * the real one for the confirm — is precisely how a marquee ends up green
   * right up to the moment it refuses.
   */
  digPreview: (rect?: BuildRect | null) => {
    mode: 'dig' | 'fill';
    /** gold it costs to cut (mode 'dig') */
    cost: number;
    /** gold handed back for filling in (mode 'fill') */
    refund: number;
    /** the waterways a fill would remove */
    fills: WaterFeature[];
    area: number;
    problem: string | null;
  };
  /** cut the armed patch (or fill in the water it covers), then clear it */
  digArea: () => void;
}

export const createBuildToolsSlice: SliceCreator<BuildToolsSlice> = (set, get) => {
  return {
    blueprintSelection: null,

    buildTool: 'build',
    freeformBuild: false,
    demolishRect: null,
    digRect: null,

    setBlueprintSelection: (blueprintSelection) => set({
      blueprintSelection,
      ...(blueprintSelection ? { buildTool: 'build' as BuildTool, demolishRect: null, digRect: null } : {}),
    }),

    captureBlueprint: (name, x, z) => {
      const st = get();
      const RADIUS = 9;
      const MAX_PIECES = 24;
      const nearby = st.buildings.filter((b) => Math.hypot(b.x - x, b.z - z) <= RADIUS);
      if (nearby.length === 0) {
        st.notify('No buildings found near the build camera to capture.');
        return false;
      }
      if (nearby.length > MAX_PIECES) {
        st.notify(`Too many pieces nearby (${nearby.length}, max ${MAX_PIECES}) — capture a smaller cluster.`);
        return false;
      }
      const anchorX = nearby.reduce((sum, b) => sum + b.x, 0) / nearby.length;
      const anchorZ = nearby.reduce((sum, b) => sum + b.z, 0) / nearby.length;
      const pieces: BlueprintPiece[] = nearby.map((b) => ({
        type: b.type,
        dx: Math.round((b.x - anchorX) * 100) / 100,
        dz: Math.round((b.z - anchorZ) * 100) / 100,
        rot: b.rot,
      }));
      const bp: Blueprint = { id: `bp${seq.blueprint++}`, name: name.trim() || 'Unnamed Blueprint', pieces };
      set({ customBlueprints: [...st.customBlueprints, bp], dirty: true });
      st.notify(`Blueprint "${bp.name}" saved (${pieces.length} pieces)!`, true);
      return true;
    },

    deleteBlueprint: (id) => {
      const st = get();
      set({ customBlueprints: st.customBlueprints.filter((b) => b.id !== id), dirty: true });
    },

    evalBlueprintPlacement: (blueprintId, x, z, rot) => {
      const st = get();
      const bp = STARTER_BLUEPRINT_BY_ID[blueprintId] ?? st.customBlueprints.find((b) => b.id === blueprintId);
      if (!bp) return { pieces: [], valid: false, cost: {} };
      const cos = Math.cos((rot * Math.PI) / 2);
      const sin = Math.sin((rot * Math.PI) / 2);
      const cost: Partial<Record<ItemId, number>> = {};
      let valid = true;
      const pieces = bp.pieces.map((p) => {
        const px = x + (p.dx * cos - p.dz * sin);
        const pz = z + (p.dx * sin + p.dz * cos);
        const pieceRot = ((p.rot + rot) % 4) as 0 | 1 | 2 | 3;
        const def = BUILDABLE_BY_ID[p.type];
        let pieceValid = !!def;
        if (def?.requiresUnlock && !st.unlocks.includes(def.requiresUnlock)) pieceValid = false;
        const ev = pieceValid ? st.evalPlacement(p.type, px, pz, pieceRot) : { y: 0, valid: false };
        pieceValid = pieceValid && ev.valid;
        if (!pieceValid) valid = false;
        if (def) {
          for (const [id, n] of Object.entries(def.cost)) {
            cost[id as ItemId] = (cost[id as ItemId] ?? 0) + (n as number);
          }
        }
        return { type: p.type, x: px, z: pz, rot: pieceRot, y: ev.y, valid: pieceValid };
      });
      return { pieces, valid, cost };
    },

    placeBlueprintAt: (blueprintId, x, z, rot) => {
      const st = get();
      const ev = st.evalBlueprintPlacement(blueprintId, x, z, rot);
      if (!ev.valid || ev.pieces.length === 0) return false;
      if (!st.canAfford(ev.cost)) {
        st.notify('Not enough materials for this blueprint!');
        audio.play('brick_collide', 0.5);
        return false;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(ev.cost)) {
        inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      }
      const placed: PlacedBuilding[] = ev.pieces.map((p) => {
        // build-then-construct: blueprint pieces are construction sites too —
        // XP/quest credit lands per-piece as each finishes (constructBuilding)
        const pb: PlacedBuilding = { id: `b${seq.build++}`, type: p.type, x: p.x, z: p.z, y: p.y, rot: p.rot, built: 0, world: st.destination ?? null };
        buildUndo.placeHistory = [...buildUndo.placeHistory.slice(-24), [pb.id]];
        return pb;
      });
      set({ inventory: inv, buildings: [...st.buildings, ...placed], dirty: true });
      audio.play('brick_link', 0.7);
      st.notify(`Blueprint staked out: ${ev.pieces.length} sites marked — now build them!`, true);
      return true;
    },

    // ---- Wave 9 · build-view tools ------------------------------------
    setBuildTool: (buildTool) => set({
      buildTool,
      demolishRect: null,
      digRect: null,
      // the wrecking tool owns the left button, so a piece still selected
      // underneath it would only be a lie about what a click does — and Wave
      // 12's spade owns it exactly the same way
      ...(buildTool !== 'build' ? { buildSelection: null, blueprintSelection: null } : {}),
    }),
    setFreeformBuild: (freeformBuild) => set({ freeformBuild }),
    setDemolishRect: (demolishRect) => set({ demolishRect }),

    demolishPreview: () => {
      const st = get();
      const r = st.demolishRect;
      const refund: Partial<Record<ItemId, number>> = {};
      if (!r) return { ids: [], refund };
      const hit = buildingsInRect(st.buildings, st.destination ?? null, r);
      for (const b of hit) {
        for (const [itemId, n] of Object.entries(BUILDABLE_BY_ID[b.type]?.cost ?? {})) {
          // the same half-of-cost removeBuilding actually pays back, so the
          // number shown before the click is the number that arrives after it
          const back = Math.floor((n as number) / 2);
          if (back > 0) refund[itemId as ItemId] = (refund[itemId as ItemId] ?? 0) + back;
        }
      }
      return { ids: hit.map((b) => b.id), refund };
    },

    demolishArea: () => {
      const st = get();
      const { ids } = st.demolishPreview();
      if (ids.length === 0) {
        set({ demolishRect: null });
        st.notify('Nothing inside that patch to pull down.');
        return;
      }
      // one piece at a time through the ordinary teardown, so the half-material
      // refund is whatever removeBuilding already does — an area tool that
      // reimplemented removal would drift out of step with it the first time
      // removal grew a rule. `quiet` only suppresses the per-piece toast and
      // crash: twenty of each at once is noise, not feedback.
      for (const id of ids) get().removeBuilding(id, false, true);
      set({ demolishRect: null });
      audio.play('brick_collide', 0.7);
      st.notify(`Cleared ${ids.length} ${ids.length === 1 ? 'piece' : 'pieces'} (half materials refunded)`, true);
    },

    // ---- Wave 12 · digging --------------------------------------------
    setDigRect: (rect) => set({ digRect: rect ? snapDigRect(rect) : null }),

    digPreview: (rect) => {
      const st = get();
      const r = rect === undefined ? st.digRect : rect;
      const none = { mode: 'dig' as const, cost: 0, refund: 0, fills: [] as WaterFeature[], area: 0, problem: null };
      if (!r) return none;
      const area = (r.maxX - r.minX) * (r.maxZ - r.minZ);
      // home only, and checked before anything else so the refusal is the real
      // reason rather than whatever the homestead's own geography says about a
      // rectangle two thousand metres away. Away from home the ground is a
      // template bake's real sloped geometry, and a flat basin cut into it
      // would hang in the air at one end — see WaterFeature's own note.
      const away = st.destination ? 'Your diggers work your homestead, not this place.' : null;
      const fills = waterworksInRect(r);
      // FILL, whenever the patch touches water at all. The alternative reading
      // — "dig the dry part of it too" — would have one gesture both cut and
      // fill, and there is no honest way to price or explain that.
      if (fills.length > 0) {
        const refund = Math.round(fills.reduce((n, w) => n + w.paid, 0) * FILL_REFUND);
        return { mode: 'fill' as const, cost: 0, refund, fills, area, problem: away };
      }
      const cost = digCost(r);
      // shape first: "keep dragging, it is not a waterway yet" has to win over
      // "there is a tree in the way", or the very first pixel of every drag
      // reports the wrong problem
      let problem = shapeConflict(r) ?? away;
      if (!problem) problem = terrainConflict(r, st.landTier);
      if (!problem && st.waterworks.length >= MAX_WATERWORKS) {
        problem = `You already keep ${MAX_WATERWORKS} waterways — fill one in before cutting another.`;
      }
      if (!problem && buildingsInRect(st.buildings, null, r).length > 0) {
        problem = 'Something of yours stands there — pull it down first.';
      }
      if (!problem && st.keep
        && Math.abs(st.keep.x - (r.minX + r.maxX) / 2) < KEEP_SIZE / 2 + (r.maxX - r.minX) / 2
        && Math.abs(st.keep.z - (r.minZ + r.maxZ) / 2) < KEEP_SIZE / 2 + (r.maxZ - r.minZ) / 2) {
        // checked separately because `buildingsInRect` deliberately skips the
        // keep (it is picked up whole, never area-demolished) — and a moat is
        // exactly the thing a player will try to draw round their castle, so
        // "over the foundation" is the likeliest mistake there is here
        problem = 'Your keep stands on that ground — draw the moat around it.';
      }
      if (!problem) {
        // Resource nodes hold their spot for the life of the world — a felled
        // one is not gone, it is `respawnAt`, and it comes back exactly where
        // it stood. So this ignores respawn state on purpose: cutting over a
        // stump would put a tree back in the middle of the water a minute
        // later, standing on it, harvestable. Refusing costs the player one
        // more swing of the axe and a walk to somewhere else.
        //
        // This is also, at today's numbers, the ONLY thing standing between a
        // cut and the fenced sections: every GROUND and both CULTIVATED_PLOTS
        // lie beyond the widest legal reach (Barony's 32 + DIG_OUTSKIRT = 48;
        // the nearest, the orchard, starts at z=56), so their own rectangles
        // need no check here — but their nodes would be caught by this one if
        // the bound ever moved out to them.
        const node = st.nodes.find((n) => (n.world ?? null) === null
          && n.x > r.minX - 0.8 && n.x < r.maxX + 0.8 && n.z > r.minZ - 0.8 && n.z < r.maxZ + 0.8);
        if (node) problem = 'Clear the trees and rocks off that ground first.';
      }
      if (!problem && (st.inventory.gold ?? 0) < cost) {
        problem = `Your diggers want ${cost} gold for that — you have ${st.inventory.gold ?? 0}.`;
      }
      return { mode: 'dig' as const, cost, refund: 0, fills, area, problem };
    },

    digArea: () => {
      const st = get();
      const r = st.digRect;
      if (!r) return;
      const pre = st.digPreview();
      if (pre.problem) {
        st.notify(pre.problem);
        audio.play('brick_collide', 0.5);
        return;
      }
      if (pre.mode === 'fill') {
        const gone = new Set(pre.fills.map((w) => w.id));
        const list = st.waterworks.filter((w) => !gone.has(w.id));
        setWaterworks(list);
        set({ waterworks: list, digRect: null, dirty: true });
        if (pre.refund > 0) st.addItems({ gold: pre.refund });
        st.notify(
          `Filled in ${pre.fills.length} ${pre.fills.length === 1 ? 'waterway' : 'waterways'}`
          + (pre.refund > 0 ? ` — ${pre.refund} gold back from the spoil.` : '.'),
          true,
        );
        return;
      }
      const w: WaterFeature = {
        id: `w${seq.water++}`,
        x: (r.minX + r.maxX) / 2,
        z: (r.minZ + r.maxZ) / 2,
        halfX: (r.maxX - r.minX) / 2,
        halfZ: (r.maxZ - r.minZ) / 2,
        paid: pre.cost,
      };
      const list = [...st.waterworks, w];
      setWaterworks(list);
      set({ waterworks: list, digRect: null, dirty: true });
      st.addItems({ gold: -pre.cost });
      // no nav call here on purpose: NavGrid.rebuild() is polled at 1Hz from
      // game/directors/navMaintenance.ts and now watches `waterworks.rev` as a second input beside
      // the buildings array's identity, so the water is in the grid within the
      // second without this action reaching into the pathfinder.
      audio.play('treasure', 0.55);
      st.notify(`Dug ${Math.round(pre.area)}m² of waterway for ${pre.cost} gold.`, true);
    },
  };
};
