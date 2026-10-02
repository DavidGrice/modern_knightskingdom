'use client';
// The "active errand / offers / blocked" board: Cedric's war council (ParleyPanel) and every guild hall's Guild Work
// (GuildPanel) render the same three states off the same sideQuest machinery — `giverId` stands in for an NpcDef id
// (a guild id, or 'cedric'). The icon/label props only carry each call site's own wording — the two callers'
// quest pools differ in shape, not in this board's logic: Cedric's 3 quests are independent (any can offer at
// once), while a guild's are `requires`-chained (`sideQuestOffers` only ever unblocks one at a time today) — the
// choice-menu capability here is real for both, the guild content just isn't parallel yet.
import { useGameStore } from '@/game/store/gameStore';
import { ITEMS } from '@/game/data/items';
import { sideQuestOffers, sideQuestsOf, type SideQuestDef } from '@/game/data/npcs';
import type { ItemId } from '@/game/types';

export function rewardText(def: SideQuestDef) {
  return [
    `${def.xp} ${def.xpSkill} XP`,
    ...Object.entries(def.rewardItems ?? {}).map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`),
  ].join(' · ');
}

export default function SideQuestBoard({ giverId, mineIcon = '', offerIcon = '', offersLine, emptyNote }: {
  giverId: string;
  /** text drawn before the active errand's label (e.g. '🐂 ') */
  mineIcon?: string;
  /** text drawn before each offer's label (e.g. '⚔ ') */
  offerIcon?: string;
  /** the tail of the "N … — choose one:" header, e.g. 'errands available — choose one:' */
  offersLine: string;
  /** shown when nothing is on offer and nothing is active; omit for no note */
  emptyNote?: string;
}) {
  const sideQuest = useGameStore((s) => s.sideQuest);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const completedSideQuests = useGameStore((s) => s.completedSideQuests);
  const allegiance = useGameStore((s) => s.allegiance);
  const alliance = useGameStore((s) => s.alliance);
  const acceptSideQuest = useGameStore((s) => s.acceptSideQuest);
  const turnInSideQuest = useGameStore((s) => s.turnInSideQuest);
  const abandonSideQuest = useGameStore((s) => s.abandonSideQuest);

  const pool = sideQuestsOf(giverId);
  // Wave 55 (F1) · `sideQuestOffers` (npcs.ts) skips already-completed quests by construction and surfaces every
  // simultaneously-unblocked quest as a real choice menu — the old single-candidate rotation could land back on a
  // finished quest and Take the Job would silently no-op against acceptSideQuest's own completedSideQuests guard.
  const offers = sideQuestOffers(giverId, completedSideQuests, completedQuests, allegiance, alliance);
  const mine = sideQuest?.npcId === giverId ? sideQuest : null;
  const mineDef = mine ? pool.find((q) => q.id === mine.questId) : null;

  return (
    <>
      {mine && mineDef && (
        <div className="quest-item">
          <div className="q-name">{mineIcon}{mineDef.label}</div>
          <div className="q-desc">Progress: {mine.have}/{mineDef.need} · Reward: {rewardText(mineDef)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="menu-btn small flush"
              disabled={mine.have < mineDef.need}
              onClick={turnInSideQuest}
            >
              {mine.have >= mineDef.need ? 'Turn In' : 'Not finished yet'}
            </button>
            <button className="menu-btn small danger flush" onClick={abandonSideQuest}>
              Abandon
            </button>
          </div>
        </div>
      )}
      {!sideQuest && offers.length > 0 && (
        <>
          {offers.length > 1 && (
            <div style={{ fontSize: 12, color: 'var(--parchment-dark)', fontStyle: 'italic', marginBottom: 4 }}>
              {offers.length}{` ${offersLine}`}
            </div>
          )}
          {offers.map((offer) => (
            <div className="quest-item" key={offer.id}>
              <div className="q-name">{offerIcon}{offer.label}</div>
              <div className="q-desc">Reward: {rewardText(offer)}</div>
              <button className="menu-btn small follow" onClick={() => acceptSideQuest(giverId, offer.id)}>
                Take the Job
              </button>
            </div>
          ))}
        </>
      )}
      {sideQuest && sideQuest.npcId !== giverId && (
        <div style={{ fontSize: 13, color: 'var(--parchment-dark)' }}>
          You already carry an errand for someone else. Finish it first.
        </div>
      )}
      {emptyNote && offers.length === 0 && !mine && (
        <div className="loading-note">{emptyNote}</div>
      )}
    </>
  );
}
