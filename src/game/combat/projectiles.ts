'use client';
// CLN-11 · split out of game/combat.ts unchanged: bolts, arrows and the caster's spell bolt — firing them, and the
// one step function that flies them into a wall, an enemy, the ram, the ladder, or the player.
import { create } from 'zustand';
import { audio } from '@/lib/audio';
import type { RigJoint } from '@/lib/minifigRig';
import { useGameStore } from '../store/gameStore';
import { playerState } from '../playerState';
import { ridingState } from '../riding';
import { raiderRamState, RAM_RADIUS } from '../raiderRam';
import { raiderLadderState, LADDER_RADIUS } from '../raiderLadder';
import { hitTestCharacter, PART_DAMAGE, PART_LABEL, type PartHit } from '../hitbox';
import { hasLineOfSight, GROUND_LOS_Y } from '../navgrid';
import { emitSound, SOUND_LOUDNESS } from '@/ai/perception/sounds';
import { enemyBeliefId } from '@/ai/perception/Belief';
import { MOUNT_SEAT_Y } from '../data/enemies';
import { combatState, onBattlement } from './state';
import { useEnemyStore, type EnemyData } from './enemyStore';
import { damagePlayer } from './playerDamage';
import { resolveEnemyKill } from './kill';
import { SHIELD_REDUCTION, isFrontalHit } from './shield';
import { hitRaiderLadder, hitRaiderRam } from './structures';

// ---- crossbow bolts ----

export interface Bolt {
  id: number;
  kind: 'bolt' | 'arrow' | 'spell';
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  age: number;
  damage: number;
  /** Wave 37 (A3 remainder) · true only for a caster's own spell bolt.
   *  stepBolt is otherwise built exclusively player-vs-enemy (it tests the
   *  flight segment against useEnemyStore().enemies and never calls
   *  damagePlayer at all) — this flag is what branches a hostile bolt to a
   *  simple segment-vs-player-point test instead, calling damagePlayer(b.damage)
   *  directly, which also means the player's own shield-block and armor
   *  reduction apply for free (damagePlayer already owns that logic). */
  hostile?: boolean;
  /** age at which the shaft lodged, so a corpse's bolts linger briefly
   *  rather than vanishing the instant the mob starts its death animation */
  stuckAt?: number;
  /** set on impact: the shaft stops dead and rides the struck character.
   *  `local` is the impact point in that figure's own frame, so the bolt
   *  follows the limb it hit without re-solving anything per frame. */
  stuck?: {
    mobId: number;
    part: RigJoint;
    local: { x: number; y: number; z: number };
    /** flight direction at impact, kept so the shaft still points the way
     *  it was travelling instead of snapping to the mob's facing */
    dir: { x: number; y: number; z: number };
  };
}

let boltSeq = 1;

interface BoltStore {
  bolts: Bolt[];
  add: (b: Bolt) => void;
  remove: (id: number) => void;
}

export const useBoltStore = create<BoltStore>((set, get) => ({
  bolts: [],
  add: (b) => set({ bolts: [...get().bolts, b] }),
  remove: (id) => set({ bolts: get().bolts.filter((x) => x.id !== id) }),
}));

/** fire a crossbow bolt along the camera direction; consumes one bolt item */
/**
 * L62 · How high above the ground a shot leaves your hands. Mounted, that is
 * the saddle plus your own height, not the 1.45m of a man standing — bolts
 * and arrows used to leave from the horse's shoulder while you aimed from a
 * metre higher, so a level shot from the saddle went into the ground.
 */
function muzzleHeight(): number {
  return ridingState.active ? 2.35 : 1.45;
}

export function fireBolt(): boolean {
  const st = useGameStore.getState();
  if ((st.inventory.crossbow ?? 0) < 1) return false;
  if ((st.inventory.bolt ?? 0) < 1) {
    st.notify('Out of bolts! Craft more at the workbench.');
    audio.play('brick_collide', 0.4);
    return false;
  }
  st.addItems({ bolt: -1 });
  const cp = Math.cos(playerState.pitch);
  const dir = {
    x: -Math.sin(playerState.yaw) * cp,
    y: Math.sin(playerState.pitch),
    z: -Math.cos(playerState.yaw) * cp,
  };
  const speed = 30;
  useBoltStore.getState().add({
    id: boltSeq++,
    kind: 'bolt',
    pos: {
      x: playerState.x + dir.x * 0.6,
      y: playerState.y + muzzleHeight() + dir.y * 0.6,
      z: playerState.z + dir.z * 0.6,
    },
    vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    age: 0,
    // A bolt is a spent crafted item fired from a slow, single-shot weapon,
    // so it should hit meaningfully harder than a free sword swing (3): one
    // shot drops a skeleton, two drop a bandit. The battlement bonus stays
    // proportional rather than a flat +1.
    damage: 7 * (onBattlement() ? 1.25 : 1) * (st.perks.includes('quick_draw') ? 1.2 : 1),
  });
  combatState.attackAt = performance.now();
  audio.play('crossbow', 0.8);
  return true;
}

