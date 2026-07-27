'use client';
// D16 · The collection book: every foe in the realm, and what you actually
// know about each one.
//
// Entries are filled in by SCANNING (aim at a foe and press the record key),
// not by killing — you have to look at something to learn about it. An
// unrecorded foe still gets a card, greyed with its details withheld, so the
// book reads as a set with gaps rather than hiding how much is left. That is
// the same "show the grid empty rather than replacing it with a sentence"
// rule the UI pack asks for everywhere else.
import { useGameStore } from '@/game/store/gameStore';
import { KIND_LABEL, LOOT_TABLES, maxHpOf, type EnemyKind } from '@/game/combat';
import { ITEMS } from '@/game/data/items';
import type { ItemId } from '@/game/types';
import MenuTabs from './MenuTabs';
import KkIcon from '../ui/KkIcon';

/** every foe worth a page. Storm is a duel, not a bestiary entry. */
const KINDS: EnemyKind[] = ['skeleton', 'bandit', 'royal', 'gilbert', 'cedric'];

const BLURB: Record<EnemyKind, string> = {
  skeleton: 'Rises after dark and goes back to the earth at dawn. Brittle, but it never comes alone.',
  bandit: 'A road robber carrying whatever they took off the last traveller.',
  royal: "One of the crown's knights. They only ride against you if you swore to Cedric.",
  gilbert: 'Raid captain. Better kit than the men he leads, and he knows it.',
  cedric: 'Cedric the Bull, in the flesh. The capstone of the whole chronicle.',
  storm: '',
};

export default function BestiaryPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const bestiary = useGameStore((s) => s.bestiary);
  // lifetime kills already live in the stats block, keyed by the same kind
  const kills = useGameStore((s) => s.stats.killsByKind);

  const recorded = KINDS.filter((k) => bestiary.includes(k)).length;

  return (
    <div className="game-panel clickable menu-family">
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <MenuTabs />
      <h2>Collection Book</h2>
      <div className="panel-scroll">
        <div style={{ fontSize: 12, color: 'var(--parchment-dark)', marginBottom: 12 }}>
          Recorded <b style={{ color: 'var(--gold)' }}>{recorded}</b> of {KINDS.length}.
          Aim at a foe out in the field and press the record key to write them up —
          fighting one teaches you nothing you did not stop to look at.
        </div>
        <div className="kk-book">
          {KINDS.map((k) => {
            const known = bestiary.includes(k);
            const loot = (LOOT_TABLES[k] ?? [])
              .map((e) => ITEMS[e.item as ItemId]?.name ?? e.item)
              .join(' · ');
            return (
              <div key={k} className={`kk-book-card ${known ? '' : 'unknown'}`}>
                <div className="kk-book-name">
                  {known ? KIND_LABEL[k] : <><KkIcon name="k-lock" size={12} /> Unrecorded</>}
                </div>
                {known ? (
                  <>
                    <div className="kk-book-row"><span>Vigour</span><b>{maxHpOf(k)}</b></div>
                    <div className="kk-book-row"><span>Felled</span><b>{kills[k] ?? 0}</b></div>
                    <div className="kk-book-loot">{BLURB[k]}</div>
                    {loot && <div className="kk-book-loot"><b>Carries:</b> {loot}</div>}
                  </>
                ) : (
                  <div className="kk-book-loot">Record one in the field to fill this page in.</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
