'use client';
// The rig lab's classification of what each extracted asset actually is,
// loaded from public/assets/rigs/capabilities.json — built by
// scripts/prepare-assets.mjs out of the lab's PAK_ASSET_CAPABILITIES.json
// (all 264 PAK warehouse assets, base layer) overlaid with
// PAK_CAPABILITY_OVERRIDES.json (86 hand-curated, human-VERIFIED entries,
// always winning — see `seedSource` below to tell which is which for a
// given id).
//
// Before this, every one of these facts was hardcoded per-buildable in
// data/buildables.ts (or simply guessed): whether you can stand on a piece,
// whether it's destructible, which hand holds the sword, whether a prop is a
// siege engine that fires or a barrel that blows up walls. The lab answered
// all of it once, by hand, against the real meshes — so we look it up.
//
// Loading is async (one 64 KB fetch) but every consumer wants a synchronous
// answer mid-frame, so the module keeps a warm snapshot and every accessor
// degrades to a sensible default until it lands. Nothing here is load-bearing
// for correctness on frame 1 — worst case a piece reads as non-destructible
// for a few hundred ms during startup.

export type LabKind = 'minifig' | 'wall' | 'mount' | 'explosive' | 'vehicle' | 'scenery';

export interface LabInteraction {
  isMovable?: boolean;
  isRotatable?: boolean;
  isDeletable?: boolean;
  isDestructible?: boolean;
  isPaintable?: boolean;
  isDriveable?: boolean;
  isSelectable?: boolean;
  canGrab?: boolean;
  canWear?: boolean;
  canSeat?: boolean;
  canStandOn?: boolean;
  canFire?: boolean;
}

export interface LabWallTraits {
  structureKind?: string;
  wallRole?: 'corner' | 'straight' | 'tower' | 'gate_flank' | string;
  canStandOn?: boolean;
  canConnectAsWall?: boolean;
  /** the lab's own flags on oc6096-5: a piece you climb, and one you can pick
   *  up and re-lean somewhere else (Wave 8 — see labIsLadder) */
  isLadder?: boolean;
  isMovableLadder?: boolean;
  isDestructible?: boolean;
  hasHole?: boolean;
  isRuined?: boolean;
  needsRepair?: boolean;
  /** 1 = intact … N = rubble, within a piece's own destruction chain */
  destructionPhase?: number;
  destructionPhaseCount?: number;
}

export interface LabMinifigTraits {
  isMountable?: boolean;
  defaultMountId?: string;
  laterality?: string;
  equipKind?: string;
  /** which rig bone actually holds each item — the lab checked per donor */
  shieldHand?: 'hand_L' | 'hand_R' | string;
  swordHand?: 'hand_L' | 'hand_R' | string;
  canGrab?: boolean;
  canWear?: boolean;
  equipmentSummary?: Record<string, boolean>;
}

export interface LabVehicleTraits {
  canSeat?: boolean;
  canDrive?: boolean;
  canPush?: boolean;
  /** the lab found a crew position on this engine — you can step onto it */
  canOccupy?: boolean;
  /** 'standing' on a catapult platform, 'seated' behind a wheeled crossbow */
  occupyMode?: 'standing' | 'seated' | string;
  isStandingTurret?: boolean;
  siegeRole?: string;
  isStationary?: boolean;
  isSiegeEngine?: boolean;
  canFire?: boolean;
  hasProjectile?: boolean;
  damagesWalls?: boolean;
  damagesVehicles?: boolean;
}

export interface LabExplosiveTraits {
  isExplosive?: boolean;
  damagesWalls?: boolean;
  damagesVehicles?: boolean;
  triggerKind?: 'manual' | 'fuse' | 'impact' | string;
}

export interface LabMountTraits {
  isMount?: boolean;
  mountFamily?: 'horse' | 'dragon' | 'chest_team' | string;
  faction?: string;
  canSeat?: boolean;
  color?: string;
}

export interface LabSceneryTraits {
  canStandOn?: boolean;
  isAnimal?: boolean;
  animalKind?: string;
  isDestructible?: boolean;
}

