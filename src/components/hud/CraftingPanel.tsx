'use client';
import { useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { ITEMS } from '@/game/data/items';
import { RECIPES, repairCostFor, STATION_LABELS, STATION_TABS, UNLOCK_HINTS } from '@/game/data/recipes';
import type { ItemId, Recipe } from '@/game/types';
import Ico from '../ui/Ico';
import PanelFrame from './PanelFrame';

const DEGRADABLE_TOOLS: ItemId[] = ['axe', 'pickaxe', 'fishing_rod', 'sword'];

type CraftSort = 'default' | 'az' | 'craftable';

/** Station-specific crafting menus (overhauled 2026-07-20): the old panel
 *  dumped all 19 recipes across 4 stations into one flat, ever-growing list
 *  — "one big massive convoluted mess." Recipes are now grouped into a
 *  station tab bar (mirroring how the world actually gates them — you can't
 *  smelt a bar without a Forge), defaulting to wherever you're actually
 *  standing, plus a text search and a sort/filter pass for cutting through
 *  a single busy station (the Workbench alone still has 7 recipes). */
export default function CraftingPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const unlocks = useGameStore((s) => s.unlocks);
  const nearStations = useGameStore((s) => s.nearStations);
  const craft = useGameStore((s) => s.craft);
  const canAfford = useGameStore((s) => s.canAfford);
  const durability = useGameStore((s) => s.durability);
  const repairTool = useGameStore((s) => s.repairTool);
  const skillTree = useGameStore((s) => s.skillTree);

  const [tab, setTab] = useState<Recipe['station']>(
    () => (nearStations[0] as Recipe['station'] | undefined) ?? 'hand',
  );
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CraftSort>('default');
  const [hideUnavailable, setHideUnavailable] = useState(false);

  const atWorkbench = nearStations.includes('workbench');
  const wornTools = DEGRADABLE_TOOLS.filter((id) => (inventory[id] ?? 0) > 0 && (durability[id] ?? 100) < 100);

  function craftable(r: Recipe) {
    const lockedByQuest = !!r.requiresUnlock && !unlocks.includes(r.requiresUnlock);
    const stationOk = r.station === 'hand' || nearStations.includes(r.station);
    return !lockedByQuest && stationOk && canAfford(r.cost);
  }

  const q = search.trim().toLowerCase();
  let visible = RECIPES.filter((r) => r.station === tab);
  if (q) visible = visible.filter((r) => r.name.toLowerCase().includes(q) || ITEMS[r.output]?.name.toLowerCase().includes(q));
  if (hideUnavailable) visible = visible.filter(craftable);
  if (sort === 'az') visible = [...visible].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'craftable') visible = [...visible].sort((a, b) => Number(craftable(b)) - Number(craftable(a)));

  return (
    <PanelFrame title="Crafting">
      <div className="station-tabs">
        {STATION_TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <Ico e={t.icon} /> {t.label}
            {nearStations.includes(t.id) && <span className="station-tab-here" title="You're standing here">●</span>}
          </button>
        ))}
      </div>
      <div className="craft-toolbar">
        <input
          className="craft-search"
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="craft-sort">
          {(['default', 'az', 'craftable'] as CraftSort[]).map((s) => (
            <button key={s} className={sort === s ? 'selected' : ''} onClick={() => setSort(s)}>
              {s === 'default' ? 'Default' : s === 'az' ? 'A–Z' : 'Craftable First'}
            </button>
          ))}
        </div>
        <label className="craft-filter-toggle">
          <input type="checkbox" checked={hideUnavailable} onChange={(e) => setHideUnavailable(e.target.checked)} style={{ width: 'auto' }} />
          Hide unavailable
        </label>
      </div>
      {tab !== 'hand' && !nearStations.includes(tab) && (
        <div className="loading-note">Stand near a {STATION_LABELS[tab]} to craft these — browsing only for now.</div>
      )}
      {tab === 'workbench' && wornTools.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="creator-section" style={{ marginBottom: 8 }}>Repair</div>
          {wornTools.map((id) => {
            const dur = durability[id] ?? 100;
            // shared with the store's own repairTool action so the preview
            // and the afford-check can never drift from what's actually
            // charged (also reflects the Guild Rates/Master Forge talents)
            const repairCost = repairCostFor(id, skillTree);
            const cost = Object.entries(repairCost).map(([k, n]) => `${n}× ${ITEMS[k as ItemId]?.name ?? k}`).join(' · ');
            const afford = canAfford(repairCost);
            return (
              <div className="recipe-row" key={id}>
                <div className="icon"><Ico e={ITEMS[id].icon} /></div>
                <div className="r-main">
                  <div className="r-name">{ITEMS[id].name} {dur <= 0 ? '(worn out)' : `— ${Math.round(dur)}% condition`}</div>
                  <div className="r-cost">{cost}</div>
                  <div className="r-station">{atWorkbench ? 'Workbench' : 'Workbench — stand near one'}</div>
                </div>
                <button disabled={!atWorkbench || !afford} onClick={() => repairTool(id)}>Repair</button>
              </div>
            );
          })}
        </div>
      )}
      {visible.length === 0 && <div className="loading-note">No recipes match.</div>}
      {visible.map((r) => {
        const lockedByQuest = !!r.requiresUnlock && !unlocks.includes(r.requiresUnlock);
        const stationOk = r.station === 'hand' || nearStations.includes(r.station);
        const afford = canAfford(r.cost);
        const enabled = !lockedByQuest && stationOk && afford;
        return (
          <div className={`recipe-row ${lockedByQuest || !stationOk ? 'locked' : ''}`} key={r.id}>
            <div className="icon">{lockedByQuest ? '🔒' : r.icon}</div>
            <div className="r-main">
              <div className="r-name">
                {r.name}{r.outputCount > 1 ? ` ×${r.outputCount}` : ''}
              </div>
              <div className="r-cost">
                {Object.entries(r.cost)
                  .map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`)
                  .join(' · ')}
              </div>
              <div className="r-station">
                {lockedByQuest
                  ? `Locked — ${UNLOCK_HINTS[r.requiresUnlock!] ?? 'progress the quest line'}`
                  : !stationOk ? `Stand near a ${STATION_LABELS[r.station]}` : ''}
              </div>
            </div>
            <button disabled={!enabled} onClick={() => craft(r.id)}>
              {lockedByQuest ? 'Locked' : afford ? 'Craft' : 'Missing'}
            </button>
          </div>
        );
      })}
      <div style={{ fontSize: 12.5, color: '#a89468', marginTop: 8 }}>
        Inventory: {Object.entries(inventory).filter(([, n]) => (n ?? 0) > 0)
          .map(([id, n]) => (
            <span key={id} style={{ marginRight: 8 }}>
              <Ico e={ITEMS[id as ItemId]?.icon ?? ''} />{n}
            </span>
          ))}
        {Object.values(inventory).every((n) => !n) && '—'}
      </div>
    </PanelFrame>
  );
}
