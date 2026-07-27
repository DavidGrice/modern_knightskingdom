'use client';
// 1a–1d · compass strip, top-right. 250×32 with cardinal ticks that scroll
// under a fixed bearing line at 50%, plus coloured pips for real bearings:
// renown for home, taint for the nearest hostile. Per HANDOFF §5.1.
//
// This game's yaw convention is yaw = 0 faces −Z, so a world bearing is
// atan2(-dx, -dz) and the on-strip offset is the shortest signed delta
// between that and the player's own yaw.
import { useEffect, useState } from 'react';
import { playerState } from '@/game/playerState';
import { useEnemyStore } from '@/game/combat';
import { SPAWN } from '@/game/data/world';

/** How many radians of heading the strip shows end to end. 270° puts the
 *  two flanking cardinals at ~17%/83% instead of hard against the clipped
 *  edges, which is how the mockup reads (W · N · E across the strip). */
const SPAN = Math.PI * 1.5;

function wrap(a: number) {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** 0..1 across the strip, or null when the mark is behind you */
function place(yaw: number, dx: number, dz: number): number | null {
  const bearing = Math.atan2(-dx, -dz);
  const rel = wrap(bearing - yaw);
  if (Math.abs(rel) > SPAN / 2) return null;
  return 0.5 + rel / SPAN;
}

const CARDINALS: [string, number][] = [
  ['N', 0], ['E', -Math.PI / 2], ['S', Math.PI], ['W', Math.PI / 2],
];

export default function Compass() {
  const [state, setState] = useState({
    yaw: 0,
    threat: null as number | null,
    home: null as number | null,
  });

  useEffect(() => {
    const t = setInterval(() => {
      const { x, z, yaw } = playerState;
      // nearest living hostile, if any is close enough to matter
      let best: { d: number; dx: number; dz: number } | null = null;
      for (const e of useEnemyStore.getState().enemies) {
        if (e.mob.state === 'dying') continue;
        const dx = e.mob.x - x;
        const dz = e.mob.z - z;
        const d = Math.hypot(dx, dz);
        if (d > 60) continue;
        if (!best || d < best.d) best = { d, dx, dz };
      }
      const homeDx = SPAWN[0] - x;
      const homeDz = SPAWN[2] - z;
      setState({
        yaw,
        threat: best ? place(yaw, best.dx, best.dz) : null,
        // no point pointing home while you are standing in it
        home: Math.hypot(homeDx, homeDz) > 18 ? place(yaw, homeDx, homeDz) : null,
      });
    }, 120);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="kk-compass kk-glass">
      <div className="kk-compass-ticks">
        {CARDINALS.map(([label, bearing]) => {
          const rel = wrap(bearing - state.yaw);
          if (Math.abs(rel) > SPAN / 2) return null;
          return (
            <span
              key={label}
              className={label === 'N' ? 'n' : undefined}
              style={{ left: `${(0.5 + rel / SPAN) * 100}%` }}
            >
              {label}
            </span>
          );
        })}
      </div>
      {state.home !== null && (
        <span className="kk-compass-pip objective" style={{ left: `${state.home * 100}%` }} title="Your holdfast" />
      )}
      {state.threat !== null && (
        <span className="kk-compass-pip threat" style={{ left: `${state.threat * 100}%` }} title="Hostile" />
      )}
      <div className="kk-compass-bearing" />
    </div>
  );
}
