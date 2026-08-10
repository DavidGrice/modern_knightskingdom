'use client';
// Wave 8 · Is the homestead actually WALLED IN?
//
// Every wall in this game has always been a decoration with collision: you
// could ring the whole holding in crenellated stone and nothing anywhere
// noticed. This is the check that notices — and the buff that makes ringing it
// worth the stone.
//
// WHY A FLOOD FILL AND NOT A GRAPH WALK. game/walls.ts derives the real
// connection graph the lab's `canConnectAsWall` data was collected for, and
// this module uses it — but only to describe the ring afterwards, not to
// decide the question. A graph walk answers "are these pieces joined", which
// is not the same question as "is the homestead inside them": a joined run can
// be a long straight line, a ring can be closed by butting against the keep,
// and a single open gate has to un-close whatever it is part of. Flooding in
// from outside the fence answers all three at once, the way water would.
//
// The grid is a flat metre lattice over the current land tier (32m half at the
// widest, so ~4,900 cells) rebuilt only when the buildings array, the gate
// state, the keep or the land tier actually change identity — placing a piece
// is the only thing that can change the answer, so idle frames cost nothing.
import { useGameStore } from './store/gameStore';
import { landHalf, sizeFor } from './data/buildables';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from './data/keep';
import { isRampart, wallLinks } from './walls';
import { isBuilt, isDoorLike } from './types';
import { playerState } from './playerState';

/** metres per cell. A door is 0.8m deep, so cells are stamped by AABB overlap
 *  rather than centre containment — at this pitch a thin piece must still
 *  block a solid line of cells or the fill leaks through a shut door. */
const CELL = 1;
/** open ground kept outside the fence, so the fill always has somewhere to
 *  start even when a wall is built hard against the region boundary */
const MARGIN = 3;

export const fortState = {
  /** the homestead's centre cannot be reached from outside the walls */
  enclosed: false,
  /** wall/gate pieces actually standing in that perimeter */
  ring: 0,
  /** how many of those are gates or doors — the ones that can open it again */
  doors: 0,
  /** square metres of ground sealed in */
  area: 0,
  /** the largest run of pieces joined to each other (game/walls.ts) — what a
   *  player sees as "one wall" rather than a scatter of segments */
  longestRun: 0,
};

/** Sound Walls: the damage a closed ring takes off every blow landed on you
 *  inside it. Multiplies AFTER armour (game/combat.ts's armorReduction) rather
 *  than adding into that same capped pool, so plate and stone are two separate
 *  investments that both pay. */
export const FORT_DAMAGE_REDUCTION = 0.2;

// ---- the lattice ----------------------------------------------------------
let gridMin = 0;
let gridN = 0;
let outside: Uint8Array | null = null;

// memo keys: every one of these is replaced by identity when it changes
let lastBuildings: unknown = null;
let lastGates: unknown = null;
let lastKeep: unknown = null;
let lastTier = -1;
let everChecked = false;
/** identity of the character record, which newGame and loadFromSave both
 *  replace. Loading a save whose walls are already closed must not toast as
 *  though you had just closed them — this is what tells the two apart without
 *  gameStore having to know this module exists. */
let lastCharacter: unknown = null;

const idx = (i: number, j: number) => j * gridN + i;
const cellOf = (v: number) => Math.round((v - gridMin) / CELL);

function stamp(blocked: Uint8Array, cx: number, cz: number, hx: number, hz: number) {
  const i0 = Math.max(0, Math.floor((cx - hx - gridMin) / CELL));
  const i1 = Math.min(gridN - 1, Math.ceil((cx + hx - gridMin) / CELL));
  const j0 = Math.max(0, Math.floor((cz - hz - gridMin) / CELL));
  const j1 = Math.min(gridN - 1, Math.ceil((cz + hz - gridMin) / CELL));
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) blocked[idx(i, j)] = 1;
  }
}

/**
 * Recompute the ring, at most once per real change. Cheap to call often — the
 * HUD badge polls it twice a second and PlayerController ticks it alongside
 * its own half-second station sweep, and both are no-ops until something
 * actually moves.
 */
