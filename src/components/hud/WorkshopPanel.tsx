'use client';
// M · The workshop. Which set you are building, and how far along it is.
//
// The nine sets here are the ones the extraction actually ships a model for
// (see ROADMAP, "The workshop"): the game holds each of them already broken
// into the modules the real set is built from, so a build is set → module →
// part, and the order comes from `gen-setplans.mjs`.
import { useGameStore } from '@/game/store/gameStore';
import { SET_PLANS, setStepCount } from '@/lib/setBuild';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';

const FACTION_LABEL: Record<string, string> = {
  lion: "King Leo's",
  bull: "Cedric's",
  mixed: 'Both houses',
};

export default function WorkshopPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const workshop = useGameStore((s) => s.workshop);
  const builtSets = useGameStore((s) => s.builtSets);
  const startSet = useGameStore((s) => s.startSet);
  const clearBench = useGameStore((s) => s.clearBench);

  const entries = Object.entries(SET_PLANS);

  return (
    <div className="game-panel clickable" style={{ minWidth: 'min(520px, 94vw)' }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>The Workshop</h2>
      <div className="loading-note" style={{ marginBottom: 12 }}>
        Lay a set out on the bench and build it piece by piece. Each piece costs
        bricks from your parts bin. A finished set unlocks its pieces for the
        homestead.
      </div>

      {workshop && (
        <div className="keep-standing" style={{ marginBottom: 14 }}>
          <div className="creator-section" style={{ marginBottom: 6 }}>On the bench</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="keep-option-name">{SET_PLANS[workshop.setNum]?.name}</div>
              <div className="kk-bar vigour" style={{ marginTop: 6 }}>
                <i style={{ width: `calc(${(workshop.step / Math.max(1, setStepCount(workshop.setNum))) * 100}% - 2px)` }} />
                <span className="kk-bar-num">{workshop.step}/{setStepCount(workshop.setNum)}</span>
              </div>
            </div>
            <button className="menu-btn small" style={{ width: 'auto', padding: '5px 10px', margin: 0 }} onClick={clearBench}>
              Clear bench
            </button>
          </div>
          <div className="loading-note" style={{ marginTop: 6 }}>
            Go to the workbench and hold <b>E</b> to set the next piece.
          </div>
        </div>
      )}

      <div className="creator-section" style={{ marginBottom: 8 }}>Sets</div>
      <div className="keep-options">
        {entries.map(([num, plan]) => {
          const total = setStepCount(num);
          const done = builtSets.includes(num);
          const onBench = workshop?.setNum === num;
          const unlocks = plan.modules.map((m) => m.asset).filter((a) => !!BUILDABLE_BY_ID[a]);
          return (
            <button
              key={num}
              className={`keep-option${done ? ' short' : ''}`}
              disabled={done || onBench}
              onClick={() => startSet(num)}
              title={done ? 'Already built' : onBench ? 'Already on the bench' : `Lay out the ${plan.name}`}
            >
              <div className="keep-option-body">
                <div className="keep-option-name">
                  {plan.name} <span style={{ opacity: 0.6, fontSize: 11 }}>· set {num}</span>
                </div>
                <div className="keep-option-blurb">
                  {FACTION_LABEL[plan.faction] ?? plan.faction} · {plan.modules.length} module{plan.modules.length === 1 ? '' : 's'} · {total} pieces
                  {unlocks.length > 0 && ` · unlocks ${unlocks.length} buildable${unlocks.length === 1 ? '' : 's'}`}
                </div>
                {done && <div className="keep-option-cost">Built ✓</div>}
                {onBench && <div className="keep-option-cost">On the bench</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
