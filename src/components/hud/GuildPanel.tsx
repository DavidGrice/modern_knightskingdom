'use client';
import { useGameStore } from '@/game/store/gameStore';
import { ITEMS } from '@/game/data/items';
import { CHALLENGES, challengeProgress } from '@/game/data/challenges';
import { GUILD_BY_ID, GUILD_BY_WORLD, guildEligible, guildMaxRank, guildRankIndex, SWITCH_TITHE } from '@/game/data/guilds';
import Ico from '../ui/Ico';
import PopupFrame from './PopupFrame';
import SideQuestBoard from './shared/SideQuestBoard';

// Guild hall (Phase 21): shown at the hall of whichever guild lives in the
// current instance. Join gated on the matching Challenge tier; changing an
// existing banner costs the transfer tithe.
// Wave 22 · what each guild's own passive sharpens to at its top rank — pure
// display text for GuildPanel's Standing block; the real numbers live at
// each passive's own call site (gameStore.ts/combat.ts/fishing.ts), gated on
// the same atGuildMaxRank check.
const GUILD_MAX_RANK_NOTE: Record<string, string> = {
  woodsmen: 'Deep Grain sharpens to a 30% chance',
  miners: 'Ore Sense sharpens to a 75% chance',
  anglers: 'Read the Water cuts the wait even further',
  builders: 'Master Joinery sharpens to +45%',
  knights: 'Weight of the Order sharpens to +2 damage',
};

export default function GuildPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const destination = useGameStore((s) => s.destination);
  const stats = useGameStore((s) => s.stats);
  const myGuild = useGameStore((s) => s.guild);
  const joinGuild = useGameStore((s) => s.joinGuild);
  const guildRanks = useGameStore((s) => s.guildRanks);
  const inventory = useGameStore((s) => s.inventory);
  const buyGuildOffer = useGameStore((s) => s.buyGuildOffer);
  // Wave 23 · mirrors the exact haggle terms buyOffer() itself applies (see
  // its own comment) — the vendor's ticket price must agree with what a
  // purchase will really deduct, same reasoning as ShopPanel's own mirror.
  const silverTongue = useGameStore((s) => s.perks.includes('silver_tongue'));
  const honestWeight = useGameStore((s) => s.perks.includes('honest_weight'));
  const wit = useGameStore((s) => s.attrSpent.wit ?? 0);
  const g = destination ? GUILD_BY_WORLD[destination] : null;
  if (!g) return null;
  const eligible = guildEligible(g, stats);
  const track = CHALLENGES.find((c) => c.id === g.challengeId)!;
  const { value } = challengeProgress(track, stats);
  const isMine = myGuild === g.id;
  const rep = guildRanks[g.id] ?? 0;
  const rankIdx = guildRankIndex(g, rep);
  const rank = g.rankTitles[rankIdx];
  const nextRank = g.rankTitles[rankIdx + 1];
  const atMax = rankIdx >= guildMaxRank(g);
  const gold = inventory.gold ?? 0;
  return (
    <PopupFrame minWidth="min(560px, 94vw)">
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

      {isMine && (
        <>
          <div className="creator-section" style={{ marginTop: 16 }}>Standing</div>
          <div className="skill-row">
            <div className="s-ico"><Ico e={g.icon} /></div>
            <div className="s-body">
              <div className="s-name">{rank.title} <span>{rep} rep</span></div>
              {nextRank ? (
                <div className="xpbar">
                  <div style={{ width: `${Math.min(100, Math.round(((rep - rank.min) / (nextRank.min - rank.min)) * 100))}%` }} />
                </div>
              ) : (
                <div className="xpbar"><div style={{ width: '100%' }} /></div>
              )}
              <div className="s-locked">
                {nextRank ? `Next: ${nextRank.title} at ${nextRank.min} rep.` : 'Highest rank earned.'}
                {' '}{atMax ? `${GUILD_MAX_RANK_NOTE[g.id]} — already active.` : `${GUILD_MAX_RANK_NOTE[g.id]} at ${g.rankTitles[guildMaxRank(g)].title}.`}
              </div>
            </div>
          </div>

          <div className="creator-section" style={{ marginTop: 16 }}>Guild Store</div>
          {g.vendor.map((o) => {
            const cost = Math.max(1, Math.round(o.price * (1 - wit * 0.04 - (silverTongue ? 0.15 : 0) - (honestWeight ? 0.08 : 0))));
            const locked = (o.minRank ?? 0) > rankIdx;
            return (
              <div className="recipe-row" key={o.item}>
                <div className="icon"><Ico e={ITEMS[o.item].icon} /></div>
                <div className="r-main">
                  <div className="r-name">{ITEMS[o.item].name}{o.qty > 1 ? ` ×${o.qty}` : ''}</div>
                  <div className="r-cost">
                    {locked ? `Reach ${g.rankTitles[o.minRank ?? 0].title}` : `${cost}g`}
                  </div>
                </div>
                <button
                  disabled={locked || gold < cost}
                  onClick={() => buyGuildOffer(g.id, o.item, o.qty, o.price)}
                >
                  Buy
                </button>
              </div>
            );
          })}

          <GuildErrands guildId={g.id} />
        </>
      )}

      <button className="menu-btn closing" onClick={() => setPanel('none')}>
        Leave the hall
      </button>
    </PopupFrame>
  );
}

// Wave 22 · a guild's own repeatable errand board — the same offer-rotation
// and accept/turn-in/abandon shape as ParleyPanel's Cedric war-council
// branch, reusing the identical sideQuestsOf/acceptSideQuest/turnInSideQuest/
// abandonSideQuest plumbing (guildId stands in for an NpcDef id throughout,
// exactly like 'cedric' already does).
function GuildErrands({ guildId }: { guildId: string }) {
  return (
    <>
      <div className="creator-section" style={{ marginTop: 16 }}>Guild Work</div>
      <SideQuestBoard giverId={guildId} offersLine="errands available — choose one:" emptyNote="Nothing to ask of you right now." />
    </>
  );
}
