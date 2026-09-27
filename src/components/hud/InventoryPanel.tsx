'use client';
// Satchel panel: the paperdoll/weapon picker (EquipmentSection), the parts bin and the satchel grid.
import { useEffect, useState } from 'react';
import { createPortal } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { useAppStore } from '@/game/store/appStore';
import { resolveInputDevice } from '@/game/inputMode';
import { brickFor, brickLabel } from '@/game/data/brickResources';
import RotatablePreview from '../character/RotatablePreview';
import AllegianceMeter from './AllegianceMeter';
import { HeldSword, HeldHalberd, HeldSpear, ArmShield, HeldHelmet, Chestplate } from '../character/Equipment';
import { EDIBLES, ITEMS, UTILITY_POTIONS, consumeVerb } from '@/game/data/items';
import { CHESTPLATES, bestChestplateOwned } from '@/game/data/armor';
import { activeMelee, bestMeleeTierOwned, combatState, isMeleeSlot, ownsMeleeSlot, weaponSlotOfItem, type WeaponSlot } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { BULK_GOODS, isBulkGood, storageCapacity } from '@/game/storage';
import { gamepadButtonLabel } from '@/game/data/gamepadInput';
import type { ItemId } from '@/game/types';
import Ico from '../ui/Ico';
import { onKeyActivate } from '../ui/a11yClick';
import PanelFrame from './PanelFrame';

/** Rotatable paperdoll of the player's own character with a real weapon/shield
 *  slot picker — clicking an owned weapon writes straight into combatState,
 *  the same field Viewmodel.tsx/PlayerAvatar.tsx already read, so it's live
 *  in the world immediately with no separate "apply" step. */
