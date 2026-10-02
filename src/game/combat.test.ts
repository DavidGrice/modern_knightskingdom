import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import {
  KIND_LABEL, canChallengeStorm, combatState, cycleWeapon, damagePlayer, fireBolt, lootFor, maxHpOf, playerAttack,
  stepBolt, tryDodge, useBoltStore, useEnemyStore, type EnemyData, type EnemyKind,
} from './combat';
import { arenaState } from './arena';
import { worldEnv } from './env';
import { registerHitbox, unregisterHitbox } from './hitbox';
import { playerState } from './playerState';
import { useGameStore } from './store/gameStore';
import type { CharacterConfig } from './types';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const enemies = () => useEnemyStore.getState().enemies;

let clock = 0;
let notes: string[] = [];

/** spawn one enemy and hand it back */
function spawn(kind: EnemyKind, x: number, z: number, opts: { arena?: boolean; finalStand?: boolean; room?: number } = {}): EnemyData {
  useEnemyStore.getState().spawn(kind, x, z, false, opts.room, false, opts.finalStand ?? false, 1, opts.arena ?? false);
  return enemies()[enemies().length - 1];
}
/** swing until the given enemy falls: stamina topped up, the clock moved past each swing, and the enemy put back
 *  where it stood (every landed blow knocks it out of reach) */
function fell(e: EnemyData): void {
  const { x, z } = e.mob;
  for (let i = 0; i < 40 && e.mob.state !== 'dying'; i++) {
    combatState.stamina = combatState.maxStamina;
    e.mob.x = x; e.mob.z = z;
    playerAttack();
    clock += 400;
  }
}

beforeEach(() => {
  clock = 100_000;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  // 0.999: every loot chance below 1 fails, so a kill's haul is exactly what the test put in the purse
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  game().newGame(HERO);
  notes = [];
  useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
  Object.assign(combatState, { blocking: false, blockPressedAt: 0, iframeUntil: 0, dodgeReadyAt: 0, comboCount: 0, comboWindowUntil: 0, weapon: 'melee', meleeWeapon: 'sword', teleportTo: null });
  Object.assign(playerState, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }); // yaw 0 faces -Z
  arenaState.kills = 0;
  for (const b of [...useBoltStore.getState().bolts]) useBoltStore.getState().remove(b.id);
});
afterEach(() => { vi.restoreAllMocks(); });

describe('vitals', () => {
  it('start full, and their ceilings follow levels, perks, talents and attributes', () => {
    expect([combatState.hp, combatState.maxHp, combatState.stamina, combatState.maxStamina]).toEqual([10, 10, 100, 100]);
    useGameStore.setState({ perks: ['iron_grip'], skillTree: ['combat2'], attrSpent: { courage: 2 } } as never);
    expect(combatState.maxStamina).toBe(100 + 15 + 10 + 10);
    // a trade-off perk can lower the ceiling, and stamina above it is trimmed
    combatState.stamina = combatState.maxStamina;
    useGameStore.setState({ perks: ['berserker'], skillTree: [], attrSpent: {} } as never);
    expect(combatState.maxStamina).toBe(80);
    expect(combatState.stamina).toBe(80);
  });

  it('a new session clears the fight and refills them', () => {
    spawn('bandit', 3, 3);
    combatState.hp = 2; combatState.stamina = 5;
    game().newGame(HERO);
    expect(enemies()).toHaveLength(0);
    expect([combatState.hp, combatState.stamina]).toEqual([combatState.maxHp, combatState.maxStamina]);
  });
});

describe('the enemy store', () => {
  it('spawns at the kind\'s own health and drops a world\'s enemies when the player leaves it', () => {
    const e = spawn('bandit', 1, 1);
    expect(e.hp).toBe(maxHpOf('bandit'));
    useGameStore.setState({ destination: 'dungeon' } as never);
    spawn('skeleton', 2, 2, { room: 0 });
    expect(enemies().map((x) => x.world ?? null)).toEqual([null, 'dungeon']);
    useGameStore.setState({ destination: null } as never);
    expect(enemies().map((x) => x.kind)).toEqual(['bandit']);
  });
});

