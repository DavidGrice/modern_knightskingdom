'use client';
// Homestead roster: assign recruited villagers to a job for slow passive
// production (see gameStore.tickVillagers), or leave them unassigned.
// Defenders (Phase 19) get their own extra controls here — loadout and
// station — since their "production" is fighting off raids instead.
import { useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { mountOf, stabledHorses } from '@/game/riding';
import { defenderOrders, orderFor } from '@/game/defenders';
import { DEFENDER_ORDERS, setDefenderOrder } from '@/game/data/defenderOrders';
import MenuTabs from './MenuTabs';
import { CARRIERS, CARRIER_ITEM, DEFENDER_LOADOUTS, JOBS, LOADOUT_REQUIRES, MAX_VILLAGERS, villagerRequirement } from '@/game/data/villagers';
import { ITEMS } from '@/game/data/items';
import { ATTRS, attrsOf, carryCapacityOf, tradeLevelOf } from '@/game/data/attributes';
import { CHESTPLATES, CHESTPLATE_BY_TIER, chestplateTierOf } from '@/game/data/armor';
import { hasTrait, traitSlots, traitsForJob, traitsOwnedInJob } from '@/game/data/companionTraits';
import { TAM_TITLE } from '@/game/data/companion';
import { ArmorySection } from './NpcEquipPanel';
import { levelFromXp, xpForLevel } from '@/game/data/ranks';
import { isBuilt, isHomeBuilding } from '@/game/types';
import type { DefenderLoadout, ItemId, Villager, VillagerJob } from '@/game/types';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from '@/game/data/keep';
import { MERCHANT_CAMP_STATION } from '@/game/data/trade';
import { villagerConfig } from '@/game/data/villagerLooks';
import { PortraitFactory, usePortrait } from '../character/VillagerPortrait';
import Ico from '../ui/Ico';

/** the roster's own real-face portrait (2026-07-30), falling back to the old
 *  job emoji for the brief window before a look's thumbnail finishes baking */
function RosterPortrait({ villager, fallbackIcon }: { villager: Villager; fallbackIcon: string }) {
  const url = usePortrait(villagerConfig(villager));
  return (
    <div className="icon">
      {url ? (
        <img src={url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <Ico e={fallbackIcon} />
      )}
    </div>
  );
}

export default function VillagersPanel() {
  // stabledHorses is a mutable leaf module (no store churn for a per-frame
  // ride), so the panel needs a nudge to repaint after an assignment
  const [, setMountTick] = useState(0);
  const bumpMounts = () => setMountTick((n) => n + 1);
  // Wave 23 · defenderOrders.overrides is the same shape of mutable leaf
  // module as stabledHorses above, so a per-defender order pick needs the
  // same manual repaint nudge.
  const [, setOrderTick] = useState(0);
  const bumpOrders = () => setOrderTick((n) => n + 1);
  const setPanel = useGameStore((s) => s.setPanel);
  const villagers = useGameStore((s) => s.villagers);
  const villagerProgress = useGameStore((s) => s.villagerProgress);
  const assignJob = useGameStore((s) => s.assignJob);
  const setDefenderLoadout = useGameStore((s) => s.setDefenderLoadout);
  const unequipDefenderLoadout = useGameStore((s) => s.unequipDefenderLoadout);
  const armory = useGameStore((s) => s.armory);
  const stationDefender = useGameStore((s) => s.stationDefender);
  const setDefenderShift = useGameStore((s) => s.setDefenderShift);
  const chooseTrait = useGameStore((s) => s.chooseTrait);
  const equipVillagerCarrier = useGameStore((s) => s.equipVillagerCarrier);
  const unequipVillagerCarrier = useGameStore((s) => s.unequipVillagerCarrier);
  const openVillagerEquip = useGameStore((s) => s.openVillagerEquip);
  // Wave 54 (E2) · Tam's own independent progression — a card of his own
  // below, not from `villagers.map` (see types.ts's `CompanionState` doc
  // comment for why he is never pushed into that array).
  const companionRecruited = useGameStore((s) => s.companionRecruited);
  const companion = useGameStore((s) => s.companion);
  const equipCompanionHelmet = useGameStore((s) => s.equipCompanionHelmet);
  const unequipCompanionHelmet = useGameStore((s) => s.unequipCompanionHelmet);
  const equipCompanionChestplate = useGameStore((s) => s.equipCompanionChestplate);
  const unequipCompanionChestplate = useGameStore((s) => s.unequipCompanionChestplate);
  const setCompanionLoadout = useGameStore((s) => s.setCompanionLoadout);
  const unequipCompanionLoadout = useGameStore((s) => s.unequipCompanionLoadout);
  // homestead-only counts: a remote claimed-plot structure shouldn't count
  // toward villager arrivals or read as a stationable tower here
  const allBuildings = useGameStore((s) => s.buildings);
  const buildings = allBuildings.filter(isHomeBuilding);

  const keep = useGameStore((s) => s.keep);

  const beds = buildings.filter((b) => b.type === 'bed').length;
  const next = villagers.length < MAX_VILLAGERS ? villagerRequirement(villagers.length + 1) : null;
  const towers = buildings.filter((b) => b.type === 'tower' && isBuilt(b));
  // J51 (rest) · a raised, finished KeepPart with its own walkway is a
  // station too — same "archers see further from it" reasoning as a tower,
  // read off KeepPart.walkway instead of a fixed buildable height
  const keepWalls = keep
    ? KEEP_SOCKETS.filter((s) => {
      const part = KEEP_PART_BY_ID[keep.parts[s.id] ?? ''];
      return part?.walkway && (keep.built[s.id] ?? 0) >= 1;
    })
    : [];

  return (
    <div className="game-panel clickable menu-family">
      <PortraitFactory />
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <MenuTabs />
      <h2>Homestead Roster</h2>
      <div className="panel-scroll">
      {villagers.length > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginBottom: 10, fontStyle: 'italic' }}>
          Folk keep workaday hours — labor and building pause overnight (8 PM – 5 AM) and pick back up at dawn.
          Defenders stand watch regardless.
        </div>
      )}
      {villagers.length === 0 && (
        <div className="loading-note">
          No villagers yet. Build beds and grow your homestead — folk hear of a
          welcoming hearth and come to settle.
        </div>
      )}
      {villagers.map((v) => {
        const jobDef = JOBS.find((j) => j.id === v.job)!;
        const left = villagerProgress[v.id] ?? jobDef.tripSeconds;
        const pct = v.job === 'idle' || v.job === 'defender' ? 0 : Math.round((1 - left / Math.max(1, jobDef.tripSeconds)) * 100);
        const level = levelFromXp(v.xp ?? 0);
        const curXp = (v.xp ?? 0) - xpForLevel(level);
        const nextXp = xpForLevel(level + 1) - xpForLevel(level);
        return (
          <div className="recipe-row" key={v.id} style={{ alignItems: 'flex-start' }}>
            <RosterPortrait villager={v} fallbackIcon={jobDef.icon} />
            <div className="r-main">
              <div className="r-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {v.name}
                {v.gear?.helmet && <span title="Wearing a helmet">🪖</span>}
                {/* Wave 9 · the plate's own tier icon, so the roster says
                    WHICH plate at a glance (data/armor.ts) */}
                {chestplateTierOf(v.gear) && (
                  <span title={`Wearing ${CHESTPLATE_BY_TIER[chestplateTierOf(v.gear)!].label}`}>
                    {CHESTPLATE_BY_TIER[chestplateTierOf(v.gear)!].icon}
                  </span>
                )}
                {v.gear?.carrier && (
                  <span title={`Carrying a ${CARRIERS.find((c) => c.id === v.gear!.carrier)?.label}`}>
                    {CARRIERS.find((c) => c.id === v.gear!.carrier)?.icon}
                  </span>
                )}
                <button
                  className="menu-btn small"
                  style={{ margin: 0, width: 'auto', padding: '3px 9px', fontSize: 11 }}
                  onClick={() => openVillagerEquip(v.id)}
                >
                  🎽 Equip
                </button>
              </div>
              <div className="r-cost">
                {v.job === 'idle' && 'Unassigned'}
                {v.job === 'defender' && `Defender — Lv ${level}`}
                {v.job !== 'idle' && v.job !== 'defender' && `${jobDef.label} — delivering ${jobDef.perTrip}× ${jobDef.produces} (${pct}%)`}
              </div>
              {/* nature & mastery (Phase 24A): innate attrs derive from the id;
                  trade levels are earned per job and survive re-assignment */}
              <div className="attr-row">
                {ATTRS.map((a) => {
                  const val = attrsOf(v.id)[a.id];
                  return (
                    <span key={a.id} className={`attr-chip ${val >= 9 ? 'gifted' : ''}`} title={`${a.label} ${val}/10 — ${a.blurb}`}>
                      <Ico e={a.icon} />
                      <span className="attr-bar"><span style={{ width: `${val * 10}%` }} /></span>
                      {val}
                    </span>
                  );
                })}
              </div>
              {(() => {
                const mastered = JOBS.filter((j) => tradeLevelOf(v, j.id) > 0);
                return mastered.length ? (
                  <div style={{ fontSize: 11, color: 'var(--parchment-dark)', marginTop: 3 }}>
                    Mastery: {mastered.map((j, i) => (
                      <span key={j.id}>
                        {i > 0 ? ' · ' : ''}<Ico e={j.icon} /> {j.label} Lv {tradeLevelOf(v, j.id)}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}
              {/* companion trait tree (AI-wave-2): one slot per 2 mastery
                  levels in the current trade, picked here for keeps */}
              {(() => {
                const pool = traitsForJob(v.job);
                if (!pool.length) return null;
                const slots = traitSlots(v);
                const owned = traitsOwnedInJob(v);
                return (
                  <>
                    <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                      Traits ({owned}/{slots} learned{slots < pool.length ? ` — next slot at ${v.job === 'defender' ? 'Defender' : JOBS.find((j) => j.id === v.job)?.label} Lv ${(slots + 1) * 2}` : ''})
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {pool.map((t) => {
                        const has = hasTrait(v, t.id);
                        const pickable = !has && owned < slots;
                        return (
                          <button
                            key={t.id}
                            className="menu-btn small"
                            title={`${t.name} — ${t.desc}`}
                            style={{
                              margin: 0, width: 'auto', padding: '5px 10px',
                              opacity: has ? 1 : pickable ? 0.85 : 0.4,
                              borderColor: has ? 'var(--gold)' : undefined,
                              color: has ? 'var(--gold)' : undefined,
                            }}
                            onClick={() => { if (pickable) chooseTrait(v.id, t.id); }}
                          >
                            <Ico e={t.icon} /> {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
              {/* Wave 9 · the carrier row. Shown for every job, not just
                  defenders: carry capacity is a working stat. Tier buttons
                  mirror the Loadout row directly below — one field, so
                  picking Cart while wearing a Basket hands the basket back to
                  the Armory in the same action (gameStore's
                  equipVillagerCarrier). The capacity number beside it is the
                  real `carryCapacityOf` the AI reads, Storehouse bonus and
                  all, so the effect of both is visible before you spend. */}
              <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                {/* `allBuildings`, not the homestead-filtered list above:
                    externalCapacityBonus scopes to the villager's OWN world,
                    so pre-filtering to home would hide a settlement
                    resident's own Storehouse from their readout */}
                Carrier — carries <b style={{ color: 'var(--gold)' }}>{carryCapacityOf(v, v.job, allBuildings)}</b> per trip
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <button
                  className="menu-btn small"
                  style={{
                    margin: 0, width: 'auto', padding: '5px 10px',
                    opacity: !v.gear?.carrier ? 1 : 0.65,
                    borderColor: !v.gear?.carrier ? 'var(--gold)' : undefined,
                  }}
                  onClick={() => unequipVillagerCarrier(v.id)}
                  title="Bare-handed — returns any carrier to the Armory"
                >
                  🤲 Bare Arms
                </button>
                {CARRIERS.map((c) => {
                  const item = CARRIER_ITEM[c.id];
                  const worn = v.gear?.carrier === c.id;
                  const stock = armory[item] ?? 0;
                  return (
                    <button
                      key={c.id}
                      className="menu-btn small"
                      disabled={!worn && stock <= 0}
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: worn ? 1 : stock > 0 ? 0.85 : 0.4,
                        borderColor: worn ? 'var(--gold)' : undefined,
                      }}
                      onClick={() => equipVillagerCarrier(v.id, c.id)}
                      title={worn ? `Worn — ${c.blurb} (return it with Bare Arms)` : `${c.blurb} · ${stock} in the Armory`}
                    >
                      {worn || stock > 0 ? c.icon : '🔒'} {c.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {JOBS.map((j) => (
                  <button
                    key={j.id}
                    className="menu-btn small"
                    style={{
                      margin: 0, width: 'auto', padding: '5px 10px',
                      opacity: v.job === j.id ? 1 : 0.65,
                      borderColor: v.job === j.id ? 'var(--gold)' : undefined,
                    }}
                    onClick={() => assignJob(v.id, j.id as VillagerJob)}
                  >
                    <Ico e={j.icon} /> {j.label}
                  </button>
                ))}
              </div>
              {v.job === 'defender' && (
                <>
                  <div className="xpbar" style={{ marginTop: 8 }}>
                    <div style={{ width: `${Math.round((curXp / Math.max(1, nextXp)) * 100)}%` }} />
                  </div>
                  {/* Wave 23 · a per-defender standing order, overriding the
                      fleet-wide radial call (T) for just this one. Placed
                      first — "what to do" precedes "what to hold". */}
                  <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                    Standing Order {defenderOrders.overrides[v.id]
                      ? '— on their own'
                      : `— following the fleet (${DEFENDER_ORDERS.find((o) => o.id === defenderOrders.order)?.label})`}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {DEFENDER_ORDERS.map((o) => {
                      const active = orderFor(v.id) === o.id;
                      return (
                        <button
                          key={o.id}
                          className="menu-btn small"
                          style={{
                            margin: 0, width: 'auto', padding: '5px 10px',
                            opacity: active ? 1 : 0.65,
                            borderColor: active ? 'var(--gold)' : undefined,
                          }}
                          onClick={() => { setDefenderOrder(v.id, o.id); bumpOrders(); }}
                          title={o.desc}
                        >
                          <Ico e={o.icon} /> {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                    Loadout — weapons spend Armory stock; unarmed hits noticeably softer
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <button
                      className="menu-btn small"
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: !v.loadout ? 1 : 0.65,
                        borderColor: !v.loadout ? 'var(--gold)' : undefined,
                      }}
                      onClick={() => unequipDefenderLoadout(v.id)}
                      title="Bare-handed — returns any equipped weapon to the Armory"
                    >
                      ✋ Bare-handed
                    </button>
                    {DEFENDER_LOADOUTS.map((lo) => {
                      const owned = v.loadout === lo.id;
                      const need = LOADOUT_REQUIRES[lo.id];
                      const afford = Object.entries(need).every(([id, n]) => (armory[id as ItemId] ?? 0) >= (n as number));
                      const costLine = Object.entries(need).map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`).join(' + ');
                      const stockLine = Object.entries(need).map(([id]) => `${armory[id as ItemId] ?? 0} in Armory`).join(', ');
                      return (
                        <button
                          key={lo.id}
                          className="menu-btn small"
                          disabled={!owned && !afford}
                          style={{
                            margin: 0, width: 'auto', padding: '5px 10px',
                            opacity: owned ? 1 : afford ? 0.85 : 0.4,
                            borderColor: owned ? 'var(--gold)' : undefined,
                          }}
                          onClick={() => setDefenderLoadout(v.id, lo.id as DefenderLoadout)}
                          title={owned ? `Equipped — costs ${costLine} (return to Armory via Bare-handed)` : `Costs ${costLine} (${stockLine})`}
                        >
                          {afford || owned ? lo.icon : '🔒'} {lo.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* G27 · a stabled horse turns a defender into a mounted
                      patrol — nearly twice the ground covered */}
                  <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                    Mount {stabledHorses.ids.length === 0 ? '— catch a horse and walk it to a Stable first' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <button
                      className="menu-btn small"
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: mountOf(v.id) ? 0.65 : 1,
                        borderColor: mountOf(v.id) ? undefined : 'var(--gold)',
                      }}
                      onClick={() => { delete stabledHorses.assigned[v.id]; bumpMounts(); }}
                    >
                      On Foot
                    </button>
                    {stabledHorses.ids.map((hid, i) => {
                      const takenBy = Object.entries(stabledHorses.assigned)
                        .find(([who, h]) => h === hid && who !== v.id);
                      return (
                        <button
                          key={hid}
                          className="menu-btn small"
                          disabled={!!takenBy}
                          title={takenBy ? 'Already ridden by another defender' : 'Assign this horse'}
                          style={{
                            margin: 0, width: 'auto', padding: '5px 10px',
                            opacity: mountOf(v.id) === hid ? 1 : takenBy ? 0.4 : 0.65,
                            borderColor: mountOf(v.id) === hid ? 'var(--gold)' : undefined,
                          }}
                          onClick={() => { stabledHorses.assigned[v.id] = hid; bumpMounts(); }}
                        >
                          Horse {i + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                    Station {v.loadout === 'bow' ? '(a tower gives archers real cover)' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <button
                      className="menu-btn small"
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: !v.stationId ? 1 : 0.65,
                        borderColor: !v.stationId ? 'var(--gold)' : undefined,
                      }}
                      onClick={() => stationDefender(v.id, null)}
                    >
                      🏠 Patrol Home
                    </button>
                    <button
                      className="menu-btn small"
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: v.stationId === MERCHANT_CAMP_STATION ? 1 : 0.65,
                        borderColor: v.stationId === MERCHANT_CAMP_STATION ? 'var(--gold)' : undefined,
                      }}
                      onClick={() => stationDefender(v.id, MERCHANT_CAMP_STATION)}
                    >
                      🏪 Merchant Camp
                    </button>
                    {towers.map((t, i) => (
                      <button
                        key={t.id}
                        className="menu-btn small"
                        style={{
                          margin: 0, width: 'auto', padding: '5px 10px',
                          opacity: v.stationId === t.id ? 1 : 0.65,
                          borderColor: v.stationId === t.id ? 'var(--gold)' : undefined,
                        }}
                        onClick={() => stationDefender(v.id, t.id)}
                      >
                        🗼 Tower {i + 1}
                      </button>
                    ))}
                    {keepWalls.map((s) => {
                      const stationId = `keep:${s.id}`;
                      return (
                        <button
                          key={stationId}
                          className="menu-btn small"
                          style={{
                            margin: 0, width: 'auto', padding: '5px 10px',
                            opacity: v.stationId === stationId ? 1 : 0.65,
                            borderColor: v.stationId === stationId ? 'var(--gold)' : undefined,
                          }}
                          onClick={() => stationDefender(v.id, stationId)}
                        >
                          🏰 {s.name}
                        </button>
                      );
                    })}
                    {towers.length === 0 && keepWalls.length === 0 && (
                      <span style={{ fontSize: 11.5, color: 'var(--parchment-dark)', fontStyle: 'italic' }}>
                        Build a Watch Tower, or raise a walled Keep piece, to station a defender atop it.
                      </span>
                    )}
                  </div>
                  {/* N80 · a per-defender watch so raids that come by day
                      don't find the whole garrison asleep */}
                  <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                    Shift
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <button
                      className="menu-btn small"
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: (v.shift ?? 'night') === 'night' ? 1 : 0.65,
                        borderColor: (v.shift ?? 'night') === 'night' ? 'var(--gold)' : undefined,
                      }}
                      onClick={() => setDefenderShift(v.id, 'night')}
                      title="Stands watch after dusk, rests by day — when raiders and skeletons come"
                    >
                      🌙 Night Watch
                    </button>
                    <button
                      className="menu-btn small"
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: v.shift === 'day' ? 1 : 0.65,
                        borderColor: v.shift === 'day' ? 'var(--gold)' : undefined,
                      }}
                      onClick={() => setDefenderShift(v.id, 'day')}
                      title="Stands watch by day, rests after dusk"
                    >
                      ☀️ Day Watch
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
      {next && (
        <div style={{ fontSize: 12.5, color: 'var(--parchment-dark)', marginTop: 12 }}>
          Next villager arrives with <b style={{ color: 'var(--gold)' }}>{next.beds}</b> bed(s)
          {' '}(you have {beds}) and <b style={{ color: 'var(--gold)' }}>{next.buildings}</b> total
          {' '}structures (you have {buildings.length}).
        </div>
      )}
      {!next && (
        <div style={{ fontSize: 12.5, color: 'var(--parchment-dark)', marginTop: 12 }}>
          Your homestead is fully settled.
        </div>
      )}
      {/* Wave 54 (E2) · Tam's own card — a real gear/loadout/XP system for
          the one always-on companion (falcon.ts's "one always-on companion,
          not a fleet" precedent), deliberately NOT pulled from `villagers`.
          Reuses this file's own Loadout/Carrier row idiom rather than
          forking NpcEquipPanel's full paperdoll — its real value-add
          (rotating 3D preview, drag-and-drop, dye editing) doesn't apply to
          a fixed-identity NPC. Bow is excluded: assist_leader
          (ai/actions/assistLeader.ts) is melee-only today. */}
      {companionRecruited && (() => {
        const level = levelFromXp(companion.xp ?? 0);
        const curXp = (companion.xp ?? 0) - xpForLevel(level);
        const nextXp = xpForLevel(level + 1) - xpForLevel(level);
        const chestTier = chestplateTierOf(companion.gear);
        const meleeLoadouts = DEFENDER_LOADOUTS.filter((lo) => lo.id !== 'bow');
        return (
          <div
            className="recipe-row"
            style={{ alignItems: 'flex-start', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--parchment-dark)' }}
          >
            <div className="icon"><Ico e="🛡️" /></div>
            <div className="r-main">
              <div className="r-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Tam
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--parchment-dark)' }}>— {TAM_TITLE}</span>
                {companion.gear?.helmet && <span title="Wearing a helmet">🪖</span>}
                {chestTier && (
                  <span title={`Wearing ${CHESTPLATE_BY_TIER[chestTier].label}`}>{CHESTPLATE_BY_TIER[chestTier].icon}</span>
                )}
              </div>
              <div className="r-cost">Companion — Lv {level}</div>
              <div className="xpbar" style={{ marginTop: 8 }}>
                <div style={{ width: `${Math.round((curXp / Math.max(1, nextXp)) * 100)}%` }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                Helmet — same shared Armory pool as the Roster
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <button
                  className="menu-btn small"
                  style={{
                    margin: 0, width: 'auto', padding: '5px 10px',
                    opacity: !companion.gear?.helmet ? 1 : 0.65,
                    borderColor: !companion.gear?.helmet ? 'var(--gold)' : undefined,
                  }}
                  onClick={unequipCompanionHelmet}
                  title="Bare-headed — returns any helmet to the Armory"
                >
                  🤲 Bare-headed
                </button>
                {(() => {
                  const stock = armory.helmet ?? 0;
                  const worn = !!companion.gear?.helmet;
                  return (
                    <button
                      className="menu-btn small"
                      disabled={!worn && stock <= 0}
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: worn ? 1 : stock > 0 ? 0.85 : 0.4,
                        borderColor: worn ? 'var(--gold)' : undefined,
                      }}
                      onClick={equipCompanionHelmet}
                      title={worn ? 'Worn — return it with Bare-headed' : `${stock} in the Armory`}
                    >
                      {worn || stock > 0 ? '🪖' : '🔒'} Helmet
                    </button>
                  );
                })()}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                Chestplate
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <button
                  className="menu-btn small"
                  style={{
                    margin: 0, width: 'auto', padding: '5px 10px',
                    opacity: !chestTier ? 1 : 0.65,
                    borderColor: !chestTier ? 'var(--gold)' : undefined,
                  }}
                  onClick={unequipCompanionChestplate}
                  title="Bare-chested — returns any plate to the Armory"
                >
                  🤲 Bare-chested
                </button>
                {CHESTPLATES.map((c) => {
                  const worn = chestTier === c.id;
                  const stock = armory[c.item] ?? 0;
                  return (
                    <button
                      key={c.id}
                      className="menu-btn small"
                      disabled={!worn && stock <= 0}
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: worn ? 1 : stock > 0 ? 0.85 : 0.4,
                        borderColor: worn ? 'var(--gold)' : undefined,
                      }}
                      onClick={() => equipCompanionChestplate(c.id)}
                      title={worn ? `Worn — ${c.blurb} (return it with Bare-chested)` : `${c.blurb} · ${stock} in the Armory`}
                    >
                      {worn || stock > 0 ? c.icon : '🔒'} {c.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 8 }}>
                Loadout — weapons spend Armory stock; no bow (Tam fights melee-only)
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <button
                  className="menu-btn small"
                  style={{
                    margin: 0, width: 'auto', padding: '5px 10px',
                    opacity: !companion.loadout ? 1 : 0.65,
                    borderColor: !companion.loadout ? 'var(--gold)' : undefined,
                  }}
                  onClick={unequipCompanionLoadout}
                  title="Bare-handed — returns any equipped weapon to the Armory"
                >
                  ✋ Bare-handed
                </button>
                {meleeLoadouts.map((lo) => {
                  const owned = companion.loadout === lo.id;
                  const need = LOADOUT_REQUIRES[lo.id];
                  const afford = Object.entries(need).every(([id, n]) => (armory[id as ItemId] ?? 0) >= (n as number));
                  const costLine = Object.entries(need).map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`).join(' + ');
                  const stockLine = Object.entries(need).map(([id]) => `${armory[id as ItemId] ?? 0} in Armory`).join(', ');
                  return (
                    <button
                      key={lo.id}
                      className="menu-btn small"
                      disabled={!owned && !afford}
                      style={{
                        margin: 0, width: 'auto', padding: '5px 10px',
                        opacity: owned ? 1 : afford ? 0.85 : 0.4,
                        borderColor: owned ? 'var(--gold)' : undefined,
                      }}
                      onClick={() => setCompanionLoadout(lo.id as Exclude<DefenderLoadout, 'bow'>)}
                      title={owned ? `Equipped — costs ${costLine} (return to Armory via Bare-handed)` : `Costs ${costLine} (${stockLine})`}
                    >
                      {afford || owned ? lo.icon : '🔒'} {lo.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
      <ArmorySection />
      </div>
    </div>
  );
}
