'use client';
// 3b · Main Menu & Saves — Metalheart, per the UI handoff pack.
// Two columns: a sheared-steel nav rail on the left keeping the six
// established items in their established order, and the new HOLDFASTS
// column on the right showing what a save actually contains (rank,
// chapter, day, structures, kin, gold) instead of a bare "Continue".
//
// The game stores ONE save per account (plus one guest save in this
// browser), so the right column shows that save as a card and an empty
// slot beneath it — the mockup's multi-slot shape, told truthfully
// rather than faked with slots the backend does not have.
import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore } from '@/game/store/gameStore';
import { fetchSave, hasGuestSave } from '@/lib/save';
import { SKILLS, levelFromXp, rankFromTotalLevel, RANKS } from '@/game/data/ranks';
import { QUESTS } from '@/game/data/quests';
import { stageNewGamePlus } from '@/game/ngPlus';
import type { SaveGame } from '@/game/types';
import KkIcon from '../ui/KkIcon';

// Wave 39 (A4) · the name of the topmost rank, not the literal string
// 'Paladin' — RANKS is ordered climbing, so a future wave adding a rank
// above it (already flagged elsewhere in this project's plan) moves this
// gate for free, with no edit here.
const TOP_RANK = RANKS[RANKS.length - 1].name;

interface SlotInfo {
  name: string;
  rank: string;
  chapterNo: number;
  chapterName: string;
  day: number;
  structures: number;
  kin: number;
  gold: number;
}

function describe(save: SaveGame): SlotInfo {
  const total = SKILLS.reduce((t, s) => t + levelFromXp(save.xp?.[s.id] ?? 0), 0);
  const done = save.completedQuests ?? [];
  const idx = QUESTS.findIndex((q) => !done.includes(q.id));
  const active = idx >= 0 ? QUESTS[idx] : null;
  return {
    name: `${save.character?.name ?? 'Wanderer'}'s Holdfast`,
    rank: rankFromTotalLevel(total, done).name,
    chapterNo: (idx >= 0 ? idx : QUESTS.length - 1) + 1,
    chapterName: active?.name ?? 'The chronicle is told',
    day: (save.dayCount ?? 0) + 1,
    structures: save.buildings?.length ?? 0,
    kin: save.villagers?.length ?? 0,
    gold: save.inventory?.gold ?? 0,
  };
}