export function refreshFort(force = false) {
  const st = useGameStore.getState();
  if (st.character !== lastCharacter) {
    lastCharacter = st.character;
    everChecked = false; // a fresh game or a freshly loaded one: report, don't announce
  }
  if (
    !force
    && st.buildings === lastBuildings
    && st.gateOpen === lastGates
    && st.keep === lastKeep
    && st.landTier === lastTier
  ) return;
  lastBuildings = st.buildings;
  lastGates = st.gateOpen;
  lastKeep = st.keep;
  lastTier = st.landTier;

  const half = landHalf(st.landTier);
  gridMin = -half - MARGIN;
  gridN = Math.ceil(((half + MARGIN) * 2) / CELL) + 1;
  const cells = gridN * gridN;
  const blocked = new Uint8Array(cells);

  const barriers = st.buildings.filter((b) => {
    if ((b.world ?? null) !== null) return false; // the homestead's own ring only
    if (!isBuilt(b)) return false;                // a staked-out site stops nothing
    if (!isRampart(b.type)) return false;
    // a raised gate is a hole in your wall, and it should read as one
    if (isDoorLike(b.type) && (st.gateOpen[b.id] ?? true)) return false;
    return true;
  });
  for (const b of barriers) {
    const [sx, sz] = sizeFor(b.type, b.rot);
    stamp(blocked, b.x, b.z, sx / 2, sz / 2);
  }
  // the composed keep seals ground too — its pieces are not PlacedBuildings
  // (they live in KeepState), so they need their own pass here exactly the way
  // siege.ts's damageKeepNear needs one alongside its buildings loop
  const keep = st.keep;
  if (keep) {
    for (const s of KEEP_SOCKETS) {
      const part = KEEP_PART_BY_ID[keep.parts[s.id] ?? ''];
      if (!part || (keep.built[s.id] ?? 0) < 1) continue;
      const alongX = s.kind !== 'wall' || Math.abs(Math.sin(s.yaw)) < 0.5;
      const hx = s.kind === 'wall' ? (alongX ? 4 : 1.2) : 2;
      const hz = s.kind === 'wall' ? (alongX ? 1.2 : 4) : 2;
      stamp(blocked, keep.x + s.x, keep.z + s.z, hx, hz);
    }
  }

  // flood in from the boundary. Four-connected on purpose: a wall laid on the
  // diagonal is a wall, and eight-connected water would seep through the
  // corner where two pieces meet.
  const seen = new Uint8Array(cells);
  const queue = new Int32Array(cells);
  let head = 0;
  let tail = 0;
  const push = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= gridN || j >= gridN) return;
    const k = idx(i, j);
    if (seen[k] || blocked[k]) return;
    seen[k] = 1;
    queue[tail++] = k;
  };
  for (let i = 0; i < gridN; i++) {
    push(i, 0); push(i, gridN - 1); push(0, i); push(gridN - 1, i);
  }
  while (head < tail) {
    const k = queue[head++];
    const i = k % gridN;
    const j = (k - i) / gridN;
    push(i + 1, j); push(i - 1, j); push(i, j + 1); push(i, j - 1);
  }
  outside = seen;

  // the homestead's centre is the thing being walled in: the signpost, the
  // keep site, the first campfire every game starts around all sit on it
  const centre = idx(cellOf(0), cellOf(0));
  const wasEnclosed = fortState.enclosed;
  const enclosed = barriers.length > 0 && !seen[centre] && !blocked[centre];

  let area = 0;
  for (let k = 0; k < cells; k++) if (!seen[k] && !blocked[k]) area += CELL * CELL;

  // which pieces are actually holding that line: a barrier with sheltered
  // ground against it, as opposed to a spare wall standing out in the meadow
  let ring = 0;
  let doors = 0;
  if (enclosed) {
    for (const b of barriers) {
      const [sx, sz] = sizeFor(b.type, b.rot);
      const i0 = Math.max(0, Math.floor((b.x - sx / 2 - 1 - gridMin) / CELL));
      const i1 = Math.min(gridN - 1, Math.ceil((b.x + sx / 2 + 1 - gridMin) / CELL));
      const j0 = Math.max(0, Math.floor((b.z - sz / 2 - 1 - gridMin) / CELL));
      const j1 = Math.min(gridN - 1, Math.ceil((b.z + sz / 2 + 1 - gridMin) / CELL));
      let onRing = false;
      for (let j = j0; j <= j1 && !onRing; j++) {
        for (let i = i0; i <= i1; i++) {
          const k = idx(i, j);
          if (!seen[k] && !blocked[k]) { onRing = true; break; }
        }
      }
      if (!onRing) continue;
      ring++;
      if (isDoorLike(b.type)) doors++;
    }
  }

  // the longest joined run, straight off game/walls.ts's graph — the one place
  // the lab's connection data is read as a graph rather than as a snap hint
  const links = wallLinks(st.buildings, null);
  let longest = 0;
  const visited = new Set<string>();
  for (const id of links.keys()) {
    if (visited.has(id)) continue;
    let size = 0;
    const stack = [id];
    visited.add(id);
    while (stack.length) {
      const cur = stack.pop()!;
      size++;
      for (const nb of links.get(cur) ?? []) {
        if (visited.has(nb)) continue;
        visited.add(nb);
        stack.push(nb);
      }
    }
    if (size > longest) longest = size;
  }

  fortState.enclosed = enclosed;
  fortState.ring = ring;
  fortState.doors = doors;
  fortState.area = area;
  fortState.longestRun = longest;

  // announce the flip, never the state — loading a save with a finished wall
  // must not toast as though you had just closed it
  if (everChecked && enclosed !== wasEnclosed) {
    if (enclosed) {
      st.notify(
        `🏰 Your walls close — ${ring} pieces ring ${Math.round(area)}m² of ground. `
        + `Sound Walls: you take ${Math.round(FORT_DAMAGE_REDUCTION * 100)}% less damage inside them.`,
        true,
      );
    } else {
      st.notify('Your wall ring is open — Sound Walls is lost until it is sealed again.');
    }
  }
  everChecked = true;
}

/** true where the ground is sealed in by the ring (and the ring is closed) */
export function insideWalls(x: number, z: number): boolean {
  if (!fortState.enclosed || !outside) return false;
  const i = cellOf(x);
  const j = cellOf(z);
  if (i < 0 || j < 0 || i >= gridN || j >= gridN) return false;
  return !outside[idx(i, j)];
}

/** the live Sound Walls reduction for whoever is asking (the player, right
 *  now): only at home, only outdoors, only actually inside your own walls. */
export function fortDamageReduction(): number {
  const st = useGameStore.getState();
  if (st.destination || st.interior) return 0;
  return insideWalls(playerState.x, playerState.z) ? FORT_DAMAGE_REDUCTION : 0;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkfort = fortState;
  (window as unknown as Record<string, unknown>).__kkfortCheck = () => { refreshFort(true); return fortState; };
}
