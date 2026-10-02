'use client';
// CLN-11 · the nine window.__kk* handles combat publishes, gathered from where they sat between the declarations of
// game/combat.ts. Names and identities are unchanged (lib/debugHooks.ts keeps the registry).
import { exposeDebug } from '@/lib/debugHooks';
import { combatState } from './state';
import { useEnemyStore } from './enemyStore';
import { resolveDuel } from './duel';
import { damagePlayer } from './playerDamage';
import { playerAttack } from './melee';
import { fireArrow, fireBolt, useBoltStore } from './projectiles';

exposeDebug('__kkc', combatState);
// debug handle: a smoke test cannot click through pointer lock
exposeDebug('__kkfireBolt', () => fireBolt());
exposeDebug('__kke', useEnemyStore);
exposeDebug('__kkResolveDuel', resolveDuel);
exposeDebug('__kkAttack', playerAttack);
exposeDebug('__kkDamagePlayer', damagePlayer);
exposeDebug('__kkBolt', fireBolt);
exposeDebug('__kkArrow', fireArrow);
exposeDebug('__kkBolts', useBoltStore);
