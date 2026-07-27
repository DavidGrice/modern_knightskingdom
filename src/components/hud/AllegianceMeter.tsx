'use client';
// E19 · Where you stand between the two houses.
//
// Leo's banner at one end, Cedric's at the other, and a bar between them
// that fills from the neutral centre toward whichever way your deeds lean —
// in that house's own colours. Both banners are always drawn, because this
// is a choice between two allegiances rather than a score you accumulate;
// the one you lean toward brightens, the other dims.
//
// The pledge (`alliance`) and the standing (`allegiance`) are shown together
// on purpose. They are allowed to disagree — swearing to Leo and then doing
// Cedric's dirty work should look like exactly what it is.
import { useGameStore } from '@/game/store/gameStore';
import {
  ALLEGIANCE_MAX, ALLEGIANCE_MIN, allegianceFrac, allegianceTier,
  HOUSE_COLORS, HOUSE_NAME, leaningHouse, type House,
} from '@/game/data/allegiance';

function Banner({ house, lean }: { house: House; lean: boolean }) {
  const c = HOUSE_COLORS[house];
  return (
    <div className={`kk-alleg-banner ${lean ? 'lean' : ''}`}>
      <div className="kk-alleg-flag" style={{ background: c.primary }}>
        <i style={{ background: c.accent }} />
        <i style={{ background: c.secondary }} />
      </div>
      <div className="kk-alleg-house">{house === 'leo' ? 'Leo' : 'The Bull'}</div>
    </div>
  );
}

export default function AllegianceMeter({ compact = false }: { compact?: boolean }) {
  const value = useGameStore((s) => s.allegiance);
  const alliance = useGameStore((s) => s.alliance);

  const tier = allegianceTier(value);
  const lean = leaningHouse(value);
  const frac = allegianceFrac(value);
  // the fill runs from the centre out toward the leaning side
  const pct = frac * 100;
  const fill = value >= 0
    ? { left: '50%', width: `${Math.max(0, pct - 50)}%` }
    : { left: `${pct}%`, width: `${Math.max(0, 50 - pct)}%` };
  const colour = lean ? HOUSE_COLORS[lean].primary : 'rgba(255,255,255,.35)';

  return (
    <div>
      <div className="kk-alleg">
        <Banner house="cedric" lean={lean === 'cedric'} />
        <div className="kk-alleg-track">
          <span className="kk-alleg-fill" style={{ ...fill, background: colour }} />
          <span className="kk-alleg-mid" />
          <span className="kk-alleg-knob" style={{ left: `${pct}%`, color: colour }} />
        </div>
        <Banner house="leo" lean={lean === 'leo'} />
      </div>
      {!compact && (
        <div className="kk-alleg-caption">
          <div className="kk-alleg-title">
            {tier.title}
            <span className="kk-alleg-value">
              {value > 0 ? '+' : ''}{value} / {value >= 0 ? ALLEGIANCE_MAX : ALLEGIANCE_MIN}
            </span>
          </div>
          <div className="kk-alleg-blurb">{tier.blurb}</div>
          <div className="kk-alleg-blurb">
            {alliance
              ? <>You have sworn to <b style={{ color: HOUSE_COLORS[alliance].primary }}>{HOUSE_NAME[alliance]}</b>
                {lean && lean !== alliance
                  ? ' — though your deeds lately say otherwise.'
                  : '.'}</>
              : 'You have sworn to neither house. Both are still asking.'}
          </div>
        </div>
      )}
    </div>
  );
}
