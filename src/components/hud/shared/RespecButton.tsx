'use client';
// The two-click "Rethink your ..." respec control shared by the Talent Tree and the Attributes sheet. A respec is
// irreversible spending, so the button arms itself on the first click and commits on the second, then disarms.
// Local state on purpose: it resets the moment the panel closes. Stays mounted (renders nothing) while nothing is
// spent, so the armed state's lifetime is the parent panel's, exactly as when the state lived in the parent.
import { useState } from 'react';

export default function RespecButton({ spent, cost, gold, onRespec, label, titleNoun, poolNoun, armedNoun }: {
  spent: number;
  cost: number;
  gold: number;
  onRespec: () => void;
  /** 'training' / 'nature' — the "↺ Rethink your ___" word */
  label: string;
  /** singular, e.g. 'learned talent point' (used in the tooltip) */
  titleNoun: string;
  /** singular, e.g. 'learned point' (used in "Returns all N ___s to the pool.") */
  poolNoun: string;
  /** plural, e.g. 'talent points' (used in "Click again to take all your ___ back.") */
  armedNoun: string;
}) {
  const [arming, setArming] = useState(false);
  const canRespec = spent > 0 && gold >= cost;
  if (spent <= 0) return null;
  return (
    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button
        className="menu-btn small"
        style={{
          margin: 0, width: 'auto', padding: '5px 12px',
          opacity: canRespec ? 1 : 0.45,
          borderColor: arming ? 'var(--gold)' : undefined,
          color: arming ? 'var(--gold)' : undefined,
        }}
        disabled={!canRespec}
        title={`Hands all ${spent} ${titleNoun}${spent > 1 ? 's' : ''} back so you can spend them differently. Costs ${cost} gold (you have ${gold}).`}
        onClick={() => {
          if (!arming) { setArming(true); return; }
          setArming(false);
          onRespec();
        }}
      >
        {arming ? `✓ Confirm — ${cost} gold` : `↺ Rethink your ${label} — ${cost} gold`}
      </button>
      <span style={{ fontSize: 11.5, color: 'var(--parchment-dark)' }}>
        {arming
          ? `Click again to take all your ${armedNoun} back.`
          : gold >= cost
            ? `Returns all ${spent} ${poolNoun}${spent > 1 ? 's' : ''} to the pool.`
            : `You need ${cost - gold} more gold.`}
      </span>
    </div>
  );
}
