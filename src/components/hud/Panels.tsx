'use client';
// In-game overlay panels: inventory, crafting, quest log, skills.
import { useEffect, useState } from 'react';
import { createPortal } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { brickFor, brickLabel } from '@/game/data/brickResources';
import EmoteWheel from './EmoteWheel';
import MenuTabs from './MenuTabs';
import DialoguePanel from './DialoguePanel';
import ShopPanel from './ShopPanel';
import VillagersPanel from './VillagersPanel';
import TravelPanel from './TravelPanel';
import ChroniclePanel from './ChroniclePanel';
import NpcEquipPanel from './NpcEquipPanel';
import QuestLogPanel from './QuestLogPanel';
import BuildingMenuPanel from './BuildingMenuPanel';
import WorkshopPanel from './WorkshopPanel';
import KeepSocketPanel from './KeepSocketPanel';
import StationMenuPanel from './StationMenuPanel';
import RotatablePreview from '../character/RotatablePreview';
import AppearancePanel from './AppearancePanel';
import BestiaryPanel from './BestiaryPanel';
import AllegianceMeter from './AllegianceMeter';
import { HeldSword, HeldHalberd, HeldSpear, ArmShield, HeldHelmet, Chestplate } from '../character/Equipment';
import { EDIBLES, ITEMS, UTILITY_POTIONS, consumeVerb } from '@/game/data/items';
import { CHESTPLATES, bestChestplateOwned } from '@/game/data/armor';
import { activeMelee, combatState, isMeleeSlot, type WeaponSlot } from '@/game/combat';
import { cedricFinalStandReady, startCedricDuel } from '@/game/cedricSiege';
import { CEDRIC_CAMP } from '@/game/data/world';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { RECIPES, STATION_LABELS, STATION_TABS, UNLOCK_HINTS } from '@/game/data/recipes';
import { SKILLS, levelFromXp, perkSlotsEarned, xpForLevel } from '@/game/data/ranks';
import { DEEDS } from '@/game/data/achievements';
import { PERKS, PERK_BY_ID } from '@/game/data/perks';
import { sideQuestsOf } from '@/game/data/npcs';
import { CHALLENGES, challengeProgress } from '@/game/data/challenges';
import { GUILD_BY_ID, GUILD_BY_WORLD, guildEligible, SWITCH_TITHE } from '@/game/data/guilds';
import { TALENTS, talentPointsEarned, talentPointsSpent, talentBuyable } from '@/game/data/skillTree';
import { PLAYER_ATTRS, ATTR_POINT_EVERY, attrPointsEarned, attrPointsSpent, respecCost } from '@/game/data/playerAttributes';
import { BULK_GOODS, isBulkGood, storageCapacity } from '@/game/storage';
import type { ItemId, Recipe } from '@/game/types';
import Ico from '../ui/Ico';

function PanelFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const setPanel = useGameStore((s) => s.setPanel);
  // every PanelFrame user is part of the one-stop menu family, so the shared
  // tab bar rides along automatically (Roster/Lore add it in their own frames)
  return (
    <div className="game-panel clickable menu-family">
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <MenuTabs />
      <h2>{title}</h2>
      <div className="panel-scroll">{children}</div>
    </div>
  );
}

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
  const hasSword = (inventory.sword ?? 0) > 0;
  const hasShield = (inventory.shield ?? 0) > 0;
  const hasCrossbow = (inventory.crossbow ?? 0) > 0;
  const hasLongbow = (inventory.longbow ?? 0) > 0;
  const hasHalberd = (inventory.halberd ?? 0) > 0;
  const hasSpear = (inventory.spear ?? 0) > 0;
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
            {hasHalberd && active === 'halberd' && createPortal(<HeldHalberd side={-1} />, rig.joints.rightarm)}
            {hasSpear && active === 'spear' && createPortal(<HeldSpear side={-1} />, rig.joints.rightarm)}
            {hasSword && active !== 'halberd' && active !== 'spear' && createPortal(<HeldSword side={-1} />, rig.joints.rightarm)}
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

function InventoryPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const addItems = useGameStore((s) => s.addItems);
  const notify = useGameStore((s) => s.notify);
  const buildings = useGameStore((s) => s.buildings);
  const entries = Object.entries(inventory).filter(([, n]) => (n ?? 0) > 0);
  const [showControls, setShowControls] = useState(false);
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
          return (
            <div
              className="inv-slot"
              key={id}
              title={`${hint ? `${def?.name} — ${hint}` : def?.name}${stored}`}
              style={full ? { cursor: usable ? 'pointer' : undefined, borderColor: 'var(--gold)' } : usable ? { cursor: 'pointer', borderColor: '#7a9a4f' } : undefined}
              onClick={() => usable && use(id as ItemId)}
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
      {showControls && (
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

const DEGRADABLE_TOOLS: ItemId[] = ['axe', 'pickaxe', 'fishing_rod', 'sword'];

type CraftSort = 'default' | 'az' | 'craftable';

/** Station-specific crafting menus (overhauled 2026-07-20): the old panel
 *  dumped all 19 recipes across 4 stations into one flat, ever-growing list
 *  — "one big massive convoluted mess." Recipes are now grouped into a
 *  station tab bar (mirroring how the world actually gates them — you can't
 *  smelt a bar without a Forge), defaulting to wherever you're actually
 *  standing, plus a text search and a sort/filter pass for cutting through
 *  a single busy station (the Workbench alone still has 7 recipes). */
function CraftingPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const unlocks = useGameStore((s) => s.unlocks);
  const nearStations = useGameStore((s) => s.nearStations);
  const craft = useGameStore((s) => s.craft);
  const canAfford = useGameStore((s) => s.canAfford);
  const durability = useGameStore((s) => s.durability);
  const repairTool = useGameStore((s) => s.repairTool);

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
            const recipe = RECIPES.find((r) => r.output === id);
            // the axe is a starting tool with no recipe of its own — same
            // flat fallback base cost the store's repairTool action uses
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

// Quest Log moved to its own file (QuestLogPanel.tsx) — a regional parchment
// journal replacing this flat list, see that file's header comment.

// Phase 19 alliance branch: parley at Cedric's camp for an unsworn knight —
// the one place the "bad" pledge is offered. Cedric isn't an NpcDef (he's an
// EnemyKind boss), so this is its own small panel rather than DialoguePanel.
function ParleyPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const pledgeAlliance = useGameStore((s) => s.pledgeAlliance);
  const finalStandReady = useGameStore((s) => cedricFinalStandReady(s));
  const challenge = () => {
    setPanel('none');
    const finalStand = startCedricDuel(useGameStore.getState());
    audio.play('warcry', 0.9);
    audio.playVoice('greeting_cedric', 0.85);
    useGameStore.getState().notify(
      finalStand
        ? 'Cedric the Bull roars: "This ends here, would-be knight!"'
        : 'Cedric the Bull sneers: "Come to lose your head, have you?"',
      true,
    );
  };
  // War council (Phase 20 4b): a sworn bannerman gets rebellion errands
  // instead of the recruitment pitch — the same sideQuest machinery every
  // court NPC uses, with Cedric's own quest pool (sideQuestsOf('cedric'))
  const alliance = useGameStore((s) => s.alliance);
  const sideQuest = useGameStore((s) => s.sideQuest);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const acceptSideQuest = useGameStore((s) => s.acceptSideQuest);
  const turnInSideQuest = useGameStore((s) => s.turnInSideQuest);
  const abandonSideQuest = useGameStore((s) => s.abandonSideQuest);
  if (alliance === 'cedric') {
    const pool = sideQuestsOf('cedric');
    const offer = pool[(completedQuests.length + pool.length) % pool.length];
    const mine = sideQuest?.npcId === 'cedric' ? sideQuest : null;
    const mineDef = mine ? pool.find((q) => q.id === mine.questId) : null;
    return (
      <div className="game-panel clickable" style={{ minWidth: 'min(520px, 94vw)' }}>
        <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
        <h2>War Council</h2>
        <div style={{ fontSize: 15.5, lineHeight: 1.6, marginBottom: 14 }}>
          “Ah, my favorite turncoat. The crown bleeds a little more every day — and you&apos;re
          going to open the vein. What do you have for me?”
        </div>
        {mine && mineDef && (
          <div className="quest-item">
            <div className="q-name">🐂 {mineDef.label}</div>
            <div className="q-desc">Progress: {mine.have}/{mineDef.need} · Reward: {mineDef.xp} {mineDef.xpSkill} XP</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="menu-btn small"
                style={{ margin: 0 }}
                disabled={mine.have < mineDef.need}
                onClick={turnInSideQuest}
              >
                {mine.have >= mineDef.need ? 'Turn In' : 'Not finished yet'}
              </button>
              <button className="menu-btn small danger" style={{ margin: 0 }} onClick={abandonSideQuest}>
                Abandon
              </button>
            </div>
          </div>
        )}
        {!sideQuest && offer && (
          <div className="quest-item">
            <div className="q-name">⚔ {offer.label}</div>
            <div className="q-desc">Reward: {offer.xp} {offer.xpSkill} XP</div>
            <button className="menu-btn small" style={{ margin: '8px 0 0' }} onClick={() => acceptSideQuest('cedric', offer.id)}>
              Take the Job
            </button>
          </div>
        )}
        {sideQuest && sideQuest.npcId !== 'cedric' && (
          <div style={{ fontSize: 13, color: 'var(--parchment-dark)' }}>
            You already carry an errand for someone else. Finish it first.
          </div>
        )}
        <button className="menu-btn" style={{ marginTop: 14 }} onClick={() => setPanel('none')}>
          Leave the council
        </button>
      </div>
    );
  }
  return (
    <div className="game-panel clickable" style={{ minWidth: 'min(520px, 94vw)' }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>Cedric the Bull</h2>
      <div style={{ fontSize: 15.5, lineHeight: 1.6, marginBottom: 14 }}>
        “Well, well — Leo&apos;s newest little knight, alone in my woods. You&apos;ve got iron in you,
        I&apos;ll grant that. So here&apos;s my offer: kneel to that gilded fool in his keep… or ride
        with ME, and we&apos;ll take this kingdom apart brick by brick. Choose.”
      </div>
      <div className="quest-item">
        <div className="q-name">🐂 Join Cedric&apos;s Rebellion</div>
        <div className="q-desc">
          Pledge to the Bull. His raiders will never again touch your homestead — but the
          crown&apos;s knights will come for you instead, and the King will not forget.
        </div>
        <button className="menu-btn small" style={{ margin: '8px 0 0' }} onClick={() => pledgeAlliance('cedric')}>
          Clasp arms with Cedric
        </button>
      </div>
      <div className="quest-item">
        <div className="q-name">⚔ Challenge Him to Battle</div>
        <div className="q-desc">
          {finalStandReady
            ? 'His Final Stand — answer his offer with steel, and finish this for good.'
            : 'Answer his offer with steel — he fights for real, but has not yet earned his final defeat.'}
        </div>
        <button className="menu-btn small danger" style={{ margin: '8px 0 0' }} onClick={challenge}>
          {finalStandReady ? 'Draw your sword — His Final Stand' : 'Draw your sword'}
        </button>
      </div>
      <button className="menu-btn" style={{ marginTop: 14 }} onClick={() => setPanel('none')}>
        Walk away
      </button>
    </div>
  );
}

// Guild hall (Phase 21): shown at the hall of whichever guild lives in the
// current instance. Join gated on the matching Challenge tier; changing an
// existing banner costs the transfer tithe.
function GuildPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const destination = useGameStore((s) => s.destination);
  const stats = useGameStore((s) => s.stats);
  const myGuild = useGameStore((s) => s.guild);
  const joinGuild = useGameStore((s) => s.joinGuild);
  const g = destination ? GUILD_BY_WORLD[destination] : null;
  if (!g) return null;
  const eligible = guildEligible(g, stats);
  const track = CHALLENGES.find((c) => c.id === g.challengeId)!;
  const { value } = challengeProgress(track, stats);
  const isMine = myGuild === g.id;
  return (
    <div className="game-panel clickable" style={{ minWidth: 'min(520px, 94vw)' }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2><Ico e={g.icon} /> {g.name}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 14, fontStyle: 'italic', color: 'var(--parchment-dark)' }}>
        “{g.blurb}”
      </div>
      <div className="quest-item">
        <div className="q-name">✦ {g.passiveLabel}</div>
        <div className="q-desc">{g.passiveDesc} (active while you carry this banner)</div>
      </div>
      <div className="quest-item">
        <div className="q-name">Membership</div>
        <div className="q-desc">
          Requires: {track.tiers[0].label} ({track.tiers[0].threshold} {track.unit} — you have {value}).
          {myGuild && !isMine ? ` Changing banners costs a ${SWITCH_TITHE} gold tithe.` : ''}
        </div>
        {isMine ? (
          <div style={{ fontSize: 13.5, color: 'var(--gold)', marginTop: 8 }}>⚑ This is your banner.</div>
        ) : (
          <button
            className="menu-btn small"
            style={{ margin: '8px 0 0' }}
            disabled={!eligible}
            onClick={() => joinGuild(g.id)}
          >
            {eligible ? (myGuild ? `Change banners (${SWITCH_TITHE} gold)` : 'Take up the banner') : 'Not yet proven'}
          </button>
        )}
      </div>
      {myGuild && !isMine && (
        <div style={{ fontSize: 12.5, color: 'var(--parchment-dark)' }}>
          You currently carry the banner of the {GUILD_BY_ID[myGuild]?.name ?? myGuild}.
        </div>
      )}
      <button className="menu-btn" style={{ marginTop: 14 }} onClick={() => setPanel('none')}>
        Leave the hall
      </button>
    </div>
  );
}

// The Talent Tree (Phase 21): seven skill branches, three tiers each, node
// icons drawn from the original game's own assets (piece thumbnails, the
// castle-stone sprite, a portrait) rather than emoji.
function TalentTree() {
  const xp = useGameStore((s) => s.xp);
  const skillTree = useGameStore((s) => s.skillTree);
  const buyTalent = useGameStore((s) => s.buyTalent);
  const earned = talentPointsEarned(xp);
  const unspent = earned - talentPointsSpent(skillTree);
  return (
    <>
      <div className="creator-section" style={{ marginTop: 16 }}>
        Talent Tree — {unspent} unspent point{unspent === 1 ? '' : 's'} ({earned} earned, 1 per total level)
      </div>
      <div className="talent-grid" style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {SKILLS.map((s) => (
          <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ textAlign: 'center', fontSize: 15 }} title={s.name}><Ico e={s.icon} /></div>
            {TALENTS.filter((t) => t.skill === s.id).map((t) => {
              const owned = skillTree.includes(t.id);
              const check = talentBuyable(t, skillTree, xp);
              return (
                <div
                  key={t.id}
                  onClick={() => !owned && buyTalent(t.id)}
                  title={`${t.name} — ${t.desc}${owned ? ' (learned)' : check.ok ? ` · Learn for ${t.cost} pt` : ` · ${check.why}`}`}
                  style={{
                    textAlign: 'center', padding: '5px 3px', borderRadius: 6,
                    background: 'rgba(0,0,0,0.35)',
                    border: `1px solid ${owned ? 'var(--gold)' : check.ok ? 'var(--chrome)' : 'var(--chrome-2)'}`,
                    opacity: owned ? 1 : check.ok ? 0.9 : 0.4,
                    cursor: owned ? 'default' : check.ok ? 'pointer' : 'default',
                    boxShadow: owned ? '0 0 6px var(--chrome-glow)' : 'none',
                  }}
                >
                  <img
                    src={t.icon}
                    alt={t.name}
                    style={{
                      width: 30, height: 30, objectFit: 'cover', borderRadius: 4,
                      filter: owned || check.ok ? 'none' : 'grayscale(1) brightness(0.7)',
                    }}
                  />
                  <div style={{ fontSize: 9.5, marginTop: 2, color: owned ? 'var(--gold)' : 'var(--parchment-dark)', lineHeight: 1.15 }}>
                    {t.name}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

/** The champion's attribute sheet: points earned by total level, invested
 *  permanently — each amplifies a family of skill outcomes (AI-wave-2). */
function AttributesSection() {
  const xp = useGameStore((s) => s.xp);
  const attrSpent = useGameStore((s) => s.attrSpent);
  const spendAttrPoint = useGameStore((s) => s.spendAttrPoint);
  const respecAttributes = useGameStore((s) => s.respecAttributes);
  const gold = useGameStore((s) => s.inventory.gold ?? 0);
  // Wave 9 · a respec is irreversible spending, and this codebase has exactly
  // one confirmation precedent (a bare window.confirm in MainMenu) — rather
  // than reach for a browser dialog inside the game HUD, the button arms
  // itself on the first click and commits on the second, then disarms. Local
  // state on purpose: it must reset the moment the panel closes.
  const [arming, setArming] = useState(false);
  const totalLevel = SKILLS.reduce((t, s) => t + levelFromXp(xp[s.id]), 0);
  const earned = attrPointsEarned(totalLevel);
  const spent = attrPointsSpent(attrSpent);
  const free = earned - spent;
  const cost = respecCost(spent);
  const canRespec = spent > 0 && gold >= cost;
  return (
    <>
      <div className="creator-section" style={{ marginTop: 16 }}>
        Attributes {free > 0 ? `— ${free} point${free > 1 ? 's' : ''} to spend!` : `(next at total level ${(earned + 1) * ATTR_POINT_EVERY})`}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {PLAYER_ATTRS.map((a) => {
          const val = attrSpent[a.id] ?? 0;
          return (
            <div
              key={a.id}
              title={a.blurb}
              style={{
                width: 118, padding: '8px 6px', textAlign: 'center',
                background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                border: `1px solid ${val > 0 ? 'var(--gold)' : 'var(--chrome-2)'}`,
              }}
            >
              <div style={{ fontSize: 22 }}><Ico e={a.icon} /></div>
              <div style={{ fontSize: 11.5, marginTop: 2, color: val > 0 ? 'var(--gold)' : 'var(--parchment-dark)' }}>
                {a.label} {val}
              </div>
              <button
                className="menu-btn small"
                style={{ margin: '6px auto 0', width: 'auto', padding: '2px 12px', opacity: free > 0 ? 1 : 0.4 }}
                onClick={() => spendAttrPoint(a.id)}
                disabled={free <= 0}
              >
                +
              </button>
            </div>
          );
        })}
      </div>
      {spent > 0 && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="menu-btn small"
            style={{
              margin: 0, width: 'auto', padding: '5px 12px',
              opacity: canRespec ? 1 : 0.45,
              borderColor: arming ? 'var(--gold)' : undefined,
              color: arming ? 'var(--gold)' : undefined,
            }}
            disabled={!canRespec}
            title={`Hands all ${spent} invested point${spent > 1 ? 's' : ''} back so you can spend them differently. Costs ${cost} gold (you have ${gold}).`}
            onClick={() => {
              if (!arming) { setArming(true); return; }
              setArming(false);
              respecAttributes();
            }}
          >
            {arming ? `✓ Confirm — ${cost} gold` : `↺ Rethink your nature — ${cost} gold`}
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--parchment-dark)' }}>
            {arming
              ? 'Click again to take all your points back.'
              : gold >= cost
                ? `Returns all ${spent} invested point${spent > 1 ? 's' : ''} to the pool.`
                : `You need ${cost - gold} more gold.`}
          </span>
        </div>
      )}
    </>
  );
}

function SkillsPanel() {
  const xp = useGameStore((s) => s.xp);
  const unlocks = useGameStore((s) => s.unlocks);
  const deeds = useGameStore((s) => s.deeds);
  const perks = useGameStore((s) => s.perks);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const choosePerk = useGameStore((s) => s.choosePerk);
  const slotsEarned = perkSlotsEarned(xp, completedQuests);
  const unpicked = PERKS.filter((p) => !perks.includes(p.id));
  // trade-off perks (2026-07-29) get their own row rather than blending into
  // the plain upside five — the point is that the cost is legible BEFORE
  // picking, not just in the tooltip after. Same shared slot budget: picking
  // one is still one fewer of the other kind, not a separate allowance.
  const unpickedPlain = unpicked.filter((p) => !p.tradeoff);
  const unpickedTradeoff = unpicked.filter((p) => p.tradeoff);
  return (
    <PanelFrame title="Abilities">
      {SKILLS.map((s) => {
        const locked = s.unlockFlag && !unlocks.includes(s.unlockFlag);
        const level = levelFromXp(xp[s.id]);
        const cur = xp[s.id] - xpForLevel(level);
        const next = xpForLevel(level + 1) - xpForLevel(level);
        return (
          <div className="skill-row" key={s.id}>
            <div className="s-ico">{locked ? '🔒' : s.icon}</div>
            <div className="s-body">
              <div className="s-name">
                {s.name} {!locked && <span>Lv {level}</span>}
              </div>
              {locked ? (
                <div className="s-locked">Locked — progress the quest line to learn this.</div>
              ) : (
                <>
                  <div className="xpbar"><div style={{ width: `${Math.round((cur / next) * 100)}%` }} /></div>
                  <div style={{ fontSize: 11, color: 'var(--parchment-dark)', marginTop: 3 }}>
                    {cur} / {next} XP to next level
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
      <AttributesSection />
      {perks.length > 0 && (
        <>
          <div className="creator-section" style={{ marginTop: 16 }}>Perks ({perks.length}/{slotsEarned})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {perks.map((id) => {
              const def = PERK_BY_ID[id];
              if (!def) return null;
              return (
                <div
                  key={id}
                  title={`${def.name} — ${def.desc}`}
                  style={{
                    width: 118, padding: '8px 6px', textAlign: 'center',
                    background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid var(--gold)',
                  }}
                >
                  <div style={{ fontSize: 22 }}><Ico e={def.icon} /></div>
                  <div style={{ fontSize: 11, marginTop: 3, color: 'var(--gold)' }}>{def.name}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {perks.length < slotsEarned && (
        <>
          <div className="creator-section" style={{ marginTop: 16 }}>
            A New Strength — choose a permanent gift ({perks.length}/{slotsEarned})
          </div>
          {unpickedPlain.map((p) => (
            <div
              key={p.id}
              className="quest-item"
              style={{ cursor: 'pointer' }}
              onClick={() => choosePerk(p.id)}
            >
              <div className="q-name"><Ico e={p.icon} /> {p.name}</div>
              <div className="q-desc">{p.desc}</div>
            </div>
          ))}
          {unpickedTradeoff.length > 0 && (
            <>
              <div className="creator-section" style={{ marginTop: 12 }}>
                Or — A Calculated Risk (costs something in exchange)
              </div>
              {unpickedTradeoff.map((p) => (
                <div
                  key={p.id}
                  className="quest-item"
                  style={{ cursor: 'pointer', borderColor: 'var(--danger)' }}
                  onClick={() => choosePerk(p.id)}
                >
                  <div className="q-name"><Ico e={p.icon} /> {p.name}</div>
                  <div className="q-desc">{p.desc}</div>
                </div>
              ))}
            </>
          )}
        </>
      )}
      <TalentTree />
      <div className="creator-section" style={{ marginTop: 16 }}>Deeds ({deeds.length}/{DEEDS.length})</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {DEEDS.map((d) => {
          const done = deeds.includes(d.id);
          return (
            <div
              key={d.id}
              title={`${d.name} — ${d.desc}`}
              style={{
                width: 118, padding: '8px 6px', textAlign: 'center',
                background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                border: `1px solid ${done ? 'var(--gold)' : 'var(--chrome-2)'}`,
                opacity: done ? 1 : 0.45,
              }}
            >
              <div style={{ fontSize: 22 }}>{done ? d.icon : '🔒'}</div>
              <div style={{ fontSize: 11, marginTop: 3, color: done ? 'var(--gold)' : 'var(--parchment-dark)' }}>
                {d.name}
              </div>
            </div>
          );
        })}
      </div>
    </PanelFrame>
  );
}

export default function Panels() {
  const panel = useGameStore((s) => s.panel);
  switch (panel) {
    case 'inventory': return <InventoryPanel />;
    case 'crafting': return <CraftingPanel />;
    case 'quests': return <QuestLogPanel />;
    case 'skills': return <SkillsPanel />;
    case 'emotes': return <EmoteWheel />;
    case 'dialogue': return <DialoguePanel />;
    case 'shop': return <ShopPanel />;
    case 'villagers': return <VillagersPanel />;
    case 'travel': return <TravelPanel />;
    case 'chronicle': return <ChroniclePanel />;
    case 'parley': return <ParleyPanel />;
    case 'guild': return <GuildPanel />;
    case 'npcEquip': return <NpcEquipPanel />;
    case 'stationMenu': return <StationMenuPanel />;
    case 'keepSocket': return <KeepSocketPanel />;
    case 'buildingMenu': return <BuildingMenuPanel />;
    case 'workshop': return <WorkshopPanel />;
    case 'appearance': return <AppearancePanel />;
    case 'bestiary': return <BestiaryPanel />;
    default: return null;
  }
}
