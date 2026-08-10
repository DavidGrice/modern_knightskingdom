'use client';
// Build menu 3.0 (2026-07-20): relocated to the right-hand rail — the
// minimap already hides during build mode, freeing that whole side — as a
// tall vertical panel instead of a cramped bottom bar, with category tabs
// laid out as a proper 2-column grid (piece counts included) rather than one
// long horizontal strip, plus the same sort/hide-unavailable toolbar pattern
// the crafting-menu overhaul established.
import { useMemo, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLES, BUILD_CATEGORIES, LAND_TIERS, MAX_LAND_TIER } from '@/game/data/buildables';
import { STARTER_BLUEPRINTS } from '@/game/data/blueprints';
import { buildCamState } from '@/game/buildCam';
import { brickFor, brickLabel } from '@/game/data/brickResources';
import { SET_PLANS, setOwning } from '@/lib/setBuild';
import { ITEMS } from '@/game/data/items';
import { MAX_VILLAGERS, villagerRequirement } from '@/game/data/villagers';
import { isHomeBuilding } from '@/game/types';
import type { Buildable, ItemId } from '@/game/types';
import Ico from '../ui/Ico';

// Wave 9 · the wrecking tool's confirmation. Area demolition is the only
// action in the game that can level a whole wall run in one click, so it is
// the only one that arms first and fires second: the drag marks the patch, the
// rail says what is in it and what comes back, and nothing moves until this
// button is pressed. (Deliberately not `window.confirm` — the game's one use
// of that sits on the main menu, outside the HUD, and a browser dialog in the
// middle of a build session steals focus and breaks the held-key state.)
function DemolishConfirm() {
  const demolishRect = useGameStore((s) => s.demolishRect);
  const demolishPreview = useGameStore((s) => s.demolishPreview);
  const demolishArea = useGameStore((s) => s.demolishArea);
  const setDemolishRect = useGameStore((s) => s.setDemolishRect);
  // subscribed, not just read: the marquee stays armed while the player pans
  // around it, so a piece torn down by hand in the meantime has to drop out of
  // the count before they press the button
  const buildings = useGameStore((s) => s.buildings);
  const { ids, refund } = useMemo(
    () => demolishPreview(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demolishRect, buildings, demolishPreview],
  );
  if (!demolishRect) return null;
  const back = Object.entries(refund);
  return (
    <div className="build-hint clickable" style={{ borderColor: '#e04434' }}>
      <b>{ids.length} {ids.length === 1 ? 'piece' : 'pieces'}</b> inside the patch
      {back.length > 0 && (
        <> — returns {back.map(([id, n]) => `${n} ${ITEMS[id as ItemId]?.name ?? id}`).join(', ')}</>
      )}
      {' '}
      <button
        className="menu-btn small"
        style={{ display: 'inline', width: 'auto', padding: '2px 10px', margin: 0 }}
        disabled={ids.length === 0}
        onClick={demolishArea}
      >
        ✓ Pull it down
      </button>
      {' '}
      <button
        className="menu-btn small"
        style={{ display: 'inline', width: 'auto', padding: '2px 10px', margin: 0 }}
        onClick={() => setDemolishRect(null)}
      >
        Cancel
      </button>
    </div>
  );
}

type Tab = Buildable['category'] | 'blueprints';
type BuildSort = 'default' | 'az' | 'affordable';

// static — the catalog never changes at runtime, so count once
const CATEGORY_COUNTS: Record<string, number> = Object.fromEntries(
  BUILD_CATEGORIES.map((c) => [c.id, BUILDABLES.filter((b) => b.category === c.id).length]),
);

