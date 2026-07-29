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
import { SKILLS, levelFromXp, rankFromTotalLevel } from '@/game/data/ranks';
import { QUESTS } from '@/game/data/quests';
import type { SaveGame } from '@/game/types';
import KkIcon from '../ui/KkIcon';

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
  const [checked, setChecked] = useState(false);

  const canContinue = guest ? checked && !!slot : hasSave;

  // read the save once on mount so the card can show what is in it
  useEffect(() => {
    let alive = true;
    const present = guest ? hasGuestSave() : hasSave;
    if (!present) { setChecked(true); return; }
    fetchSave(guest).then((s) => {
      if (!alive) return;
      if (s?.character) setSlot(describe(s));
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

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setGuest(false);
    resetTo('auth');
  }

  return (
    <div className={`kk-screen kk-screen-${settings.uiTheme}`}>
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
