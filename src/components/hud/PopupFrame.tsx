'use client';
// The standalone (non-tabbed) panel shell: a fixed-min-width parchment with the ✕ close button. The tabbed
// one-stop-menu shell is PanelFrame.
import { useGameStore } from '@/game/store/gameStore';

export default function PopupFrame({ minWidth, children }: { minWidth: string; children: React.ReactNode }) {
  const setPanel = useGameStore((s) => s.setPanel);
  return (
    <div className="game-panel clickable" style={{ minWidth }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      {children}
    </div>
  );
}
