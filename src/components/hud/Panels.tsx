'use client';
// In-game overlay panel dispatcher: one file per panel, this switch picks the one the store's `panel` field names.
import { useGameStore, type PanelId } from '@/game/store/gameStore';
import { crashIfArmed } from '@/game/crashTest';
import ErrorBoundary from '../ui/ErrorBoundary';
import EmoteWheel from './EmoteWheel';
import DialoguePanel from './DialoguePanel';
import ShopPanel from './ShopPanel';
import VillagersPanel from './VillagersPanel';
import TravelPanel from './TravelPanel';
import ChroniclePanel from './ChroniclePanel';
import NpcEquipPanel from './NpcEquipPanel';
import QuestLogPanel from './QuestLogPanel';
import BuildingMenuPanel from './BuildingMenuPanel';
import WorkshopPanel from './WorkshopPanel';
import KeepSocketPanel from './KeepSocketPanel';
import StationMenuPanel from './StationMenuPanel';
import AppearancePanel from './AppearancePanel';
import BestiaryPanel from './BestiaryPanel';
import InventoryPanel from './InventoryPanel';
import CraftingPanel from './CraftingPanel';
import SkillsPanel from './SkillsPanel';
import ParleyPanel from './ParleyPanel';
import GuildPanel from './GuildPanel';

// Quest Log moved to its own file (QuestLogPanel.tsx) — a regional parchment
// journal replacing this flat list, see that file's header comment.

export default function Panels() {
  const panel = useGameStore((s) => s.panel);
  // F-06 · a panel that throws is closed with a notice, and the game goes on; the boundary is keyed by the panel, so
  // the next one opened starts afresh
  return (
    <ErrorBoundary key={panel} name="panel" fallback={null} onError={closeBrokenPanel}>
      <Panel panel={panel} />
    </ErrorBoundary>
  );
}

function closeBrokenPanel() {
  const st = useGameStore.getState();
  st.setPanel('none');
  st.notify('That panel broke and was closed. The game goes on.');
}

function Panel({ panel }: { panel: PanelId }) {
  if (panel !== 'none') crashIfArmed('panel');
  switch (panel) {
    case 'inventory': return <InventoryPanel />;
    case 'crafting': return <CraftingPanel />;
    case 'quests': return <QuestLogPanel />;
    case 'skills': return <SkillsPanel />;
    case 'emotes': return <EmoteWheel />;
    case 'dialogue': return <DialoguePanel />;
    case 'shop': return <ShopPanel />;
    case 'villagers': return <VillagersPanel />;
    case 'travel': return <TravelPanel />;
    case 'chronicle': return <ChroniclePanel />;
    case 'parley': return <ParleyPanel />;
    case 'guild': return <GuildPanel />;
    case 'npcEquip': return <NpcEquipPanel />;
    case 'stationMenu': return <StationMenuPanel />;
    case 'keepSocket': return <KeepSocketPanel />;
    case 'buildingMenu': return <BuildingMenuPanel />;
    case 'workshop': return <WorkshopPanel />;
    case 'appearance': return <AppearancePanel />;
    case 'bestiary': return <BestiaryPanel />;
    default: return null;
  }
}
