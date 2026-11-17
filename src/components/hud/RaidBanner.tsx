'use client';
// G-04 · the raid's warning, on screen: from the horn until the raiders come (the directors' raidPlan.incoming), which
// sides they come from and how long is left. Polled at a 250 ms throttle against the directors' module state, as
// OrderStatus and FortStatus read theirs. It must reach a player who is building or reading a panel (OD-08), so
// GameScreen mounts it on a layer of its own over the panels, not in the HUD's (which hides most of itself for build
// mode and sits under every panel). At home only: away, the warning is a word in the toasts (raidDirector.ts).
import { useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { raidPlan } from '@/game/directors/state';
import { sidesNamed } from '@/game/directors/approach';
import { useRafPoll } from './useRafPoll';

export default function RaidBanner() {
  const destination = useGameStore((s) => s.destination);
  const photoMode = useGameStore((s) => s.photoMode);
  const [, setTick] = useState(0);
  useRafPoll(250, () => setTick((n) => n + 1));

  if (destination || photoMode || raidPlan.incoming <= 0) return null;
  return (
    <div className="kk-raid-banner kk-glass" role="alert">
      <div className="r-kicker">The horn sounds</div>
      <div className="r-title">Raiders on the road</div>
      <div className="r-sub">
        From {sidesNamed(raidPlan.sides)}
        {/* the countdown out of the alert's hearing: a screen reader says the warning once, not again each second */}
        <span aria-hidden="true"> · {raidPlan.incoming} s</span>
      </div>
    </div>
  );
}