export interface LabCapability {
  kind: LabKind | null;
  displayName: string;
  rigClass: string | null;
  rigStatus: string | null;
  traits: {
    wall?: LabWallTraits;
    minifig?: LabMinifigTraits;
    vehicle?: LabVehicleTraits;
    explosive?: LabExplosiveTraits;
    mount?: LabMountTraits;
    scenery?: LabSceneryTraits;
  };
  interaction: LabInteraction;
  /** named attach points; values are mesh names, `bone:<name>` or `empty:<name>` */
  sockets: Record<string, string>;
  /** requested 2026-08-03: 'verified' for the 86 hand-curated overrides,
   *  'auto' for the wider auto-seeded pool from PAK_ASSET_CAPABILITIES.json
   *  — absent on data written before this field existed. Not read by any
   *  predicate below; a hint for UI/tooling that wants to flag unverified
   *  data rather than trust it at the same confidence as a reviewed entry. */
  seedSource?: 'auto' | 'verified';
}

let warm: Record<string, LabCapability> = {};
let promise: Promise<Record<string, LabCapability>> | null = null;

export function loadCapabilities(): Promise<Record<string, LabCapability>> {
  if (!promise) {
    promise = fetch('/assets/rigs/capabilities.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, LabCapability>) => { warm = d; return d; })
      .catch(() => ({}));
  }
  return promise;
}
// start the fetch as soon as anything imports this module
if (typeof window !== 'undefined') loadCapabilities();

export function capOf(assetId: string | undefined | null): LabCapability | null {
  if (!assetId) return null;
  return warm[assetId] ?? null;
}

/** every asset the lab verified for a given kind */
export function capsOfKind(kind: LabKind): [string, LabCapability][] {
  return Object.entries(warm).filter(([, c]) => c.kind === kind);
}

// ---- convenience predicates, each with the pre-lab default as fallback ----

export function labCanStandOn(assetId: string | undefined, fallback = true): boolean {
  const c = capOf(assetId);
  if (!c) return fallback;
  return c.interaction.canStandOn ?? c.traits.wall?.canStandOn ?? c.traits.scenery?.canStandOn ?? fallback;
}

export function labIsDestructible(assetId: string | undefined, fallback = true): boolean {
  const c = capOf(assetId);
  if (!c) return fallback;
  return c.interaction.isDestructible ?? c.traits.wall?.isDestructible ?? fallback;
}

export function labIsPaintable(assetId: string | undefined, fallback = false): boolean {
  return capOf(assetId)?.interaction.isPaintable ?? fallback;
}

export function labCanConnectAsWall(assetId: string | undefined): boolean {
  return capOf(assetId)?.traits.wall?.canConnectAsWall ?? false;
}

/** where a piece sits in its own destruction chain, if the lab charted one */
export function labDestruction(assetId: string | undefined): { phase: number; count: number } | null {
  const w = capOf(assetId)?.traits.wall;
  if (!w?.destructionPhase || !w.destructionPhaseCount) return null;
  return { phase: w.destructionPhase, count: w.destructionPhaseCount };
}

/**
 * The straight-wall destruction chain, derived from the lab's own
 * `destructionPhase` / `destructionPhaseCount` rather than hardcoded.
 * mc009 is charted as phase 2 of 3 ("damaged (hole)") and mc010 as phase 3
 * ("ruined (last phase)"); any straight wall with no phase of its own is the
 * intact phase 1 that feeds into them. That matters because the old
 * hardcoded ladder only degraded mc006 — mc007 (the main Castle Wall in the
 * Walls tab) and mc008 shrugged off sieges without ever showing a scratch.
 */
let chainCache: string[] | null = null;
function straightChain(): string[] {
  if (chainCache) return chainCache;
  const phased: { id: string; phase: number }[] = [];
  for (const [id, c] of Object.entries(warm)) {
    const w = c.traits.wall;
    if (!w || w.structureKind !== 'wall_straight') continue;
    if (w.destructionPhase) phased.push({ id, phase: w.destructionPhase });
  }
  phased.sort((a, b) => a.phase - b.phase);
  chainCache = phased.map((p) => p.id);
  return chainCache;
}

/** what a damaged wall should turn into at this HP fraction, or null if the
 *  lab charted no destruction chain for it (most pieces) */
export function labDamagedForm(assetId: string | undefined, hpFrac: number): string | null {
  const w = capOf(assetId)?.traits.wall;
  if (!w || w.structureKind !== 'wall_straight') return null;
  const chain = straightChain();
  if (!chain.length) return null;
  const count = w.destructionPhaseCount ?? chain.length + 1;
  const current = w.destructionPhase ?? 1;
  // even split across the chain: with 3 phases, phase 2 at <2/3 HP, 3 at <1/3
  let target = 1;
  for (let p = count; p >= 2; p--) {
    if (hpFrac < (count - p + 1) / count) { target = p; break; }
  }
  if (target <= current) return null; // never un-break a wall
  const next = chain.find((id) => capOf(id)?.traits.wall?.destructionPhase === target);
  return next && next !== assetId ? next : null;
}

/** a siege engine the lab marked as able to shoot (`traits.vehicle.canFire`) */
export function labCanFire(assetId: string | undefined): boolean {
  const c = capOf(assetId);
  if (!c) return false;
  return !!(c.traits.vehicle?.canFire ?? c.interaction.canFire);
}

/** can the player step onto this engine and crew it? The lab charted a crew
 *  position (`canOccupy`) on eight of the nine engines — the lone catapult
 *  oc1289 has none, so it stays a fire-and-forget emplacement. */
export function labCanOccupy(assetId: string | undefined): boolean {
  return !!capOf(assetId)?.traits.vehicle?.canOccupy;
}

/** 'seated' only where the lab actually found a seat (the wheeled crossbow
 *  oc4806b2, the one piece with `canSeat: true`) — everything else stands */
export function labOccupyMode(assetId: string | undefined): 'standing' | 'seated' {
  const v = capOf(assetId)?.traits.vehicle;
  if (v?.occupyMode === 'seated' || v?.canSeat) return 'seated';
  return 'standing';
}

/** A corner piece. Corners are bi-directional by nature — they turn a run
 *  either way — so a facing arrow on one is noise at best and misleading at
 *  worst. The lab labels them (`traits.wall.wallRole`), so this stays data
 *  driven rather than a hardcoded id list. */
export function labIsCorner(assetId: string | undefined): boolean {
  const role = capOf(assetId)?.traits.wall?.wallRole;
  return role === 'corner' || role === 'corner_connectable';
}

/** A piece you CLIMB (`traits.wall.isLadder`). Wave 8's Siege Stair is the
 *  one asset carrying it, but the interact never names that id — a second
 *  ladder mesh promoted out of the generic catalog would light up for free,
 *  the same way labCanFire already covers nine engines with no per-piece
 *  branch anywhere. */
export function labIsLadder(assetId: string | undefined): boolean {
  return !!capOf(assetId)?.traits.wall?.isLadder;
}

/** How a siege piece SOUNDS when it looses: the lab's own `siegeRole`, which
 *  cleanly separates gunpowder (`cannon`) from torsion arms (`catapult`,
 *  `stone_thrower`) from bolt-throwers (`crossbow_emplacement`, `turret`).
 *  Wave 8 · every engine used to play the cannon's report — a counterweight
 *  catapult that goes bang is the one thing a catapult definitely does not do. */
export function labSiegeRole(assetId: string | undefined): string | null {
  return capOf(assetId)?.traits.vehicle?.siegeRole ?? null;
}

/** a charge that goes off and damages what's around it */
export function labIsExplosive(assetId: string | undefined): boolean {
  return !!capOf(assetId)?.traits.explosive?.isExplosive;
}

export function labExplosive(assetId: string | undefined): LabExplosiveTraits | null {
  return capOf(assetId)?.traits.explosive ?? null;
}

/** which rig bone a donor's sword/shield hand is — the lab checked per donor,
 *  so held gear no longer has to assume a fixed side for every character */
export function labHands(donorId: string | undefined): { sword: 'left' | 'right'; shield: 'left' | 'right' } {
  const m = capOf(donorId)?.traits.minifig;
  const side = (v: string | undefined, dflt: 'left' | 'right') =>
    (v === 'hand_L' ? 'left' : v === 'hand_R' ? 'right' : dflt);
  return { sword: side(m?.swordHand, 'right'), shield: side(m?.shieldHand, 'left') };
}