/** min fraction of a full draw needed for the longbow to loose at all */
export const MIN_DRAW = 0.18;

/** seconds of holding LMB for a 100%-power longbow draw */
export const FULL_DRAW_TIME = 1.1;

/** fire a longbow arrow; power in [0,1] scales speed, range and damage.
 *  consumes one arrow item. Returns false (no shot, no consumption) if the
 *  draw was released too early or ammo is out. */
export function fireArrow(power: number): boolean {
  const st = useGameStore.getState();
  if ((st.inventory.longbow ?? 0) < 1) return false;
  if (power < MIN_DRAW) return false;
  if ((st.inventory.arrow ?? 0) < 1) {
    st.notify('Out of arrows! Craft more at the workbench.');
    audio.play('brick_collide', 0.4);
    return false;
  }
  st.addItems({ arrow: -1 });
  const cp = Math.cos(playerState.pitch);
  const dir = {
    x: -Math.sin(playerState.yaw) * cp,
    y: Math.sin(playerState.pitch),
    z: -Math.cos(playerState.yaw) * cp,
  };
  const speed = 26 + power * 20; // 26..46, faster than a bolt at full draw
  useBoltStore.getState().add({
    id: boltSeq++,
    kind: 'arrow',
    pos: {
      x: playerState.x + dir.x * 0.6,
      y: playerState.y + muzzleHeight() + dir.y * 0.6,
      z: playerState.z + dir.z * 0.6,
    },
    vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    age: 0,
    // 6..16 across the draw: a snap shot is worse than a bolt, a full draw
    // is the strongest single hit in the game — which is the point of a
    // weapon that makes you stand still to use it. +25% from a battlement.
    damage: (6 + power * 10) * (onBattlement() ? 1.25 : 1) * (st.perks.includes('quick_draw') ? 1.2 : 1),
  });
  combatState.attackAt = performance.now();
  audio.play('longbow', 0.85);
  return true;
}

/** how close a hostile bolt has to come to the player to land — the player
 *  has no per-part hitbox registry (game/hitbox.ts only ever covers ENEMY
 *  donors; every other attack on the player so far has been a melee swing or
 *  a silent hit-scan, neither of which needed one), so a simple point radius
 *  stands in, same shape as raiderRam's own RAM_RADIUS just below. */
const HOSTILE_BOLT_HIT_RADIUS = 0.6;

/**
 * Wave 37 (A3 remainder) · the caster's own ranged attack. No magic/VFX
 * precedent exists anywhere in this codebase (no particle system, no "magic"
 * asset in the catalog) — the two existing ranged shapes are the player's own
 * travelling Bolt/Cannonball projectiles and a silent hit-scan (ranged
 * bandits/Defenders: straight to damagePlayer, no object in the world at
 * all). Reskinning the Bolt system is the honest middle ground: a REAL,
 * visible travelling projectile (Bolts.tsx's own 'spell' render branch)
 * using the exact same store/physics every other bolt already gets, rather
 * than inventing a whole new particle system for one enemy kind or falling
 * back to ANOTHER invisible hit-scan.
 *
 * Sibling to fireBolt/fireArrow above, but takes `damage` as a parameter —
 * Enemies.tsx's own AI branch owns the actual number (mirrors how RANGED_DMG
 * lives beside the ranged-bandit AI that fires it, not in this module).
 */
export function fireSpellBolt(e: EnemyData, damage: number): void {
  // GROUND_LOS_Y ("the body height a ground-standing figure already
  // occupies") stands in for both the caster's own casting-hand height and,
  // added to the player's own foot-height `playerState.y`, roughly the
  // player's centre mass — reusing the one constant this codebase already
  // has for "a standing figure's own body height" rather than inventing a
  // second one.
  const ox = e.mob.x, oy = GROUND_LOS_Y, oz = e.mob.z;
  const dx = playerState.x - ox;
  const dy = (playerState.y + GROUND_LOS_Y) - oy;
  const dz = playerState.z - oz;
  const len = Math.hypot(dx, dy, dz) || 1;
  const speed = 22;
  useBoltStore.getState().add({
    id: boltSeq++,
    kind: 'spell',
    hostile: true,
    pos: { x: ox, y: oy, z: oz },
    vel: { x: (dx / len) * speed, y: (dy / len) * speed, z: (dz / len) * speed },
    age: 0,
    damage,
  });
  // no dedicated spell SFX exists in the extracted bank (lib/audio.ts's
  // SOUNDS) — 'lightning' is the closest "something just loosed" cue that
  // isn't a gunpowder bang or a mundane weapon sound
  audio.play('lightning', 0.5);
}

