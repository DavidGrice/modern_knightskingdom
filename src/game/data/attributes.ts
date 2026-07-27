// Villager attributes (Phase 24A): five innate stats per villager, rolled
// DETERMINISTICALLY from the villager id — the same villager always has the
// same nature, so nothing needs storing or migrating (old saves just work).
// What IS stored is tradeXp (Villager.tradeXp): mutable per-trade mastery
// earned by actually working, kept per job so a veteran lumberjack switched
// to mining starts that trade green but keeps their axe mastery.
import type { ItemId, Villager, VillagerJob } from '../types';

export type AttrId = 'might' | 'diligence' | 'craft' | 'courage' | 'wit';

export const ATTRS: { id: AttrId; label: string; icon: string; blurb: string }[] = [
  { id: 'might', label: 'Might', icon: '💪', blurb: 'chance to haul a double load' },
  { id: 'diligence', label: 'Diligence', icon: '⏳', blurb: 'works trips faster' },
  { id: 'craft', label: 'Craft', icon: '✋', blurb: 'chance of bonus side-goods' },
  { id: 'courage', label: 'Courage', icon: '🦁', blurb: 'defender strike weight' },
  { id: 'wit', label: 'Wit', icon: '🧠', blurb: 'merchant haggling, scout eyes' },
];

function hash(s: string, salt: number): number {
  let h = salt >>> 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 1–10, stable per villager id. ~8% of rolls are "gifted" (9–10). */
export function attrsOf(id: string): Record<AttrId, number> {
  const out = {} as Record<AttrId, number>;
  ATTRS.forEach((a, i) => {
    const h = hash(id + a.id, 977 + i * 131);
    out[a.id] = h % 100 < 8 ? 9 + (h % 2) : 2 + (h % 7);
  });
  return out;
}

export function tradeXpOf(v: Villager, job: VillagerJob): number {
  return v.tradeXp?.[job] ?? 0;
}

/** 25 xp → Lv1, 100 → Lv2, 225 → Lv3… (+10 xp per completed trip) */
export function tradeLevelOf(v: Villager, job: VillagerJob): number {
  return Math.floor(Math.sqrt(tradeXpOf(v, job) / 25));
}

/** Trip-duration multiplier: Diligence ±2.5%/point around 5, trade mastery
 *  −2%/level, floored at 0.55× — a gifted veteran works nearly twice as fast. */
export function tripSpeedMult(v: Villager): number {
  const a = attrsOf(v.id);
  const lvl = v.job === 'idle' ? 0 : tradeLevelOf(v, v.job);
  return Math.max(0.55, 1 - 0.025 * (a.diligence - 5) - 0.02 * lvl);
}

/** Craft side-goods: what a skilled hand brings home besides the main haul. */
export const SIDE_GOODS: Partial<Record<ItemId, ItemId>> = {
  wood: 'flowers',
  stone: 'iron_ore',
  wheat: 'herb',
};
