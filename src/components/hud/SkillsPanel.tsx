'use client';
import { useGameStore } from '@/game/store/gameStore';
import { SKILLS, levelFromXp, perkSlotsEarned, xpForLevel } from '@/game/data/ranks';
import { DEEDS } from '@/game/data/achievements';
import { PERKS, PERK_BY_ID } from '@/game/data/perks';
import { TALENTS, talentPointsEarned, talentPointsSpent, talentBuyable, talentRespecCost } from '@/game/data/skillTree';
import { PLAYER_ATTRS, ATTR_POINT_EVERY, attrPointsEarned, attrPointsSpent, respecCost } from '@/game/data/playerAttributes';
import Ico from '../ui/Ico';
import { onKeyActivate } from '../ui/a11yClick';
import RespecButton from './shared/RespecButton';
import PanelFrame from './PanelFrame';

// The Talent Tree (Phase 21): seven skill branches, four tiers each as of
// Wave 52's "mastery" tier, node icons drawn from the original game's own
// assets (piece thumbnails, the castle-stone sprite, a portrait) rather than
// emoji.
function TalentTree() {
  const xp = useGameStore((s) => s.xp);
  const skillTree = useGameStore((s) => s.skillTree);
  const buyTalent = useGameStore((s) => s.buyTalent);
  const respecTalents = useGameStore((s) => s.respecTalents);
  const gold = useGameStore((s) => s.inventory.gold ?? 0);
  const earned = talentPointsEarned(xp);
  const spent = talentPointsSpent(skillTree);
  const unspent = earned - spent;
  const respecGold = talentRespecCost(spent);
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
                  // Wave 61 (H1) · mirrors the click guard exactly: an
                  // already-learned node has nothing left to do, so it's
                  // excluded from the rove/Tab order (tabIndex -1) same as
                  // its own click already no-ops.
                  role={owned ? undefined : 'button'}
                  tabIndex={owned ? -1 : 0}
                  onKeyDown={owned ? undefined : onKeyActivate(() => buyTalent(t.id))}
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
      <RespecButton spent={spent} cost={respecGold} gold={gold} onRespec={respecTalents} label="training" titleNoun="learned talent point" poolNoun="learned point" armedNoun="talent points" />
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
  const totalLevel = SKILLS.reduce((t, s) => t + levelFromXp(xp[s.id]), 0);
  const earned = attrPointsEarned(totalLevel);
  const spent = attrPointsSpent(attrSpent);
  const free = earned - spent;
  const cost = respecCost(spent);
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
      <RespecButton spent={spent} cost={cost} gold={gold} onRespec={respecAttributes} label="nature" titleNoun="invested point" poolNoun="invested point" armedNoun="points" />
    </>
  );
}

export default function SkillsPanel() {
  const xp = useGameStore((s) => s.xp);
  const unlocks = useGameStore((s) => s.unlocks);
  const deeds = useGameStore((s) => s.deeds);
  const perks = useGameStore((s) => s.perks);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const cedricCaptures = useGameStore((s) => s.cedricCaptures);
  const choosePerk = useGameStore((s) => s.choosePerk);
  const slotsEarned = perkSlotsEarned(xp, completedQuests, cedricCaptures);
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
              role="button"
              tabIndex={0}
              onKeyDown={onKeyActivate(() => choosePerk(p.id))}
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={onKeyActivate(() => choosePerk(p.id))}
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
