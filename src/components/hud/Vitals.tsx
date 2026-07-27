'use client';
// 1a–1d · vitals cluster, top-left. Per HANDOFF §5.1 the row of heart
// glyphs is gone: a row of 8 hearts cannot show 178/240 and does not
// scale past 10, so vigour is ONE bar with a numeric readout, with
// stamina and the rank XP bar sharing the line beneath it.
//
// Polls the mutable combat/player modules on an interval rather than
// subscribing to a store, because those are written every frame by the
// R3F loop and this is DOM.
import { useEffect, useState } from 'react';
import { combatState } from '@/game/combat';
import { useGameStore } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { EYE_HEIGHT } from '@/game/data/world';
import { SKILLS, levelFromXp, rankFromTotalLevel } from '@/game/data/ranks';
import KkIcon from '../ui/KkIcon';
import CharacterPortrait from './CharacterPortrait';

export default function Vitals() {
  const character = useGameStore((s) => s.character);
  const xp = useGameStore((s) => s.xp);
  const completedQuests = useGameStore((s) => s.completedQuests);

  const [snap, setSnap] = useState({
    hp: 10, maxHp: 10, stamina: 100, maxStamina: 100, flash: 0, blocking: false,
    ranged: false, bow: false, bolts: 0, arrows: 0, draw: 0, elevated: false,
  });

  useEffect(() => {
    const t = setInterval(() => {
      const inv = useGameStore.getState().inventory;
      const bow = combatState.rangedWeapon === 'longbow';
      setSnap({
        hp: combatState.hp,
        maxHp: combatState.maxHp,
        stamina: combatState.stamina,
        maxStamina: combatState.maxStamina,
        flash: combatState.flash,
        blocking: combatState.blocking,
        ranged: combatState.weapon === 'ranged'
          && (bow ? (inv.longbow ?? 0) > 0 : (inv.crossbow ?? 0) > 0),
        bow,
        bolts: inv.bolt ?? 0,
        arrows: inv.arrow ?? 0,
        draw: combatState.drawStart > 0
          ? Math.min(1, (performance.now() - combatState.drawStart) / 1100)
          : 0,
        elevated: playerState.y > EYE_HEIGHT + 0.15,
      });
    }, 80);
    return () => clearInterval(t);
  }, []);

  const totalLevel = SKILLS.reduce((t, s) => t + levelFromXp(xp[s.id]), 0);
  const rank = rankFromTotalLevel(totalLevel, completedQuests);
  // progress across the current total level, from the summed skill XP
  const totalXp = SKILLS.reduce((t, s) => t + xp[s.id], 0);
  const perLevel = 90;
  const xpFrac = Math.min(1, (totalXp % perLevel) / perLevel);

  const hpPct = Math.max(0, Math.min(1, snap.hp / Math.max(1, snap.maxHp)));
  const stamPct = Math.max(0, Math.min(1, snap.stamina / Math.max(1, snap.maxStamina)));

  return (
    <>
      {snap.flash > 0 && (
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            boxShadow: `inset 0 0 ${90 + snap.flash * 140}px rgba(176, 30, 20, ${Math.min(0.75, snap.flash * 1.3)})`,
          }}
        />
      )}
      <div className="kk-vitals kk-glass">
        <div className="kk-vitals-crest">
          <CharacterPortrait size={54} />
        </div>
        <div className="kk-vitals-main">
          <div className="kk-vitals-name-row">
            <span className="kk-vitals-name">{rank.name} {character?.name ?? ''}</span>
            <span className="kk-vitals-lv">LV {totalLevel}</span>
          </div>
          <div className="kk-bar vigour" title={`Vigour ${Math.ceil(snap.hp)}/${snap.maxHp}`}>
            <i style={{ width: `calc(${hpPct * 100}% - 2px)` }} />
            <span className="kk-bar-num">{Math.ceil(snap.hp)}/{snap.maxHp}</span>
          </div>
          <div className="kk-vitals-sub">
            <div className={`kk-bar stamina ${snap.blocking ? 'blocking' : ''}`} title={`Stamina ${Math.round(snap.stamina)}%`}>
              <i style={{ width: `calc(${stamPct * 100}% - 2px)` }} />
            </div>
            <div className="kk-bar xp" title={`${rank.title} · total level ${totalLevel}`}>
              <i style={{ width: `calc(${xpFrac * 100}% - 2px)` }} />
            </div>
          </div>
          {(snap.blocking || (snap.ranged && snap.elevated) || snap.draw > 0) && (
            <div className="kk-vitals-flags">
              {snap.blocking && <span className="gold"><KkIcon name="k-shield" size={12} /> Blocking</span>}
              {snap.ranged && snap.elevated && <span className="ok">Battlement — bonus damage</span>}
              {snap.draw > 0 && <span className="gold">Drawing {Math.round(snap.draw * 100)}%</span>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
