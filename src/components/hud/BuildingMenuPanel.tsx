'use client';
// L72 · What you can do with a piece you have already built.
//
// Clicking a placed building used to pick it up: the only action it had was
// "move me", taken without asking. A built thing should be a thing you can
// act ON — move it, take it down, or mount something on it — so a click opens
// this instead, and moving is one choice among several rather than the only
// one.
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLE_BY_ID, labAssetId } from '@/game/data/buildables';
import { labIsExplosive } from '@/game/data/labCapabilities';
import { brickFor } from '@/game/data/brickResources';
import { ITEMS } from '@/game/data/items';
import type { ItemId } from '@/game/types';
import { isBuilt } from '@/game/types';

/** the charges the lab marks as explosive, in the order they read as a ladder */
const CHARGES = ['l394101', 'l248901', 'l473801'];

export default function BuildingMenuPanel() {
  const id = useGameStore((s) => s.menuBuilding);
  const buildings = useGameStore((s) => s.buildings);
  const inventory = useGameStore((s) => s.inventory);
  const setPanel = useGameStore((s) => s.setPanel);
  const pickup = useGameStore((s) => s.pickupBuilding);
  const remove = useGameStore((s) => s.removeBuilding);
  const mountCharge = useGameStore((s) => s.mountCharge);

  const b = id ? buildings.find((x) => x.id === id) : null;
  if (!b) return null;
  const def = BUILDABLE_BY_ID[b.type];
  const isWall = def?.category === 'walls';
  const charges = CHARGES.map((c) => BUILDABLE_BY_ID[c]).filter(Boolean);

  return (
    <div className="game-panel clickable" style={{ minWidth: 420 }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>{def?.name ?? b.type}</h2>
      {!isBuilt(b) && (
        <div className="loading-note" style={{ marginBottom: 10 }}>
          Still a site — {Math.round((b.built ?? 0) * 100)}% built.
        </div>
      )}

      <div className="creator-section" style={{ marginBottom: 8 }}>Actions</div>
      <div className="keep-options">
        <button className="keep-option" onClick={() => { setPanel('none'); pickup(b.id); }}>
          <div className="keep-option-body">
            <div className="keep-option-name">Move it</div>
            <div className="keep-option-blurb">Pick the piece up and set it down somewhere else.</div>
          </div>
        </button>
        <button className="keep-option" onClick={() => { setPanel('none'); remove(b.id); }}>
          <div className="keep-option-body">
            <div className="keep-option-name">Take it down</div>
            <div className="keep-option-blurb">Dismantle it and get its pieces back.</div>
          </div>
        </button>
      </div>

      {isWall && (
        <>
          <div className="creator-section" style={{ margin: '14px 0 8px' }}>Mount a charge</div>
          <div className="loading-note" style={{ marginBottom: 8 }}>
            A charge sits on top of the wall and arms itself — it goes off when a raider comes close.
          </div>
          <div className="keep-options">
            {charges.map((c) => {
              const afford = Object.entries(c.cost)
                .every(([item, n]) => (inventory[item as ItemId] ?? 0) >= (n ?? 0));
              const already = buildings.some((x) => labIsExplosive(labAssetId(x.type))
                && Math.hypot(x.x - b.x, x.z - b.z) < 0.6 && (x.y ?? 0) > (b.y ?? 0));
              return (
                <button
                  key={c.id}
                  className={`keep-option${afford && !already ? '' : ' short'}`}
                  disabled={!afford || already}
                  onClick={() => mountCharge(b.id, c.id)}
                  title={already ? 'This wall already carries a charge' : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="keep-option-thumb" src={c.thumb} alt="" />
                  <div className="keep-option-body">
                    <div className="keep-option-name">{c.name}</div>
                    <div className="keep-option-blurb">
                      {already ? 'This wall already carries a charge.' : 'Arms on approach; takes the wall with it.'}
                    </div>
                    <div className="keep-option-cost">
                      {Object.entries(c.cost).map(([item, n]) => {
                        const brick = brickFor(item as ItemId);
                        const have = inventory[item as ItemId] ?? 0;
                        return (
                          <span key={item} className={`b-cost-part${have >= (n ?? 0) ? '' : ' short'}`}>
                            {brick
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img className="b-cost-thumb" src={brick.thumb} alt="" />
                              : <span>{ITEMS[item as ItemId]?.icon ?? item}</span>}
                            {n}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
