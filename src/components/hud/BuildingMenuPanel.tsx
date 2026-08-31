'use client';
// L72 · What you can do with a piece you have already built.
//
// Clicking a placed building used to pick it up: the only action it had was
// "move me", taken without asking. A built thing should be a thing you can
// act ON — move it, take it down, or mount something on it — so a click opens
// this instead, and moving is one choice among several rather than the only
// one.
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLE_BY_ID, costBill, labAssetId } from '@/game/data/buildables';
import { labIsExplosive } from '@/game/data/labCapabilities';
import type { ItemId } from '@/game/types';
import { isBuilt } from '@/game/types';

/** the charges the lab marks as explosive, in the order they read as a
 *  ladder — Wave 29 adds `l4105278` ("Powder Mine"), the catalog's 4th real
 *  Destructor model, promoted alongside its 3 already-wired siblings above
 *  (see buildables.ts's own comment on that entry). */
const CHARGES = ['l394101', 'l248901', 'l473801', 'l4105278'];

export default function BuildingMenuPanel() {
  const id = useGameStore((s) => s.menuBuilding);
  const buildings = useGameStore((s) => s.buildings);
  const inventory = useGameStore((s) => s.inventory);
  const setPanel = useGameStore((s) => s.setPanel);
  const pickup = useGameStore((s) => s.pickupBuilding);
  const pickupKeep = useGameStore((s) => s.pickupKeep);
  const remove = useGameStore((s) => s.removeBuilding);
  const mountCharge = useGameStore((s) => s.mountCharge);

  const b = id ? buildings.find((x) => x.id === id) : null;
  if (!b) return null;
  const def = BUILDABLE_BY_ID[b.type];
  const isWall = def?.category === 'walls';
  // J51 · the keep's synthetic PlacedBuilding exists purely for interact
  // detection (see gameStore's foundKeep) — everything it actually IS lives
  // in st.keep, so it gets its own narrower menu: relocate the foundation
  // (every socket travels with it), never a plain "take it down" that would
  // orphan a whole assembled castle in one click.
  const isKeep = b.type === 'keep';
  const charges = CHARGES.map((c) => BUILDABLE_BY_ID[c]).filter(Boolean);

  return (
    <div className="game-panel clickable" style={{ minWidth: 'min(420px, 94vw)' }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>{isKeep ? 'The Grand Keep' : (def?.name ?? b.type)}</h2>
      {!isBuilt(b) && (
        <div className="loading-note" style={{ marginBottom: 10 }}>
          Still a site — {Math.round((b.built ?? 0) * 100)}% built.
        </div>
      )}

      <div className="creator-section" style={{ marginBottom: 8 }}>Actions</div>
      <div className="keep-options">
        {isKeep ? (
          <button className="keep-option" onClick={() => { setPanel('none'); pickupKeep(); }}>
            <div className="keep-option-body">
              <div className="keep-option-name">Move the foundation</div>
              <div className="keep-option-blurb">Pick up the whole castle — every socket, as built — and lay it down somewhere else.</div>
            </div>
          </button>
        ) : (
          <>
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
          </>
        )}
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
                      {/* Wave 29 · costBill() (none of these charges author a
                          `pieces` bill, so this is byte-identical to the old
                          Object.entries(c.cost) loop it replaces) — line.key
                          is the real ItemId for every non-`pieces` buildable,
                          which is what the per-line afford check needs. */}
                      {costBill(c).map((line) => {
                        const have = inventory[line.key as ItemId] ?? 0;
                        return (
                          <span key={line.key} className={`b-cost-part${have >= line.qty ? '' : ' short'}`}>
                            {line.thumb
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img className="b-cost-thumb" src={line.thumb} alt="" />
                              : <span>{line.icon}</span>}
                            {line.qty}
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
