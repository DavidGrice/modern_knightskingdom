// NPC_AI_SPEC §3.1 / PHASE_2_NAVIGATION_AND_GATHERING.md §3.1 — the unified
// target model. Harvestables live in `st.nodes`, deposits in the building
// array; `gather_resource` must never fork by source, since `tree` exists in
// BOTH id spaces (a reservation keyed on a bare id would collide silently)
// and `farmer -> farmplot` is a building while `lumberjack -> tree` is a
// node. Every target gets a composite TargetId so the two spaces can never
// collide.
//
// Phase-2 deliverable: the registry and its queries, testable without a
// reasoner. Phase 5's real gather/haul actions are the first real caller of
// reserve()/release() — this module doesn't wire itself into anything yet.

import { useGameStore } from '@/game/store/gameStore';
import { isBuilt, isHomeBuilding, type PlacedBuilding } from '@/game/types';
import type { ResourceNodeState } from '@/game/types';
import { anchorRuleFor, type AnchorRule } from '../config';

export type TargetId = string; // 'node:17' | 'bldg:42'

export interface Target {
  id: TargetId;
  source: 'node' | 'building';
  kind: string;
  x: number;
  z: number;
  /** null for a homestead node/building, a destination id for one that
   *  lives in a settlement. §1.1 originally documented this as ALWAYS null
   *  for nodes ("nodes are home-only, no destination has any of its own
   *  yet") — true when written, but `ResourceNodeState` gained a real
   *  `world` field in Wave 5 for exactly the opposite case, and Wave 26's
   *  SETTLEMENT_NODES (data/settlementQuests.ts) is the first to actually
   *  populate it. `nodeTarget()` below now threads it through the same way
   *  `buildingTarget()` already did for `PlacedBuilding.world` — the stale
   *  claim here was a real bug (see rosterSync.ts's own Wave 26 comment for
   *  the live-reproduced failure it caused: `resolveAnchor`/`getNavGrid`
   *  validating a destination node's anchor against the HOME nav grid). */
  region: string | null;
  /** node: respawnAt === null && hitsLeft > 0. building: isBuilt(b), NOT a
   *  bare `built >= 1` check — `built` is optional and absent means
   *  complete, so `undefined >= 1` is false and every finished building
   *  without an explicit value would wrongly read as unavailable. */
  available: boolean;
  anchorRule: AnchorRule;
  /** quarter-turns, buildings only (iteration 2.9's fixed-mode anchor
   *  resolution needs it to rotate a rule's local offset with the piece —
   *  see AnchorResolution.ts). Nodes carry a continuous `yaw` instead, not
   *  this — always undefined for a node target, and never read for one,
   *  since every node's own anchor rule is 'radial'. */
  rot?: 0 | 1 | 2 | 3;
  /** node: the named ground it seeded in (ResourceNodeState.ground),
   *  absent for a node with none (starter area, open-water fishing,
   *  road-verge trees — all worked without a deed by design) and always
   *  absent for a building target. Threaded through so gather_resource can
   *  gate on deed ownership the same way PlayerController already does —
   *  see that action's own `target_usable` consideration. */
  ground?: string;
}

function nodeTarget(n: ResourceNodeState): Target {
  return {
    // Wave 26 fix: was hardcoded `null` — see `Target.region`'s own doc above.
    id: `node:${n.id}`, source: 'node', kind: n.kind, x: n.x, z: n.z, region: n.world ?? null,
    available: n.respawnAt === null && n.hitsLeft > 0,
    anchorRule: anchorRuleFor('node', n.kind),
    ground: n.ground,
  };
}

function buildingTarget(b: PlacedBuilding): Target {
  const region = isHomeBuilding(b) ? null : (b.world ?? null);
  return {
    id: `bldg:${b.id}`, source: 'building', kind: b.type, x: b.x, z: b.z, region,
    available: isBuilt(b), anchorRule: anchorRuleFor('building', b.type), rot: b.rot,
  };
}

interface Reservation {
  slotKind: string;
  agentId: string;
}

class TargetRegistry {
  // keyed by the full composite TargetId, so a node and a building of the
  // same bare id/kind can never share a reservation bucket
  private reservations = new Map<TargetId, Reservation[]>();

  // Performance pass (2026-07-28): get() used to be a straight
  // `st.nodes.find(...)`/`st.buildings.find(...)` — an O(n) scan of the
  // WHOLE array. That's expensive here specifically because get() isn't
  // just a think-tick cost: Locomotion.ts calls it every RENDER FRAME for
  // every agent walking to an anchor (not think-rate-limited at all), and
  // GatherAtNode/HaulToDeposit's own update() call it again every think
  // tick on top of that. These id-indexes turn it into an O(1) Map lookup.
  // Rebuilt lazily on reference change rather than on every call — st.nodes/
  // st.buildings get a genuinely new array reference on every store update
  // that touches either (harvest, respawn, placement, damage), so identity
  // comparison is a correct, cheap staleness check, and the O(n) rebuild
  // only happens once per actual mutation instead of once per lookup.
  private nodesRef: ResourceNodeState[] | null = null;
  private nodesById = new Map<string, ResourceNodeState>();
  private buildingsRef: PlacedBuilding[] | null = null;
  private buildingsById = new Map<string, PlacedBuilding>();

