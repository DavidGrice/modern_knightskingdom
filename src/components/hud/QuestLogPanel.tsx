'use client';
// The Quest Log (overhauled 2026-07-20): a proper regional journal instead
// of one flat list. The Main Chronicle (the linear story quest) sits at the
// top; every court NPC's repeatable errand pool gets its own collapsible
// region section, named for the realm they actually stand in — matching the
// Kingdom of Instances (you go THERE to see what THEY need). Deliberately
// READ-ONLY: accepting/turning in a side quest still requires standing in
// front of the giver (DialoguePanel/ParleyPanel) — this is an overview and
// reference tool, not a shortcut around the travel design. Styled as an aged
// parchment page inside the usual stone-and-chrome panel frame, on request.
import { useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import MenuTabs from './MenuTabs';
import { QUESTS } from '@/game/data/quests';
import { NPCS, NPC_BY_ID, CEDRIC_WAR_QUESTS, isNpcRevealed, sideQuestBlocker, sideQuestGiverName, sideQuestsOf, type SideQuestDef } from '@/game/data/npcs';
import { HOUSE_COLORS } from '@/game/data/allegiance';
import AllegianceMeter from './AllegianceMeter';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { CEDRIC_WORLD } from '@/game/data/world';
import Ico from '../ui/Ico';

interface QuestRegion {
  id: string;
  label: string;
  icon: string;
  npcIds: string[];
}

// derived once from the NPC roster: one region per world that actually has
// a side-quest giver in it (Alric/Beda give none, so the homestead never
// gets a spurious region of its own — its quests are the Main Chronicle)
const NPC_REGIONS: QuestRegion[] = (() => {
  const byWorld = new Map<string, string[]>();
  for (const n of NPCS) {
    if (!n.world || n.sideQuests.length === 0) continue;
    byWorld.set(n.world, [...(byWorld.get(n.world) ?? []), n.id]);
  }
  return [...byWorld.entries()].map(([world, npcIds]) => ({
    id: world, label: WORLD_DESTINATION_BY_ID[world]?.name ?? world, icon: '⚜️', npcIds,
  }));
})();
const CEDRIC_REGION: QuestRegion = {
  id: CEDRIC_WORLD, label: WORLD_DESTINATION_BY_ID[CEDRIC_WORLD]?.name ?? 'The Rival Castle',
  icon: '🐂', npcIds: ['cedric'],
};

function RewardLine({ q }: { q: SideQuestDef }) {
  const items = q.rewardItems
    ? Object.entries(q.rewardItems).map(([id, n]) => `${n}× ${id}`).join(', ')
    : '';
  return <span>{q.xp} {q.xpSkill} XP{items ? ` · ${items}` : ''}</span>;
}

function GiverBlock({ npcId }: { npcId: string }) {
  const completedQuests = useGameStore((s) => s.completedQuests);
  const reputation = useGameStore((s) => s.reputation);
  const sideQuest = useGameStore((s) => s.sideQuest);
  const trackedQuest = useGameStore((s) => s.trackedQuest);
  const setTrackedQuest = useGameStore((s) => s.setTrackedQuest);
  const completedSideQuests = useGameStore((s) => s.completedSideQuests);
  const allegiance = useGameStore((s) => s.allegiance);
  const npc = npcId === 'cedric' ? null : NPC_BY_ID[npcId];
  const revealed = npc ? isNpcRevealed(npc, completedQuests) : true; // cedric gated by alliance, not reveal
  const name = sideQuestGiverName(npcId);
  const pool = sideQuestsOf(npcId);

  if (npc && !revealed) {
    const gate = QUESTS.find((q) => q.id === npc.revealAfterQuest);
    return (
      <div className="quest-giver quest-giver-locked">
        <div className="quest-giver-name"><Ico e="🔒" /> {name}</div>
        <div className="quest-giver-hint">Revealed after completing "{gate?.name ?? npc.revealAfterQuest}".</div>
      </div>
    );
  }

  const rep = npc ? (reputation[npcId] ?? 0) : 0;
  const repTier = npc?.repTitles ? [...npc.repTitles].reverse().find((t) => rep >= t.min) : null;
  const mine = sideQuest?.npcId === npcId ? sideQuest : null;
  const mineDef = mine ? pool.find((q) => q.id === mine.questId) : null;
  const others = pool.filter((q) => q.id !== mine?.questId);

  return (
    <div className="quest-giver">
      <div className="quest-giver-name">
        {name}
        {repTier && <span className="quest-giver-title">— {repTier.title}</span>}
      </div>
      {mine && mineDef && (
        <div className="quest-entry active">
          <div className="quest-entry-name">
            ⚔ {mineDef.label}
            <button
              className="quest-track-pin"
              disabled={trackedQuest === 'side'}
              onClick={() => setTrackedQuest('side')}
            >
              {trackedQuest === 'side' ? '📌 Tracked' : '📌 Track'}
            </button>
          </div>
          <div className="quest-entry-meta">
            Progress: {mine.have}/{mineDef.need} · Reward: <RewardLine q={mineDef} />
          </div>
          <div className="quest-entry-hint">Carrying this errand — return to {name} to turn it in.</div>
        </div>
      )}
      {others.map((q) => {
        // a locked errand NAMES its blocker: which errand comes first, or how
        // far toward which house you have to stand before this is offered
        const blocked = sideQuestBlocker(q, completedSideQuests, allegiance);
        const done = completedSideQuests.includes(q.id);
        return (
          <div key={q.id} className={`quest-entry ${blocked ? 'locked' : done ? 'done' : 'available'}`}>
            <div className="quest-entry-name">
              {blocked ? <><Ico e="🔒" /> {q.label}</> : q.label}
              {q.allegiance ? (
                <span
                  className="quest-entry-tag"
                  style={{ color: q.allegiance > 0 ? HOUSE_COLORS.leo.primary : HOUSE_COLORS.cedric.primary }}
                  title={q.allegiance > 0 ? 'Moves you toward the crown' : 'Moves you toward the Bull'}
                >
                  {q.allegiance > 0 ? '+' : ''}{q.allegiance} allegiance
                </span>
              ) : (
                <span className="quest-entry-tag" title="Neither house has an opinion">neutral</span>
              )}
            </div>
            <div className="quest-entry-meta">Reward: <RewardLine q={q} /></div>
            <div className="quest-entry-hint">
              {blocked ?? (done ? 'Already done for them.'
                : sideQuest ? 'You already carry an errand — finish it first.'
                : `Available — visit ${name} in person to accept.`)}
            </div>
          </div>
        );
      })}
      {pool.length === 0 && <div className="quest-entry-hint">Nothing to ask of you right now.</div>}
    </div>
  );
}

function RegionBlock({ region, open, onToggle }: { region: QuestRegion; open: boolean; onToggle: () => void }) {
  return (
    <div className="quest-region">
      <div className="quest-region-header" onClick={onToggle}>
        <span className="quest-region-arrow">{open ? '▾' : '▸'}</span>
        <span className="quest-region-icon"><Ico e={region.icon} /></span>
        <span>{region.label}</span>
      </div>
      {open && (
        <div className="quest-region-body">
          {region.npcIds.map((id) => <GiverBlock key={id} npcId={id} />)}
        </div>
      )}
    </div>
  );
}

export default function QuestLogPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const questProgress = useGameStore((s) => s.questProgress);
  const sideQuest = useGameStore((s) => s.sideQuest);
  const alliance = useGameStore((s) => s.alliance);
  const trackedQuest = useGameStore((s) => s.trackedQuest);
  const setTrackedQuest = useGameStore((s) => s.setTrackedQuest);

  const [showCompleted, setShowCompleted] = useState(false);
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { main: true };
    const giverWorld = sideQuest
      ? (sideQuest.npcId === 'cedric' ? CEDRIC_WORLD : NPC_BY_ID[sideQuest.npcId]?.world)
      : null;
    if (giverWorld) init[giverWorld] = true;
    return init;
  });
  const toggleRegion = (id: string) => setOpenRegions((prev) => ({ ...prev, [id]: !prev[id] }));

  const activeQuestId = QUESTS.find((q) => !completedQuests.includes(q.id))?.id;
  const regions = alliance === 'cedric' ? [...NPC_REGIONS, CEDRIC_REGION] : NPC_REGIONS;

  return (
    <div className="game-panel clickable menu-family">
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <MenuTabs />
      <h2>Quest Log</h2>
      <div className="quest-journal panel-scroll">
        <div className="quest-journal-toolbar">
          <button className={`journal-filter ${!showCompleted ? 'selected' : ''}`} onClick={() => setShowCompleted(false)}>
            Active
          </button>
          <button className={`journal-filter ${showCompleted ? 'selected' : ''}`} onClick={() => setShowCompleted(true)}>
            All, incl. completed
          </button>
        </div>

        {/* where you stand, at the top of the journal — every errand below
            is tagged by which way it pulls, so this is the frame for them */}
        <div className="quest-region" style={{ padding: '2px 0 10px' }}>
          <AllegianceMeter />
        </div>

        <div className="quest-region">
          <div className="quest-region-header" onClick={() => toggleRegion('main')}>
            <span className="quest-region-arrow">{openRegions.main ? '▾' : '▸'}</span>
            <span className="quest-region-icon">🏰</span>
            <span>The Main Chronicle</span>
          </div>
          {openRegions.main && (
            <div className="quest-region-body">
              {QUESTS.map((q) => {
                const done = completedQuests.includes(q.id);
                if (done && !showCompleted) return null;
                const isActive = q.id === activeQuestId;
                const upcoming = !done && !isActive;
                const qp = questProgress[q.id] ?? {};
                const visitObj = q.objectives.find((o) => o.kind === 'visit');
                const destLabel = visitObj ? WORLD_DESTINATION_BY_ID[visitObj.target]?.name : null;
                return (
                  <div key={q.id} className={`quest-entry ${done ? 'done' : isActive ? 'active' : 'locked'}`}>
                    <div className="quest-entry-name">
                      {done ? '✓' : isActive ? '➤' : '🔒'} {q.name}
                      {destLabel && <span className="quest-entry-tag">→ {destLabel}</span>}
                      {isActive && sideQuest && (
                        <button
                          className="quest-track-pin"
                          disabled={trackedQuest === 'main'}
                          onClick={() => setTrackedQuest('main')}
                        >
                          {trackedQuest === 'main' ? '📌 Tracked' : '📌 Track'}
                        </button>
                      )}
                    </div>
                    {!upcoming && <div className="quest-entry-meta">{q.description}</div>}
                    {isActive && q.objectives.map((o) => {
                      const cur = Math.min(o.count, qp[o.id] ?? 0);
                      return (
                        <div key={o.id} className={`quest-obj-line ${cur >= o.count ? 'done' : ''}`}>
                          • {o.label} ({cur}/{o.count})
                        </div>
                      );
                    })}
                    {!upcoming && <div className="quest-entry-hint">Reward: {q.rewardText}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {regions.map((region) => (
          <RegionBlock
            key={region.id}
            region={region}
            open={!!openRegions[region.id]}
            onToggle={() => toggleRegion(region.id)}
          />
        ))}
      </div>
    </div>
  );
}
