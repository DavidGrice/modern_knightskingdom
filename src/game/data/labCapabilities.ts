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
  /** Wave 34 (G6.2) · the springboard prop oc6096b5's own flag */
  canLaunch?: boolean;
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
  // Wave 34 (G6.2) · the skeleton-display prop oc6095-1 and the springboard
  // oc6096b5, promoted from static decoration to real interactables.
  hasSkeleton?: boolean;
  hasStandSpot?: boolean;
  hasFlags?: boolean;
  hasFlames?: boolean;
  hasSpringboard?: boolean;
  /** the lab itself isn't sure which part is the actual launch mechanism on
   *  oc6096b5 — the player-jump-boost interaction sidesteps this by never
   *  needing to identify or animate a specific launching part */
  launchPartUncertain?: boolean;
  rigScope?: string;
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

/**
 * Wave 29 · a small IN-REPO patch layer over the fetched capabilities.json.
 *
 * That file is a build artifact (`/public/assets/`, gitignored — see the
 * repo's own asset-pipeline note there) regenerated wholesale by
 * scripts/prepare-assets.mjs (also gitignored) from the lab's own external
 * PAK_ASSET_CAPABILITIES.json/PAK_CAPABILITY_OVERRIDES.json — files that live
 * in the sibling lab repo, not here. A hand-edit straight to capabilities.json
 * would work locally for exactly as long as nobody re-runs that pipeline on
 * any machine, then silently vanish — not a durable fix this repo can ship.
 * This function is the durable version of the same "override always wins"
 * rule PAK_CAPABILITY_OVERRIDES.json itself already follows one layer up,
 * just moved into tracked source for the handful of corrections this
 * content-authoring wave found and could verify against real rig data
 * (part_roles.json) but couldn't get the external lab tool to re-seed.
 */
function applyLocalOverrides(caps: Record<string, LabCapability>) {
  // The Signal Cannon promotion (buildables.ts) needs `12_l3207401` to read
  // as a real firing siege engine. Its rig is lab-verified (part_roles.json:
  // rigClass 'cannon', status 'verified', parts base/barrel/plunger) but its
  // capabilities.json entry was still the generic auto-seeded 'workshop'
  // shape (kind:'workshop', rigClass:'none') — the rig layer identified it,
  // the capability layer never got updated. Given `kind: 'vehicle'` with a
  // real `traits.vehicle`, not the 'wall'-kind shape c3_cannon/oc6096b4 use
  // below — see their own comment for why that shape doesn't actually work.
  caps['12_l3207401'] = {
    kind: 'vehicle',
    displayName: 'Signal Cannon 12_l3207401 (compact wall gun, verified rig)',
    rigClass: 'cannon',
    rigStatus: 'verified',
    traits: {
      vehicle: {
        isSiegeEngine: true, isStationary: true, canFire: true,
        hasProjectile: true, damagesWalls: true, damagesVehicles: true,
        siegeRole: 'cannon',
      },
    },
    interaction: {
      isMovable: false, isRotatable: false, isDeletable: false, isDestructible: true,
      isPaintable: false, isDriveable: false, isSelectable: true,
      canGrab: false, canWear: false, canSeat: false, canStandOn: false, canFire: true,
    },
    sockets: {
      origin: 'root',
      baseplate: '005_L_3207401_PART_3',
      cannon_barrel: '015_L_3207400',
      cannon_ball: '010_OC_6096B4_Plunger',
    },
    seedSource: 'verified',
  };

  // Bonus fix found while wiring the above: `c3_cannon`/`oc6096b4` (the
  // "Cannon"/"Wall Cannon" buildables already in the game) carry an
  // `isCannon: true` / `structureKind: 'stationary_cannon'` shape under
  // `traits.wall` — but neither `isCannon` nor `structureKind` is read by
  // ANY predicate in this file, and `labCanFire` only ever checks
  // `traits.vehicle?.canFire ?? interaction.canFire` — so `oc6096b4` (which
  // isn't the hardcoded `b.type === 'cannon'` bypass Emplacements.tsx/
  // PlayerController.tsx special-case) never actually auto-fires or
  // manually fires today, unlike its 8 SIEGE siblings. Adding the same real
  // `traits.vehicle` shape the working siege engines use — additively,
  // alongside their existing `traits.wall` data, which nothing here removes
  // — fixes that using the exact mechanism the game already relies on for
  // every other siege piece, rather than inventing a second one.
  for (const id of ['c3_cannon', 'oc6096b4']) {
    const c = caps[id];
    if (!c) continue;
    c.traits.vehicle = {
      ...c.traits.vehicle,
      isSiegeEngine: true, isStationary: true, canFire: true,
      hasProjectile: true, damagesWalls: true, damagesVehicles: true,
      siegeRole: 'cannon',
    };
  }

  // Wave 35 (G3/G4) · three dormant manual-turret structures (oc6098b1,
  // oc6098b2, oc6032b1) plus the two firing corners of the oc6098
  // castle-corner family (oc6098-3's catapult, oc6098-5's crossbows) — all
  // five real, verified `kind:'wall'` pieces (capabilities.json) that DO
  // carry a genuine fire capability (`hasCatapult`/`canFireCatapult`,
  // `hasCrossbows`/`canFireCrossbow`, or oc6032b1's `canUseAsTurret` +
  // `hasThroneSeat`), but that capability lives under `traits.wall`/
  // `interaction.canFire*` — fields `labCanFire`/`labCanOccupy` never read
  // (see c3_cannon/oc6096b4's own comment above for the first time this
  // exact nesting mismatch was found). Same additive fix, applied per-piece
  // rather than in one shared loop since each needs its own siegeRole/
  // occupyMode: oc6032b1 is the SECOND `occupyMode:'seated'` piece in the
  // game (the wheeled crossbow oc4806b2 is the first and, until now, only
  // one — see labOccupyMode's own comment), the rest stand like the other
  // eight standing engines.
  const WALL_FIRE_OVERRIDES: Record<string, Partial<LabVehicleTraits>> = {
    oc6098b1: { siegeRole: 'catapult', occupyMode: 'standing' },
    oc6098b2: { siegeRole: 'crossbow_emplacement', occupyMode: 'standing' },
    oc6032b1: { siegeRole: 'turret', occupyMode: 'seated' },
    'oc6098-3': { siegeRole: 'catapult', occupyMode: 'standing' },
    'oc6098-5': { siegeRole: 'crossbow_emplacement', occupyMode: 'standing' },
  };
  for (const [id, role] of Object.entries(WALL_FIRE_OVERRIDES)) {
    const c = caps[id];
    if (!c) continue;
    c.traits.vehicle = {
      ...c.traits.vehicle,
      isSiegeEngine: true, isStationary: true, canFire: true,
      hasProjectile: true, damagesWalls: true, damagesVehicles: true,
      canOccupy: true,
      ...role,
    };
  }
}

let warm: Record<string, LabCapability> = {};
let promise: Promise<Record<string, LabCapability>> | null = null;

export function loadCapabilities(): Promise<Record<string, LabCapability>> {
  if (!promise) {
    promise = fetch('/assets/rigs/capabilities.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, LabCapability>) => {
        applyLocalOverrides(d);
        warm = d;
        return d;
      })
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

/** a prop the rig lab found a real launch mechanism on (oc6096b5's
 *  springboard) — mirrors labCanFire's shape so any future piece the lab
 *  charts the same way lights up automatically, without a per-id branch. */
export function labCanLaunch(assetId: string | undefined): boolean {
  return !!capOf(assetId)?.interaction.canLaunch;
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