function BlueprintsTab() {
  const blueprintSelection = useGameStore((s) => s.blueprintSelection);
  const setBlueprintSelection = useGameStore((s) => s.setBlueprintSelection);
  const setSelection = useGameStore((s) => s.setBuildSelection);
  const customBlueprints = useGameStore((s) => s.customBlueprints);
  const captureBlueprint = useGameStore((s) => s.captureBlueprint);
  const deleteBlueprint = useGameStore((s) => s.deleteBlueprint);
  const [name, setName] = useState('');

  const all = [...STARTER_BLUEPRINTS, ...customBlueprints];

  return (
    <div className="build-grid" style={{ flexDirection: 'column', display: 'flex', gap: 8 }}>
      <div className="opt-row" style={{ marginBottom: 4 }}>
        <input
          className="build-search"
          placeholder="Name a new blueprint…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          className="menu-btn"
          style={{ width: 'auto', padding: '6px 14px' }}
          onClick={() => {
            if (captureBlueprint(name || 'Unnamed Blueprint', buildCamState.x, buildCamState.z)) setName('');
          }}
        >
          📋 Capture Nearby as Blueprint
        </button>
      </div>
      <div className="loading-note" style={{ marginBottom: 4 }}>
        Captures every building within ~9m of the camera center above. Pan there, then capture.
      </div>
      {all.map((bp) => (
        <div
          key={bp.id}
          className={`recipe-row ${blueprintSelection === bp.id ? 'selected' : ''}`}
          onClick={() => {
            setSelection(null);
            setBlueprintSelection(blueprintSelection === bp.id ? null : bp.id);
          }}
        >
          <div className="icon">📋</div>
          <div className="r-main">
            <div className="r-name">{bp.name}{bp.starter ? '' : ' (custom)'}</div>
            <div className="r-cost">{bp.pieces.length} pieces</div>
          </div>
          {!bp.starter && (
            <button onClick={(e) => { e.stopPropagation(); deleteBlueprint(bp.id); }}>Delete</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function BuildBar() {
  const selection = useGameStore((s) => s.buildSelection);
  const setSelection = useGameStore((s) => s.setBuildSelection);
  const blueprintSelection = useGameStore((s) => s.blueprintSelection);
  const setBlueprintSelection = useGameStore((s) => s.setBlueprintSelection);
  const moving = useGameStore((s) => s.movingBuilding);
  const cancelMove = useGameStore((s) => s.cancelMove);
  const unlocks = useGameStore((s) => s.unlocks);
  const builtSets = useGameStore((s) => s.builtSets);
  const canAfford = useGameStore((s) => s.canAfford);
  const buildings = useGameStore((s) => s.buildings);
  const landTier = useGameStore((s) => s.landTier);
  const buyLand = useGameStore((s) => s.buyLand);
  const inventory = useGameStore((s) => s.inventory);
  const villagers = useGameStore((s) => s.villagers);
  const buildTool = useGameStore((s) => s.buildTool);
  const setBuildTool = useGameStore((s) => s.setBuildTool);
  const freeform = useGameStore((s) => s.freeformBuild);
  const setFreeformBuild = useGameStore((s) => s.setFreeformBuild);
  const [tab, setTab] = useState<Tab>('essentials');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<BuildSort>('default');
  const [hideUnavailable, setHideUnavailable] = useState(false);

  // M · a piece that belongs to a real set is locked until you have built
  // that set in the workshop — which is what makes finishing one worth the
  // bench time, rather than the set being a display piece
  function locked(b: Buildable) {
    if (b.requiresUnlock && !unlocks.includes(b.requiresUnlock)) return true;
    const owner = setOwning(b.id);
    return !!owner && !builtSets.includes(owner);
  }
  function lockReason(b: Buildable): string | null {
    if (b.requiresUnlock && !unlocks.includes(b.requiresUnlock)) return null;
    const owner = setOwning(b.id);
    if (owner && !builtSets.includes(owner)) return `Build ${SET_PLANS[owner]?.name} in the workshop`;
    return null;
  }
  function affordable(b: Buildable) { return !locked(b) && canAfford(b.cost); }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q ? BUILDABLES.filter((b) => b.name.toLowerCase().includes(q)) : BUILDABLES.filter((b) => b.category === tab);
    if (hideUnavailable) list = list.filter(affordable);
    if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'affordable') list = [...list].sort((a, b) => Number(affordable(b)) - Number(affordable(a)));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, sort, hideUnavailable, unlocks, canAfford]);

  return (
    <>
      <div className="build-hint clickable">
        {moving ? (
          <>
            <b>Moving {BUILDABLES.find((b) => b.id === moving.type)?.name}</b> — click to set down · <b>R</b> rotate ·{' '}
            <button className="menu-btn small" style={{ display: 'inline', width: 'auto', padding: '2px 10px', margin: 0 }} onClick={cancelMove}>
              Cancel
            </button>
          </>
        ) : buildTool === 'demolish' ? (
          <>
            <b>Wrecking Tool</b> — drag a patch over what you want gone, then confirm ·{' '}
            <b>X</b> or the tool row below puts it away
          </>
        ) : (
          <>
            <b>Aerial Build View</b> — hold click to place · <b>shift-drag</b> lays a wall run ·
            click a piece to move it · <b>R</b> rotate · <b>U</b> undo · right-click removes ·{' '}
            <b>WASD</b>/middle-drag pan · <b>Q</b>/<b>E</b> turn the view · scroll zoom · <b>B</b>/<b>Esc</b> return
          </>
        )}
      </div>
      <DemolishConfirm />
      <div className="build-menu clickable">
        {/* Wave 9 · the two things that change what the LEFT BUTTON does, kept
            together above the catalogue: which tool is in hand, and whether
            the grid is holding it. Both are also keys (X, F) — the row is for
            discovering that they exist. */}
        <div className="build-sort" style={{ marginBottom: 6 }}>
          <button
            className={buildTool === 'build' ? 'selected' : ''}
            onClick={() => setBuildTool('build')}
            title="Place, move and stack pieces"
          >
            🔨 Build
          </button>
          <button
            className={buildTool === 'demolish' ? 'selected' : ''}
            onClick={() => setBuildTool(buildTool === 'demolish' ? 'build' : 'demolish')}
            title="Drag a patch, then confirm — takes down every piece inside it (X)"
          >
            🧹 Demolish Area
          </button>
          <button
            className={freeform ? 'selected' : ''}
            onClick={() => setFreeformBuild(!freeform)}
            title="Ignore the grid: place at the cursor and turn in small steps (F). Pieces still cost the same and still collide as their nearest square footprint."
          >
            ✥ Freeform
          </button>
        </div>
        <input
          className="build-search"
          placeholder="Search all pieces…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="build-tabs">
          {BUILD_CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={tab === c.id && !search ? 'active' : ''}
              onClick={() => { setTab(c.id); setSearch(''); }}
            >
              <Ico e={c.icon} /> {c.label} <span className="build-tab-count">{CATEGORY_COUNTS[c.id]}</span>
            </button>
          ))}
          <button
            className={tab === 'blueprints' ? 'active' : ''}
            onClick={() => { setTab('blueprints'); setSearch(''); }}
          >
            📋 Blueprints
          </button>
        </div>
        {!(tab === 'blueprints' && !search) && (
          <div className="build-toolbar">
            <div className="build-sort">
              {(['default', 'az', 'affordable'] as BuildSort[]).map((s) => (
                <button key={s} className={sort === s ? 'selected' : ''} onClick={() => setSort(s)}>
                  {s === 'default' ? 'Default' : s === 'az' ? 'A–Z' : 'Affordable'}
                </button>
              ))}
            </div>
            <label className="build-filter-toggle">
              <input type="checkbox" checked={hideUnavailable} onChange={(e) => setHideUnavailable(e.target.checked)} style={{ width: 'auto' }} />
              Hide unavailable
            </label>
          </div>
        )}
        {tab === 'blueprints' && !search ? (
          <BlueprintsTab />
        ) : (
          <div className="build-grid">
            {visible.map((b) => {
              const isLocked = locked(b);
              const afford = canAfford(b.cost);
              const cls = [
                'build-item',
                selection === b.id ? 'selected' : '',
                isLocked ? 'locked' : !afford ? 'unaffordable' : '',
              ].join(' ');
              return (
                <div
                  key={b.id}
                  className={cls}
                  title={isLocked ? (lockReason(b) ?? 'Locked — advance the quest line') : b.name}
                  onClick={() => {
                    if (isLocked) return;
                    setBlueprintSelection(null);
                    setSelection(selection === b.id ? null : b.id);
                  }}
                >
                  {b.thumb ? <img src={b.thumb} alt={b.name} draggable={false} /> : <div className="b-ico"><Ico e={b.icon} /></div>}
                  <div className="b-name">{isLocked ? '🔒 ' : ''}{b.name}</div>
                  {/* J45 · the cost is a BILL OF PIECES: each line is the
                      actual catalogue brick it will take, with its own
                      thumbnail, rather than an emoji and a number */}
                  <div className="b-cost">
                    {Object.entries(b.cost).map(([id, n]) => {
                      const brick = brickFor(id as ItemId);
                      return (
                        <span className="b-cost-part" key={id} title={brickLabel(id as ItemId, ITEMS[id as ItemId]?.name ?? id)}>
                          {brick
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img className="b-cost-thumb" src={brick.thumb} alt="" />
                            : <span>{ITEMS[id as ItemId]?.icon ?? id}</span>}
                          {n}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {visible.length === 0 && <div className="loading-note">No pieces match.</div>}
          </div>
        )}
        {/* what the homestead is actually worth right now — the palette's
            own footer, pinned last in flow */}
        {(() => {
          const built = buildings.filter(isHomeBuilding).length;
          const next = villagers.length < MAX_VILLAGERS
            ? villagerRequirement(villagers.length + 1) : null;
          const tier = LAND_TIERS[landTier];
          const nextLand = landTier < MAX_LAND_TIER ? LAND_TIERS[landTier + 1] : null;
          const gold = inventory.gold ?? 0;
          return (
            <>
              <div className="build-foot">
                <span><b>{built}</b> structures</span>
                <span>{next ? <>next kin at <b>{next.buildings}</b></> : 'fully settled'}</span>
              </div>
              {/* F20 · the fence you own, and what the next deed costs. Every
                  tier is `corner + N walls + corner` to a side, so the grid
                  always closes on a corner. */}
              <div className="build-foot" style={{ borderTop: 0, paddingTop: 0 }}>
                <span>{tier.name} — <b>{tier.walls}</b> walls a side</span>
                {nextLand ? (
                  <button
                    className="menu-btn small"
                    style={{ margin: 0, width: 'auto', padding: '3px 9px', fontSize: 11 }}
                    disabled={gold < nextLand.cost}
                    title={gold < nextLand.cost
                      ? `A ${nextLand.name} deed costs ${nextLand.cost} gold — you have ${gold}`
                      : `Push the fence out to ${nextLand.walls} walls a side`}
                    onClick={buyLand}
                  >
                    Buy {nextLand.name} · {nextLand.cost}g
                  </button>
                ) : <span>the whole barony</span>}
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