describe('damagePlayer', () => {
  it('takes the blow off, less armour', () => {
    damagePlayer(2);
    expect(combatState.hp).toBe(8);
    useGameStore.setState({ inventory: { ...game().inventory, helmet: 1 } } as never);
    damagePlayer(2);
    expect(combatState.hp).toBeCloseTo(8 - 2 * 0.9, 6);
  });

  it('a held block takes a quarter; a parry takes nothing, staggers the attacker and leaves i-frames', () => {
    useGameStore.setState({ inventory: { ...game().inventory, shield: 1 } } as never);
    combatState.blocking = true;
    combatState.blockPressedAt = clock - 5000;
    damagePlayer(4, { melee: true });
    expect(combatState.hp).toBe(9);

    const attacker = spawn('bandit', 0, -1);
    combatState.blockPressedAt = clock - 50;
    damagePlayer(4, { melee: true, attacker });
    expect(combatState.hp).toBe(9);
    expect(notes).toContain('Parry!');
    expect(attacker.mob.attackCd).toBeGreaterThanOrEqual(2.2);
    expect(attacker.mob.z).toBeLessThan(-1); // knocked back, away from the player

    combatState.blocking = false;
    damagePlayer(5);
    expect(combatState.hp).toBe(9); // still inside the parry's i-frames
    clock += 1000;
    damagePlayer(5);
    expect(combatState.hp).toBe(4);
  });

  it('a dodge costs stamina, grants i-frames and has a cooldown', () => {
    expect(tryDodge(1, 0)).toBe(true);
    expect(combatState.stamina).toBe(75);
    expect(tryDodge(1, 0)).toBe(false);
    damagePlayer(5);
    expect(combatState.hp).toBe(10);
    clock += 700;
    expect(tryDodge(0, 1)).toBe(true);
  });

  it('a knockout at home is a forced recovery: full vitals, the raid called off, dawn', () => {
    spawn('bandit', 4, 4);
    damagePlayer(999);
    expect([combatState.hp, combatState.stamina]).toEqual([combatState.maxHp, combatState.maxStamina]);
    expect(combatState.teleportTo).toEqual([0, 26]);
    expect(enemies()).toHaveLength(0);
    expect(worldEnv.time).toBe(0.27);
  });

  it('a knockout away from home also brings the player home', () => {
    useGameStore.setState({ destination: 'template-01' } as never);
    damagePlayer(999);
    expect(game().destination).toBeNull();
  });
});

