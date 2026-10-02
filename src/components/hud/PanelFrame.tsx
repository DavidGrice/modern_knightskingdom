'use client';
// The shared close-button + tab-bar + title + scroll shell of the one-stop menu family.
import { useGameStore } from '@/game/store/gameStore';
import MenuTabs from './MenuTabs';

export default function PanelFrame({ title, lead, scrollClass, children }: {
  title: React.ReactNode; lead?: React.ReactNode; scrollClass?: string; children: React.ReactNode;
}) {
  const setPanel = useGameStore((s) => s.setPanel);
  // every PanelFrame user is part of the one-stop menu family, so the shared
  // tab bar rides along automatically. `title` is a ReactNode (Equip Villager passes
  // <>Equip {name}</>), and `lead` renders ahead of the close button (the Roster's PortraitFactory).
  // CLN-31 · `scrollClass` is an optional extra class on the scroll wrapper,
  // for QuestLogPanel's load-bearing `.quest-journal` (its own vellum
  // background/border/grain, plus kk-hud-widgets.css's AllegianceMeter color
  // re-point) -- every other caller omits it and gets the plain wrapper.
  return (
    <div className="game-panel clickable menu-family">
      {lead}
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <MenuTabs />
      <h2>{title}</h2>
      <div className={scrollClass ? `${scrollClass} panel-scroll` : 'panel-scroll'}>{children}</div>
    </div>
  );
}