  private syncNodeIndex(nodes: ResourceNodeState[]): void {
    if (nodes === this.nodesRef) return;
    this.nodesRef = nodes;
    this.nodesById.clear();
    for (const n of nodes) this.nodesById.set(n.id, n);
  }

  private syncBuildingIndex(buildings: PlacedBuilding[]): void {
    if (buildings === this.buildingsRef) return;
    this.buildingsRef = buildings;
    this.buildingsById.clear();
    for (const b of buildings) this.buildingsById.set(b.id, b);
  }

  /** Nearest targets to (x, z) within `radius`, filtered to `kinds` (empty
   *  = any kind) and `region`. Capped at 12 — §3.1: do not score the whole
   *  world every think. Targets are computed fresh from live store state
   *  every call, not cached; only reservations persist across calls.
   *  Performance pass: the radius scan itself is still O(nodes+buildings) —
   *  a real spatial index would be a much bigger change for a cap this game
   *  world's current scale doesn't need yet — but a real `Target` object
   *  (nodeTarget()/buildingTarget()) is now only constructed for the
   *  entries that actually survive the sort+slice to `limit`, not for every
   *  match within radius. */
  queryNearby(
    x: number, z: number, radius: number,
    kinds: string[] = [], region: string | null = null, limit = 12,
  ): Target[] {
    const st = useGameStore.getState();
    this.syncNodeIndex(st.nodes);
    this.syncBuildingIndex(st.buildings);
    const r2 = radius * radius;
    const wantKind = kinds.length > 0 ? new Set(kinds) : null;
    const found: { ref: ResourceNodeState | PlacedBuilding; isNode: boolean; d2: number }[] = [];

    // Wave 26 fix: was `if (region === null) { scan every node }` — correct
    // only back when every node's own region really was null (see
    // Target.region's doc above for why that stopped being true). Same
    // per-item region filter the building loop just below already uses,
    // rather than a second, differently-shaped rule for the other source.
    for (const n of st.nodes) {
      if ((n.world ?? null) !== region) continue;
      if (wantKind && !wantKind.has(n.kind)) continue;
      const dx = n.x - x, dz = n.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= r2) found.push({ ref: n, isNode: true, d2 });
    }

    for (const b of st.buildings) {
      const buildingRegion = isHomeBuilding(b) ? null : (b.world ?? null);
      if (buildingRegion !== region) continue;
      if (wantKind && !wantKind.has(b.type)) continue;
      const dx = b.x - x, dz = b.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= r2) found.push({ ref: b, isNode: false, d2 });
    }

    found.sort((a, b) => a.d2 - b.d2);
    return found.slice(0, limit).map((e) => (
      e.isNode ? nodeTarget(e.ref as ResourceNodeState) : buildingTarget(e.ref as PlacedBuilding)
    ));
  }

  /** The live Target for a specific id, or null if it no longer exists (a
   *  harvested node despawned, a building was demolished). Re-reads current
   *  store state every call rather than trusting a cached snapshot — a
   *  target that no longer exists must read as gone, not stale-available.
   *  O(1) via the id-index above, not a linear scan — see that comment for
   *  why this specific lookup mattered enough to index. */
  get(id: TargetId): Target | null {
    const st = useGameStore.getState();
    if (id.startsWith('node:')) {
      this.syncNodeIndex(st.nodes);
      const n = this.nodesById.get(id.slice(5));
      return n ? nodeTarget(n) : null;
    }
    if (id.startsWith('bldg:')) {
      this.syncBuildingIndex(st.buildings);
      const b = this.buildingsById.get(id.slice(5));
      return b ? buildingTarget(b) : null;
    }
    return null;
  }

  /** Claim one slot on `id` for `agentId`, tagged `slotKind` (e.g. "chop",
   *  "haul") so two different actions on the same target keep separate
   *  bookkeeping. Fails if the target doesn't exist, is unavailable, this
   *  agent already holds a slot there, or every slot its anchor rule allows
   *  is already taken — §4.3's "an affordance whose slots are full scores
   *  zero, not low" is the same discipline applied to targets. */
  reserve(id: TargetId, slotKind: string, agentId: string): boolean {
    const target = this.get(id);
    if (!target || !target.available) return false;
    const held = this.reservations.get(id) ?? [];
    if (held.some((r) => r.agentId === agentId)) return false;
    if (held.length >= target.anchorRule.slots) return false;
    held.push({ slotKind, agentId });
    this.reservations.set(id, held);
    return true;
  }

  release(id: TargetId, slotKind: string, agentId: string): void {
    const held = this.reservations.get(id);
    if (!held) return;
    const next = held.filter((r) => !(r.slotKind === slotKind && r.agentId === agentId));
    if (next.length > 0) this.reservations.set(id, next);
    else this.reservations.delete(id);
  }

  /** How many of `id`'s slots are currently held. Debug/test readout, not
   *  used by reserve()/release() themselves (they only need held.length). */
  reservedCount(id: TargetId): number {
    return this.reservations.get(id)?.length ?? 0;
  }

  clear() {
    this.reservations.clear();
    // drop the id-index too — a stale reference held onto across a
    // newGame()/loadFromSave() is a real (if small) leak, and the next
    // get()/queryNearby() call rebuilds it against the new array anyway
    this.nodesRef = null;
    this.nodesById.clear();
    this.buildingsRef = null;
    this.buildingsById.clear();
  }
}

export const targetRegistry = new TargetRegistry();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kktargets = targetRegistry;
}
