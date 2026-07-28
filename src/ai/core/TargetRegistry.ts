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
  /** ALWAYS null for nodes — §1.1: nodes are home-only, no destination has
   *  any of its own yet. */
  region: string | null;
  /** node: respawnAt === null && hitsLeft > 0. building: isBuilt(b), NOT a
   *  bare `built >= 1` check — `built` is optional and absent means
   *  complete, so `undefined >= 1` is false and every finished building
   *  without an explicit value would wrongly read as unavailable. */
  available: boolean;
  anchorRule: AnchorRule;
}

function nodeTarget(n: ResourceNodeState): Target {
  return {
    id: `node:${n.id}`, source: 'node', kind: n.kind, x: n.x, z: n.z, region: null,
    available: n.respawnAt === null && n.hitsLeft > 0,
    anchorRule: anchorRuleFor('node', n.kind),
  };
}

function buildingTarget(b: PlacedBuilding): Target {
  const region = isHomeBuilding(b) ? null : (b.world ?? null);
  return {
    id: `bldg:${b.id}`, source: 'building', kind: b.type, x: b.x, z: b.z, region,
    available: isBuilt(b), anchorRule: anchorRuleFor('building', b.type),
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

  /** Nearest targets to (x, z) within `radius`, filtered to `kinds` (empty
   *  = any kind) and `region`. Capped at 12 — §3.1: do not score the whole
   *  world every think. Targets are computed fresh from live store state
   *  every call, not cached; only reservations persist across calls. */
  queryNearby(
    x: number, z: number, radius: number,
    kinds: string[] = [], region: string | null = null, limit = 12,
  ): Target[] {
    const st = useGameStore.getState();
    const r2 = radius * radius;
    const wantKind = kinds.length > 0 ? new Set(kinds) : null;
    const found: { t: Target; d2: number }[] = [];

    for (const n of st.nodes) {
      if (region !== null) continue; // every node's own region is null — see Target.region's doc
      if (wantKind && !wantKind.has(n.kind)) continue;
      const dx = n.x - x, dz = n.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= r2) found.push({ t: nodeTarget(n), d2 });
    }

    for (const b of st.buildings) {
      const buildingRegion = isHomeBuilding(b) ? null : (b.world ?? null);
      if (buildingRegion !== region) continue;
      if (wantKind && !wantKind.has(b.type)) continue;
      const dx = b.x - x, dz = b.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= r2) found.push({ t: buildingTarget(b), d2 });
    }

    found.sort((a, b) => a.d2 - b.d2);
    return found.slice(0, limit).map((e) => e.t);
  }

  /** The live Target for a specific id, or null if it no longer exists (a
   *  harvested node despawned, a building was demolished). Re-reads current
   *  store state every call rather than trusting a cached snapshot — a
   *  target that no longer exists must read as gone, not stale-available. */
  get(id: TargetId): Target | null {
    const st = useGameStore.getState();
    if (id.startsWith('node:')) {
      const n = st.nodes.find((x) => x.id === id.slice(5));
      return n ? nodeTarget(n) : null;
    }
    if (id.startsWith('bldg:')) {
      const b = st.buildings.find((x) => x.id === id.slice(5));
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
  }
}

export const targetRegistry = new TargetRegistry();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kktargets = targetRegistry;
}
