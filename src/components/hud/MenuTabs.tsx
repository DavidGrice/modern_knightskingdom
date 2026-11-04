'use client';
// One-stop-shop tab bar (Phase 22): the six "menu family" panels share this
// header, so opening any of them (I is the front door) reads as one tabbed
// menu — hop between Satchel/Crafting/Quests/Abilities/Roster/Lore without
// closing. The old hotkeys still deep-link straight to their tab; contextual
// panels (dialogue, shop, travel, parley, guild hall, emotes) stay standalone.
import { useGameStore, type PanelId } from '@/game/store/gameStore';
import { useAppStore } from '@/game/store/appStore';
import { codeLabel } from '@/game/data/keybinds';
import Ico from '../ui/Ico';

// F-10a · each tab's chip names the key its action is bound to now, not the default
const TABS: { id: PanelId; icon: string; label: string; action: string }[] = [
  { id: 'inventory', icon: '🎒', label: 'Satchel', action: 'inventory' },
  { id: 'crafting', icon: '🔨', label: 'Crafting', action: 'craft' },
  { id: 'quests', icon: '📜', label: 'Quests', action: 'quests' },
  { id: 'skills', icon: '⭐', label: 'Abilities', action: 'skills' },
  { id: 'villagers', icon: '👥', label: 'Roster', action: 'roster' },
  { id: 'chronicle', icon: '📖', label: 'Lore', action: 'lore' },
];

export default function MenuTabs() {
  const panel = useGameStore((s) => s.panel);
  const setPanel = useGameStore((s) => s.setPanel);
  const keybinds = useAppStore((s) => s.settings.keybinds);
  return (
    <div className="menu-tabs">
      {TABS.map((t) => (
        <button key={t.id} className={panel === t.id ? 'active' : ''} onClick={() => setPanel(t.id)}>
          <span className="mt-icon"><Ico e={t.icon} /></span> {t.label} <span className="mt-key">{codeLabel(keybinds[t.action])}</span>
        </button>
      ))}
    </div>
  );
}