describe('melee', () => {
  it('refuses a swing without the stamina for it', () => {
    combatState.stamina = 0;
    expect(playerAttack()).toBe(false);
  });

  it('a sword takes the nearest foe in front, and nobody behind', () => {
    useGameStore.setState({ inventory: { ...game().inventory, sword: 1 } } as never);
    const near = spawn('gilbert', 0, -1.4);
    const far = spawn('gilbert', 0.3, -2.1);
    const behind = spawn('gilbert', 0, 1.4);
    playerAttack();
    expect(near.hp).toBeLessThan(maxHpOf('gilbert'));
    expect(far.hp).toBe(maxHpOf('gilbert'));
    expect(behind.hp).toBe(maxHpOf('gilbert'));
  });

  it('a halberd sweeps everyone in the arc', () => {
    useGameStore.setState({ inventory: { ...game().inventory, halberd: 1 } } as never);
    combatState.meleeWeapon = 'halberd';
    const a = spawn('gilbert', -0.6, -2);
    const b = spawn('gilbert', 0.6, -2);
    playerAttack();
    expect(a.hp).toBeLessThan(maxHpOf('gilbert'));
    expect(b.hp).toBeLessThan(maxHpOf('gilbert'));
  });

  it('the third landed swing of a chain is a finisher', () => {
    useGameStore.setState({ inventory: { ...game().inventory, sword: 1 } } as never);
    const e = spawn('cedric', 0, -1.4);
    const dealt: number[] = [];
    for (let i = 0; i < 3; i++) {
      const before = e.hp;
      combatState.stamina = combatState.maxStamina;
      playerAttack();
      dealt.push(before - e.hp);
      e.mob.x = 0; e.mob.z = -1.4; // undo the knockback so every swing lands
      clock += 300;
    }
    expect(dealt[1]).toBeCloseTo(dealt[0], 6);
    expect(dealt[2]).toBeCloseTo(dealt[0] * 1.6, 6);
    expect(notes).toContain('Finishing blow!');
  });

  it('a kill pays XP, hands over what the enemy carried, and says so', () => {
    useGameStore.setState({ inventory: { ...game().inventory, sword: 1 } } as never);
    const e = spawn('bandit', 0, -1.4);
    e.inventory = { gold: 7 };
    const xp = game().xp.combat ?? 0;
    const gold = game().inventory.gold ?? 0;
    fell(e);
    expect(e.mob.state).toBe('dying');
    expect(game().xp.combat).toBeGreaterThan(xp);
    expect(game().inventory.gold).toBe(gold + 7);
    expect(notes.some((n) => n.startsWith(`${KIND_LABEL.bandit} defeated! Looted 7×`))).toBe(true);
  });

  it('an arena kill is counted, and only an arena kill', () => {
    useGameStore.setState({ inventory: { ...game().inventory, sword: 1 } } as never);
    fell(spawn('skeleton', 0, -1.4));
    expect(arenaState.kills).toBe(0);
    fell(spawn('skeleton', 0, -1.4, { arena: true }));
    expect(arenaState.kills).toBe(1);
  });

  it('the first blow ends a duel with Storm without a kill', () => {
    expect(canChallengeStorm()).toBe(true);
    const storm = spawn('storm', 0, -1.4);
    const rep = game().reputation.storm ?? 0;
    playerAttack();
    expect(enemies().find((e) => e.id === storm.id)).toBeUndefined();
    expect(game().reputation.storm).toBe(rep + 10);
    expect(canChallengeStorm()).toBe(false);
    clock += 5000;
    expect(canChallengeStorm()).toBe(true);
  });

  it('Q cycles through the weapons the player owns', () => {
    useGameStore.setState({ inventory: { ...game().inventory, sword: 1, crossbow: 1 } } as never);
    cycleWeapon();
    expect(combatState.weapon).toBe('ranged');
    expect(combatState.rangedWeapon).toBe('crossbow');
    cycleWeapon();
    expect([combatState.weapon, combatState.meleeWeapon]).toEqual(['melee', 'sword']);
  });
});

describe('bolts', () => {
  it('need a crossbow and a bolt, and spend one', () => {
    expect(fireBolt()).toBe(false);
    useGameStore.setState({ inventory: { ...game().inventory, crossbow: 1 } } as never);
    expect(fireBolt()).toBe(false);
    expect(notes).toContain('Out of bolts! Craft more at the workbench.');
    useGameStore.setState({ inventory: { ...game().inventory, bolt: 2 } } as never);
    expect(fireBolt()).toBe(true);
    expect(game().inventory.bolt).toBe(1);
    expect(useBoltStore.getState().bolts).toHaveLength(1);
  });

  it('a head shot kills, pays the ranged XP and loots the body', () => {
    useGameStore.setState({ inventory: { ...game().inventory, crossbow: 1, bolt: 3 } } as never);
    const e = spawn('skeleton', 0, -6);
    e.inventory = { gold: 3 };
    registerHitbox(String(e.id), [{ part: 'head', cx: 0, cy: 1.45, cz: 0, hx: 0.4, hy: 0.4, hz: 0.4 }] as never);
    const xp = game().xp.combat ?? 0;
    fireBolt();
    for (let i = 0; i < 60 && e.mob.state !== 'dying'; i++) for (const b of useBoltStore.getState().bolts) stepBolt(b, 1 / 60);
    unregisterHitbox(String(e.id));
    expect(e.mob.state).toBe('dying');
    expect(game().xp.combat).toBeGreaterThan(xp);
    expect(notes.some((n) => n.startsWith(`${KIND_LABEL.skeleton} shot down! Looted 3×`))).toBe(true);
  });
});

describe('loot', () => {
  it('a fallen enemy hands over its own purse; a bare kind rolls a fresh one', () => {
    const e = spawn('bandit', 0, 0);
    e.inventory = { gold: 5, bread: 1 };
    expect(lootFor(e)).toEqual({ gold: 5, bread: 1 });
    expect(lootFor('bandit')).toEqual({}); // Math.random is pinned at 0.999: every chance fails
  });
});
