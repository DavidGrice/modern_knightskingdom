'use client';
// Wave 9 · the dye rack. Shared by both colour pickers (the player's own
// Appearance panel and the villager editor) because a dye is opened for the
// SAVE, not for one figure — unlocking Royal Purples while dressing a villager
// must put the same colours in the player's own picker, and the only way to
// guarantee that is for both panels to render the same component over the same
// store field.
//
// Locked rows show their real colours rather than grey placeholders: the point
// of a dye is that you can see what you'd be buying. This mirrors the crest
// creator's "locked tile + hint" shape (data/crestUnlocks.ts) — the only other
// gated cosmetic in the game — but reads its state from the save instead of
// localStorage, since a dye is brewed from this character's own herbs.
import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { DYE_ROWS, lockedDyeRows } from '@/game/data/dyes';
import { ITEMS } from '@/game/data/items';
import { loadPalette } from '@/lib/minifig';
import KkIcon from '../ui/KkIcon';
import Ico from '../ui/Ico';

export default function DyeRack() {
  const dyes = useGameStore((s) => s.dyes);
  const inventory = useGameStore((s) => s.inventory);
  const unlockDye = useGameStore((s) => s.unlockDye);
  const [colors, setColors] = useState<[number, number, number][]>([]);

  useEffect(() => { loadPalette().then(setColors); }, []);

  const locked = lockedDyeRows(dyes);
  const opened = DYE_ROWS.filter((r) => dyes.includes(r.id));

  return (
    <div style={{ marginTop: 14 }}>
      <div className="creator-section">Dyes</div>
      <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginBottom: 8 }}>
        Steep a dye at any campfire and pour it out here — the whole row of colours joins the
        swatches above for good, for you and every soul on the homestead.
      </div>
      {locked.map((row) => {
        const held = inventory[row.item] ?? 0;
        return (
          <div
            key={row.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '6px 0', borderTop: '1px solid rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ display: 'flex', gap: 3 }}>
              {row.swatches.map((i) => {
                const [r, g, b] = colors[i] ?? [128, 128, 128];
                return (
                  <span
                    key={i}
                    title={row.label}
                    style={{
                      width: 18, height: 18, borderRadius: 3, opacity: 0.55,
                      background: `rgb(${r},${g},${b})`,
                      border: '1px solid rgba(0,0,0,0.35)', display: 'inline-block',
                    }}
                  />
                );
              })}
            </div>
            <div style={{ flex: '1 1 160px', minWidth: 140 }}>
              <div style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
                <KkIcon name="k-lock" size={12} /> {row.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--parchment-dark)' }}>{row.blurb}</div>
            </div>
            <button
              className="menu-btn small"
              style={{ margin: 0, width: 'auto', padding: '4px 10px', opacity: held > 0 ? 1 : 0.5 }}
              disabled={held <= 0}
              // never disable without naming the blocker
              title={held > 0
                ? `Pour 1 ${ITEMS[row.item].name} — opens ${row.label} for this save`
                : `Steep a ${ITEMS[row.item].name} at a campfire first`}
              onClick={() => unlockDye(row.id)}
            >
              <Ico e={row.icon} /> {held > 0 ? `Pour the ${ITEMS[row.item].name}` : `Needs ${ITEMS[row.item].name}`}
            </button>
          </div>
        );
      })}
      {opened.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--parchment-dark)', marginTop: 6 }}>
          Opened: {opened.map((r) => r.label).join(' · ')}
        </div>
      )}
      {locked.length === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--gold)', marginTop: 4 }}>
          Every dye in the realm is yours. Nothing left to steep.
        </div>
      )}
    </div>
  );
}
