'use client';
// The shared close-button + tab-bar + title + scroll shell of the one-stop menu family.
import { useGameStore } from '@/game/store/gameStore';
import MenuTabs from './MenuTabs';

export default function PanelFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const setPanel = useGameStore((s) => s.setPanel);
  // every PanelFrame user is part of the one-stop menu family, so the shared
  // tab bar rides along automatically (Roster/Lore add it in their own frames)
  return (
    <div className="game-panel clickable menu-family">
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <MenuTabs />
      <h2>{title}</h2>
      <div className="panel-scroll">{children}</div>
    </div>
  );
}
