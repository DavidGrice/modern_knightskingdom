import type { SkillId } from '../types';
import { SKILLS, levelFromXp } from './ranks';

// Deeds: checked against a snapshot of the game state; awarded once, saved.

export interface DeedState {
  inventory: Partial<Record<string, number>>;
  xp: Record<SkillId, number>;
  completedQuests: string[];
  buildings: { type: string }[];
  kills?: number;
  treasureOpened?: boolean;
  defeatedCedric?: boolean;
  dragonSeen?: boolean;
  dragonSieges?: number;
  dragonRouted?: boolean;
  cedricSieges?: number;
  cedricRouted?: boolean;
  reputation?: Record<string, number>;
}

export interface DeedDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (s: DeedState) => boolean;
}

const totalLevel = (s: DeedState) => SKILLS.reduce((t, sk) => t + levelFromXp(s.xp[sk.id] ?? 0), 0);

export const DEEDS: DeedDef[] = [
  { id: 'first_wood', name: 'Timber!', icon: '🪵', desc: 'Chop your first log.',
    check: (s) => (s.xp.woodcutting ?? 0) > 0 },
  { id: 'cozy', name: 'Hearth & Home', icon: '🔥', desc: 'Complete Cozy Beginnings.',
    check: (s) => s.completedQuests.includes('cozy_beginnings') },
  { id: 'ten_pieces', name: 'Master Builder', icon: '🧱', desc: 'Have 10 structures standing at once.',
    check: (s) => s.buildings.length >= 10 },
  { id: 'ironclad', name: 'Ironclad', icon: '🔩', desc: 'Smelt an iron bar.',
    check: (s) => (s.xp.smithing ?? 0) > 0 },
  { id: 'angler', name: 'Patient Angler', icon: '🎣', desc: 'Reach Fishing level 2.',
    check: (s) => levelFromXp(s.xp.fishing ?? 0) >= 2 },
  { id: 'harvest', name: 'Harvest Home', icon: '🌾', desc: 'Bring in your first wheat.',
    check: (s) => (s.xp.farming ?? 0) > 0 },
  { id: 'first_blood', name: 'Nightwatch', icon: '⚔️', desc: 'Defeat a creature of the night.',
    check: (s) => (s.xp.combat ?? 0) > 0 },
  { id: 'armed', name: 'Knight’s Arms', icon: '🛡️', desc: 'Carry a sword and a shield.',
    check: (s) => (s.inventory.sword ?? 0) > 0 && (s.inventory.shield ?? 0) > 0 },
  { id: 'sharpshooter', name: 'Sharpshooter', icon: '🏹', desc: 'Own a crossbow.',
    check: (s) => (s.inventory.crossbow ?? 0) > 0 },
  { id: 'wealthy', name: 'Merchant’s Friend', icon: '🪙', desc: 'Hold 50 gold at once.',
    check: (s) => (s.inventory.gold ?? 0) >= 50 },
  { id: 'level10', name: 'Rising Star', icon: '⭐', desc: 'Reach total level 10.',
    check: (s) => totalLevel(s) >= 10 },
  { id: 'keep', name: 'Castle Builder', icon: '🏰', desc: 'Raise the Grand Keep.',
    check: (s) => s.buildings.some((b) => b.type === 'keep') },
  { id: 'paladin', name: 'Paladin of the Realm', icon: '👑', desc: 'Complete every royal quest.',
    check: (s) => s.completedQuests.length >= 8 },
  { id: 'treasury', name: 'Royal Treasury', icon: '💰', desc: "Open the Grand Keep's treasure chest.",
    check: (s) => !!s.treasureOpened },
  { id: 'cedric_jailed', name: 'Behind Bars', icon: '🔒', desc: 'Defeat Cedric the Bull at his forest camp.',
    check: (s) => !!s.defeatedCedric },
  { id: 'storm_first_win', name: 'First Blood', icon: '⚔️', desc: 'Win a duel against Princess Storm.',
    check: (s) => (s.reputation?.storm ?? 0) >= 10 },
  { id: 'dragon_omen', name: 'The Omen', icon: '🐉', desc: 'Witness the dragon cross the night sky.',
    check: (s) => !!s.dragonSeen },
  { id: 'flame_stone', name: 'Flame and Stone', icon: '🔥', desc: 'Weather a dragonfire siege upon your homestead.',
    check: (s) => (s.dragonSieges ?? 0) >= 1 },
  { id: 'sky_sting', name: 'Sting the Sky', icon: '🏹', desc: 'Drive the dragon off with bolts before it tires of burning.',
    check: (s) => !!s.dragonRouted },
  { id: 'bull_siege', name: 'The Bull at the Gate', icon: '🐂', desc: "Weather Cedric's siege upon your homestead.",
    check: (s) => (s.cedricSieges ?? 0) >= 1 },
  { id: 'bull_routed', name: 'Gore for Gore', icon: '⚔️', desc: "Drive Cedric's war party off before he tires of the assault.",
    check: (s) => !!s.cedricRouted },
];
