// CLN-07 · the store's keep slice: the composed keep (founding it; raising, working and damaging its parts; carrying
// it) and the assembly workshop's bench. Wave 67 (G-36): raising, working and damaging a piece is done on any socket
// site (game/sites/sites.ts) by its id; the keep's own actions are those on site 'keep'.
import type { ItemId, PlacedBuilding } from '../../types';
import { SET_PLANS, locateStep, setStepCount } from '@/lib/setBuild';
import { KEEP_PART_BY_ID, maxHpForPart } from '../../data/keep';
import {
  KEEP_SITE_ID, siteById, siteComplete, siteSocket, siteSockets, siteWrite,
} from '../../sites/sites';
import { ITEMS } from '../../data/items';
import { repairCost } from '../../repair';
import { audio } from '@/lib/audio';
import { buildUndo, seq } from '../storeCounters';
import type { SliceCreator } from './types';

/**
 * M · what one workshop step costs. Priced off the part's own measured volume
 * so a base plate is a real outlay and a stud is not — but kept small, because
 * a 204-step castle would otherwise cost more than the homestead.
 */
function partCost(vol: number): Partial<Record<ItemId, number>> {
  const n = Math.max(1, Math.min(4, Math.round(vol * 26)));
  return vol > 0.06 ? { stone: n } : { plank: n };
}

export interface KeepSlice {
  /** which socket of which site the player is stood at, for the socket panel */
  keepSocket: { site: string; socket: string } | null;

  /** J51 · lay the castle foundation at (x, z, y) — sockets open once it
   *  exists. Wave 31 adds `y`: the caller (placeBuilding) already computed a
   *  real elevation via evalPlacement and used to discard it here. */
  foundKeep: (x: number, z: number, y: number) => void;
  /** open the socket panel for one named socket (of the home keep, unless a site is named) */
  openKeepSocket: (socketId: string, siteId?: string) => void;

  /** M · put a set on the bench (or swap the one that is there) */
  startSet: (setNum: string) => void;
  /** M · set the next piece; returns false if it could not be paid for */
  placeSetPart: () => boolean;
  /** M · clear the bench without finishing */
  clearBench: () => void;
  /** G-36 · commit a part to one socket of a site, paying its bill of pieces */
  raiseSitePart: (siteId: string, socketId: string, partId: string) => void;
  /** G-36 · one hammer swing's worth of work on a site socket's piece — a new one, or a ruin being rebuilt */
  workSitePart: (siteId: string, socketId: string, amount: number) => void;
  /** G-36 · a raised piece on a site takes siege damage. Wave 68 (G-05): at 0 HP it lies in ruins — its part kept,
   *  `ruined` set and its work back to 0, a breach to rebuild — where it was knocked down for half its materials */
  damageSitePart: (siteId: string, socketId: string, amount: number, cause?: string) => void;
  /** G-05 · make a damaged, standing piece on a site whole, for repair.ts's repairCost of its HP lost */
  repairSitePart: (siteId: string, socketId: string) => void;
  /** the same three on the home keep (site 'keep') */
  raiseKeepPart: (socketId: string, partId: string) => void;
  workKeepPart: (socketId: string, amount: number) => void;
  damageKeepPart: (socketId: string, amount: number, cause?: string) => void;

  /** J51 · pick the whole foundation up — every socket's part/progress/HP
   *  travels with it, ready to set down again via the same movingBuilding
   *  ghost flow an ordinary building uses */
  pickupKeep: () => void;
}

