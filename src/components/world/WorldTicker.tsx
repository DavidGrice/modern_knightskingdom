'use client';
// Wave 65.1 (F-14) · runs the world's ticks while the player controller cannot: in build mode (GameWorld swaps the
// controller out for BuildController) and behind a panel (the controller holds still) — the build challenge's
// countdown, and the half-second sweep that grows the crops, brings the felled trees back and the newcomers in
// (game/worldTick.ts's tickWorldHeld). Paused or in a ceremony, nobody runs them (worldTickOwner, the owner's OD-08).
// Mounted always, beside the controller; renders nothing.
//
// Its frame callback has priority -1, so it runs first in every frame: it opens the frame (beginWorldFrame) for the
// once-a-frame claim the controller makes too. A negative priority does not take over the render the way a positive
// one does.
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { beginWorldFrame, claimWorldTicks, tickWorldHeld, worldTickOwner } from '@/game/worldTick';

export default function WorldTicker() {
  useFrame((_, rawDt) => {
    beginWorldFrame();
    const st = useGameStore.getState();
    if (worldTickOwner(st) !== 'ticker' || !claimWorldTicks()) return;
    tickWorldHeld(st, playerState.x, playerState.z, Math.min(rawDt, 0.05));
  }, -1);

  return null;
}
