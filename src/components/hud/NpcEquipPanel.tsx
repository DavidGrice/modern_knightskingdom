'use client';
// The garrison's equipment system: a shared homestead Armory (stocked by
// raid/dungeon loot or donated from the player's own Satchel) and a per-
// villager paperdoll for spending it — the same RotatablePreview + portal
// pattern the player's own Equipment section uses, so a dressed-up defender
// looks exactly as real in the roster as they do out on patrol. Slots
// support both click-to-equip and native HTML5 drag-and-drop (drag an
// Armory tile onto a villager's slot).
import { useEffect, useState } from 'react';
import { createPortal } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import MenuTabs from './MenuTabs';
import RotatablePreview from '../character/RotatablePreview';
import { HeldSword, ArmShield, HeldHalberd, HeldCrossbow, HeldHelmet, Chestplate, WornCarrier } from '../character/Equipment';
import { CARRIERS, CARRIER_ITEM } from '@/game/data/villagers';
import { CHESTPLATES, chestplateTierOf } from '@/game/data/armor';
import { villagerConfig, VILLAGER_LOOKS } from '@/game/data/villagerLooks';
import { faceThumbFor } from '@/game/data/minifigs';
import { swatchIndices } from '@/game/data/dyes';
import { loadPalette } from '@/lib/minifig';
import DyeRack from './DyeRack';
import type { CharacterConfig, ItemId, Villager } from '@/game/types';

// Wave 9 · the helmet is the only remaining plain on/off armor slot (one helm
// mold exists in the whole extraction, see RealHelmet). The chestplate became
// a tier — its tiles are built from CHESTPLATES below.
type GearSlot = 'helmet';
const SLOT_ITEM: Record<GearSlot, ItemId> = { helmet: 'helmet' };
const SLOT_ICON: Record<GearSlot, string> = { helmet: '🪖' };
const SLOT_LABEL: Record<GearSlot, string> = { helmet: 'Helmet' };

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

/** kept as a named re-export: several panels already import this name, and it
 *  now just defers to the shared derived-plus-override look */
export function villagerPreviewConfig(v: Villager): CharacterConfig {
  return villagerConfig(v);
}

/** Appearance editor (2026-07-20) — the same face/crest + limb-recolor
 *  controls the player gets in the character creator, applied to a villager.
 *  Looks are a "derived default + sparse override" (data/villagerLooks.ts), so
 *  Reset simply drops the override and the villager falls back to whatever
 *  their id says they should look like.
 *
 *  Head and torso move TOGETHER on purpose: part positions are baked per
 *  donor pose, so a head from one donor on another's body renders floating
 *  above the neck. Picking a "look" therefore picks a coherent donor pair. */
