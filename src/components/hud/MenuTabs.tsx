'use client';
// One-stop-shop tab bar (Phase 22): the six "menu family" panels share this
// header, so opening any of them (I is the front door) reads as one tabbed
// menu — hop between Satchel/Crafting/Quests/Abilities/Roster/Lore without
// closing. The old hotkeys still deep-link straight to their tab; contextual
// panels (dialogue, shop, travel, parley, guild hall, emotes) stay standalone.
import { useGameStore, type PanelId } from '@/game/store/gameStore';
import Ico from '../ui/Ico';

const TABS: { id: PanelId; icon: string; label: string; hint: string }[] = [
  { id: 'inventory', icon: '🎒', label: 'Satchel', hint: 'I' },
  { id: 'crafting', icon: '🔨', label: 'Crafting', hint: 'C' },
  { id: 'quests', icon: '📜', label: 'Quests', hint: 'J' },
  { id: 'skills', icon: '⭐', label: 'Abilities', hint: 'K' },
  { id: 'villagers', icon: '👥', label: 'Roster', hint: 'N' },
  { id: 'chronicle', icon: '📖', label: 'Lore', hint: 'L' },
];

export default function MenuTabs() {
  const panel = useGameStore((s) => s.panel);
  const setPanel = useGameStore((s) => s.setPanel);
  return (
    <div className="menu-tabs">
      {TABS.map((t) => (
        <button key={t.id} className={panel === t.id ? 'active' : ''} onClick={() => setPanel(t.id)}>
          <span className="mt-icon"><Ico e={t.icon} /></span> {t.label} <span className="mt-key">{t.hint}</span>
        </button>
      ))}
    </div>
  );
}
