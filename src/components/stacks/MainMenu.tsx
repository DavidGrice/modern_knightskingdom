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
import { fetchSave, hasGuestSave, type SaveResult } from '@/lib/save';
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

/** CLN-09 · a save that is there but could not be fetched just now, or cannot be read at all — shown where its card would
 *  be, never taken for "no save" (which sent Continue on to character creation, whose first autosave wrote a new game
 *  over it) — or a note that the server fell back to the save before the latest. */
type Trouble = { kind: 'error' | 'corrupt'; problem: string } | { kind: 'restored' };

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function describe(save: SaveGame): SlotInfo {
  const total = SKILLS.reduce((t, s) => t + levelFromXp(save.xp?.[s.id] ?? 0), 0);
  const done = save.completedQuests ?? [];
  const idx = QUESTS.findIndex((q) => !done.includes(q.id));
  const active = idx >= 0 ? QUESTS[idx] : null;
  return {
    name: `${save.character?.name ?? 'Wanderer'}'s Holdfast`,
    rank: rankFromTotalLevel(total, done, save.cedricCaptures ?? 0).name,
    chapterNo: (idx >= 0 ? idx : QUESTS.length - 1) + 1,
    chapterName: active?.name ?? 'The chronicle is told',
    day: (save.dayCount ?? 0) + 1,
    structures: save.buildings?.length ?? 0,
    kin: save.villagers?.length ?? 0,
    gold: save.inventory?.gold ?? 0,
  };
}

export default function MainMenu() {
  const user = useAppStore((s) => s.user);
  const guest = useAppStore((s) => s.guest);
  const hasSave = useAppStore((s) => s.hasSave);
  const setHasSave = useAppStore((s) => s.setHasSave);
  const push = useAppStore((s) => s.push);
  const resetTo = useAppStore((s) => s.resetTo);
  const setUser = useAppStore((s) => s.setUser);
  const setGuest = useAppStore((s) => s.setGuest);
  const uiTheme = useAppStore((s) => s.settings.uiTheme);
  const loadFromSave = useGameStore((s) => s.loadFromSave);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState<SlotInfo | null>(null);
  // Wave 39 (A4) · the raw save, kept alongside the derived SlotInfo above
  // (which used to be all this screen held onto) so "Begin New Game+" has
  // the actual xp/skillTree to stage without a second fetch.
  const [rawSave, setRawSave] = useState<SaveGame | null>(null);
  const [checked, setChecked] = useState(false);
  const [trouble, setTrouble] = useState<Trouble | null>(null);
  const [tries, setTries] = useState(0);

  // signed in, `hasSave` is the server's word that it holds one (readable or not); a guest's is in this browser
  const saveOnRecord = guest ? hasGuestSave() : hasSave;
  const canContinue = (guest ? checked && !!slot : hasSave) && trouble?.kind !== 'corrupt';

  const take = useCallback((r: SaveResult) => {
    if (r.status === 'ok') {
      setSlot(describe(r.save));
      setRawSave(r.save);
      setTrouble(r.restored ? { kind: 'restored' } : null);
      return;
    }
    setSlot(null);
    setRawSave(null);
    if (r.status !== 'none') { setTrouble({ kind: r.status, problem: r.problem }); return; }
    setTrouble(null);
    if (!guest) setHasSave(false);
  }, [guest, setHasSave]);

  // read the save on mount (and on "Try again") so the card can show what is in it
  useEffect(() => {
    let alive = true;
    const present = guest ? hasGuestSave() : hasSave;
    if (!present) { setChecked(true); return; }
    fetchSave(guest).then((r) => {
      if (!alive) return;
      take(r);
      setChecked(true);
    });
    return () => { alive = false; };
  }, [guest, hasSave, take, tries]);

  const play = useCallback(async (continueGame: boolean) => {
    if (continueGame) {
      setLoading(true);
      const r = await fetchSave(guest);
      setLoading(false);
      if (r.status === 'ok') {
        loadFromSave(r.save);
        push('game');
        return;
      }
      // anything else stays on this screen, shown for what it is — Continue never starts a new game (CLN-09)
      take(r);
      return;
    }
    push('create');
  }, [guest, loadFromSave, push, take]);

  // Reported 2026-07-28: "Empty slot — start a new holdfast" sits directly
  // beneath the real save card, styled almost the same way, and used to jump
  // straight to character creation on a single click — this file's own
  // footer text already says "Starting a new holdfast overwrites the one
  // above", so a misclick here silently discards real progress with no way
  // back. Only guard when there's actually something to lose — which there is
  // whenever a save is on record, read or not (CLN-09: an unreadable one used
  // to look like none, and went without asking).
  const startNew = useCallback(() => {
    const what = slot ? `"${slot.name}"` : 'the holdfast you have saved';
    if (saveOnRecord && !window.confirm(`Starting a new holdfast will overwrite ${what}. This cannot be undone — continue?`)) {
      return;
    }
    play(false);
  }, [slot, saveOnRecord, play]);

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
    <div className={`kk-screen kk-screen-scroll kk-screen-${uiTheme}`}>
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
            {trouble && trouble.kind !== 'restored' && (
              <div className="kk-save kk-save-trouble" role="alert">
                <div className="kk-save-thumb"><KkIcon name="k-scroll" size={30} /></div>
                <div className="kk-save-main">
                  <div className="kk-save-name-row">
                    <span className="kk-save-name">
                      {trouble.kind === 'corrupt' ? 'Your holdfast could not be read' : 'Your holdfast could not be fetched'}
                    </span>
                  </div>
                  <div className="kk-save-chapter">
                    {sentence(trouble.problem)}. {trouble.kind === 'corrupt' ? 'It has been left untouched.' : 'Nothing has been changed.'}
                  </div>
                </div>
                {trouble.kind === 'error' && (
                  <button className="kk-save-cta kk-save-retry" onClick={() => setTries((n) => n + 1)}>TRY AGAIN</button>
                )}
              </div>
            )}
            {trouble?.kind === 'restored' && (
              <div className="kk-save-note">The latest save could not be read, so the one before it was restored.</div>
            )}
            <button className="kk-save-empty" onClick={startNew}>
              <KkIcon name="k-plus" size={15} />
              {slot || saveOnRecord ? 'Empty slot — start a new holdfast' : 'Empty slot — forge your first hero'}
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