function AppearanceSection({ villager }: { villager: Villager }) {
  const setVillagerLook = useGameStore((s) => s.setVillagerLook);
  const resetVillagerLook = useGameStore((s) => s.resetVillagerLook);
  // Wave 9 · the free swatches PLUS whatever dye rows this save has opened
  // (data/dyes.ts) — recomputed when a dye is poured, hence the dep
  const dyes = useGameStore((s) => s.dyes);
  const [swatches, setSwatches] = useState<{ index: number; css: string }[]>([]);

  useEffect(() => {
    loadPalette().then((colors) => {
      setSwatches(swatchIndices(dyes).map((i) => {
        const [r, g, b] = colors[i] ?? [128, 128, 128];
        return { index: i, css: `rgb(${r},${g},${b})` };
      }));
    });
  }, [dyes]);

  const cfg = villagerConfig(villager);
  const edited = !!villager.look && Object.keys(villager.look).length > 0;

  const Swatches = ({ label, field }: { label: string; field: 'armColor' | 'handColor' | 'legColor' | 'hipColor' }) => (
    <>
      <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>{label}</div>
      <div className="swatch-grid">
        {swatches.map((c) => (
          <div
            key={c.index}
            className={`swatch ${cfg[field] === c.index ? 'selected' : ''}`}
            style={{ background: c.css }}
            onClick={() => setVillagerLook(villager.id, { [field]: c.index })}
          />
        ))}
      </div>
    </>
  );

  return (
    <div style={{ marginTop: 16 }}>
      <div className="creator-section">Appearance</div>
      <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginBottom: 8 }}>
        Face and dress come as a matched pair — the models bake each figure's pose, so a head from one
        and a body from another won't sit right on the neck.
      </div>
      <div className="face-grid">
        {VILLAGER_LOOKS.map((l) => {
          const on = cfg.headDonor === l.headDonor && cfg.bodyDonor === l.bodyDonor;
          return (
            <div
              key={`${l.headDonor}|${l.bodyDonor}`}
              className={`face-tile ${on ? 'selected' : ''}`}
              title={l.gender === 'female' ? 'Female villager' : 'Male villager'}
              onClick={() => setVillagerLook(villager.id, { headDonor: l.headDonor, bodyDonor: l.bodyDonor })}
            >
              {/* the creator's cropped face thumbs only exist for the eight
                  donors IT offers; the two generic villager donors fall back
                  to their full-figure catalog thumbnail. Resolved UP FRONT
                  (data/minifigs.ts) rather than by an onError retry — the
                  retry rendered the same picture in the end, but only after
                  the browser had logged a 404 for both generics every time
                  this strip mounted. */}
              <img
                src={faceThumbFor(l.headDonor)}
                alt=""
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
              />
            </div>
          );
        })}
      </div>
      <Swatches label="Arms" field="armColor" />
      <Swatches label="Hands" field="handColor" />
      <Swatches label="Legs" field="legColor" />
      <Swatches label="Hips" field="hipColor" />
      <button
        className="menu-btn small"
        style={{ marginTop: 10, width: 'auto', padding: '4px 10px', opacity: edited ? 1 : 0.5 }}
        disabled={!edited}
        onClick={() => resetVillagerLook(villager.id)}
      >
        ↺ Reset to their own look
      </button>
      <DyeRack />
    </div>
  );
}

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
              className={`inv-slot ${stock > 0 ? 'armory-draggable' : ''}`}
              draggable={stock > 0}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', item)}
              title={`${stock} in the Armory${spare > 0 ? ` · ${spare} spare in your Satchel` : ''}`}
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