/** advance one bolt; returns true when it should despawn */
export function stepBolt(b: Bolt, dt: number): boolean {
  const st = useGameStore.getState();
  b.age += dt;
  // Already lodged in someone: stop simulating flight entirely. Bolts.tsx
  // drives its transform from the mob it hit. It clears when that mob is
  // gone, or after a while if the corpse has already been cleaned up.
  if (b.stuck) {
    const owner = useEnemyStore.getState().enemies.find((e) => e.id === b.stuck!.mobId);
    return !owner || owner.mob.state === 'dying' ? b.age > (b.stuckAt ?? 0) + 2.5 : false;
  }
  b.vel.y -= 4.5 * dt; // gentle drop
  const nx = b.pos.x + b.vel.x * dt;
  const ny = b.pos.y + b.vel.y * dt;
  const nz = b.pos.z + b.vel.z * dt;
  // Wave 20 · a shaft that would have to pass through a wall/building this
  // frame stops right there instead, lodged in whatever it hit — the same
  // real 3D obstacle boxes findPath routes around (game/navgrid.ts's
  // hasLineOfSight), tested against this frame's own segment rather than a
  // new field on Bolt. Because it is a true 3D box test using each box's
  // real yBase/yTop (not the flattened 2D nav grid), a battlement shot's
  // early segments — well above the wall's own yTop, since muzzleHeight()
  // above adds +1.45m to a standing surface already at the wall's own top —
  // never register as blocked, so the elevated-archery mechanic survives.
  if (!hasLineOfSight(b.pos.x, b.pos.y, b.pos.z, nx, ny, nz, st.destination ?? null)) {
    audio.play('brick_collide', 0.5);
    return true; // despawns — lodged in whatever it hit
  }
  // Wave 37 (A3 remainder) · a hostile bolt (the caster's own spell) is
  // fired AT the player, so it tests THIS frame's flight segment against
  // the player's own position instead of the enemy roster below — closest
  // point on the segment to a fixed point, tested against a hit radius,
  // the same shape the raiderRam segment check further down this function
  // already uses.
  if (b.hostile) {
    const dx = nx - b.pos.x, dy = ny - b.pos.y, dz = nz - b.pos.z;
    const len2 = dx * dx + dy * dy + dz * dz || 1;
    const py = playerState.y + GROUND_LOS_Y;
    let t = ((playerState.x - b.pos.x) * dx + (py - b.pos.y) * dy + (playerState.z - b.pos.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = b.pos.x + dx * t, ppy = b.pos.y + dy * t, pz = b.pos.z + dz * t;
    const d2 = (px - playerState.x) ** 2 + (ppy - py) ** 2 + (pz - playerState.z) ** 2;
    if (d2 < HOSTILE_BOLT_HIT_RADIUS * HOSTILE_BOLT_HIT_RADIUS) {
      damagePlayer(b.damage);
      audio.play('thud', 0.6);
      return true;
    }
    b.pos.x = nx; b.pos.y = ny; b.pos.z = nz;
    return b.pos.y <= 0.05 || b.age > 3;
  }
  // Segment-vs-enemy, tested against that donor's REAL per-part volumes
  // (game/hitbox.ts, measured from the assembled rig). This replaces a
  // single 0.55m sphere parked at a fixed chest height, which both let a
  // shot that visibly missed still connect and made a head shot worth
  // exactly as much as a shin.
  const { enemies } = useEnemyStore.getState();
  let nearest: { e: typeof enemies[number]; hit: PartHit } | null = null;
  for (const e of enemies) {
    if (e.mob.state === 'dying') continue;
    // a duel with Storm is settled sword-to-sword, not from range
    if (e.kind === 'storm') continue;
    // Wave 36 (A3): a mounted raider's rig is lifted MOUNT_SEAT_Y off the
    // ground (Enemies.tsx's own saddle wrap) — the registered per-part boxes
    // are still measured in the figure's own LOCAL frame, so without this a
    // shot aimed at the visible rider tested against an empty hitbox sitting
    // where a standing foe's would be, a full saddle-height too low.
    // Wave 58 (H4): the SAME reasoning now applies to an elevated raider —
    // `e.mob.postY` is its real wall-walk height (~3.6-4.2m), not a saddle's
    // ~1m, but the fix is identical: without it every shot at a raider on
    // the battlements tests against a hitbox still sitting at ground level,
    // metres below where the model actually renders, and never connects.
    const hit = hitTestCharacter(
      String(e.id), e.mob.x, e.mob.z, e.mob.yaw, e.mob.postY ?? (e.kind === 'mountedRaider' ? MOUNT_SEAT_Y : 0),
      b.pos.x, b.pos.y, b.pos.z, nx, ny, nz,
    );
    if (!hit) continue;
    if (!nearest || hit.t < nearest.hit.t) nearest = { e, hit };
  }
  {
    const e = nearest?.e;
    const hit = nearest?.hit;
    if (e && hit) {
      const mult = PART_DAMAGE[hit.part] ?? 1;
      const raw = b.damage * mult;
      // Wave 37 (A3 remainder) · the same frontal block a melee swing
      // already respects — blocked from range too, deliberately (see
      // isFrontalHit's own comment (shield.ts) for why melee+ranged both count).
      const dealt = (e.kind === 'shieldedElite' && isFrontalHit(e.mob.yaw, e.mob.x, e.mob.z, playerState.x, playerState.z))
        ? raw * SHIELD_REDUCTION : raw;
      e.hp -= dealt;
      audio.play('thud', 0.7);
      // NPC_AI_SPEC §6.2 — the ranged counterpart of landMeleeHit's own
      // emission. Quieter than a melee exchange (a shaft landing is one thud,
      // not a running fight), but it still gives the struck mob away.
      emitSound(e.mob.x, e.mob.z, SOUND_LOUDNESS.boltHit, 'combat',
        enemyBeliefId(e.id), st.destination ?? null);
      // the shaft stops in the wound and rides the body from here on
      const inv = 1 / (Math.hypot(b.vel.x, b.vel.y, b.vel.z) || 1);
      b.stuckAt = b.age;
      b.stuck = {
        mobId: e.id,
        part: hit.part,
        local: hit.local,
        dir: { x: b.vel.x * inv, y: b.vel.y * inv, z: b.vel.z * inv },
      };
      if (hit.part === 'head' && e.hp > 0) {
        useGameStore.getState().notify(`${PART_LABEL[hit.part]} shot! ×${mult}`);
      }
      if (e.hp <= 0) resolveEnemyKill(e, { by: 'ranged' });
      // NOT removed: a stuck bolt stays in the world (Bolts.tsx parents it to
      // the struck mob). It expires with the corpse, not on contact.
      return false;
    }
  }
  // the raiders' ram, tested after the mobs so a raider standing in front of
  // it still soaks the shaft first
  if (raiderRamState.active && !raiderRamState.wrecked) {
    const dx = nx - b.pos.x, dy = ny - b.pos.y, dz = nz - b.pos.z;
    const len2 = dx * dx + dy * dy + dz * dz || 1;
    let t = ((raiderRamState.x - b.pos.x) * dx + (0.9 - b.pos.y) * dy + (raiderRamState.z - b.pos.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = b.pos.x + dx * t, py = b.pos.y + dy * t, pz = b.pos.z + dz * t;
    const d2 = (px - raiderRamState.x) ** 2 + (py - 0.9) ** 2 + (pz - raiderRamState.z) ** 2;
    if (d2 < RAM_RADIUS * RAM_RADIUS) {
      hitRaiderRam(b.damage);
      audio.play('thud', 0.7);
      return true;   // a shaft in timber does not ride along, it drops
    }
  }
  // Wave 58 (H4) · the siege ladder, tested the same way — after the ram so a
  // raider standing in front of it still soaks the shaft first, same reasoning
  // as the ram's own comment above. Centred at half its own 3.2m height
  // rather than the ram's low 0.9m: this is a tall standing structure, not a
  // waist-high engine.
  if (raiderLadderState.active && !raiderLadderState.wrecked) {
    const dx = nx - b.pos.x, dy = ny - b.pos.y, dz = nz - b.pos.z;
    const len2 = dx * dx + dy * dy + dz * dz || 1;
    const ladderMidY = 1.6;
    let t = ((raiderLadderState.x - b.pos.x) * dx + (ladderMidY - b.pos.y) * dy + (raiderLadderState.z - b.pos.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = b.pos.x + dx * t, py = b.pos.y + dy * t, pz = b.pos.z + dz * t;
    const d2l = (px - raiderLadderState.x) ** 2 + (py - ladderMidY) ** 2 + (pz - raiderLadderState.z) ** 2;
    if (d2l < LADDER_RADIUS * LADDER_RADIUS) {
      hitRaiderLadder(b.damage);
      audio.play('thud', 0.7);
      return true;
    }
  }
  b.pos.x = nx; b.pos.y = ny; b.pos.z = nz;
  return b.pos.y <= 0.05 || b.age > 3;
}
