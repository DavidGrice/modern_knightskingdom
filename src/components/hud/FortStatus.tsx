'use client';
// Wave 8 · Sound Walls, on the HUD.
//
// A buff you cannot see is a rumour, so the ring gets its own chip in the
// top-right stack next to the clock: it appears the moment the wall closes and
// disappears the moment something opens it, which is also the only feedback
// that tells you WHICH gate you left up.
//
// It polls game/fort.ts's leaf module the way DungeonStatus polls the dungeon
// layout — and it is the thing that drives the recomputation while build mode
// is open (PlayerController, the other caller, is unmounted for the whole time
// you are actually laying walls).
import { useEffect, useRef, useState } from 'react';
import { FORT_DAMAGE_REDUCTION, fortState, refreshFort } from '@/game/fort';
import { useGameStore } from '@/game/store/gameStore';
import KkIcon from '../ui/KkIcon';

export default function FortStatus() {
  const destination = useGameStore((s) => s.destination);
  const [state, setState] = useState({ on: false, ring: 0, doors: 0, area: 0 });
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last.current < 500) return;
      last.current = now;
      refreshFort(); // a no-op unless something was actually built or opened
      setState((prev) =>
        prev.on === fortState.enclosed && prev.ring === fortState.ring
          && prev.doors === fortState.doors && prev.area === fortState.area
          ? prev
          : { on: fortState.enclosed, ring: fortState.ring, doors: fortState.doors, area: fortState.area });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // the ring is the homestead's; while you are away it protects nothing you
  // are standing in, so claiming it would be a lie
  if (destination || !state.on) return null;
  return (
    <div
      className="kk-clock kk-glass"
      title={
        `${state.ring} wall pieces (${state.doors} gate${state.doors === 1 ? '' : 's'}/door${state.doors === 1 ? '' : 's'}) `
        + `seal ${Math.round(state.area)}m². You take ${Math.round(FORT_DAMAGE_REDUCTION * 100)}% less damage inside your walls.`
      }
    >
      <KkIcon name="k-shield" size={13} />
      Sound Walls · {state.ring} pieces
    </div>
  );
}