function EquipmentSection() {
  const character = useGameStore((s) => s.character);
  const inventory = useGameStore((s) => s.inventory);
  // `melee` is activeMelee(), not the raw preference — a tile must not read as
  // selected for a weapon that is no longer in the Satchel (it would be drawn
  // 'locked' and 'selected' at the same time)
  const [loadout, setLoadout] = useState({
    weapon: combatState.weapon, ranged: combatState.rangedWeapon, melee: activeMelee(),
  });

  useEffect(() => {
    const t = setInterval(() => {
      setLoadout({ weapon: combatState.weapon, ranged: combatState.rangedWeapon, melee: activeMelee() });
    }, 150);
    return () => clearInterval(t);
  }, []);

  if (!character) return null;
  // Wave 49 (C1) · owns ANY tier, not just the base item — a Forged/Crested
  // sword or halberd re-forges (consumes) the tier below it, so a flat
  // inventory.sword/halberd count would wrongly read as unowned the moment
  // either is upgraded.
  const hasSword = ownsMeleeSlot('sword', inventory);
  const hasShield = (inventory.shield ?? 0) > 0;
  const hasCrossbow = (inventory.crossbow ?? 0) > 0;
  const hasLongbow = (inventory.longbow ?? 0) > 0;
  const hasHalberd = ownsMeleeSlot('halberd', inventory);
  const hasSpear = (inventory.spear ?? 0) > 0;
  // the best tier of each currently owned, for the paperdoll's own held
  // model — mirrors how `plate` (below) already reads the best chestplate
  const swordTier = bestMeleeTierOwned('sword', inventory) ?? 'base';
  const halberdTier = bestMeleeTierOwned('halberd', inventory) ?? 'base';
  const hasHelmet = (inventory.helmet ?? 0) > 0;
  // Wave 9 · armor is tiered now (data/armor.ts). There is no armor equip
  // slot — owning a plate IS wearing it, the same rule armorReduction uses —
  // so the paperdoll and the tiles below both key off the best one owned.
  const plate = bestChestplateOwned(inventory);
  const active = loadout.weapon === 'melee' ? loadout.melee : loadout.ranged;

  const weapons: { kind: WeaponSlot; icon: string; name: string; owned: boolean }[] = [
    { kind: 'sword', icon: '⚔️', name: 'Sword', owned: hasSword },
    { kind: 'halberd', icon: '🔱', name: 'Halberd', owned: hasHalberd },
    { kind: 'spear', icon: '🗡️', name: 'Spear', owned: hasSpear },
    { kind: 'crossbow', icon: '🏹', name: 'Crossbow', owned: hasCrossbow },
    { kind: 'longbow', icon: '🏹', name: 'Longbow', owned: hasLongbow },
  ];

  function equip(kind: WeaponSlot, owned: boolean) {
    if (!owned) return;
    // Wave 7 · melee is a three-way choice now, so which SUB-selector this
    // writes depends on the family rather than on "is it the sword"
    const melee = isMeleeSlot(kind);
    combatState.weapon = melee ? 'melee' : 'ranged';
    if (melee) combatState.meleeWeapon = kind;
    else combatState.rangedWeapon = kind;
    audio.play('brick_connect', 0.6);
    setLoadout({ weapon: combatState.weapon, ranged: combatState.rangedWeapon, melee: activeMelee() });
  }

  // drag-and-drop: dragging any owned weapon tile onto the row equips it —
  // the same effect as clicking it, just with the "drag it into a slot" feel
  function onWeaponDrop(e: React.DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData('text/plain') as WeaponSlot;
    const w = weapons.find((x) => x.kind === kind);
    if (w) equip(w.kind, w.owned);
  }

  return (
    <div className="equip-layout" style={{ marginBottom: 22 }}>
      <RotatablePreview
        config={character}
        height={2.2}
        clip="anim_r_restpose"
        className="equip-preview"
        cameraZ={4.4}
        held={(rig) => (
          <>
            {/* the paperdoll holds what is READIED (Wave 7), so clicking a
                tile below is visibly answered by the figure, not just by a
                highlight — falls back to the sword the way it always did */}
            {hasHalberd && active === 'halberd' && createPortal(<HeldHalberd side={-1} tier={halberdTier} />, rig.joints.rightarm)}
            {hasSpear && active === 'spear' && createPortal(<HeldSpear side={-1} />, rig.joints.rightarm)}
            {hasSword && active !== 'halberd' && active !== 'spear' && createPortal(<HeldSword side={-1} tier={swordTier} />, rig.joints.rightarm)}
            {hasShield && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
            {hasHelmet && createPortal(<HeldHelmet />, rig.joints.head)}
            {plate && createPortal(<Chestplate tier={plate.id} />, rig.joints.body)}
          </>
        )}
      />
      <div className="equip-slots">
        {/* where you stand between the houses — part of the character's
            stats, alongside their gear (E19) */}
        <div className="creator-section">Allegiance</div>
        <AllegianceMeter />
        <div className="creator-section">Weapon</div>
        <div className="equip-tile-row" onDragOver={(e) => e.preventDefault()} onDrop={onWeaponDrop}>
          {weapons.map((w) => (
            <div
              key={w.kind}
              className={`equip-tile ${w.owned ? 'owned' : 'locked'} ${active === w.kind ? 'selected' : ''}`}
              draggable={w.owned}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', w.kind)}
              onClick={() => equip(w.kind, w.owned)}
              // Wave 61 (H1) · the CLICK half only — the drag-to-equip half
              // above stays mouse/touch-only, a deliberate, permanent scope
              // cut (see GamepadMenuController.tsx's header comment).
              role="button"
              tabIndex={0}
              onKeyDown={onKeyActivate(() => equip(w.kind, w.owned))}
              title={w.owned ? `Equip ${w.name} (click or drag)` : `Craft a ${w.name} first`}
            >
              <div className="icon">{w.owned ? w.icon : '🔒'}</div>
              <div className="name">{w.name}</div>
            </div>
          ))}
        </div>
        <div className="creator-section">Armor</div>
        <div className="equip-tile-row">
          <div className={`equip-tile ${hasShield ? 'owned selected' : 'locked'}`} style={{ cursor: 'default' }}>
            <div className="icon">{hasShield ? '🛡️' : '🔒'}</div>
            <div className="name">Shield</div>
          </div>
          <div className={`equip-tile ${hasHelmet ? 'owned selected' : 'locked'}`} style={{ cursor: 'default' }}>
            <div className="icon">{hasHelmet ? '🪖' : '🔒'}</div>
            <div className="name">Helm</div>
          </div>
          {/* Wave 9 · one tile per plate tier, worst to best. Only the best one
              owned reads as worn, because only that one counts — the lesser
              plates are still in the Satchel (and are the Forge's ingredient
              for the next rung up), so they show as owned-but-outclassed
              rather than vanishing. */}
          {CHESTPLATES.map((c) => {
            const owned = (inventory[c.item] ?? 0) > 0;
            const worn = plate?.id === c.id;
            return (
              <div
                key={c.id}
                className={`equip-tile ${worn ? 'owned selected' : owned ? 'owned' : 'locked'}`}
                style={{ cursor: 'default', opacity: owned && !worn ? 0.7 : 1 }}
                title={owned
                  ? `${c.label} — ${c.blurb} (${Math.round(c.reduction * 100)}% less damage taken)${worn ? '' : ' · outclassed by the better plate you own'}`
                  : `${c.label} — forge one to wear it`}
              >
                <div className="icon">{owned ? c.icon : '🔒'}</div>
                <div className="name">{c.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            className="menu-btn small"
            style={{ margin: 0, width: 'auto', padding: '5px 12px' }}
            onClick={() => useGameStore.getState().setPanel('appearance')}
          >
            <Ico e="🎽" /> Change Appearance
          </button>
          <button
            className="menu-btn small"
            style={{ margin: 0, width: 'auto', padding: '5px 12px' }}
            onClick={() => useGameStore.getState().setPanel('bestiary')}
          >
            <Ico e="📖" /> Collection Book
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--parchment-dark)', marginTop: 6 }}>
          Drag the figure to look it over. Q also cycles your active weapon out in the field.
          Worn armor reduces incoming damage passively — a shield block still stacks on top.
        </div>
      </div>
    </div>
  );
}

export default function InventoryPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const addItems = useGameStore((s) => s.addItems);
  const notify = useGameStore((s) => s.notify);
  const buildings = useGameStore((s) => s.buildings);
  const entries = Object.entries(inventory).filter(([, n]) => (n ?? 0) > 0);
  const [showControls, setShowControls] = useState(false);
  // Wave 15: the one representative cheat-sheet made device-aware (see
  // game/inputMode.ts) — this WASD/keyboard block was already meaningless to
  // a gamepad or touch player (and already hidden outright under 720px via
  // .controls-ref's own media rule, which is a viewport check, not a device
  // one — a gamepad on a full-size screen never hit that breakpoint).
  const inputModeSetting = useAppStore((s) => s.settings.inputMode);
  const activeDevice = useGameStore((s) => s.activeInputDevice);
  const controlsDevice = resolveInputDevice(inputModeSetting, activeDevice);
  // Wave 61 (H1) · jump/interact/sprint (and every other gamepad action) are
  // all independently rebindable now, so this cheat sheet reads the LIVE
  // button table instead of a hardcoded default label — a rebound player
  // sees their own actual buttons, not a stale "A"/"X"/"RB".
  const gpBtn = useAppStore((s) => s.settings.gamepadButtons);
  // Wave 9 · the storage ceiling has to be VISIBLE somewhere before it bites,
  // or the first refusal toast reads as a bug. This is the one screen that
  // already shows what you're holding, so it shows the room left too.
  const cap = storageCapacity(buildings);
  const atCap = BULK_GOODS.filter((id) => (inventory[id] ?? 0) >= cap);

  function eat(id: ItemId) {
    const vigour = EDIBLES[id];
    if (!vigour) return;
    if (combatState.hp >= combatState.maxHp) {
      notify('You are already full of vigor.');
      return;
    }
    addItems({ [id]: -1 });
    combatState.hp = Math.min(combatState.maxHp, combatState.hp + vigour);
    audio.play('villager', 0.4);
    notify(`You ${consumeVerb(id)} the ${ITEMS[id].name.toLowerCase()} (+${vigour} vigour)`);
  }

  function drinkPotion(id: ItemId) {
    addItems({ [id]: -1 });
    audio.play('villager', 0.4);
    if (id === 'potion_stamina') {
      combatState.stamina = combatState.maxStamina;
      notify('Stamina restored!');
    } else if (id === 'potion_nightvision') {
      worldEnv.nightVisionUntil = performance.now() + 60000;
      notify('Your eyes sharpen in the dark (60s)…');
    }
  }

  function use(id: ItemId) {
    if (EDIBLES[id]) eat(id);
    else if (UTILITY_POTIONS.includes(id)) drinkPotion(id);
  }

  // building materials go in the parts bin; everything else stays a satchel
  // item, because a fish is not a brick
  const parts = entries.filter(([id]) => !!brickFor(id as ItemId));
  const rest = entries.filter(([id]) => !brickFor(id as ItemId));

  return (
    <PanelFrame title="Equipment & Satchel">
      <EquipmentSection />
      {/* J45 · the parts bin. Gathered materials are REAL CATALOGUE PIECES,
          so they show their own rendered thumbnail and the piece's name —
          "Stone Brick 2x2", not an abstract count of "stone" — and they file
          into their own drawer ahead of tools and stores. */}
      <div className="creator-section" style={{ marginBottom: 10 }}>Parts Bin</div>
      <div style={{ fontSize: 11.5, color: atCap.length ? 'var(--gold)' : 'var(--parchment-dark)', marginBottom: 8 }}>
        Stores hold <b>{cap}</b> of each good.
        {atCap.length
          ? ` Full: ${atCap.map((id) => ITEMS[id]?.name ?? id).join(', ')} — anything more is turned away. Raise a Stockpile or Storehouse, or spend what you have.`
          : ' Raise a Stockpile or Storehouse to keep more.'}
      </div>
      {parts.length === 0 && <div className="loading-note">No pieces yet. The woods await…</div>}
      <div className="inv-grid">
        {parts.map(([id, n]) => {
          const def = ITEMS[id as ItemId];
          const brick = brickFor(id as ItemId)!;
          const full = isBulkGood(id as ItemId) && (n ?? 0) >= cap;
          return (
            <div
              className="inv-slot brick"
              key={id}
              style={full ? { borderColor: 'var(--gold)' } : undefined}
              title={`${brickLabel(id as ItemId, def?.name ?? id)} — gathered as ${def?.name ?? id}${isBulkGood(id as ItemId) ? ` · ${n}/${cap} stored${full ? ' (FULL)' : ''}` : ''}`}
            >
              <img className="brick-thumb" src={brick.thumb} alt="" />
              <div className="iname">{brickLabel(id as ItemId, def?.name ?? id)}</div>
              {(n ?? 0) > 1 && <div className="count">{n}</div>}
            </div>
          );
        })}
      </div>
      <div className="creator-section" style={{ margin: '14px 0 10px' }}>Satchel</div>
      {rest.length === 0 && parts.length === 0 && <div className="loading-note">Empty. The woods await…</div>}
      <div className="inv-grid">
        {rest.map(([id, n]) => {
          const def = ITEMS[id as ItemId];
          const vigour = EDIBLES[id as ItemId];
          const usable = !!vigour || UTILITY_POTIONS.includes(id as ItemId);
          // bread is eaten, a draught is drunk — see consumeVerb (data/items.ts)
          const verb = consumeVerb(id as ItemId);
          const hint = vigour ? `click to ${verb} (+${vigour} vigour)` : usable ? `click to ${verb}` : undefined;
          // the food half of BULK_GOODS (fish, bread, herb, flowers) files
          // here rather than in the Parts Bin, so the cap has to read the
          // same way on this grid too
          const capped = isBulkGood(id as ItemId);
          const full = capped && (n ?? 0) >= cap;
          const stored = capped ? ` · ${n}/${cap} stored${full ? ' (FULL)' : ''}` : '';
          // Wave 51 (C5) · any weapon-family item (base or a tiered re-forge)
          // is a real drag SOURCE here, same mechanism EquipmentSection's own
          // weapon row already proved — dataTransfer carries the resolved
          // base WeaponSlot (not the raw item id), so it lands on that row's
          // existing onWeaponDrop unchanged. Helmet/chestplate/carrier items
          // have no reachable same-panel drop target this wave and stay
          // click-only (donate via NpcEquipPanel's own Armory row).
          const weaponSlot = weaponSlotOfItem(id as ItemId);
          return (
            <div
              className="inv-slot"
              key={id}
              title={`${hint ? `${def?.name} — ${hint}` : def?.name}${stored}${weaponSlot ? ' · drag onto your Weapon row to equip' : ''}`}
              style={full ? { cursor: usable ? 'pointer' : undefined, borderColor: 'var(--gold)' } : usable ? { cursor: 'pointer', borderColor: '#7a9a4f' } : undefined}
              draggable={!!weaponSlot}
              onDragStart={weaponSlot ? (e) => e.dataTransfer.setData('text/plain', weaponSlot) : undefined}
              onClick={() => usable && use(id as ItemId)}
              // Wave 61 (H1) · click-to-eat/drink only — a stored weapon's
              // drag-to-equip (above) has no click equivalent to wire up here
              // at all, so it's excluded the same way NOT setting tabIndex
              // already excludes every other non-actionable tile.
              role={usable ? 'button' : undefined}
              tabIndex={usable ? 0 : -1}
              onKeyDown={usable ? onKeyActivate(() => use(id as ItemId)) : undefined}
            >
              <div className="icon"><Ico e={def?.icon ?? '❔'} /></div>
              <div className="iname">{def?.name ?? id}</div>
              {(n ?? 0) > 1 && <div className="count">{n}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--parchment-dark)', marginTop: 10 }}>
        Green-edged food and draughts can be drunk/eaten from here — restoring vigour, stamina, or (for the Night-Vision Brew) sharpening your eyes in the dark for a minute.
      </div>
      <button
        className="menu-btn small controls-toggle"
        style={{ margin: '14px 0 0', width: 'auto', padding: '5px 10px' }}
        onClick={() => setShowControls((v) => !v)}
      >
        🎮 Controls {showControls ? '▾' : '▸'}
      </button>
      {showControls && controlsDevice === 'gamepad' && (
        <div className="controls-ref">
          <b>L-Stick</b>/D-pad move · <b>{gamepadButtonLabel(gpBtn.sprint)}</b> sprint · <b>{gamepadButtonLabel(gpBtn.jump)}</b> jump · <b>{gamepadButtonLabel(gpBtn.interact)}</b> interact<br />
          <b>{gamepadButtonLabel(gpBtn.attack)}</b> attack/draw · <b>{gamepadButtonLabel(gpBtn.block)}</b> block/aim · <b>{gamepadButtonLabel(gpBtn.swapWeapon)}</b> swap weapon<br />
          <b>R-Stick</b> look · <b>{gamepadButtonLabel(gpBtn.menuInventory)}</b> satchel · <b>{gamepadButtonLabel(gpBtn.menuCrafting)}</b> craft · <b>{gamepadButtonLabel(gpBtn.menuQuests)}</b> quests<br />
          <b>{gamepadButtonLabel(gpBtn.pause)}</b> pause/back · <b>{gamepadButtonLabel(gpBtn.cancel)}</b> cancel · <b>{gamepadButtonLabel(gpBtn.confirm)}</b> confirm (in-panel) · <b>{gamepadButtonLabel(gpBtn.dodge)}</b> dodge
        </div>
      )}
      {showControls && controlsDevice === 'touch' && (
        <div className="controls-ref">
          Joystick to move · drag the screen to look<br />
          <b>»</b> sprint · <b>⤒</b> jump · <b>🛡</b> block/aim · <b>E</b> interact · <b>⚔</b> attack/draw<br />
          Tap a hotbar/menu button on screen for everything else
        </div>
      )}
      {showControls && controlsDevice === 'keyboard' && (
        <div className="controls-ref">
          <b>WASD</b> move · <b>Shift</b> sprint · <b>Space</b> jump · <b>E</b> interact<br />
          <b>I</b> satchel · <b>C</b> craft · <b>J</b> quests · <b>K</b> abilities<br />
          <b>V</b> camera · <b>G</b> emotes · <b>M</b> map · <b>N</b> roster · <b>L</b> lore<br />
          <b>T</b> orders · <b>B</b> build view · <b>H</b> how to play · <b>Esc</b> menu
        </div>
      )}
    </PanelFrame>
  );
}
