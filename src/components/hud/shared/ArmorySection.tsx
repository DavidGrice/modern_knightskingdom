'use client';
import { useGameStore } from '@/game/store/gameStore';
import { CARRIERS, CARRIER_ITEM } from '@/game/data/villagers';
import { CHESTPLATES } from '@/game/data/armor';
import type { ItemId } from '@/game/types';
import { SLOT_ITEM, SLOT_ICON, SLOT_LABEL } from './gearSlots';

// weapon stock (2026-07-20 Armory rework) — unlike helmet/chestplate these
// aren't a simple per-villager on/off toggle (a defender's loadout is one of
// several mutually-exclusive combos), so this is a read-only stock display +
// donate-from-Satchel row; the actual equip action lives in the Roster's own
// Loadout buttons (VillagersPanel.tsx), which already show cost/stock.
const WEAPON_ITEMS: { item: ItemId; icon: string; label: string }[] = [
  { item: 'sword', icon: '⚔️', label: 'Sword' },
  { item: 'shield', icon: '🛡️', label: 'Shield' },
  { item: 'crossbow', icon: '🏹', label: 'Crossbow' },
  { item: 'halberd', icon: '🔱', label: 'Halberd' },
];

/** The Armory: shared homestead gear stock, drag source for the paperdoll
 *  below and a one-click way to move spare gear over from the Satchel. */
export function ArmorySection() {
  const armory = useGameStore((s) => s.armory);
  const inventory = useGameStore((s) => s.inventory);
  const donateToArmory = useGameStore((s) => s.donateToArmory);
  // Wave 9 · the helm, then the three plate tiers. All four stay draggable
  // onto the paperdoll below; a plate tile carries its OWN item id, so
  // dragging the Forged Plate over puts the forged one on and hands whatever
  // they were wearing back to the Armory.
  const armorTiles: { item: ItemId; icon: string; label: string }[] = [
    { item: SLOT_ITEM.helmet, icon: SLOT_ICON.helmet, label: SLOT_LABEL.helmet },
    ...CHESTPLATES.map((c) => ({ item: c.item, icon: c.icon, label: c.label })),
  ];
  return (
    <div style={{ marginTop: 16 }}>
      <div className="creator-section">The Armory</div>
      <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginBottom: 8 }}>
        Spare gear held for the garrison — won from raids and the Sealed Crypt, or sent over from your
        own Satchel. Drag a piece onto a villager's slot to outfit them.
      </div>
      <div className="equip-tile-row">
        {armorTiles.map(({ item, icon, label }) => {
          const stock = armory[item] ?? 0;
          const spare = inventory[item] ?? 0;
          return (
            <div
              key={item}
              className={`inv-slot ${stock > 0 || spare > 0 ? 'armory-draggable' : ''}`}
              // Wave 51 (C5) · draggable on a Satchel spare too, not just real
              // Armory stock — onDrop/onPlateDrop below auto-donate 1 before
              // equipping when stock reads 0, collapsing the old two-step
              // "Donate 1, then drag" into one motion. A no-op when stock is
              // already ≥1 (donateToArmory's own call there never fires).
              draggable={stock > 0 || spare > 0}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', item)}
              title={`${stock} in the Armory${spare > 0 ? ` · ${spare} spare in your Satchel (drag equips straight from there)` : ''}`}
            >
              <div className="icon">{icon}</div>
              <div className="iname">{label}</div>
              {stock > 0 && <div className="count">{stock}</div>}
              {spare > 0 && (
                <button
                  className="menu-btn small"
                  style={{ marginTop: 5, width: 'auto', padding: '2px 8px' }}
                  onClick={() => donateToArmory(item, 1)}
                >
                  Donate 1
                </button>
              )}
            </div>
          );
        })}
      </div>
      {/* Wave 9 · carriers. Read-only stock + donate here for the same reason
          the weapon row below is: a carrier is a mutually-exclusive TIER on
          one field, not an on/off slot, so the actual equip lives in the
          Roster's Carrier row where the cost/stock per tier is visible. */}
      <div className="creator-section" style={{ marginTop: 14 }}>Carriers</div>
      <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginBottom: 8 }}>
        Craft one at the Workbench, send it over, then hand it to a villager in the Roster — they'll
        bring home a bigger load every trip.
      </div>
      <div className="equip-tile-row">
        {CARRIERS.map((c) => {
          const item = CARRIER_ITEM[c.id];
          const stock = armory[item] ?? 0;
          const spare = inventory[item] ?? 0;
          return (
            <div key={c.id} className="inv-slot" title={`${c.blurb} · ${stock} in the Armory${spare > 0 ? ` · ${spare} spare in your Satchel` : ''}`}>
              <div className="icon">{c.icon}</div>
              <div className="iname">{c.label}</div>
              {stock > 0 && <div className="count">{stock}</div>}
              {spare > 0 && (
                <button
                  className="menu-btn small"
                  style={{ marginTop: 5, width: 'auto', padding: '2px 8px' }}
                  onClick={() => donateToArmory(item, 1)}
                >
                  Donate 1
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="creator-section" style={{ marginTop: 14 }}>Weapons</div>
      <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginBottom: 8 }}>
        Spent arming defenders in the Roster panel (Homestead Roster → a defender's Loadout row). The
        Halberd has no craft recipe of its own — it only ever turns up as Sealed Crypt salvage.
      </div>
      <div className="equip-tile-row">
        {WEAPON_ITEMS.map(({ item, icon, label }) => {
          const stock = armory[item] ?? 0;
          const spare = inventory[item] ?? 0;
          return (
            <div key={item} className="inv-slot" title={`${stock} in the Armory${spare > 0 ? ` · ${spare} spare in your Satchel` : ''}`}>
              <div className="icon">{icon}</div>
              <div className="iname">{label}</div>
              {stock > 0 && <div className="count">{stock}</div>}
              {spare > 0 && (
                <button
                  className="menu-btn small"
                  style={{ marginTop: 5, width: 'auto', padding: '2px 8px' }}
                  onClick={() => donateToArmory(item, 1)}
                >
                  Donate 1
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