export default function NpcEquipPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const villagerId = useGameStore((s) => s.equippingVillagerId);
  const villagers = useGameStore((s) => s.villagers);
  const armory = useGameStore((s) => s.armory);
  const equipVillagerGear = useGameStore((s) => s.equipVillagerGear);
  const unequipVillagerGear = useGameStore((s) => s.unequipVillagerGear);
  const equipVillagerChestplate = useGameStore((s) => s.equipVillagerChestplate);
  const unequipVillagerChestplate = useGameStore((s) => s.unequipVillagerChestplate);
  const villager = villagers.find((v) => v.id === villagerId);

  if (!villager) {
    return (
      <div className="game-panel clickable menu-family">
        <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
        <MenuTabs />
        <h2>Equip Villager</h2>
        <div className="panel-scroll">
          <div className="loading-note">That villager is no longer with the homestead.</div>
        </div>
      </div>
    );
  }

  const config = villagerPreviewConfig(villager);
  const isDefender = villager.job === 'defender';
  // bare-handed by default (2026-07-20 Armory rework) — no more free
  // sword_shield fallback; the paperdoll should honestly show fists until a
  // real loadout is bought with Armory stock
  const loadout = villager.loadout;
  // Wave 9 · which plate tier they're actually in (legacy `true` = iron)
  const plateTier = chestplateTierOf(villager.gear);

  function toggle(slot: GearSlot) {
    if (villager!.gear?.[slot]) unequipVillagerGear(villager!.id, slot);
    else equipVillagerGear(villager!.id, slot);
  }

  function onDrop(e: React.DragEvent, slot: GearSlot) {
    e.preventDefault();
    const item = e.dataTransfer.getData('text/plain');
    if (item !== SLOT_ITEM[slot]) return; // only that slot's own item kind lands here
    if (!villager!.gear?.[slot]) equipVillagerGear(villager!.id, slot);
  }

  /** dropping a plate tile straight onto a tier tile — swapping in place is
   *  the store's job (it hands the old plate back), so unlike the helmet this
   *  doesn't have to refuse a drop onto an occupied slot */
  function onPlateDrop(e: React.DragEvent, tier: (typeof CHESTPLATES)[number]) {
    e.preventDefault();
    if (e.dataTransfer.getData('text/plain') !== tier.item) return;
    equipVillagerChestplate(villager!.id, tier.id);
  }

  return (
    <div className="game-panel clickable menu-family">
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <MenuTabs />
      <h2>Equip {villager.name}</h2>
      <div className="panel-scroll">
      <div className="equip-layout">
        <RotatablePreview
          config={config}
          height={2.2}
          clip="anim_r_restpose"
          className="equip-preview"
          cameraZ={4.4}
          held={(rig) => (
            <>
              {isDefender && loadout === 'sword_shield' && createPortal(<HeldSword side={-1} />, rig.joints.rightarm)}
              {isDefender && loadout === 'sword_shield' && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
              {isDefender && loadout === 'halberd' && createPortal(<HeldHalberd side={-1} />, rig.joints.rightarm)}
              {isDefender && loadout === 'bow' && createPortal(<HeldCrossbow side={-1} />, rig.joints.rightarm)}
              {villager!.gear?.helmet && createPortal(<HeldHelmet />, rig.joints.head)}
              {plateTier && createPortal(<Chestplate tier={plateTier} />, rig.joints.body)}
              {villager!.gear?.carrier && createPortal(<WornCarrier tier={villager!.gear.carrier} />, rig.joints.hips)}
            </>
          )}
        />
        <div className="equip-slots">
          <div className="creator-section">Armor</div>
          <div className="equip-tile-row">
            {(['helmet'] as GearSlot[]).map((slot) => {
              const worn = !!villager.gear?.[slot];
              const stock = armory[SLOT_ITEM[slot]] ?? 0;
              const available = worn || stock > 0;
              return (
                <div
                  key={slot}
                  className={`equip-tile ${worn ? 'owned selected' : available ? 'owned' : 'locked'}`}
                  onClick={() => (worn || stock > 0) && toggle(slot)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, slot)}
                  title={worn ? `Click to return to the Armory` : stock > 0 ? `Equip from the Armory (${stock} spare)` : 'No spare in the Armory'}
                >
                  <div className="icon">{worn ? SLOT_ICON[slot] : stock > 0 ? '➕' : '🔒'}</div>
                  <div className="name">{SLOT_LABEL[slot]}</div>
                </div>
              );
            })}
            {/* Wave 9 · one tile per plate tier — mutually exclusive on one
                slot, exactly like the Roster's Carrier and Loadout rows, so
                clicking a better plate swaps it in and returns the old one to
                the Armory in the same action rather than needing two clicks. */}
            {CHESTPLATES.map((c) => {
              const worn = plateTier === c.id;
              const stock = armory[c.item] ?? 0;
              const available = worn || stock > 0;
              return (
                <div
                  key={c.id}
                  className={`equip-tile ${worn ? 'owned selected' : available ? 'owned' : 'locked'}`}
                  onClick={() => {
                    if (worn) unequipVillagerChestplate(villager.id);
                    else if (stock > 0) equipVillagerChestplate(villager.id, c.id);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onPlateDrop(e, c)}
                  title={worn
                    ? `${c.blurb} Click to return it to the Armory.`
                    : stock > 0 ? `${c.blurb} Equip from the Armory (${stock} spare)` : 'No spare in the Armory'}
                >
                  <div className="icon">{worn ? c.icon : stock > 0 ? '➕' : '🔒'}</div>
                  <div className="name">{c.label}</div>
                </div>
              );
            })}
          </div>
          {isDefender ? (
            <div style={{ fontSize: 12, color: 'var(--parchment-dark)', marginTop: 8 }}>
              Weapon &amp; loadout are set from the Roster. Worn armor here adds a little extra grit
              in a fight — a helmet a touch, a plate rather more, and the better the plate the more
              of it: iron, forged, then castle-crested.
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--parchment-dark)', marginTop: 8 }}>
              {villager.name} doesn't fight, but a little armor never hurts — purely for show on a
              working villager.
            </div>
          )}
        </div>
      </div>
      <AppearanceSection villager={villager} />
      <ArmorySection />
      </div>
    </div>
  );
}
