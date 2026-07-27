'use client';
// Siege & training: cannon projectiles (real arcs, splash damage vs raiders)
// and quintain training hits.
import { create } from 'zustand';
import { audio } from '@/lib/audio';
import { useGameStore } from './store/gameStore';
import { useEnemyStore, damagePlayer } from './combat';
import { playerState } from './playerState';
import { labExplosive } from './data/labCapabilities';
import { labAssetId } from './data/buildables';
import { fireProp } from '@/components/world/RiggedProp';
import type { PlacedBuilding } from './types';

export interface Cannonball {
  id: number;
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
}

let ballSeq = 1;

interface SiegeStore {
  balls: Cannonball[];
  addBall: (b: Cannonball) => void;
  removeBall: (id: number) => void;
}

export const useSiegeStore = create<SiegeStore>((set, get) => ({
  balls: [],
  addBall: (b) => set({ balls: [...get().balls, b] }),
  removeBall: (id) => set({ balls: get().balls.filter((x) => x.id !== id) }),
}));

/** quintain spin impulses, keyed by building id (renderer animates toward it) */
export const quintainSpins: Record<string, number> = {};

export function quintainHit(buildingId: string, mounted: boolean) {
  const st = useGameStore.getState();
  quintainSpins[buildingId] = (quintainSpins[buildingId] ?? 0) + Math.PI * (2 + Math.random() * 2);
  st.addXp('combat', mounted ? 16 : 8);
  audio.play('sword_swish', 0.8);
  audio.play('thud', 0.5);
  if (mounted) st.notify('Mounted strike! Double training XP.');
}

/** Fire an engine. `aimYaw` is supplied when the player is CREWING it (see
 *  game/crew.ts): a manned engine shoots where you're looking instead of
 *  along the quarter-turn it happened to be placed at. */
export function fireCannon(cannon: PlacedBuilding, aimYaw?: number) {
  const st = useGameStore.getState();
  if ((st.inventory.stone ?? 0) < 1) return;
  st.addItems({ stone: -1 });
  // swing the throwing arm on any piece the rig lab charted one for
  // (RiggedProp reads this; a plain cannon has no arm and ignores it)
  fireProp(cannon.id);
  // a placed building's rot=0 points +Z; the player's look yaw=0 points −Z,
  // so a crewed shot flips the sign rather than fighting either convention
  const yaw = aimYaw ?? (cannon.rot * Math.PI) / 2;
  const s = aimYaw === undefined ? 1 : -1;
  const dx = s * Math.sin(yaw);
  const dz = s * Math.cos(yaw);
  useSiegeStore.getState().addBall({
    id: ballSeq++,
    pos: { x: cannon.x + dx * 1.2, y: (cannon.y ?? 0) + 1.1, z: cannon.z + dz * 1.2 },
    vel: { x: dx * 17, y: 4.5, z: dz * 17 },
  });
  audio.play('cannon', 0.9);
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkFire = fireCannon;
}

/** explode a ball: splash damage to enemies AND any building caught in the
 *  blast (the cannon doesn't discriminate — mind where you aim it). */
export function explodeBall(ball: Cannonball) {
  audio.play('explosion', 0.85);
  const st = useGameStore.getState();
  const { enemies } = useEnemyStore.getState();
  let hits = 0;
  for (const e of enemies) {
    if (e.mob.state === 'dying') continue;
    const d = Math.hypot(e.mob.x - ball.pos.x, e.mob.z - ball.pos.z);
    if (d > 4.5) continue;
    e.hp -= 6;
    hits++;
    if (e.hp <= 0) {
      e.mob.state = 'dying';
      e.mob.dieT = 0;
      st.recordKill(e.kind);
      st.addXp('combat', e.kind === 'skeleton' ? 20 : 30);
      st.notify(`${e.kind === 'skeleton' ? 'Skeleton' : 'Bandit'} blasted!`, true);
    }
  }
  if (hits > 0) st.addXp('combat', 5);
  for (const b of st.buildings) {
    const d = Math.hypot(b.x - ball.pos.x, b.z - ball.pos.z);
    if (d > 3.2) continue;
    st.damageBuilding(b.id, 18, 'was blasted');
  }
  useSiegeStore.getState().removeBall(ball.id);
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkExplode = explodeBall;
}

/**
 * Set off a placed explosive (2026-07-20, from the rig lab's
 * `traits.explosive`: four charges in the extraction the game never used).
 * Bigger and nastier than a cannonball — that's the point of hauling one up
 * to a wall — and it consumes itself. `damagesWalls`/`damagesVehicles` come
 * from the lab entry rather than being assumed, so a future charge that only
 * hurts one or the other behaves correctly for free.
 */
export function detonate(charge: PlacedBuilding) {
  const st = useGameStore.getState();
  const traits = labExplosive(labAssetId(charge.type));
  const x = charge.x;
  const z = charge.z;
  audio.play('explosion', 1);
  const { enemies } = useEnemyStore.getState();
  for (const e of enemies) {
    if (e.mob.state === 'dying') continue;
    if (Math.hypot(e.mob.x - x, e.mob.z - z) > 6.5) continue;
    e.hp -= 14;
    if (e.hp <= 0) {
      e.mob.state = 'dying';
      e.mob.dieT = 0;
      st.recordKill(e.kind);
      st.addXp('combat', 30);
    }
  }
  // the charge itself always goes; everything else only if the lab says this
  // charge damages structures
  if (traits?.damagesWalls !== false) {
    for (const b of st.buildings) {
      if (b.id === charge.id) continue;
      if (Math.hypot(b.x - x, b.z - z) > 5) continue;
      st.damageBuilding(b.id, 45, 'was blown apart');
    }
  }
  // caught in your own blast
  if (Math.hypot(playerState.x - x, playerState.z - z) < 4.5) damagePlayer(2);
  st.removeBuilding(charge.id, true);
  st.notify('💥 The charge goes off!', true);
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkDetonate = detonate;
}

// ---- the pushable battering ram (see game/carts.ts for the shared
// push/hitch state both this and PlayerController read/write) ----
let lastRamHitAt = 0;

/** the battering ram bashes whatever it's shoved into: a shut gate is forced
 *  open, anything else takes splash-free structural damage — gated by a
 *  cooldown so bumping against something doesn't melt it in one frame. */
export function ramCheck(rammerId: string, x: number, z: number) {
  const now = performance.now();
  if (now - lastRamHitAt < 900) return;
  const st = useGameStore.getState();
  for (const b of st.buildings) {
    if (b.id === rammerId) continue;
    const d = Math.hypot(b.x - x, b.z - z);
    if (d > 2.1) continue;
    lastRamHitAt = now;
    audio.play('thud', 0.85);
    if (b.type === 'gate') {
      if (st.gateOpen[b.id] ?? true) continue; // already open — nothing to ram
      st.toggleGate(b.id);
      st.notify('The ram splinters the gate open!', true);
    } else {
      st.damageBuilding(b.id, 12, 'was rammed');
    }
    return;
  }
}
