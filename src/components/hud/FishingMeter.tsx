'use client';
// A shrinking countdown bar for the fishing bite window — miss it and the
// fish gets away. Distinct from the generic hold-E progress bar (that one
// measures how long E has been held; this one measures how much reaction
// time is left, ticking down whether or not E has been pressed yet).
import { useEffect, useState } from 'react';
import { fishingState, biteWindowMs } from '@/game/fishing';

export default function FishingMeter() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(
        fishingState.phase === 'biting'
          ? Math.max(0, (fishingState.biteDeadline - performance.now()) / biteWindowMs())
          : 0,
      );
    }, 40);
    return () => clearInterval(t);
  }, []);

  if (remaining <= 0) return null;
  return (
    <div style={{ position: 'absolute', top: '70%', left: '50%', transform: 'translate(-50%, 0)', textAlign: 'center' }}>
      <div style={{ width: 160, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.55)', border: '1px solid var(--chrome-2)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(remaining * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#c98a2c,#e8c141)' }} />
      </div>
    </div>
  );
}
