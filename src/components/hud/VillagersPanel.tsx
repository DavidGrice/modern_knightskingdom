'use client';
// Homestead roster: assign recruited villagers to a job for slow passive
// production (see gameStore.tickVillagers), or leave them unassigned.
// Defenders (Phase 19) get their own extra controls here — loadout and
// station — since their "production" is fighting off raids instead.
import { useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { mountOf, stabledHorses } from '@/game/riding';
import MenuTabs from './MenuTabs';
import { DEFENDER_LOADOUTS, JOBS, LOADOUT_REQUIRES, MAX_VILLAGERS, villagerRequirement } from '@/game/data/villagers';
import { ITEMS } from '@/game/data/items';
import { ATTRS, attrsOf, tradeLevelOf } from '@/game/data/attributes';
import { hasTrait, traitSlots, traitsForJob, traitsOwnedInJob } from '@/game/data/companionTraits';
import { ArmorySection } from './NpcEquipPanel';
import { levelFromXp, xpForLevel } from '@/game/data/ranks';
import { isBuilt, isHomeBuilding } from '@/game/types';
import type { DefenderLoadout, ItemId, VillagerJob } from '@/game/types';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from '@/game/data/keep';
import Ico from '../ui/Ico';

export default function VillagersPanel() {
  // stabledHorses is a mutable leaf module (no store churn for a per-frame
  // ride), so the panel needs a nudge to repaint after an assignment
  const [, setMountTick] = useState(0);
  const bumpMounts = () => setMountTick((n) => n + 1);
  const setPanel = useGameStore((s) => s.setPanel);
  const villagers = useGameStore((s) => s.villagers);
  const villagerProgress = useGameStore((s) => s.villagerProgress);
  const assignJob = useGameStore((s) => s.assignJob);
  const setDefenderLoadout = useGameStore((s) => s.setDefenderLoadout);
  const unequipDefenderLoadout = useGameStore((s) => s.unequipDefenderLoadout);
  const armory = useGameStore((s) => s.armory);
  const stationDefender = useGameStore((s) => s.stationDefender);
  const chooseTrait = useGameStore((s) => s.chooseTrait);
  const openVillagerEquip = useGameStore((s) => s.openVillagerEquip);
  // homestead-only counts: a remote claimed-plot structure shouldn't count
  // toward villager arrivals or read as a stationable tower here
  const buildings = useGameStore((s) => s.buildings).filter(isHomeBuilding);

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
            <div className="icon"><Ico e={jobDef.icon} /></div>
            <div className="r-main">
              <div className="r-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {v.name}
                {v.gear?.helmet && <span title="Wearing a helmet">🪖</span>}
                {v.gear?.chestplate && <span title="Wearing a chestplate">🦺</span>}
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
                  <div style={{ fontSize: 11.5, color: 'var(--parchment-dark)', marginTop: 4 }}>
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
      <ArmorySection />
      </div>
    </div>
  );
}