export default function MainMenu() {
  const { user, guest, hasSave, push, resetTo, setUser, setGuest, settings } = useAppStore();
  const loadFromSave = useGameStore((s) => s.loadFromSave);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState<SlotInfo | null>(null);
  // Wave 39 (A4) · the raw save, kept alongside the derived SlotInfo above
  // (which used to be all this screen held onto) so "Begin New Game+" has
  // the actual xp/skillTree to stage without a second fetch.
  const [rawSave, setRawSave] = useState<SaveGame | null>(null);
  const [checked, setChecked] = useState(false);

  const canContinue = guest ? checked && !!slot : hasSave;

  // read the save once on mount so the card can show what is in it
  useEffect(() => {
    let alive = true;
    const present = guest ? hasGuestSave() : hasSave;
    if (!present) { setChecked(true); return; }
    fetchSave(guest).then((s) => {
      if (!alive) return;
      if (s?.character) { setSlot(describe(s)); setRawSave(s); }
      setChecked(true);
    });
    return () => { alive = false; };
  }, [guest, hasSave]);

  const play = useCallback(async (continueGame: boolean) => {
    if (continueGame) {
      setLoading(true);
      const save = await fetchSave(guest);
      setLoading(false);
      if (save?.character) {
        loadFromSave(save);
        push('game');
        return;
      }
    }
    push('create');
  }, [guest, loadFromSave, push]);

  // Reported 2026-07-28: "Empty slot — start a new holdfast" sits directly
  // beneath the real save card, styled almost the same way, and used to jump
  // straight to character creation on a single click — this file's own
  // footer text already says "Starting a new holdfast overwrites the one
  // above", so a misclick here silently discards real progress with no way
  // back. Only guard when there's actually something to lose.
  const startNew = useCallback(() => {
    if (slot && !window.confirm(`Starting a new holdfast will overwrite "${slot.name}". This cannot be undone — continue?`)) {
      return;
    }
    play(false);
  }, [slot, play]);

  // Wave 39 (A4) · New Game+, gated on having actually reached the top rank
  // (see canBeginNgPlus below) — reuses startNew()'s exact overwrite-confirm
  // pattern, since this equally discards the current save for good, then
  // stages the carry for CharacterCreator.tsx to pick up on mount.
  const beginNgPlus = useCallback(() => {
    if (!rawSave || !slot) return;
    if (!window.confirm(
      `Beginning New Game+ will overwrite "${slot.name}". Your skill XP and talents carry forward — everything else begins anew. This cannot be undone — continue?`,
    )) {
      return;
    }
    stageNewGamePlus({ xp: rawSave.xp, skillTree: rawSave.skillTree ?? [] });
    push('create');
  }, [rawSave, slot, push]);

  const canBeginNgPlus = slot?.rank === TOP_RANK;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setGuest(false);
    resetTo('auth');
  }

  return (
    <div className={`kk-screen kk-screen-scroll kk-screen-${settings.uiTheme}`}>
      <div className="kk-menu-body">
        <div className="kk-menu-rail">
          <div className="kk-menu-word">KNIGHTS&apos;<br />KINGDOM</div>
          <div className="kk-menu-welcome">
            {user ? `Welcome, ${user.username} of the realm` : 'Welcome, wandering stranger'}
          </div>

          <div className="kk-menu-items">
            {canContinue && (
              <button className="kk-menu-item primary" onClick={() => play(true)} disabled={loading}>
                <KkIcon name="k-swords" size={18} />
                <span>{loading ? 'Reading the chronicles…' : 'Continue Journey'}</span>
                {slot && <span className="kk-menu-key">DAY {slot.day}</span>}
              </button>
            )}
            <button className="kk-menu-item" onClick={startNew}>
              <KkIcon name="k-keep" size={17} />
              <span>New Journey</span>
            </button>
            {canBeginNgPlus && (
              <button className="kk-menu-item" onClick={beginNgPlus}>
                <KkIcon name="k-crown" size={17} />
                <span>Begin New Game+</span>
              </button>
            )}
            <button className="kk-menu-item" onClick={() => push('options')}>
              <KkIcon name="k-cog" size={17} />
              <span>Options</span>
            </button>
            <button className="kk-menu-item" onClick={() => push('help')}>
              <KkIcon name="k-book" size={17} />
              <span>How to Play</span>
              <span className="kk-menu-key">H</span>
            </button>
            <button className="kk-menu-item" onClick={() => push('credits')}>
              <KkIcon name="k-quill" size={17} />
              <span>Credits</span>
            </button>
          </div>

          <button className="kk-menu-signout" onClick={logout}>
            <KkIcon name="k-close" size={14} />
            {user ? 'Sign out' : 'Back to the gates'}
          </button>
        </div>

        <div className="kk-menu-saves">
          <div className="kk-rule-head">
            <span>Your Holdfasts</span>
            <span className="rule" />
          </div>
          <div className="kk-save-list">
            {slot && (
              <button className="kk-save current" onClick={() => play(true)} disabled={loading}>
                <div className="kk-save-thumb"><KkIcon name="k-keep" size={30} /></div>
                <div className="kk-save-main">
                  <div className="kk-save-name-row">
                    <span className="kk-save-name">{slot.name}</span>
                    <span className="kk-save-rank">{slot.rank}</span>
                  </div>
                  <div className="kk-save-chapter">
                    Chapter {slot.chapterNo} — <em>{slot.chapterName}</em>
                  </div>
                  <div className="kk-save-stats">
                    <span>DAY {slot.day}</span>
                    <span>{slot.structures} STRUCT</span>
                    <span>{slot.kin} KIN</span>
                    {slot.gold > 0 && <span className="gold">{slot.gold.toLocaleString()}c</span>}
                  </div>
                </div>
                <div className="kk-save-cta">RESUME</div>
              </button>
            )}
            <button className="kk-save-empty" onClick={startNew}>
              <KkIcon name="k-plus" size={15} />
              {slot ? 'Empty slot — start a new holdfast' : 'Empty slot — forge your first hero'}
            </button>
          </div>
          <div className="kk-menu-foot">
            {guest
              ? 'Guest saves live in this browser only. Sign in to carry a holdfast between machines.'
              : 'Starting a new holdfast overwrites the one above — there is only one chronicle per name.'}
          </div>
        </div>
      </div>
    </div>
  );
}
