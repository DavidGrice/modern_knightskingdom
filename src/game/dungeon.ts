// Procedural dungeon (Phase 17): a fresh room layout generated on entry, laid
// out along a single corridor for simplicity — a chain of entry -> N combat
// rooms -> boss room. Kept in a mutable leaf module (not the zustand store,
// and not persisted) since it's ephemeral generated-world state, exactly
// like `raiderRamState`/`cartState` — DungeonScene.tsx reads it to render,
// PlayerController.tsx reads it for wall collision, Enemies.tsx reads/writes
// room-cleared state as spawned enemies die.
import type { EnemyKind } from './combat';

export const ROOM_SIZE = 12;
export const CORRIDOR_LENGTH = 8;
export const WALL_LEN = 4; // matches the stonewall buildable's real width
export const WALL_THICK = 2;
const SPACING = ROOM_SIZE + CORRIDOR_LENGTH;

export interface DungeonWall {
  x: number;
  z: number;
  rot: 0 | 1; // 0 = runs east-west (wide along X), 1 = runs north-south
}

export interface DungeonRoom {
  index: number;
  cx: number;
  cz: number;
  isEntry: boolean;
  isBoss: boolean;
  enemyKind: EnemyKind;
  enemyCount: number;
  spawned: boolean;
  cleared: boolean;
}

export interface DungeonLayout {
  seed: number;
  origin: { x: number; z: number };
  rooms: DungeonRoom[];
  walls: DungeonWall[];
  entryPos: { x: number; z: number };
  rewarded: boolean;
}

export const dungeonState: { layout: DungeonLayout | null } = { layout: null };

/** gates entry to the Sealed Crypt — a mid/late-game system, not something a
 *  fresh Peasant should stumble into (Knight's Arms = Knight rank) */
export const DUNGEON_UNLOCK_QUEST = 'knights_arms';

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkdungeon = dungeonState;
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** hard-code the dungeon origin far from anything else (see data/worlds.ts's
 *  'dungeon' WorldDestination entry, which reuses this for its own bound) */
export const DUNGEON_ORIGIN = { x: 4200, z: 4200 };

export function generateDungeonLayout(): DungeonLayout {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const rnd = mulberry32(seed);
  const roomCount = 4 + Math.floor(rnd() * 3); // 4-6 combat rooms + 1 boss room
  const totalRooms = roomCount + 1;
  const rooms: DungeonRoom[] = [];
  const walls: DungeonWall[] = [];

  for (let i = 0; i < totalRooms; i++) {
    const isEntry = i === 0;
    const isBoss = i === totalRooms - 1;
    const cx = DUNGEON_ORIGIN.x + i * SPACING;
    const cz = DUNGEON_ORIGIN.z;
    const hasPrev = i > 0;
    const hasNext = i < totalRooms - 1;

    // north/south walls: always fully closed, 3 segments each
    for (const dz of [-ROOM_SIZE / 2, ROOM_SIZE / 2]) {
      for (const dx of [-WALL_LEN, 0, WALL_LEN]) {
        walls.push({ x: cx + dx, z: cz + dz, rot: 0 });
      }
    }
    // west wall (faces the previous room): open a 4m gap if there's a
    // corridor behind this room, otherwise fully closed
    for (const dz of hasPrev ? [-WALL_LEN, WALL_LEN] : [-WALL_LEN, 0, WALL_LEN]) {
      walls.push({ x: cx - ROOM_SIZE / 2, z: cz + dz, rot: 1 });
    }
    // east wall (faces the next room): same, open if there's a corridor ahead
    for (const dz of hasNext ? [-WALL_LEN, WALL_LEN] : [-WALL_LEN, 0, WALL_LEN]) {
      walls.push({ x: cx + ROOM_SIZE / 2, z: cz + dz, rot: 1 });
    }
    // corridor flanking walls, between this room and the next
    if (hasNext) {
      for (const side of [-2, 2]) {
        for (const dx of [ROOM_SIZE / 2 + 2, ROOM_SIZE / 2 + 6]) {
          walls.push({ x: cx + dx, z: cz + side, rot: 0 });
        }
      }
    }

    let enemyKind: EnemyKind = 'skeleton';
    let enemyCount = 0;
    if (isEntry) {
      enemyCount = 0; // a safe room to get your bearings
    } else if (isBoss) {
      enemyKind = 'gilbert';
      enemyCount = 1;
    } else {
      enemyKind = rnd() < 0.55 ? 'skeleton' : 'bandit';
      enemyCount = 1 + Math.floor(rnd() * 2);
    }

    rooms.push({
      index: i, cx, cz, isEntry, isBoss, enemyKind, enemyCount,
      spawned: false, cleared: enemyCount === 0,
    });
  }

  return {
    seed, origin: { ...DUNGEON_ORIGIN }, rooms, walls,
    entryPos: { x: rooms[0].cx, z: rooms[0].cz },
    rewarded: false,
  };
}

export function resetDungeon() {
  dungeonState.layout = null;
}
