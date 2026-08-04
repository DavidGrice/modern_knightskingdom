'use client';
// Focused per-station quick-menu (2026-07-20): walking up to a Campfire and
// pressing E used to open the WHOLE tabbed Crafting book — a browsing
// invitation to the Forge/Workbench too, not what you actually came here
// for. This is a standalone contextual panel (like Dialogue/Shop/Parley —
// no MenuTabs, no station tab bar) showing only the station you're
// physically standing at, with a single link back to the full book for
// anyone who does want to browse everything.
import { useGameStore } from '@/game/store/gameStore';
import { RECIPES, STATION_LABELS, UNLOCK_HINTS } from '@/game/data/recipes';
import { ITEMS } from '@/game/data/items';
import type { ItemId } from '@/game/types';
import Ico from '../ui/Ico';

const STATION_ICON: Record<'workbench' | 'forge' | 'campfire', string> = {
  workbench: '🔨', forge: '🏭', campfire: '🔥',
};

const DEGRADABLE_TOOLS: ItemId[] = ['axe', 'pickaxe', 'fishing_rod', 'sword'];

export default function StationMenuPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const activeStation = useGameStore((s) => s.activeStation);
  const inventory = useGameStore((s) => s.inventory);
  const unlocks = useGameStore((s) => s.unlocks);
  const nearStations = useGameStore((s) => s.nearStations);
  const craft = useGameStore((s) => s.craft);
  const canAfford = useGameStore((s) => s.canAfford);
  const durability = useGameStore((s) => s.durability);
  const repairTool = useGameStore((s) => s.repairTool);

  if (!activeStation) {
    return (
      <div className="game-panel clickable" style={{ minWidth: 'min(420px, 94vw)' }}>
        <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
        <h2>Station</h2>
        <div className="loading-note">You've stepped away from it.</div>
      </div>
    );
  }

  const atStation = nearStations.includes(activeStation);
  const recipes = RECIPES.filter((r) => r.station === activeStation);
  const wornTools = activeStation === 'workbench'
    ? DEGRADABLE_TOOLS.filter((id) => (inventory[id] ?? 0) > 0 && (durability[id] ?? 100) < 100)
    : [];

  return (
    <div className="game-panel clickable" style={{ minWidth: 'min(460px, 94vw)' }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2><Ico e={STATION_ICON[activeStation]} size={22} /> {STATION_LABELS[activeStation]}</h2>
      {!atStation && <div className="loading-note">You've stepped away — browsing only for now.</div>}
      {wornTools.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="creator-section" style={{ marginBottom: 8 }}>Repair</div>
          {wornTools.map((id) => {
            const dur = durability[id] ?? 100;
            const recipe = RECIPES.find((r) => r.output === id);
            const baseCost = recipe?.cost ?? (id === 'axe' ? { wood: 3 } : {});
            const repairCost: Partial<Record<ItemId, number>> = {};
            for (const [k, n] of Object.entries(baseCost)) repairCost[k as ItemId] = Math.max(1, Math.round((n as number) * 0.3));
            const cost = Object.entries(repairCost).map(([k, n]) => `${n}× ${ITEMS[k as ItemId]?.name ?? k}`).join(' · ');
            const afford = canAfford(repairCost);
            return (
              <div className="recipe-row" key={id}>
                <div className="icon"><Ico e={ITEMS[id].icon} /></div>
                <div className="r-main">
                  <div className="r-name">{ITEMS[id].name} {dur <= 0 ? '(worn out)' : `— ${Math.round(dur)}% condition`}</div>
                  <div className="r-cost">{cost}</div>
                </div>
                <button disabled={!atStation || !afford} onClick={() => repairTool(id)}>Repair</button>
              </div>
            );
          })}
        </div>
      )}
      {recipes.map((r) => {
        const lockedByQuest = !!r.requiresUnlock && !unlocks.includes(r.requiresUnlock);
        const afford = canAfford(r.cost);
        const enabled = !lockedByQuest && atStation && afford;
        return (
          <div className={`recipe-row ${lockedByQuest ? 'locked' : ''}`} key={r.id}>
            <div className="icon">{lockedByQuest ? <Ico e="🔒" /> : <Ico e={r.icon} />}</div>
            <div className="r-main">
              <div className="r-name">{r.name}{r.outputCount > 1 ? ` ×${r.outputCount}` : ''}</div>
              <div className="r-cost">
                {Object.entries(r.cost).map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`).join(' · ')}
              </div>
              {lockedByQuest && (
                <div className="r-station">Locked — {UNLOCK_HINTS[r.requiresUnlock!] ?? 'progress the quest line'}</div>
              )}
            </div>
            <button disabled={!enabled} onClick={() => craft(r.id)}>
              {lockedByQuest ? 'Locked' : afford ? 'Craft' : 'Missing'}
            </button>
          </div>
        );
      })}
      <button
        className="menu-btn small"
        style={{ marginTop: 14, width: 'auto', padding: '5px 10px' }}
        onClick={() => setPanel('crafting')}
      >
        <Ico e="🔨" /> Open full Crafting book
      </button>
    </div>
  );
}