export const createKeepSlice: SliceCreator<KeepSlice> = (set, get) => {
  return {
    keepSocket: null,

    // ---- J51 · the composed keep -------------------------------------
    openKeepSocket: (socketId, siteId = KEEP_SITE_ID) => set({ keepSocket: { site: siteId, socket: socketId }, panel: 'keepSocket' }),

    foundKeep: (x, z, y) => {
      const st = get();
      if (st.keep) { st.notify('Your foundation is already laid.'); return; }
      // a real PlacedBuilding, `type: 'keep'`, alongside the socket-tracking
      // `st.keep` state — a genuinely pre-existing gap found generalising the
      // interior system: nothing ever added one, so the interact-detection
      // loop's own `b.type === 'keep'` check (game/interaction/findTarget.ts) could
      // never actually match anything, and "Enter the Keep" was unreachable
      // regardless of this refactor. Built immediately — the FOUNDATION reads
      // as already laid the moment it's placed; the individual socket pieces
      // on top keep their own separate construction time (workKeepPart).
      // Wave 31 · `y` threaded through from placeBuilding's own
      // evalPlacement result rather than hardcoded — see KeepState.y and
      // keepWalkwayAt (data/keep.ts) for where it's read back.
      const placed: PlacedBuilding = { id: `b${seq.build++}`, type: 'keep', x, z, y, rot: 0, built: 1, world: null };
      set({ keep: { x, z, y, parts: {}, built: {} }, buildings: [...st.buildings, placed], dirty: true });
      audio.play('brick_link', 0.8);
      st.notify('Foundation laid. Choose a corner and raise something on it.', true);
    },

    raiseSitePart: (siteId, socketId, partId) => {
      const st = get();
      const site = siteById(st, siteId);
      const socket = site && siteSocket(site, socketId);
      const part = KEEP_PART_BY_ID[partId];
      if (!site || !socket || !part) return;
      if (!part.fits.includes(socket.kind)) {
        st.notify(`A ${part.name.toLowerCase()} will not stand on ${socket.name.toLowerCase()}.`);
        return;
      }
      if (site.parts[socketId]) { st.notify(`${socket.name} is already taken.`); return; }
      // the bill of pieces has to be in the parts bin, same as any build
      for (const [item, n] of Object.entries(part.cost)) {
        if ((st.inventory[item as ItemId] ?? 0) < (n ?? 0)) {
          st.notify(`Not enough ${ITEMS[item as ItemId]?.name ?? item} for a ${part.name}.`);
          return;
        }
      }
      const inv = { ...st.inventory };
      for (const [item, n] of Object.entries(part.cost)) {
        inv[item as ItemId] = (inv[item as ItemId] ?? 0) - (n ?? 0);
      }
      set({
        inventory: inv,
        ...siteWrite(st, siteId, { parts: { ...site.parts, [socketId]: partId }, built: { ...site.built, [socketId]: 0 } }),
        dirty: true,
      });
      audio.play('brick_link', 0.7);
      st.notify(`${part.name} staked out on ${socket.name} — now build it.`, true);
    },

    workSitePart: (siteId, socketId, amount) => {
      const st = get();
      const site = siteById(st, siteId);
      if (!site || !site.parts[socketId]) return;
      const before = site.built[socketId] ?? 0;
      if (before >= 1) return;
      const after = Math.min(1, before + amount);
      const built = { ...site.built, [socketId]: after };
      if (after >= 1 && site.ruined?.[socketId]) {
        // G-05 · a ruin raised again: whole, and no longer a ruin — but it earns nothing a first raising did (the XP,
        // the castle's fanfare), the same as a building's ruin (buildSlice.ts's constructBuilding)
        const ruined = { ...site.ruined };
        delete ruined[socketId];
        set({ ...siteWrite(st, siteId, { built, ruined }), dirty: true });
        audio.play('brick_link', 0.9);
        st.notify(`${KEEP_PART_BY_ID[site.parts[socketId]]?.name ?? 'Piece'} rebuilt.`, true);
        return;
      }
      set({ ...siteWrite(st, siteId, { built }), dirty: true });
      if (after >= 1) {
        const part = KEEP_PART_BY_ID[site.parts[socketId]];
        st.addXp('building', part?.buildXp ?? 30);
        audio.play('brick_link', 0.9);
        st.notify(`${part?.name ?? 'Piece'} raised. ${siteSockets(site).length - Object.values(built).filter((v) => v >= 1).length} to go.`, true);
        if (siteComplete({ ...site, built })) {
          st.notify('Your castle stands complete.', true);
          audio.play('treasure', 0.9);
        }
      }
    },

    damageSitePart: (siteId, socketId, amount, cause) => {
      const st = get();
      const site = siteById(st, siteId);
      if (!site) return;
      const partId = site.parts[socketId];
      const part = partId ? KEEP_PART_BY_ID[partId] : null;
      // only a finished piece can be sieged — a bare socket or a construction
      // ghost has nothing standing on it yet to knock down
      if (!part || (site.built[socketId] ?? 0) < 1) return;
      const max = maxHpForPart(part);
      const hp = (site.hp?.[socketId] ?? max) - amount;
      if (hp > 0) {
        set({ ...siteWrite(st, siteId, { hp: { ...site.hp, [socketId]: hp } }), dirty: true });
        audio.play('brick_collide', 0.6);
        return;
      }
      // G-05 · battered down to a ruin: the part stays on its socket, built back to 0 so nothing reads it as standing
      // (the walk, the seal, the raiders' targets), and rebuilt by hammer or builders for nothing more — no refund
      // here, as a building's ruin has none (OD-02: outright destruction is a lost raid's, G-07)
      const hpRest = { ...site.hp };
      delete hpRest[socketId];
      set({
        ...siteWrite(st, siteId, {
          built: { ...site.built, [socketId]: 0 }, hp: hpRest, ruined: { ...site.ruined, [socketId]: true },
        }),
        dirty: true,
      });
      audio.play('brick_collide', 0.8);
      st.notify(`${part.name} ${cause ?? 'was battered down'} — it lies in ruins. Rebuild it to restore it.`, true);
    },

    repairSitePart: (siteId, socketId) => {
      const st = get();
      const site = siteById(st, siteId);
      const part = site ? KEEP_PART_BY_ID[site.parts[socketId] ?? ''] : null;
      const hp = site?.hp?.[socketId];
      // a ruin is rebuilt (workSitePart), not repaired; a piece with no HP on record is whole
      if (!site || !part || (site.built[socketId] ?? 0) < 1 || hp === undefined) return;
      const max = maxHpForPart(part);
      const cost = repairCost(part.cost, max - hp, max);
      if (!st.canAfford(cost)) {
        st.notify(`Not enough materials to repair the ${part.name}.`);
        audio.play('brick_collide', 0.5);
        return;
      }
      const inv = { ...st.inventory };
      for (const [itemId, n] of Object.entries(cost)) inv[itemId as ItemId] = (inv[itemId as ItemId] ?? 0) - (n as number);
      const hpRest = { ...site.hp };
      delete hpRest[socketId];
      set({ ...siteWrite(st, siteId, { hp: hpRest }), inventory: inv, dirty: true });
      audio.play('brick_link', 0.85);
      st.notify(`${part.name} repaired.`, true);
    },

    raiseKeepPart: (socketId, partId) => get().raiseSitePart(KEEP_SITE_ID, socketId, partId),
    workKeepPart: (socketId, amount) => get().workSitePart(KEEP_SITE_ID, socketId, amount),
    damageKeepPart: (socketId, amount, cause) => get().damageSitePart(KEEP_SITE_ID, socketId, amount, cause),

    pickupKeep: () => {
      const st = get();
      const keep = st.keep;
      const b = st.buildings.find((x) => x.type === 'keep');
      if (!keep || !b || st.movingBuilding) return;
      // every socket's part/progress/HP travels with the foundation, lossless
      // — carried outside movingBuilding (a plain PlacedBuilding has nowhere
      // to hold that) and restored by cancelMove/finishMove (buildSlice.ts)
      // (Wave 67 · and its ruins and gates: all of KeepState but where it stands)
      const { x: _x, z: _z, y: _y, ...extra } = keep;
      buildUndo.carriedKeepExtra = { ...extra, hp: keep.hp ?? {} };
      set({
        keep: null,
        buildings: st.buildings.filter((x) => x.id !== b.id),
        movingBuilding: b,
        buildSelection: null,
        dirty: true,
      });
      audio.play('brick_collide', 0.5);
    },

    // ---- M · the assembly workshop ------------------------------------
    startSet: (setNum) => {
      const st = get();
      if (!SET_PLANS[setNum]) return;
      if (st.builtSets.includes(setNum)) {
        st.notify(`You have already built the ${SET_PLANS[setNum].name}.`);
        return;
      }
      set({ workshop: { setNum, step: 0 }, panel: 'none', dirty: true });
      audio.play('brick_link', 0.7);
      st.notify(`${SET_PLANS[setNum].name} laid out on the bench — set the first piece.`, true);
    },

    clearBench: () => set({ workshop: null, dirty: true }),

    placeSetPart: () => {
      const st = get();
      const w = st.workshop;
      if (!w) return false;
      const total = setStepCount(w.setNum);
      if (w.step >= total) return false;
      const at = locateStep(w.setNum, w.step);
      const plan = SET_PLANS[w.setNum];
      const part = at ? plan.modules[at.module].steps[at.step] : null;
      // a step costs bricks out of the parts bin, priced off the part's own
      // size — a base plate is a handful, a stud is one
      const cost = partCost(part?.vol ?? 0.02);
      if (!st.canAfford(cost)) {
        st.notify(`That piece needs ${Object.entries(cost).map(([k, n]) => `${n} ${ITEMS[k as ItemId]?.name ?? k}`).join(', ')}.`);
        audio.play('brick_collide', 0.4);
        return false;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(cost)) inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      const step = w.step + 1;
      const done = step >= total;
      set({
        inventory: inv,
        workshop: done ? null : { setNum: w.setNum, step },
        builtSets: done ? [...st.builtSets, w.setNum] : st.builtSets,
        dirty: true,
      });
      audio.play('brick_link', 0.5);
      st.addXp('building', 4);
      if (done) {
        audio.play('treasure', 0.9);
        st.notify(`${plan.name} complete — the set is yours, and its pieces are unlocked in the build menu.`, true);
      } else if (step % 10 === 0) {
        st.notify(`${plan.name}: ${step} of ${total} pieces set.`);
      }
      return true;
    },
  };
};
