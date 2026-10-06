'use client';
// The garrison's equipment system: a shared homestead Armory (stocked by
// raid/dungeon loot or donated from the player's own Satchel) and a per-
// villager paperdoll for spending it — the same RotatablePreview + portal
// pattern the player's own Equipment section uses, so a dressed-up defender
// looks exactly as real in the roster as they do out on patrol. Slots
// support both click-to-equip and native HTML5 drag-and-drop (drag an
// Armory tile onto a villager's slot).
import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import RotatablePreview from '../character/RotatablePreview';
import LoadoutGear from '../character/LoadoutGear';
import { CHESTPLATES, chestplateTierOf } from '@/game/data/armor';
import { villagerConfig, VILLAGER_LOOKS } from '@/game/data/villagerLooks';
import { faceThumbFor } from '@/game/data/minifigs';
import { swatchIndices } from '@/game/data/dyes';
import { loadPalette } from '@/lib/minifig';
import DyeRack from './DyeRack';
import { onKeyActivate } from '../ui/a11yClick';
import type { CharacterConfig, ItemId, Villager } from '@/game/types';
import { ArmorySection } from './shared/ArmorySection';
import { SLOT_ITEM, SLOT_ICON, SLOT_LABEL, type GearSlot } from './shared/gearSlots';
import PanelFrame from './PanelFrame';

/** kept as a named re-export: several panels already import this name, and it
 *  now just defers to the shared derived-plus-override look */
function villagerPreviewConfig(v: Villager): CharacterConfig {
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

export default function NpcEquipPanel() {
  const villagerId = useGameStore((s) => s.equippingVillagerId);
  const villagers = useGameStore((s) => s.villagers);
  const armory = useGameStore((s) => s.armory);
  const inventory = useGameStore((s) => s.inventory);
  const donateToArmory = useGameStore((s) => s.donateToArmory);
  const equipVillagerGear = useGameStore((s) => s.equipVillagerGear);
  const unequipVillagerGear = useGameStore((s) => s.unequipVillagerGear);
  const equipVillagerChestplate = useGameStore((s) => s.equipVillagerChestplate);
  const unequipVillagerChestplate = useGameStore((s) => s.unequipVillagerChestplate);
  const villager = villagers.find((v) => v.id === villagerId);

  if (!villager) {
    return (
      <PanelFrame title="Equip Villager">
        <div className="loading-note">That villager is no longer with the homestead.</div>
      </PanelFrame>
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

  // Wave 61 (H1) · pulled out of the plate tile's onClick so onKeyDown
  // (Enter/Space) can call the exact same logic rather than a second copy.
  function toggleChestplate(worn: boolean, stock: number, tier: (typeof CHESTPLATES)[number]) {
    if (worn) unequipVillagerChestplate(villager!.id);
    else if (stock > 0) equipVillagerChestplate(villager!.id, tier.id);
  }

  function onDrop(e: React.DragEvent, slot: GearSlot) {
    e.preventDefault();
    const item = e.dataTransfer.getData('text/plain') as ItemId;
    if (item !== SLOT_ITEM[slot]) return; // only that slot's own item kind lands here
    if (villager!.gear?.[slot]) return;
    // Wave 51 (C5) · a drag with no Armory stock but a Satchel spare auto-
    // donates 1 first — the same one-drag-does-both upgrade ArmorySection's
    // own tile now advertises. No-op when stock is already there.
    if ((armory[item] ?? 0) <= 0 && (inventory[item] ?? 0) > 0) donateToArmory(item, 1);
    equipVillagerGear(villager!.id, slot);
  }

  /** dropping a plate tile straight onto a tier tile — swapping in place is
   *  the store's job (it hands the old plate back), so unlike the helmet this
   *  doesn't have to refuse a drop onto an occupied slot */
  function onPlateDrop(e: React.DragEvent, tier: (typeof CHESTPLATES)[number]) {
    e.preventDefault();
    const item = e.dataTransfer.getData('text/plain') as ItemId;
    if (item !== tier.item) return;
    if ((armory[item] ?? 0) <= 0 && (inventory[item] ?? 0) > 0) donateToArmory(item, 1);
    equipVillagerChestplate(villager!.id, tier.id);
  }

  return (
    <PanelFrame title={<>Equip {villager.name}</>}>
      <div className="equip-layout">
        <RotatablePreview
          config={config}
          height={2.2}
          clip="anim_r_restpose"
          className="equip-preview"
          cameraZ={4.4}
          // what they would be seen wearing in the world: a weapon only on a
          // sworn defender (Defenders.tsx draws it; an ordinary villager's
          // figure has none), armor and a carrier on anyone
          held={(rig) => <LoadoutGear rig={rig} loadout={isDefender ? loadout : undefined} gear={villager!.gear} />}
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
                  // Wave 61 (H1) · the CLICK half only — onDrop above stays a
                  // permanent mouse/touch-only drag target (a gamepad has no
                  // virtual cursor to drag with; see GamepadMenuController's
                  // header comment). Mirrors the click guard: nothing to do
                  // with no stock and nothing worn, so it's out of the rove.
                  role={available ? 'button' : undefined}
                  tabIndex={available ? 0 : -1}
                  onKeyDown={available ? onKeyActivate(() => toggle(slot)) : undefined}
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
                  onClick={() => toggleChestplate(worn, stock, c)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onPlateDrop(e, c)}
                  role={available ? 'button' : undefined}
                  tabIndex={available ? 0 : -1}
                  onKeyDown={available ? onKeyActivate(() => toggleChestplate(worn, stock, c)) : undefined}
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
              {villager.name} doesn't fight back like a defender, but a little armor still makes them
              harder to knock down — extra vigour to weather a stray blow in a raid, not extra bite.
            </div>
          )}
        </div>
      </div>
      <AppearanceSection villager={villager} />
      <ArmorySection />
    </PanelFrame>
  );
}
